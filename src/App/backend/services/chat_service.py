import logging
from quart import current_app
from semantic_kernel.agents import AzureAIAgent, AzureAIAgentThread
from semantic_kernel.contents.chat_message_content import ChatMessageContent
from semantic_kernel.contents.utils.author_role import AuthorRole

from backend.agents.agent_factory import AgentFactory
from backend.common.config import config
from backend.services.sqldb_service import get_client_name_from_db

async def ensure_agents(app):
    """Ensure both agents are initialized on demand."""
    if not hasattr(app, "wealth_advisor_agent") or app.wealth_advisor_agent is None:
        app.wealth_advisor_agent = await AgentFactory.get_wealth_advisor_agent()
        logging.info("Wealth Advisor Agent initialized on demand")
    if not hasattr(app, "search_agent") or app.search_agent is None:
        app.search_agent = await AgentFactory.get_search_agent()
        logging.info("Search Agent initialized on demand")

async def delete_agents(app):
    """Delete both agents after use."""
    await AgentFactory.delete_all_agent_instance()
    app.wealth_advisor_agent = None
    app.search_agent = None

async def stream_response_from_wealth_assistant(query: str, client_id: str):
    """
    Streams real-time chat response from the Wealth Assistant.
    Uses Semantic Kernel agent with SQL and Azure Cognitive Search based on the client ID.
    """
    thread = None
    try:
        # Dynamically get the name from the database
        selected_client_name = get_client_name_from_db(client_id)

        # Prepare fallback instructions with the single-line prompt
        additional_instructions = config.STREAM_TEXT_SYSTEM_PROMPT
        if not additional_instructions:
            additional_instructions = (
                "The currently selected client's name is '{SelectedClientName}'. Treat any case-insensitive or partial mention as referring to this client."
                "If the user mentions no name, assume they are asking about '{SelectedClientName}'."
                "If the user references a name that clearly differs from '{SelectedClientName}' or comparing with other clients, respond only with: 'Please only ask questions about the selected client or select another client.' Otherwise, provide thorough answers for every question using only data from SQL or call transcripts."
                "If no data is found, respond with 'No data found for that client.' Remove any client identifiers from the final response."
                "Always send clientId as '{client_id}'."
            )

        # Replace client name and client id in the additional instructions
        additional_instructions = additional_instructions.replace(
            "{SelectedClientName}", selected_client_name
        )
        additional_instructions = additional_instructions.replace(
            "{client_id}", client_id
        )

        # Lazy agent initialization
        await ensure_agents(current_app)
        agent: AzureAIAgent = current_app.wealth_advisor_agent

        message = ChatMessageContent(role=AuthorRole.USER, content=query)
        sk_response = agent.invoke_stream(
            messages=[message],
            thread=None,
            additional_instructions=additional_instructions,
        )

        async def generate():
            nonlocal thread
            try:
                # yields deltaText strings one-by-one
                async for chunk in sk_response:
                    if not chunk or not chunk.content:
                        continue
                    thread = chunk.thread if hasattr(chunk, "thread") else None
                    yield chunk.content  # just the deltaText
            finally:
                if thread:
                    await thread.delete()
                # Delete agents after operation
                await delete_agents(current_app)

        return generate
    except Exception as e:
        if thread:
            await thread.delete()
        await delete_agents(current_app)
        raise e