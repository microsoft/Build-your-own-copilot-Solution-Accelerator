import os
import openai
import struct
import logging
import pyodbc
from azure.identity import DefaultAzureCredential
from azure.ai.projects import AIProjectClient
from semantic_kernel.agents.open_ai import AzureAssistantAgent
from semantic_kernel.kernel import Kernel
from semantic_kernel.contents.chat_message_content import ChatMessageContent
from semantic_kernel.contents.utils.author_role import AuthorRole
from semantic_kernel.functions.kernel_function_decorator import kernel_function
from typing import Annotated

# --------------------------
# Environment Variables
# --------------------------
endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
api_key = os.environ.get("AZURE_OPENAI_KEY")
api_version = os.environ.get("OPENAI_API_VERSION")
deployment = os.environ.get("AZURE_OPENAI_MODEL")
search_endpoint = os.environ.get("AZURE_AI_SEARCH_ENDPOINT")
search_key = os.environ.get("AZURE_AI_SEARCH_API_KEY")
project_connection_string = os.environ.get("AZURE_AI_PROJECT_CONN_STRING")
use_ai_project_client = os.environ.get("USE_AI_PROJECT_CLIENT", "false").lower() == "true"

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
            if self.use_ai_project_client:
                project = AIProjectClient.from_connection_string(
                    conn_str=self.azure_ai_project_conn_string,
                    credential=DefaultAzureCredential()
                )
                client = project.inference.get_chat_completions_client()

                completion = client.complete(
                    model=self.azure_openai_deployment_model,
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
                )
            else:
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

    @kernel_function(name="ChatWithSQLDatabase", description="Given a query about client assets, investements and meeting dates or times, get details from the database based on the provided question and client id")
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
            Only return the generated SQL query. Do not return anything else.'''

        try:
            if use_ai_project_client:
                project = AIProjectClient.from_connection_string(
                    conn_str=project_connection_string,
                    credential=DefaultAzureCredential()
                )
                client = project.inference.get_chat_completions_client()
                completion = client.complete(
                    model=deployment,
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant."},
                        {"role": "user", "content": sql_prompt},
                    ],
                    temperature=0,
                )

            else:
                # Initialize the Azure OpenAI client
                client = openai.AzureOpenAI(
                    azure_endpoint=endpoint,
                    api_key=api_key,
                    api_version=api_version
                )
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
            answer = answer[:20000] if len(answer) > 20000 else answer

        except Exception as e:
            answer = f"Error retrieving data from SQL: {str(e)}"
        return answer

    @kernel_function(name="ChatWithCallTranscripts", description="given a query about meetings summary or actions or notes, get answer from search index for a given ClientId")
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
                                # "role_information": system_message,
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


# --------------------------
# Streaming Response Logic
# --------------------------


async def stream_response_from_wealth_assistant(query: str, client_id: str):
    """
       Streams real-time chat response from the Wealth Assistant.
       Uses Semantic Kernel agent with SQL and Azure Cognitive Search based on the client ID.
    """

    # Dynamically get the name from the database
    selected_client_name = get_client_name_from_db(client_id)  # Optionally fetch from DB

    # Prepare fallback instructions with the single-line prompt
    host_instructions = os.environ.get("AZURE_OPENAI_STREAM_TEXT_SYSTEM_PROMPT")
    if not host_instructions:
        # Insert the name in the prompt:
        host_instructions = (
            "You are a helpful assistant to a Wealth Advisor."
            "The currently selected client's name is '{SelectedClientName}'. Treat any case-insensitive or partial mention as referring to this client."
            "If the user mentions no name, assume they are asking about '{SelectedClientName}'."
            "If the user references a name that clearly differs from '{SelectedClientName}', respond only with: 'Please only ask questions about the selected client or select another client.' Otherwise, provide thorough answers for every question using only data from SQL or call transcripts."
            "If no data is found, respond with 'No data found for that client.' Remove any client identifiers from the final response."
        )
    host_instructions = host_instructions.replace("{SelectedClientName}", selected_client_name)

    # Create the agent using the Semantic Kernel Assistant Agent
    kernel = Kernel()
    kernel.add_plugin(ChatWithDataPlugin(), plugin_name="ChatWithData")

    agent = await AzureAssistantAgent.create(
        kernel=kernel,
        service_id="agent",
        name="WealthAdvisor",
        instructions=host_instructions,
        api_key=api_key,
        deployment_name=deployment,
        endpoint=endpoint,
        api_version=api_version,
    )

    # Create a conversation thread and add the user's message
    thread_id = await agent.create_thread()
    message = ChatMessageContent(role=AuthorRole.USER, content=query)
    await agent.add_chat_message(thread_id=thread_id, message=message)

    # Additional instructions: pass the clientId
    additional_instructions = f"Always send clientId as {client_id}"
    sk_response = agent.invoke_stream(thread_id=thread_id, additional_instructions=additional_instructions)

    async def generate():
        # yields deltaText strings one-by-one
        async for chunk in sk_response:
            if not chunk or not chunk.content:
                continue
            yield chunk.content  # just the deltaText

    return generate


# --------------------------
# Get SQL Connection
# --------------------------
def get_connection():
    driver = "{ODBC Driver 18 for SQL Server}"
    server = os.environ.get("SQLDB_SERVER")
    database = os.environ.get("SQLDB_DATABASE")
    username = os.environ.get("SQLDB_USERNAME")
    password = os.environ.get("SQLDB_PASSWORD")
    mid_id = os.environ.get("SQLDB_USER_MID")

    try:
        credential = DefaultAzureCredential(managed_identity_client_id=mid_id)
        token_bytes = credential.get_token("https://database.windows.net/.default").token.encode("utf-16-LE")
        token_struct = struct.pack(f"<I{len(token_bytes)}s", len(token_bytes), token_bytes)
        SQL_COPT_SS_ACCESS_TOKEN = 1256

        connection_string = f"DRIVER={driver};SERVER={server};DATABASE={database};"
        conn = pyodbc.connect(connection_string, attrs_before={SQL_COPT_SS_ACCESS_TOKEN: token_struct})
        return conn
    except pyodbc.Error as e:
        logging.error(f"Default Credential failed: {str(e)}")
        conn = pyodbc.connect(
            f"DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password}",
            timeout=5
        )
        return conn


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
