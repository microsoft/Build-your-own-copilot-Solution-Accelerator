import azure.functions as func
import openai
from azurefunctions.extensions.http.fastapi import Request, StreamingResponse
import os
from typing import Annotated

from semantic_kernel.agents.open_ai import AzureAssistantAgent
from semantic_kernel.contents.chat_message_content import ChatMessageContent
from semantic_kernel.contents.utils.author_role import AuthorRole
from semantic_kernel.functions.kernel_function_decorator import kernel_function
from semantic_kernel.kernel import Kernel
import pymssql

# --------------------------
# Azure Function App setup
# --------------------------
app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# Retrieve required environment variables
endpoint = os.environ.get("AZURE_OPEN_AI_ENDPOINT")
api_key = os.environ.get("AZURE_OPEN_AI_API_KEY")
api_version = os.environ.get("OPENAI_API_VERSION")
deployment = os.environ.get("AZURE_OPEN_AI_DEPLOYMENT_MODEL")
temperature = 0

search_endpoint = os.environ.get("AZURE_AI_SEARCH_ENDPOINT")
search_key = os.environ.get("AZURE_AI_SEARCH_API_KEY")

# --------------------------
# Helper function to get client name from DB
# --------------------------
def get_client_name_from_db(client_id: str) -> str:
    """
    Connects to your SQL database and returns the client name for the given client_id.
    If no row is found, returns an empty string.
    """
    server = os.environ.get("SQLDB_SERVER")
    database = os.environ.get("SQLDB_DATABASE")
    username = os.environ.get("SQLDB_USERNAME")
    password = os.environ.get("SQLDB_PASSWORD")

    conn = pymssql.connect(server, username, password, database)
    cursor = conn.cursor()

    # Query your Clients table for the name
    sql = "SELECT Client FROM Clients WHERE ClientId = %s"
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
            # Replace placeholders with actual query and clientid
            sql_prompt = sql_prompt.replace("{query}", query).replace("{clientid}", clientid)
        else:
            # Fallback prompt if not set in environment
            sql_prompt = f"Generate a valid T-SQL query for: {query} and ClientId = {clientid}."

        try:
            # Ask the model to produce a SQL query
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

            # Extract the generated SQL
            sql_query = completion.choices[0].message.content
            # Remove any triple backticks if present
            sql_query = sql_query.replace("```sql", "").replace("```", "")

            print("Generated SQL:", sql_query)

            # Connect to SQL Server
            server = os.environ.get("SQLDB_SERVER")
            database = os.environ.get("SQLDB_DATABASE")
            username = os.environ.get("SQLDB_USERNAME")
            password = os.environ.get("SQLDB_PASSWORD")

            conn = pymssql.connect(server, username, password, database)
            cursor = conn.cursor()
            cursor.execute(sql_query)

            rows = cursor.fetchall()
            if not rows:
                answer = "No data found for that client."
            else:
                # Return raw data as string
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
                api_version="2024-02-01"
            )

            system_message = os.environ.get("AZURE_CALL_TRANSCRIPT_SYSTEM_PROMPT")
            if not system_message:
                system_message = (
                    "You are an assistant who supports wealth advisors in preparing for client meetings. "
                    "You have access to the client’s past meeting call transcripts to provide relevant insights."
                )

            # We pass the question and rely on the data source definitions
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
    Example: ?query=Give summary of previous meetings:::10005
    """
    query = req.query_params.get("query", None)
    if not query:
        query = "please pass a query:::00000"

    # --------------------------------------------------------------------
    # Parse user query and client id
    # --------------------------------------------------------------------
    user_query = query.split(":::")[0]
    client_id = query.split(":::")[-1]

    # --------------------------------------------------------------------
    # 1. Retrieve the actual client name from the DB
    # --------------------------------------------------------------------
    actual_client_name = get_client_name_from_db(client_id)  # e.g. "Karen Berg"

    # --------------------------------------------------------------------
    # 2. Check mismatch: if "karen" is in the user query
    #    but the DB name does not contain "karen" -> mismatch
    # --------------------------------------------------------------------
    if "karen" in user_query.lower() and "karen" not in actual_client_name.lower():
        return StreamingResponse(
            iter([b"Please only ask questions about the selected client or select another client."]),
            media_type="text/event-stream"
        )

    # --------------------------------------------------------------------
    # If not mismatched, proceed
    # --------------------------------------------------------------------
    kernel = Kernel()
    kernel.add_plugin(ChatWithDataPlugin(), plugin_name="ChatWithData")

    service_id = "agent"
    HOST_NAME = "WealthAdvisor"

    # Try reading the environment variable for the system prompt
    HOST_INSTRUCTIONS = os.environ.get("AZURE_OPENAI_STREAM_TEXT_SYSTEM_PROMPT")
    if not HOST_INSTRUCTIONS:
        HOST_INSTRUCTIONS = (
            "You are a helpful assistant to a Wealth Advisor. "
            "For any query, produce a detailed answer based on the client's live data from SQL or call transcripts. "
            "If no data is found, respond with 'No data found for that client.' "
            "Remove any sensitive client identifiers from the final response."
        )

    # Create the agent using the Semantic Kernel Assistant Agent
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

    # Create a conversation thread
    thread_id = await agent.create_thread()
    message = ChatMessageContent(role=AuthorRole.USER, content=user_query)
    await agent.add_chat_message(thread_id=thread_id, message=message)

    # Additional instructions: pass the clientId
    ADDITIONAL_INSTRUCTIONS = f"Always send clientId as {client_id}"
    sk_response = agent.invoke_stream(thread_id=thread_id, additional_instructions=ADDITIONAL_INSTRUCTIONS)

    return StreamingResponse(stream_processor(sk_response), media_type="text/event-stream")
