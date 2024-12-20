from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from azure.cosmos import exceptions
from backend.history.cosmosdbservice import CosmosConversationClient


# Helper function to create an async iterable
class AsyncIterator:
    def __init__(self, items):
        self.items = items
        self.index = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.index < len(self.items):
            item = self.items[self.index]
            self.index += 1
            return item
        else:
            raise StopAsyncIteration


@pytest.fixture
def cosmos_client():
    return CosmosConversationClient(
        cosmosdb_endpoint="https://fake.endpoint",
        credential="fake_credential",
        database_name="test_db",
        container_name="test_container",
    )


@pytest.mark.asyncio
async def test_init_invalid_credentials():
    with patch(
        "azure.cosmos.aio.CosmosClient.__init__",
        side_effect=exceptions.CosmosHttpResponseError(
            status_code=401, message="Unauthorized"
        ),
    ):
        with pytest.raises(ValueError, match="Invalid credentials"):
            CosmosConversationClient(
                cosmosdb_endpoint="https://fake.endpoint",
                credential="fake_credential",
                database_name="test_db",
                container_name="test_container",
            )


@pytest.mark.asyncio
async def test_init_invalid_endpoint():
    with patch(
        "azure.cosmos.aio.CosmosClient.__init__",
        side_effect=exceptions.CosmosHttpResponseError(
            status_code=404, message="Not Found"
        ),
    ):
        with pytest.raises(ValueError, match="Invalid CosmosDB endpoint"):
            CosmosConversationClient(
                cosmosdb_endpoint="https://fake.endpoint",
                credential="fake_credential",
                database_name="test_db",
                container_name="test_container",
            )


@pytest.mark.asyncio
async def test_ensure_success(cosmos_client):
    cosmos_client.database_client.read = AsyncMock()
    cosmos_client.container_client.read = AsyncMock()
    success, message = await cosmos_client.ensure()
    assert success
    assert message == "CosmosDB client initialized successfully"


@pytest.mark.asyncio
async def test_ensure_failure(cosmos_client):
    cosmos_client.database_client.read = AsyncMock(side_effect=Exception)
    success, message = await cosmos_client.ensure()
    assert not success
    assert "CosmosDB database" in message


@pytest.mark.asyncio
async def test_create_conversation(cosmos_client):
    cosmos_client.container_client.upsert_item = AsyncMock(return_value={"id": "123"})
    response = await cosmos_client.create_conversation("user_1", "Test Conversation")
    assert response["id"] == "123"


@pytest.mark.asyncio
async def test_create_conversation_failure(cosmos_client):
    cosmos_client.container_client.upsert_item = AsyncMock(return_value=None)
    response = await cosmos_client.create_conversation("user_1", "Test Conversation")
    assert not response


@pytest.mark.asyncio
async def test_upsert_conversation(cosmos_client):
    cosmos_client.container_client.upsert_item = AsyncMock(return_value={"id": "123"})
    response = await cosmos_client.upsert_conversation({"id": "123"})
    assert response["id"] == "123"


@pytest.mark.asyncio
async def test_delete_conversation(cosmos_client):
    cosmos_client.container_client.read_item = AsyncMock(return_value={"id": "123"})
    cosmos_client.container_client.delete_item = AsyncMock(return_value=True)
    response = await cosmos_client.delete_conversation("user_1", "123")
    assert response


@pytest.mark.asyncio
async def test_delete_conversation_not_found(cosmos_client):
    cosmos_client.container_client.read_item = AsyncMock(return_value=None)
    response = await cosmos_client.delete_conversation("user_1", "123")
    assert response


@pytest.mark.asyncio
async def test_delete_messages(cosmos_client):
    cosmos_client.get_messages = AsyncMock(
        return_value=[{"id": "msg_1"}, {"id": "msg_2"}]
    )
    cosmos_client.container_client.delete_item = AsyncMock(return_value=True)
    response = await cosmos_client.delete_messages("conv_1", "user_1")
    assert len(response) == 2


@pytest.mark.asyncio
async def test_get_conversations(cosmos_client):
    items = [{"id": "conv_1"}, {"id": "conv_2"}]
    cosmos_client.container_client.query_items = MagicMock(
        return_value=AsyncIterator(items)
    )
    response = await cosmos_client.get_conversations("user_1", 10)
    assert len(response) == 2
    assert response[0]["id"] == "conv_1"
    assert response[1]["id"] == "conv_2"


@pytest.mark.asyncio
async def test_get_conversation(cosmos_client):
    items = [{"id": "conv_1"}]
    cosmos_client.container_client.query_items = MagicMock(
        return_value=AsyncIterator(items)
    )
    response = await cosmos_client.get_conversation("user_1", "conv_1")
    assert response["id"] == "conv_1"


@pytest.mark.asyncio
async def test_create_message(cosmos_client):
    cosmos_client.container_client.upsert_item = AsyncMock(return_value={"id": "msg_1"})
    cosmos_client.get_conversation = AsyncMock(return_value={"id": "conv_1"})
    cosmos_client.upsert_conversation = AsyncMock()
    response = await cosmos_client.create_message(
        "msg_1", "conv_1", "user_1", {"role": "user", "content": "Hello"}
    )
    assert response["id"] == "msg_1"


@pytest.mark.asyncio
async def test_update_message_feedback(cosmos_client):
    cosmos_client.container_client.read_item = AsyncMock(return_value={"id": "msg_1"})
    cosmos_client.container_client.upsert_item = AsyncMock(return_value={"id": "msg_1"})
    response = await cosmos_client.update_message_feedback(
        "user_1", "msg_1", "positive"
    )
    assert response["id"] == "msg_1"


@pytest.mark.asyncio
async def test_get_messages(cosmos_client):
    items = [{"id": "msg_1"}, {"id": "msg_2"}]
    cosmos_client.container_client.query_items = MagicMock(
        return_value=AsyncIterator(items)
    )
    response = await cosmos_client.get_messages("user_1", "conv_1")
    assert len(response) == 2
