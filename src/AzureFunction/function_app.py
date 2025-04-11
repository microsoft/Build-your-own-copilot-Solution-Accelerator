import azure.functions as func
import openai
from azurefunctions.extensions.http.fastapi import Request, StreamingResponse
import os
from typing import Annotated
from dotenv import load_dotenv

from semantic_kernel.agents.open_ai import AzureAssistantAgent
from semantic_kernel.contents.chat_message_content import ChatMessageContent
from semantic_kernel.contents.utils.author_role import AuthorRole
from semantic_kernel.functions.kernel_function_decorator import kernel_function
from semantic_kernel.kernel import Kernel
from azure.identity import DefaultAzureCredential
import pyodbc
import struct
import logging

# --------------------------
# Azure Function App setup
# --------------------------
app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)
load_dotenv()
# Retrieve required environment variables
endpoint = os.environ.get("AZURE_OPEN_AI_ENDPOINT")
api_key = os.environ.get("AZURE_OPEN_AI_API_KEY")
api_version = os.environ.get("OPENAI_API_VERSION")
deployment = os.environ.get("AZURE_OPEN_AI_DEPLOYMENT_MODEL")
temperature = 0

search_endpoint = os.environ.get("AZURE_AI_SEARCH_ENDPOINT")
search_key = os.environ.get("AZURE_AI_SEARCH_API_KEY")

