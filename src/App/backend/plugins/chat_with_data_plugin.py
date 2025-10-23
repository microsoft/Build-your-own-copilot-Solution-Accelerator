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
from azure.identity import get_bearer_token_provider
from backend.helpers.azure_credential_utils import get_azure_credential
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

        thread = None
        try:
            # TEMPORARY: Use AgentFactory directly to debug the issue
            logging.info(f"Using AgentFactory directly for SQL agent for ClientId: {ClientId}")
            from backend.agents.agent_factory import AgentFactory
            agent_info = await AgentFactory.get_sql_agent()

            logging.info(f"SQL agent retrieved: {agent_info is not None}")
            agent = agent_info["agent"]
            project_client = agent_info["client"]

            thread = project_client.agents.threads.create()

            # Send question as message
            project_client.agents.messages.create(
                thread_id=thread.id,
                role=MessageRole.USER,
                content=f"ClientId: {ClientId}\nQuestion: {input}",
            )

            # Run the agent
            run = project_client.agents.runs.create_and_process(
                thread_id=thread.id,
                agent_id=agent.id,
                temperature=0,
            )

            if run.status == "failed":
                return f"Error: Agent run failed: {run.last_error}"

            # Get SQL query from the agent's final response
            message = project_client.agents.messages.get_last_message_text_by_role(
                thread_id=thread.id,
                role=MessageRole.AGENT
            )
            sql_query = message.text.value.strip() if message else None
            logging.info(f"Generated SQL query: {sql_query}")

            if not sql_query:
                return "No SQL query was generated."

            # Clean up triple backticks (if any)
            sql_query = sql_query.replace("```sql", "").replace("```", "")
            logging.info(f"Cleaned SQL query: {sql_query}")

            # Execute the query
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(sql_query)
            rows = cursor.fetchall()
            logging.info(f"Query returned {len(rows)} rows")

            if not rows:
                result = "No data found for that client."
            else:
                result = "\n".join(str(row) for row in rows)
                logging.info(f"Result preview: {result[:200]}...")

            conn.close()

            return result[:20000] if len(result) > 20000 else result
        except Exception as e:
            logging.exception("Error in get_SQL_Response")
            return f"Error retrieving SQL data: {str(e)}"
        finally:
            if thread:
                try:
                    logging.info(f"Attempting to delete thread {thread.id}")
                    await project_client.agents.threads.delete(thread.id)
                    logging.info(f"Thread {thread.id} deleted successfully")
                except Exception as e:
                    logging.error(f"Error deleting thread {thread.id}: {str(e)}")

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

        thread = None
        try:
            response_text = ""

            from backend.agents.agent_factory import AgentFactory

            agent_info = await AgentFactory.get_search_agent()

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
                    try:
                        await project_client.agents.threads.delete(thread.id)
                        logging.info(f"Thread {thread.id} deleted successfully")
                    except Exception as e:
                        logging.error(f"Error deleting thread {thread.id}: {str(e)}")

            if not response_text.strip():
                return "No data found for that client."
            return response_text

        except Exception as e:
            logging.error(f"Error in get_answers_from_calltranscripts: {str(e)}")
            return "Error retrieving data from call transcripts"

    def get_openai_client(self):
        token_provider = get_bearer_token_provider(
            get_azure_credential(config.MID_ID), "https://cognitiveservices.azure.com/.default"
        )
        openai_client = openai.AzureOpenAI(
            azure_endpoint=config.AZURE_OPENAI_ENDPOINT,
            azure_ad_token_provider=token_provider,
            api_version=config.AZURE_OPENAI_PREVIEW_API_VERSION,
        )
        return openai_client

    def get_project_openai_client(self):
        project = AIProjectClient(
            endpoint=config.AI_PROJECT_ENDPOINT, credential=get_azure_credential(config.MID_ID)
        )
        openai_client = project.inference.get_azure_openai_client(
            api_version=config.AZURE_OPENAI_PREVIEW_API_VERSION
        )
        return openai_client
