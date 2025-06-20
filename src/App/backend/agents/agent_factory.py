"""
Factory module for creating and managing a singleton AzureAIAgent instance.

This module provides asynchronous methods to get or delete the singleton agent,
ensuring only one instance exists at a time. The agent is configured for Azure AI
and supports plugin integration.
"""

import asyncio

from azure.identity.aio import DefaultAzureCredential
from semantic_kernel.agents import AzureAIAgent, AzureAIAgentSettings

from backend.plugins.chat_with_data_plugin import ChatWithDataPlugin


class AgentFactory:
    """
    Singleton factory for creating and managing an AzureAIAgent instance.
    """

    _instance = None
    _lock = asyncio.Lock()

    @classmethod
    async def get_instance(cls):
        """
        Get or create the singleton AzureAIAgent instance.
        """
        async with cls._lock:
            if cls._instance is None:
                ai_agent_settings = AzureAIAgentSettings()
                creds = DefaultAzureCredential()
                client = AzureAIAgent.create_client(
                    credential=creds, endpoint=ai_agent_settings.endpoint
                )

                agent_name = "WealthAdvisor"
                agent_instructions = "You are a helpful assistant to a Wealth Advisor."

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
                cls._instance = agent
        return cls._instance

    @classmethod
    async def delete_instance(cls):
        """
        Delete the singleton AzureAIAgent instance if it exists.
        Also deletes all threads in ChatService.thread_cache.
        """
        async with cls._lock:
            if cls._instance is not None:
                await cls._instance.client.agents.delete_agent(cls._instance.id)
                cls._instance = None