# --------------------------
# Helper function to get client name
# --------------------------
def get_client_name_from_db(client_id: str) -> str:
    """
    Connects to your SQL database and returns the client name for the given client_id.
    """

    conn = get_connection()
    cursor = conn.cursor()
    
    sql = "SELECT Client FROM Clients WHERE ClientId = ?"
    cursor.execute(sql, (client_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return row[0]  # The 'Client' column
    else:
        return ""

# --------------------------
# ChatWithDataPlugin Class
# --------------------------
class ChatWithDataPlugin:
    @kernel_function(name="GreetingsResponse", description="Respond to any greeting or general questions")
    def greeting(self, input: Annotated[str, "the question"]) -> Annotated[str, "The output is a string"]:
        """
        Simple greeting handler using Azure OpenAI.
        """
        try:
            client = openai.AzureOpenAI(
                azure_endpoint=endpoint,
                api_key=api_key,
                api_version=api_version
            )
            completion = client.chat.completions.create(
                model=deployment,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant to respond to greetings or general questions."
                    },
                    {
                        "role": "user",
                        "content": input
                    },
                ],
                temperature=0,
                top_p=1,
                n=1
            )
            answer = completion.choices[0].message.content
        except Exception as e:
            answer = f"Error retrieving greeting response: {str(e)}"
        return answer

    @kernel_function(name="ChatWithSQLDatabase", description="Generate and run a T-SQL query based on the provided question and client id")
    def get_SQL_Response(
        self,
        input: Annotated[str, "the question"],
        ClientId: Annotated[str, "the ClientId"]
    ) -> Annotated[str, "The output is a string"]:
        """
        Dynamically generates a T-SQL query using the Azure OpenAI chat endpoint
        and then executes it against the SQL database.
        """
        clientid = ClientId
        query = input

        # Initialize the Azure OpenAI client
        client = openai.AzureOpenAI(
            azure_endpoint=endpoint,
            api_key=api_key,
            api_version=api_version
        )

        # Retrieve the SQL prompt from environment variables (if available)
        sql_prompt = os.environ.get("AZURE_SQL_SYSTEM_PROMPT")
        if sql_prompt:
            sql_prompt = sql_prompt.replace("{query}", query).replace("{clientid}", clientid)
        else:
            # Fallback prompt if not set in environment
            sql_prompt = f'''Generate a valid T-SQL query to find {query} for tables and columns provided below:
            1. Table: Clients
            Columns: ClientId, Client, Email, Occupation, MaritalStatus, Dependents
            2. Table: InvestmentGoals
            Columns: ClientId, InvestmentGoal
            3. Table: Assets
            Columns: ClientId, AssetDate, Investment, ROI, Revenue, AssetType
            4. Table: ClientSummaries
            Columns: ClientId, ClientSummary
            5. Table: InvestmentGoalsDetails
            Columns: ClientId, InvestmentGoal, TargetAmount, Contribution
            6. Table: Retirement
            Columns: ClientId, StatusDate, RetirementGoalProgress, EducationGoalProgress
            7. Table: ClientMeetings
            Columns: ClientId, ConversationId, Title, StartTime, EndTime, Advisor, ClientEmail
            Always use the Investment column from the Assets table as the value.
            Assets table has snapshots of values by date. Do not add numbers across different dates for total values.
            Do not use client name in filters.
            Do not include assets values unless asked for.
            ALWAYS use ClientId = {clientid} in the query filter.
            ALWAYS select Client Name (Column: Client) in the query.
            Query filters are IMPORTANT. Add filters like AssetType, AssetDate, etc. if needed.
            If the result might return more than 100 rows, include TOP 100 to limit the row count.
            Only return the generated SQL query. Do not return anything else.'''

        try:
            completion = client.chat.completions.create(
                model=deployment,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": sql_prompt},
                ],
                temperature=0,
                top_p=1,
                n=1
            )

            sql_query = completion.choices[0].message.content

            # Remove any triple backticks if present
            sql_query = sql_query.replace("```sql", "").replace("```", "")

            print("Generated SQL:", sql_query)
        
            conn = get_connection()
            # conn = pyodbc.connect(connectionString)
            cursor = conn.cursor()
            cursor.execute(sql_query)

            rows = cursor.fetchall()
            if not rows:
                answer = "No data found for that client."
            else:
                answer = ""
                for row in rows:
                    answer += str(row) + "\n"

            conn.close()

        except Exception as e:
            answer = f"Error retrieving data from SQL: {str(e)}"
        return answer

    @kernel_function(name="ChatWithCallTranscripts", description="Retrieve answers from call transcript search for a given client")
    def get_answers_from_calltranscripts(
        self,
        question: Annotated[str, "the question"],
        ClientId: Annotated[str, "the ClientId"]
    ) -> Annotated[str, "The output is a string"]:
        """
        Uses Azure Cognitive Search (via the Azure OpenAI extension) to find relevant call transcripts.
        """
        try:
            client = openai.AzureOpenAI(
                azure_endpoint=endpoint,
                api_key=api_key,
                api_version=api_version
            )

            system_message = os.environ.get("AZURE_CALL_TRANSCRIPT_SYSTEM_PROMPT")
            if not system_message:
                system_message = (
                    "You are an assistant who supports wealth advisors in preparing for client meetings. "
                    "You have access to the client’s past meeting call transcripts. "
                    "When answering questions, especially summary requests, provide a detailed and structured response that includes key topics, concerns, decisions, and trends. "
                    "If no data is available, state 'No relevant data found for previous meetings.'"
                )

            completion = client.chat.completions.create(
                model=deployment,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": question}
                ],
                seed=42,
                temperature=0,
                top_p=1,
                n=1,
                max_tokens=800,
                extra_body={
                    "data_sources": [
                        {
                            "type": "azure_search",
                            "parameters": {
                                "endpoint": search_endpoint,
                                "index_name": os.environ.get("AZURE_SEARCH_INDEX"),
                                "semantic_configuration": "default",
                                "query_type": "vector_simple_hybrid",
                                "fields_mapping": {
                                    "content_fields_separator": "\n",
                                    "content_fields": ["content"],
                                    "filepath_field": "chunk_id",
                                    "title_field": "",
                                    "url_field": "sourceurl",
                                    "vector_fields": ["contentVector"]
                                },
                                "semantic_configuration": 'my-semantic-config',
                                "in_scope": "true",
                                "role_information": system_message,
                                "filter": f"client_id eq '{ClientId}'",
                                "strictness": 3,
                                "top_n_documents": 5,
                                "authentication": {
                                    "type": "api_key",
                                    "key": search_key
                                },
                                "embedding_dependency": {
                                    "type": "deployment_name",
                                    "deployment_name": "text-embedding-ada-002"
                                },
                            }
                        }
                    ]
                }
            )

            if not completion.choices:
                return "No data found for that client."

            response_text = completion.choices[0].message.content
            if not response_text.strip():
                return "No data found for that client."
            return response_text

        except Exception as e:
            return f"Error retrieving data from call transcripts: {str(e)}"


