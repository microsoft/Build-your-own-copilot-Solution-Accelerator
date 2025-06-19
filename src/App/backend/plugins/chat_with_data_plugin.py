from typing import Annotated

import openai
from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential, get_bearer_token_provider
from semantic_kernel.functions.kernel_function_decorator import kernel_function

from backend.common.config import config
from backend.services.sqldb_service import get_connection

# --------------------------
# ChatWithDataPlugin Class
# --------------------------


class ChatWithDataPlugin:

    @kernel_function(
        name="GreetingsResponse",
        description="Respond to any greeting or general questions",
    )
    def greeting(
        self, input: Annotated[str, "the question"]
    ) -> Annotated[str, "The output is a string"]:
        """
        Simple greeting handler using Azure OpenAI.
        """
        try:
            if config.USE_AI_PROJECT_CLIENT:
                client = self.get_project_openai_client()

            else:
                client = self.get_openai_client()

            completion = client.chat.completions.create(
                model=config.AZURE_OPENAI_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful assistant to respond to greetings or general questions.",
                    },
                    {"role": "user", "content": input},
                ],
                temperature=0,
                top_p=1,
                n=1,
            )

            answer = completion.choices[0].message.content
        except Exception as e:
            answer = f"Error retrieving greeting response: {str(e)}"
        return answer

    @kernel_function(
        name="ChatWithSQLDatabase",
        description="Given a query about client assets, investments and scheduled meetings (including upcoming or next meeting dates/times), get details from the database based on the provided question and client id",
    )
    def get_SQL_Response(
        self,
        input: Annotated[str, "the question"],
        ClientId: Annotated[str, "the ClientId"],
    ) -> Annotated[str, "The output is a string"]:
        """
        Dynamically generates a T-SQL query using the Azure OpenAI chat endpoint
        and then executes it against the SQL database.
        """
        if not ClientId or not ClientId.strip():
            return "Error: ClientId is required"

        if not input or not input.strip():
            return "Error: Query input is required"

        clientid = ClientId
        query = input

        # Retrieve the SQL prompt from environment variables (if available)
        sql_prompt = config.SQL_SYSTEM_PROMPT
        if sql_prompt:
            sql_prompt = sql_prompt.replace("{query}", query).replace(
                "{clientid}", clientid
            )
        else:
            # Fallback prompt if not set in environment
            sql_prompt = f"""Generate a valid T-SQL query to find {query} for tables and columns provided below:
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
            Only return the generated SQL query. Do not return anything else."""

        try:
            if config.USE_AI_PROJECT_CLIENT:
                client = self.get_project_openai_client()

            else:
                # Initialize the Azure OpenAI client
                client = self.get_openai_client()

            completion = client.chat.completions.create(
                model=config.AZURE_OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": sql_prompt},
                ],
                temperature=0,
                top_p=1,
                n=1,
            )

            sql_query = completion.choices[0].message.content

            # Remove any triple backticks if present
            sql_query = sql_query.replace("```sql", "").replace("```", "")

            # print("Generated SQL:", sql_query)

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

    @kernel_function(
        name="ChatWithCallTranscripts",
        description="given a query about meetings summary or actions or notes, get answer from search index for a given ClientId",
    )
    def get_answers_from_calltranscripts(
        self,
        question: Annotated[str, "the question"],
        ClientId: Annotated[str, "the ClientId"],
    ) -> Annotated[str, "The output is a string"]:
        """
        Uses Azure Cognitive Search (via the Azure OpenAI extension) to find relevant call transcripts.
        """
        if not ClientId or not ClientId.strip():
            return "Error: ClientId is required"
        if not question or not question.strip():
            return "Error: Question input is required"

        try:
            client = self.get_openai_client()

            system_message = config.CALL_TRANSCRIPT_SYSTEM_PROMPT
            if not system_message:
                system_message = (
                    "You are an assistant who supports wealth advisors in preparing for client meetings. "
                    "You have access to the client's past meeting call transcripts. "
                    "When answering questions, especially summary requests, provide a detailed and structured response that includes key topics, concerns, decisions, and trends. "
                    "If no data is available, state 'No relevant data found for previous meetings.'"
                )

            completion = client.chat.completions.create(
                model=config.AZURE_OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": question},
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
                                "endpoint": config.AZURE_SEARCH_ENDPOINT,
                                "index_name": "transcripts_index",
                                "query_type": "vector_simple_hybrid",
                                "fields_mapping": {
                                    "content_fields_separator": "\n",
                                    "content_fields": ["content"],
                                    "filepath_field": "chunk_id",
                                    "title_field": "",
                                    "url_field": "sourceurl",
                                    "vector_fields": ["contentVector"],
                                },
                                "semantic_configuration": "my-semantic-config",
                                "in_scope": "true",
                                # "role_information": system_message,
                                "filter": f"client_id eq '{ClientId}'",
                                "strictness": 3,
                                "top_n_documents": 5,
                                "authentication": {
                                    "type": "system_assigned_managed_identity"
                                },
                                "embedding_dependency": {
                                    "type": "deployment_name",
                                    "deployment_name": "text-embedding-ada-002",
                                },
                            },
                        }
                    ]
                },
            )

            if not completion.choices:
                return "No data found for that client."

            response_text = completion.choices[0].message.content
            if not response_text.strip():
                return "No data found for that client."
            return response_text

        except Exception as e:
            return f"Error retrieving data from call transcripts: {str(e)}"

    def get_openai_client(self):
        token_provider = get_bearer_token_provider(
            DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
        )
        openai_client = openai.AzureOpenAI(
            azure_endpoint=config.AZURE_OPENAI_ENDPOINT,
            azure_ad_token_provider=token_provider,
            api_version=config.AZURE_OPENAI_PREVIEW_API_VERSION,
        )
        return openai_client

    def get_project_openai_client(self):
        project = AIProjectClient(
            endpoint=config.AI_PROJECT_ENDPOINT, credential=DefaultAzureCredential()
        )
        openai_client = project.inference.get_azure_openai_client(
            api_version=config.AZURE_OPENAI_PREVIEW_API_VERSION
        )
        return openai_client
