import logging
from typing import Annotated

import openai
from azure.ai.agents.models import (
    Agent,
    AzureAISearchQueryType,
    AzureAISearchTool,
    MessageRole,
)
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
        name="ChatWithSQLDatabase",
        description="Given a query about client assets, investments and scheduled meetings (including upcoming or next meeting dates/times), get details from the database based on the provided question and client id",
    )
    async def get_SQL_Response(
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
            When answering scheduling or time-based meeting questions, always use the StartTime column from ClientMeetings table. Use correct logic to return the most recent past meeting (last/previous) or the nearest future meeting (next/upcoming), and ensure only StartTime column is used for meeting timing comparisons.
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
    async def get_answers_from_calltranscripts(
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
            response_text = ""

            from backend.agents.agent_factory import AgentFactory

            agent_info: dict = await AgentFactory.get_search_agent()

            agent: Agent = agent_info["agent"]
            project_client: AIProjectClient = agent_info["client"]

            try:
                field_mapping = {
                    "contentFields": ["content"],
                    "urlField": "sourceurl",
                    "titleField": "chunk_id",
                    "vector_fields": ["contentVector"],
                }

                project_index = project_client.indexes.create_or_update(
                    name=f"project-index-{config.AZURE_SEARCH_INDEX}",
                    version="1",
                    body={
                        "connectionName": config.AZURE_SEARCH_CONNECTION_NAME,
                        "indexName": config.AZURE_SEARCH_INDEX,
                        "type": "AzureSearch",
                        "fieldMapping": field_mapping,
                    },
                )

                ai_search_tool = AzureAISearchTool(
                    index_asset_id=f"{project_index.name}/versions/{project_index.version}",
                    index_connection_id=None,
                    index_name=None,
                    query_type=AzureAISearchQueryType.VECTOR_SIMPLE_HYBRID,
                    filter=f"client_id eq '{ClientId}'",
                )

                agent = project_client.agents.update_agent(
                    agent_id=agent.id,
                    tools=ai_search_tool.definitions,
                    tool_resources=ai_search_tool.resources,
                )

                thread = project_client.agents.threads.create()

                project_client.agents.messages.create(
                    thread_id=thread.id,
                    role=MessageRole.USER,
                    content=question,
                )

                run = project_client.agents.runs.create_and_process(
                    thread_id=thread.id,
                    agent_id=agent.id,
                    tool_choice={"type": "azure_ai_search"},
                    temperature=0.0,
                )

                if run.status == "failed":
                    logging.error(f"AI Search Agent Run failed: {run.last_error}")
                    return "Error retrieving data from call transcripts"
                else:
                    message = (
                        project_client.agents.messages.get_last_message_text_by_role(
                            thread_id=thread.id, role=MessageRole.AGENT
                        )
                    )
                    if message:
                        response_text = message.text.value

            except Exception as e:
                logging.error(f"Error in AI Search Tool: {str(e)}")
                return "Error retrieving data from call transcripts"

            finally:
                if thread:
                    project_client.agents.threads.delete(thread.id)

            if not response_text.strip():
                return "No data found for that client."
            return response_text

        except Exception as e:
            logging.error(f"Error in get_answers_from_calltranscripts: {str(e)}")
            return "Error retrieving data from call transcripts"

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