def get_connection():
    driver = "{ODBC Driver 18 for SQL Server}"
    server = os.environ.get("SQLDB_SERVER")
    database = os.environ.get("SQLDB_DATABASE")
    username = os.environ.get("SQLDB_USERNAME")
    password = os.environ.get("SQLDB_PASSWORD")
    mid_id = os.environ.get("SQLDB_USER_MID")
    try :
        credential = DefaultAzureCredential(managed_identity_client_id=mid_id)

        token_bytes = credential.get_token(
        "https://database.windows.net/.default"
        ).token.encode("utf-16-LE")
        token_struct = struct.pack(f"<I{len(token_bytes)}s", len(token_bytes), token_bytes)
        SQL_COPT_SS_ACCESS_TOKEN = (
        1256  # This connection option is defined by microsoft in msodbcsql.h
        )

        # Set up the connection
        connection_string = f"DRIVER={driver};SERVER={server};DATABASE={database};"
        conn = pyodbc.connect(
        connection_string, attrs_before={SQL_COPT_SS_ACCESS_TOKEN: token_struct}
        )
        return conn
    
    except pyodbc.Error as e:
        logging.error(f"Failed with Default Credential: {str(e)}")
        conn = pyodbc.connect(
            f"DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password}",
            timeout=5
        )
        logging.info("Connected using Username & Password")
        return conn
    


# --------------------------
# Streaming Processor
# --------------------------
async def stream_processor(response):
    """
    Streams the model's response back to the client in real-time.
    """
    async for message in response:
        if message.content:
            yield message.content

# --------------------------
# HTTP Trigger Function
# --------------------------
@app.route(route="stream_openai_text", methods=[func.HttpMethod.GET])
async def stream_openai_text(req: Request) -> StreamingResponse:
    """
    The main Azure Function endpoint. 
    Receives a query of the form: ?query=<user question>:::<client id>
    Example: ?query=Give summary of previous meetings:::10001
    """
    query = req.query_params.get("query", None)
    if not query:
        query = "please pass a query:::00000"  # default if none provided

    #Parse user query and client id
    user_query = query.split(":::")[0]
    client_id = query.split(":::")[-1]

    #Dynamically get the name from the database
    selected_client_name = get_client_name_from_db(client_id)

    #Prepare fallback instructions with the single-line prompt
    HOST_INSTRUCTIONS = os.environ.get("AZURE_OPENAI_STREAM_TEXT_SYSTEM_PROMPT")
    if not HOST_INSTRUCTIONS:
        # Insert the name in the prompt:
        HOST_INSTRUCTIONS = (
            "You are a helpful assistant to a Wealth Advisor."
            "The currently selected client's name is '{SelectedClientName}' (in any variation: ignoring punctuation, apostrophes, and case)."
            "If the user mentions no name, assume they are asking about '{SelectedClientName}'."
            "If the user references a name that clearly differs from '{SelectedClientName}', respond only with: 'Please only ask questions about the selected client or select another client.' Otherwise, provide thorough answers for every question using only data from SQL or call transcripts."
            "If no data is found, respond with 'No data found for that client.' Remove any client identifiers from the final response."
        )
    HOST_INSTRUCTIONS = HOST_INSTRUCTIONS.replace("{SelectedClientName}", selected_client_name)
    #Create the agent using the Semantic Kernel Assistant Agent
    kernel = Kernel()
    kernel.add_plugin(ChatWithDataPlugin(), plugin_name="ChatWithData")

    service_id = "agent"
    HOST_NAME = "WealthAdvisor"

    agent = await AzureAssistantAgent.create(
        kernel=kernel,
        service_id=service_id,
        name=HOST_NAME,
        instructions=HOST_INSTRUCTIONS,
        api_key=api_key,
        deployment_name=deployment,
        endpoint=endpoint,
        api_version=api_version,
    )

    #Create a conversation thread and add the user's message
    thread_id = await agent.create_thread()
    message = ChatMessageContent(role=AuthorRole.USER, content=user_query)
    await agent.add_chat_message(thread_id=thread_id, message=message)

    #dditional instructions: pass the clientId
    ADDITIONAL_INSTRUCTIONS = f"Always send clientId as {client_id}"

    #Invoke the streaming response
    sk_response = agent.invoke_stream(
        thread_id=thread_id,
        additional_instructions=ADDITIONAL_INSTRUCTIONS
    )

    return StreamingResponse(stream_processor(sk_response), media_type="text/event-stream")
