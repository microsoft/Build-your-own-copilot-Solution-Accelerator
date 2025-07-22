"""
Factory module for creating and managing a singleton AzureAIAgent instance.

This module provides asynchronous methods to get or delete the singleton agent,
ensuring only one instance exists at a time. The agent is configured for Azure AI
and supports plugin integration.
"""

import asyncio
from typing import Optional

from azure.ai.projects import AIProjectClient
from azure.identity import DefaultAzureCredential as DefaultAzureCredentialSync
from azure.identity.aio import DefaultAzureCredential
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

    @classmethod
    async def get_wealth_advisor_agent(cls):
        """
        Get or create the singleton WealthAdvisor AzureAIAgent instance.
        """
        async with cls._lock:
            if cls._wealth_advisor_agent is None:
                ai_agent_settings = AzureAIAgentSettings()
                creds = DefaultAzureCredential()
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
                    credential=DefaultAzureCredentialSync(),
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
            if cls._wealth_advisor_agent is not None:
                await cls._wealth_advisor_agent.client.agents.delete_agent(
                    cls._wealth_advisor_agent.id
                )
                cls._wealth_advisor_agent = None

            if cls._search_agent is not None:
                cls._search_agent["client"].agents.delete_agent(
                    cls._search_agent["agent"].id
                )
                cls._search_agent["client"].close()
                cls._search_agent = None

    @classmethod
    async def get_sql_agent(cls) -> dict:
        """
        Get or create a singleton SQLQueryGenerator AzureAIAgent instance.
        This agent is used to generate T-SQL queries from natural language input.
        """
        async with cls._lock:
            if not hasattr(cls, "_sql_agent") or cls._sql_agent is None:

                agent_instructions = config.SQL_SYSTEM_PROMPT or config.SQL_AGENT_FALLBACK_PROMPT

                project_client = AIProjectClient(
                    endpoint=config.AI_PROJECT_ENDPOINT,
                    credential=DefaultAzureCredentialSync(),
                    api_version="2025-05-01",
                )

                agent = project_client.agents.create_agent(
                    model=config.AZURE_OPENAI_MODEL,
                    instructions=agent_instructions,
                    name="SQLQueryGeneratorAgent",
                )

                cls._sql_agent = {"agent": agent, "client": project_client}
        return cls._sql_agent
