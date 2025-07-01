from quart import current_app
from semantic_kernel.agents import AzureAIAgent, AzureAIAgentThread
from semantic_kernel.contents.chat_message_content import ChatMessageContent
from semantic_kernel.contents.utils.author_role import AuthorRole

from backend.common.config import config
from backend.services.sqldb_service import get_client_name_from_db


async def stream_response_from_wealth_assistant(query: str, client_id: str):
    """
    Streams real-time chat response from the Wealth Assistant.
    Uses Semantic Kernel agent with SQL and Azure Cognitive Search based on the client ID.
    """
    try:
        # Dynamically get the name from the database
        selected_client_name = get_client_name_from_db(
            client_id
        )  # Optionally fetch from DB

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

        agent: AzureAIAgent = current_app.wealth_advisor_agent

        thread: AzureAIAgentThread = None
        message = ChatMessageContent(role=AuthorRole.USER, content=query)
        sk_response = agent.invoke_stream(
            messages=[message],
            thread=thread,
            additional_instructions=additional_instructions,
        )

        async def generate():
            try:
                # yields deltaText strings one-by-one
                async for chunk in sk_response:
                    if not chunk or not chunk.content:
                        continue
                    yield chunk.content  # just the deltaText
            finally:
                thread = chunk.thread if chunk else None
                await thread.delete() if thread else None

        return generate
    except Exception as e:
        await thread.delete() if thread else None
        raise e
