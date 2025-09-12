"""
Factory module for creating and managing a singleton AzureAIAgent instance.

This module provides asynchronous methods to get or delete the singleton agent,
ensuring only one instance exists at a time. The agent is configured for Azure AI
and supports plugin integration.
"""

import asyncio
import logging
from typing import Optional

from azure.ai.projects import AIProjectClient
from backend.helpers.azure_credential_utils import get_azure_credential
from backend.helpers.azure_credential_utils import get_azure_credential_async
from semantic_kernel.agents import AzureAIAgent, AzureAIAgentSettings

from backend.common.config import config
from backend.plugins.chat_with_data_plugin import ChatWithDataPlugin


class AgentFactory:
    """
    Singleton factory for creating and managing an AzureAIAgent instances.
    """

    _lock = asyncio.Lock()
    _wealth_advisor_agent: Optional[AzureAIAgent] = None
    _search_agent: Optional[dict] = None
    _sql_agent: Optional[dict] = None

    @classmethod
    async def get_wealth_advisor_agent(cls):
        """
        Get or create the singleton WealthAdvisor AzureAIAgent instance.
        """
        async with cls._lock:
            if cls._wealth_advisor_agent is None:
                ai_agent_settings = AzureAIAgentSettings()
                creds = await get_azure_credential_async(config.MID_ID)
                client = AzureAIAgent.create_client(
                    credential=creds, endpoint=ai_agent_settings.endpoint
                )

                agent_name = "WealthAdvisor"
                agent_instructions = '''You are a helpful assistant to a Wealth Advisor.
                If the question is unrelated to data but is conversational (e.g., greetings or follow-ups), respond appropriately using context, do not use external tools or perform any web searches for these conversational inputs.'''

                agent_definition = await client.agents.create_agent(
                    model=ai_agent_settings.model_deployment_name,
                    name=agent_name,
                    instructions=agent_instructions,
                )
                agent = AzureAIAgent(
                    client=client,
                    definition=agent_definition,
                    plugins=[ChatWithDataPlugin()],
                )
                cls._wealth_advisor_agent = agent
        return cls._wealth_advisor_agent

    @classmethod
    async def get_search_agent(cls):
        """
        Get or create the singleton CallTranscriptSearch AzureAIAgent instance.
        """
        async with cls._lock:
            if cls._search_agent is None:

                agent_instructions = config.CALL_TRANSCRIPT_SYSTEM_PROMPT
                if not agent_instructions:
                    agent_instructions = (
                        "You are an assistant who supports wealth advisors in preparing for client meetings. "
                        "You have access to the client's past meeting call transcripts via AI Search tool. "
                        "When answering questions, especially summary requests, provide a detailed and structured response that includes key topics, concerns, decisions, and trends. "
                        "If no data is available, state 'No relevant data found for previous meetings.'"
                    )

                project_client = AIProjectClient(
                    endpoint=config.AI_PROJECT_ENDPOINT,
                    credential=get_azure_credential(config.MID_ID),
                    api_version="2025-05-01",
                )

                agent = project_client.agents.create_agent(
                    model=config.AZURE_OPENAI_MODEL,
                    instructions=agent_instructions,
                    name="CallTranscriptSearchAgent",
                )
                cls._search_agent = {"agent": agent, "client": project_client}
        return cls._search_agent

    @classmethod
    async def delete_all_agent_instance(cls):
        """
        Delete the singleton AzureAIAgent instances if it exists.
        """
        async with cls._lock:
            logging.info("Starting agent deletion process...")

            # Delete Wealth Advisor Agent
            if cls._wealth_advisor_agent is not None:
                try:
                    agent_id = cls._wealth_advisor_agent.id
                    logging.info(f"Deleting wealth advisor agent: {agent_id}")
                    if hasattr(cls._wealth_advisor_agent, 'client') and cls._wealth_advisor_agent.client:
                        await cls._wealth_advisor_agent.client.agents.delete_agent(agent_id)
                        logging.info("Wealth advisor agent deleted successfully")
                    else:
                        logging.warning("Wealth advisor agent client is None")
                except Exception as e:
                    logging.error(f"Error deleting wealth advisor agent: {e}")
                    logging.exception("Detailed wealth advisor agent deletion error")
                finally:
                    cls._wealth_advisor_agent = None

            # Delete Search Agent
            if cls._search_agent is not None:
                try:
                    agent_id = cls._search_agent['agent'].id
                    logging.info(f"Deleting search agent: {agent_id}")
                    if cls._search_agent.get("client") and hasattr(cls._search_agent["client"], "agents"):
                        # AIProjectClient.agents.delete_agent is synchronous, don't await it
                        cls._search_agent["client"].agents.delete_agent(agent_id)
                        logging.info("Search agent deleted successfully")

                        # Close the client if it has a close method
                        if hasattr(cls._search_agent["client"], "close"):
                            cls._search_agent["client"].close()
                    else:
                        logging.warning("Search agent client is None or invalid")
                except Exception as e:
                    logging.error(f"Error deleting search agent: {e}")
                    logging.exception("Detailed search agent deletion error")
                finally:
                    cls._search_agent = None

            # Delete SQL Agent
            if cls._sql_agent is not None:
                try:
                    agent_id = cls._sql_agent['agent'].id
                    logging.info(f"Deleting SQL agent: {agent_id}")
                    if cls._sql_agent.get("client") and hasattr(cls._sql_agent["client"], "agents"):
                        # AIProjectClient.agents.delete_agent is synchronous, don't await it
                        cls._sql_agent["client"].agents.delete_agent(agent_id)
                        logging.info("SQL agent deleted successfully")

                        # Close the client if it has a close method
                        if hasattr(cls._sql_agent["client"], "close"):
                            cls._sql_agent["client"].close()
                    else:
                        logging.warning("SQL agent client is None or invalid")
                except Exception as e:
                    logging.error(f"Error deleting SQL agent: {e}")
                    logging.exception("Detailed SQL agent deletion error")
                finally:
                    cls._sql_agent = None

            logging.info("Agent deletion process completed")

    @classmethod
    async def get_sql_agent(cls) -> dict:
        """
        Get or create a singleton SQLQueryGenerator AzureAIAgent instance.
        This agent is used to generate T-SQL queries from natural language input.
        """
        async with cls._lock:
            if cls._sql_agent is None:

                agent_instructions = config.SQL_SYSTEM_PROMPT or """
    You are an expert assistant in generating T-SQL queries based on user questions.
    Always use the following schema:
    1. Table: Clients (ClientId, Client, Email, Occupation, MaritalStatus, Dependents)
    2. Table: InvestmentGoals (ClientId, InvestmentGoal)
    3. Table: Assets (ClientId, AssetDate, Investment, ROI, Revenue, AssetType)
    4. Table: ClientSummaries (ClientId, ClientSummary)
    5. Table: InvestmentGoalsDetails (ClientId, InvestmentGoal, TargetAmount, Contribution)
    6. Table: Retirement (ClientId, StatusDate, RetirementGoalProgress, EducationGoalProgress)
    7. Table: ClientMeetings (ClientId, ConversationId, Title, StartTime, EndTime, Advisor, ClientEmail)

    Rules:
    - Always filter by ClientId = <provided>
    - Do not use client name for filtering
    - Assets table contains snapshots by date; do not sum values across dates
    - Use StartTime for time-based filtering (meetings)
    - For asset values: If the question is about "asset value", "total asset value", "portfolio value", or "AUM" → ALWAYS return the SUM of the latest investments (do not return individual rows). If the question is about "current asset value" or "current investment value" → return all latest investments without SUM.
    - For trend queries: If the question contains "how did change", "over the last", "trend", or "progression" → return time series data for the requested period with SUM for each time period and show chronological progression.
    - Only return the raw T-SQL query. No explanations or comments.
    """

                project_client = AIProjectClient(
                    endpoint=config.AI_PROJECT_ENDPOINT,
                    credential=get_azure_credential(config.MID_ID),
                    api_version="2025-05-01",
                )

                agent = project_client.agents.create_agent(
                    model=config.AZURE_OPENAI_MODEL,
                    instructions=agent_instructions,
                    name="SQLQueryGeneratorAgent",
                )

                cls._sql_agent = {"agent": agent, "client": project_client}
        return cls._sql_agent
