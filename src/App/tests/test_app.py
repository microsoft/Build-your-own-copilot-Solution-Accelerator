import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from quart import Response
from app import (create_app, delete_all_conversations, generate_title,
                 init_cosmosdb_client, init_openai_client, stream_chat_request)

# Constants for testing
INVALID_API_VERSION = "2022-01-01"
INVALID_API_KEY = None
CHAT_HISTORY_ENABLED = True
AZURE_COSMOSDB_ACCOUNT = "test_account"
AZURE_COSMOSDB_ACCOUNT_KEY = "test_key"
AZURE_COSMOSDB_DATABASE = "test_database"
AZURE_COSMOSDB_CONVERSATIONS_CONTAINER = "test_container"
AZURE_COSMOSDB_ENABLE_FEEDBACK = True


@pytest.fixture(autouse=True)
def set_env_vars():
    with patch("app.AZURE_OPENAI_PREVIEW_API_VERSION", "2024-02-15-preview"), patch(
        "app.AZURE_OPENAI_ENDPOINT", "https://example.com/"
    ), patch("app.AZURE_OPENAI_MODEL", "openai_model"), patch(
        "app.CHAT_HISTORY_ENABLED", True
    ), patch(
        "app.AZURE_COSMOSDB_ACCOUNT", "test_account"
    ), patch(
        "app.AZURE_COSMOSDB_ACCOUNT_KEY", "test_key"
    ), patch(
        "app.AZURE_COSMOSDB_DATABASE", "test_database"
    ), patch(
        "app.AZURE_COSMOSDB_CONVERSATIONS_CONTAINER", "test_container"
    ), patch(
        "app.AZURE_COSMOSDB_ENABLE_FEEDBACK", True
    ), patch(
        "app.AZURE_OPENAI_KEY", "valid_key"
    ):
        yield


@pytest.fixture
def app():
    """Create a test client for the app."""
    return create_app()


@pytest.fixture
def client(app):
    """Create a test client for the app."""
    return app.test_client()


def test_create_app():
    app = create_app()
    assert app is not None
    assert app.name == "app"
    assert "routes" in app.blueprints


@patch("app.get_bearer_token_provider")
@patch("app.AsyncAzureOpenAI")
def test_init_openai_client(mock_async_openai, mock_token_provider):
    mock_token_provider.return_value = MagicMock()
    mock_async_openai.return_value = MagicMock()

    client = init_openai_client()
    assert client is not None
    mock_async_openai.assert_called_once()


@patch("app.CosmosConversationClient")
def test_init_cosmosdb_client(mock_cosmos_client):
    mock_cosmos_client.return_value = MagicMock()

    client = init_cosmosdb_client()
    assert client is not None
    mock_cosmos_client.assert_called_once()


@pytest.mark.asyncio
@patch("app.render_template")
async def test_index(mock_render_template, client):
    mock_render_template.return_value = "index"
    response = await client.get("/")
    assert response.status_code == 200
    mock_render_template.assert_called_once_with(
        "index.html", title="Woodgrove Bank", favicon="/favicon.ico"
    )


@pytest.mark.asyncio
@patch("app.bp.send_static_file")
async def test_favicon(mock_send_static_file, client):
    mock_send_static_file.return_value = "favicon"
    response = await client.get("/favicon.ico")
    assert response.status_code == 200
    mock_send_static_file.assert_called_once_with("favicon.ico")


# @pytest.mark.asyncio
# async def test_get_pbiurl(client):
#     with patch("app.VITE_POWERBI_EMBED_URL", "mocked_url"):
#         response = await client.get("/api/pbi")
#         res_text = await response.get_data(as_text=True)
#         assert response.status_code == 200
#         assert res_text == "mocked_url"


@pytest.mark.asyncio
async def test_ensure_cosmos_not_configured(client):
    with patch("app.AZURE_COSMOSDB_ACCOUNT", ""):
        response = await client.get("/history/ensure")
        res_text = await response.get_data(as_text=True)
        assert response.status_code == 404
        assert json.loads(res_text) == {"error": "CosmosDB is not configured"}


@pytest.mark.asyncio
@patch("app.init_cosmosdb_client")
async def test_ensure_cosmos_success(mock_init_cosmosdb_client, client):
    mock_client = AsyncMock()
    mock_client.ensure.return_value = (True, None)
    mock_init_cosmosdb_client.return_value = mock_client

    response = await client.get("/history/ensure")
    res_text = await response.get_data(as_text=True)
    assert response.status_code == 200
    assert json.loads(res_text) == {"message": "CosmosDB is configured and working"}
    mock_client.cosmosdb_client.close.assert_called_once()


@pytest.mark.asyncio
@patch("app.init_cosmosdb_client")
async def test_ensure_cosmos_failure(mock_init_cosmosdb_client, client):
    mock_client = AsyncMock()
    mock_client.ensure.return_value = (False, "Some error")
    mock_init_cosmosdb_client.return_value = mock_client

    response = await client.get("/history/ensure")
    res_text = await response.get_data(as_text=True)
    assert response.status_code == 422
    assert json.loads(res_text) == {"error": "Some error"}


@pytest.mark.asyncio
@patch("app.init_cosmosdb_client")
async def test_ensure_cosmos_exception(mock_init_cosmosdb_client, client):
    mock_init_cosmosdb_client.side_effect = Exception("Invalid credentials")

    response = await client.get("/history/ensure")
    assert response.status_code == 401
    res_text = await response.get_data(as_text=True)
    assert json.loads(res_text) == {"error": "Invalid credentials"}


@pytest.mark.asyncio
@patch("app.init_cosmosdb_client")
async def test_ensure_cosmos_invalid_db_name(mock_init_cosmosdb_client, client):
    with patch("app.AZURE_COSMOSDB_DATABASE", "your_db_name"), patch(
        "app.AZURE_COSMOSDB_ACCOUNT", "your_account"
    ):
        mock_init_cosmosdb_client.side_effect = Exception(
            "Invalid CosmosDB database name"
        )

        response = await client.get("/history/ensure")
        assert response.status_code == 422
        res_text = await response.get_data(as_text=True)
        assert json.loads(res_text) == {
            "error": "Invalid CosmosDB database name your_db_name for account your_account"
        }


@pytest.mark.asyncio
@patch("app.init_cosmosdb_client")
async def test_ensure_cosmos_invalid_container_name(mock_init_cosmosdb_client, client):
    with patch("app.AZURE_COSMOSDB_CONVERSATIONS_CONTAINER", "your_container_name"):
        mock_init_cosmosdb_client.side_effect = Exception(
            "Invalid CosmosDB container name"
        )

        response = await client.get("/history/ensure")
        assert response.status_code == 422
        res_text = await response.get_data(as_text=True)
        assert json.loads(res_text) == {
            "error": "Invalid CosmosDB container name: your_container_name"
        }


@pytest.mark.asyncio
@patch("app.init_cosmosdb_client")
async def test_ensure_cosmos_generic_exception(mock_init_cosmosdb_client, client):
    mock_init_cosmosdb_client.side_effect = Exception("Some other error")

    response = await client.get("/history/ensure")
    assert response.status_code == 500
    res_text = await response.get_data(as_text=True)
    assert json.loads(res_text) == {"error": "CosmosDB is not working"}


@pytest.mark.asyncio
@patch("app.get_connection")
@patch("app.dict_cursor")
async def test_get_users_success(mock_dict_cursor, mock_get_connection, client):
    # Mock database connection and cursor
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_get_connection.return_value = mock_conn
    mock_conn.cursor.return_value = mock_cursor

    # Mock query results
    mock_dict_cursor.side_effect = [
        [  # First call (client data)
            {
                "ClientId": 1,
                "Client": "Client A",
                "Email": "clienta@example.com",
                "AssetValue": "1,000,000",
                "ClientSummary": "Summary A",
                "LastMeetingDateFormatted": "Monday January 1, 2023",
                "LastMeetingStartTime": "10:00 AM",
                "LastMeetingEndTime": "10:30 AM",
                "NextMeetingFormatted": "Monday January 8, 2023",
                "NextMeetingStartTime": "11:00 AM",
                "NextMeetingEndTime": "11:30 AM",
            }
        ],
        [  # Second call (date difference query)
            {
                "ClientMeetingDaysDifference": 5,
                "AssetMonthsDifference": 1,
                "StatusMonthsDifference": 1
            }
        ]
    ]

    # Call the function
    response = await client.get("/api/users")
    assert response.status_code == 200
    res_text = await response.get_data(as_text=True)
    assert json.loads(res_text) == [
        {
            "ClientId": 1,
            "ClientName": "Client A",
            "ClientEmail": "clienta@example.com",
            "AssetValue": "1,000,000",
            "NextMeeting": "Monday January 8, 2023",
            "NextMeetingTime": "11:00 AM",
            "NextMeetingEndTime": "11:30 AM",
            "LastMeeting": "Monday January 1, 2023",
            "LastMeetingStartTime": "10:00 AM",
            "LastMeetingEndTime": "10:30 AM",
            "ClientSummary": "Summary A",
        }
    ]


@pytest.mark.asyncio
async def test_get_users_no_users(client):
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.fetchall.return_value = []

    with patch("app.get_connection", return_value=mock_conn):
        response = await client.get("/api/users")
        assert response.status_code == 200
        res_text = await response.get_data(as_text=True)
        assert json.loads(res_text) == []


@pytest.mark.asyncio
async def test_get_users_sql_execution_failure(client):
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.execute.side_effect = Exception("SQL execution failed")

    with patch("app.get_connection", return_value=mock_conn):
        response = await client.get("/api/users")
        assert response.status_code == 500
        res_text = await response.get_data(as_text=True)
        assert "SQL execution failed" in res_text


@pytest.fixture
def mock_request_headers():
    return {"Authorization": "Bearer test_token"}


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_clear_messages_success(
    mock_init_cosmosdb_client,
    mock_get_authenticated_user_details,
    mock_request_headers,
    client,
):
    # Mocking user details
    mock_get_authenticated_user_details.return_value = {"user_principal_id": "user123"}

    # Mocking CosmosDB client
    mock_cosmos_client = MagicMock()
    mock_cosmos_client.delete_messages = AsyncMock(return_value=None)
    mock_init_cosmosdb_client.return_value = mock_cosmos_client

    async with create_app().test_request_context(
        "/history/clear", method="POST", headers=mock_request_headers
    ):
        response = await client.post(
            "/history/clear", json={"conversation_id": "12345"}
        )
        assert response.status_code == 200
        assert await response.get_json() == {
            "message": "Successfully deleted messages in conversation",
            "conversation_id": "12345",
        }


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_clear_messages_missing_conversation_id(
    mock_init_cosmosdb_client,
    mock_get_authenticated_user_details,
    mock_request_headers,
    client,
):
    # Mocking user details
    mock_get_authenticated_user_details.return_value = {"user_principal_id": "user123"}

    async with create_app().test_request_context(
        "/history/clear", method="POST", headers=mock_request_headers
    ):
        response = await client.post("/history/clear", json={})
        assert response.status_code == 400
        assert await response.get_json() == {"error": "conversation_id is required"}


@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
@pytest.mark.asyncio
async def test_clear_messages_cosmos_not_configured(
    mock_init_cosmosdb_client,
    mock_get_authenticated_user_details,
    mock_request_headers,
    client,
):
    # Mocking user details
    mock_get_authenticated_user_details.return_value = {"user_principal_id": "user123"}

    # Mocking CosmosDB client to return None
    mock_init_cosmosdb_client.return_value = None

    async with create_app().test_request_context(
        "/history/clear", method="POST", headers=mock_request_headers
    ):
        response = await client.post(
            "/history/clear", json={"conversation_id": "12345"}
        )
        assert response.status_code == 500
        res_text = await response.get_data(as_text=True)
        assert "CosmosDB is not configured or not working" in res_text


@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
@pytest.mark.asyncio
async def test_clear_messages_exception(
    mock_init_cosmosdb_client,
    mock_get_authenticated_user_details,
    mock_request_headers,
    client,
):
    # Mocking user details
    mock_get_authenticated_user_details.return_value = {"user_principal_id": "user123"}

    # Mocking CosmosDB client to raise an exception
    mock_cosmos_client = MagicMock()
    mock_cosmos_client.delete_messages = AsyncMock(side_effect=Exception("Some error"))
    mock_init_cosmosdb_client.return_value = mock_cosmos_client

    async with create_app().test_request_context(
        "/history/clear", method="POST", headers=mock_request_headers
    ):
        response = await client.post(
            "/history/clear", json={"conversation_id": "12345"}
        )
        assert response.status_code == 500
        res_text = await response.get_data(as_text=True)
        assert "Some error" in res_text


@pytest.fixture
def mock_cosmos_conversation_client():
    client = MagicMock()
    client.get_conversations = AsyncMock()
    client.delete_messages = AsyncMock()
    client.delete_conversation = AsyncMock()
    client.cosmosdb_client.close = AsyncMock()
    return client


@pytest.fixture
def mock_authenticated_user():
    return {"user_principal_id": "test_user_id"}


@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
@pytest.mark.asyncio
async def test_delete_all_conversations_success(
    mock_init_cosmosdb_client,
    mock_get_authenticated_user_details,
    mock_request_headers,
    mock_authenticated_user,
    mock_cosmos_conversation_client,
):
    mock_get_authenticated_user_details.return_value = mock_authenticated_user
    mock_init_cosmosdb_client.return_value = mock_cosmos_conversation_client
    mock_cosmos_conversation_client.get_conversations.return_value = [
        {"id": "conv1"},
        {"id": "conv2"},
    ]

    async with create_app().test_request_context(
        "/history/delete_all", method="DELETE", headers=mock_request_headers
    ):
        response, status_code = await delete_all_conversations()
        response_json = await response.get_json()

    assert status_code == 200
    assert response_json == {
        "message": "Successfully deleted conversation and messages for user test_user_id"
    }
    mock_cosmos_conversation_client.get_conversations.assert_called_once_with(
        "test_user_id", offset=0, limit=None
    )
    mock_cosmos_conversation_client.delete_messages.assert_any_await(
        "conv1", "test_user_id"
    )
    mock_cosmos_conversation_client.delete_messages.assert_any_await(
        "conv2", "test_user_id"
    )
    mock_cosmos_conversation_client.delete_conversation.assert_any_await(
        "test_user_id", "conv1"
    )
    mock_cosmos_conversation_client.delete_conversation.assert_any_await(
        "test_user_id", "conv2"
    )
    mock_cosmos_conversation_client.cosmosdb_client.close.assert_awaited_once()


@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
@pytest.mark.asyncio
async def test_delete_all_conversations_no_conversations(
    mock_init_cosmosdb_client,
    mock_get_authenticated_user_details,
    mock_request_headers,
    mock_authenticated_user,
    mock_cosmos_conversation_client,
):
    mock_get_authenticated_user_details.return_value = mock_authenticated_user
    mock_init_cosmosdb_client.return_value = mock_cosmos_conversation_client
    mock_cosmos_conversation_client.get_conversations.return_value = []

    async with create_app().test_request_context(
        "/history/delete_all", method="DELETE", headers=mock_request_headers
    ):
        response, status_code = await delete_all_conversations()
        response_json = await response.get_json()

    assert status_code == 404
    assert response_json == {"error": "No conversations for test_user_id were found"}
    mock_cosmos_conversation_client.get_conversations.assert_called_once_with(
        "test_user_id", offset=0, limit=None
    )
    mock_cosmos_conversation_client.delete_messages.assert_not_called()
    mock_cosmos_conversation_client.delete_conversation.assert_not_called()


@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
@pytest.mark.asyncio
async def test_delete_all_conversations_cosmos_not_configured(
    mock_init_cosmosdb_client,
    mock_get_authenticated_user_details,
    mock_request_headers,
    mock_authenticated_user,
):
    mock_get_authenticated_user_details.return_value = mock_authenticated_user
    mock_init_cosmosdb_client.return_value = None

    async with create_app().test_request_context(
        "/history/delete_all", method="DELETE", headers=mock_request_headers
    ):
        response, status_code = await delete_all_conversations()
        response_json = await response.get_json()

    assert status_code == 500
    assert response_json == {"error": "CosmosDB is not configured or not working"}
    mock_init_cosmosdb_client.assert_called_once()


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_rename_conversation(
    mock_init_cosmosdb_client,
    mock_get_authenticated_user_details,
    mock_request_headers,
    client,
):

    # Mocking authenticated user details
    mock_get_authenticated_user_details.return_value = {"user_principal_id": "user_123"}

    # Mocking CosmosDB client and its methods
    mock_cosmos_conversation_client = AsyncMock()
    mock_cosmos_conversation_client.get_conversation = AsyncMock(
        return_value={"id": "123", "title": "Old Title"}
    )
    mock_cosmos_conversation_client.upsert_conversation = AsyncMock(
        return_value={"id": "123", "title": "New Title"}
    )
    mock_init_cosmosdb_client.return_value = mock_cosmos_conversation_client

    async with create_app().test_request_context(
        "/history/rename", method="POST", headers=mock_request_headers
    ):
        response = await client.post(
            "/history/rename", json={"conversation_id": "123", "title": "New Title"}
        )
        response_json = await response.get_json()

    # Assertions
    assert response.status_code == 200
    assert response_json == {"id": "123", "title": "New Title"}

    # Ensure the CosmosDB client methods were called correctly
    mock_cosmos_conversation_client.get_conversation.assert_called_once_with(
        "user_123", "123"
    )
    mock_cosmos_conversation_client.upsert_conversation.assert_called_once_with(
        {"id": "123", "title": "New Title"}
    )
    mock_cosmos_conversation_client.cosmosdb_client.close.assert_called_once()


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
async def test_rename_conversation_missing_conversation_id(
    mock_get_authenticated_user_details, mock_request_headers, client
):
    async with create_app().test_request_context(
        "/history/rename", method="POST", headers=mock_request_headers
    ):
        response = await client.post("/history/rename", json={"title": "New Title"})
        response_json = await response.get_json()

    assert response.status_code == 400
    assert response_json == {"error": "conversation_id is required"}


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_rename_conversation_missing_title(
    mock_init_cosmosdb_client,
    mock_get_authenticated_user_details,
    mock_request_headers,
    client,
):
    # Mocking authenticated user details
    mock_get_authenticated_user_details.return_value = {"user_principal_id": "user123"}

    # Mocking CosmosDB client and its methods
    mock_cosmos_client = MagicMock()
    mock_cosmos_client.get_conversation = AsyncMock(
        return_value={"id": "123", "title": "Old Title"}
    )
    mock_cosmos_client.upsert_conversation = AsyncMock(
        return_value={"id": "123", "title": "New Title"}
    )
    mock_init_cosmosdb_client.return_value = mock_cosmos_client

    async with create_app().test_request_context(
        "/history/rename", method="POST", headers=mock_request_headers
    ):
        response = await client.post("/history/rename", json={"conversation_id": "123"})
        response_json = await response.get_json()

    assert response.status_code == 400
    assert response_json == {"error": "title is required"}


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_rename_conversation_not_found(
    mock_init_cosmosdb_client,
    mock_get_authenticated_user_details,
    mock_request_headers,
    client,
):
    mock_get_authenticated_user_details.return_value = {"user_principal_id": "user123"}

    mock_cosmos_client = MagicMock()
    mock_cosmos_client.get_conversation = AsyncMock(return_value=None)
    mock_init_cosmosdb_client.return_value = mock_cosmos_client

    async with create_app().test_request_context(
        "/history/rename", method="POST", headers=mock_request_headers
    ):
        response = await client.post(
            "/history/rename", json={"conversation_id": "123", "title": "New Title"}
        )
        response_json = await response.get_json()

    assert response.status_code == 404
    assert response_json == {
        "error": "Conversation 123 was not found. It either does not exist or the logged in user does not have access to it."
    }


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_get_conversation_success(
    mock_init_cosmosdb_client,
    mock_get_authenticated_user_details,
    mock_request_headers,
    client,
):
    # Mocking the authenticated user details
    mock_get_authenticated_user_details.return_value = {"user_principal_id": "user123"}

    # Mocking the CosmosDB client and its methods
    mock_cosmos_client = AsyncMock()
    mock_cosmos_client.get_conversation.return_value = {"id": "12345"}
    mock_cosmos_client.get_messages.return_value = [
        {
            "id": "msg1",
            "role": "user",
            "content": "Hello",
            "createdAt": "2024-10-01T00:00:00Z",
        }
    ]
    mock_init_cosmosdb_client.return_value = mock_cosmos_client

    async with create_app().test_request_context(
        "/history/read", method="POST", headers=mock_request_headers
    ):
        response = await client.post("/history/read", json={"conversation_id": "12345"})
        response_json = await response.get_json()

    assert response.status_code == 200
    assert response_json == {
        "conversation_id": "12345",
        "messages": [
            {
                "id": "msg1",
                "role": "user",
                "content": "Hello",
                "createdAt": "2024-10-01T00:00:00Z",
                "feedback": None,
            }
        ],
    }


@pytest.mark.asyncio
async def test_get_conversation_missing_conversation_id(
    mock_request_headers,
    client,
):
    async with create_app().test_request_context(
        "/history/read", method="POST", headers=mock_request_headers
    ):
        response = await client.post("/history/read", json={})
        response_json = await response.get_json()

    assert response.status_code == 400
    assert response_json == {"error": "conversation_id is required"}


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_get_conversation_not_found(
    mock_init_cosmosdb_client,
    mock_get_authenticated_user_details,
    mock_request_headers,
    client,
):
    mock_get_authenticated_user_details.return_value = {"user_principal_id": "user123"}

    mock_cosmos_client = AsyncMock()
    mock_cosmos_client.get_conversation.return_value = None
    mock_init_cosmosdb_client.return_value = mock_cosmos_client

    async with create_app().test_request_context(
        "/history/read", method="POST", headers=mock_request_headers
    ):
        response = await client.post("/history/read", json={"conversation_id": "12345"})
        response_json = await response.get_json()

    assert response.status_code == 404
    assert response_json == {
        "error": "Conversation 12345 was not found. It either does not exist or the logged in user does not have access to it."
    }


@pytest.mark.asyncio
@patch("app.init_cosmosdb_client")
@patch("app.get_authenticated_user_details")
async def test_list_conversations_success(
    mock_get_user_details, mock_init_cosmosdb_client, client
):
    mock_get_user_details.return_value = {"user_principal_id": "test_user"}
    mock_cosmos_client = AsyncMock()
    mock_cosmos_client.get_conversations.return_value = [{"id": "1"}, {"id": "2"}]
    mock_init_cosmosdb_client.return_value = mock_cosmos_client

    response = await client.get("/history/list")
    assert response.status_code == 200
    assert await response.get_json() == [{"id": "1"}, {"id": "2"}]


@pytest.mark.asyncio
@patch("app.init_cosmosdb_client")
@patch("app.get_authenticated_user_details")
async def test_list_conversations_no_cosmos_client(
    mock_get_user_details, mock_init_cosmosdb_client, client
):
    mock_get_user_details.return_value = {"user_principal_id": "test_user"}
    mock_init_cosmosdb_client.return_value = None

    response = await client.get("/history/list")
    assert response.status_code == 500


@pytest.mark.asyncio
@patch("app.init_cosmosdb_client")
@patch("app.get_authenticated_user_details")
async def test_list_conversations_no_conversations(
    mock_get_user_details, mock_init_cosmosdb_client, client
):
    mock_get_user_details.return_value = {"user_principal_id": "test_user"}
    mock_cosmos_client = AsyncMock()
    mock_cosmos_client.get_conversations.return_value = None
    mock_init_cosmosdb_client.return_value = mock_cosmos_client

    response = await client.get("/history/list")
    assert response.status_code == 404
    assert await response.get_json() == {
        "error": "No conversations for test_user were found"
    }


@pytest.mark.asyncio
@patch("app.init_cosmosdb_client")
@patch("app.get_authenticated_user_details")
async def test_list_conversations_invalid_response(
    mock_get_user_details, mock_init_cosmosdb_client, client
):
    mock_get_user_details.return_value = {"user_principal_id": "test_user"}
    mock_cosmos_client = AsyncMock()
    mock_cosmos_client.get_conversations.return_value = None
    mock_init_cosmosdb_client.return_value = mock_cosmos_client

    response = await client.get("/history/list")
    assert response.status_code == 404
    assert await response.get_json() == {
        "error": "No conversations for test_user were found"
    }


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_delete_conversation_success(
    mock_init_cosmosdb_client,
    mock_get_authenticated_user_details,
    mock_request_headers,
    client,
):
    # Mocking authenticated user details
    mock_get_authenticated_user_details.return_value = {"user_principal_id": "user123"}

    # Mocking CosmosDB client
    mock_cosmos_client = MagicMock()
    mock_cosmos_client.delete_messages = AsyncMock()
    mock_cosmos_client.delete_conversation = AsyncMock()
    mock_cosmos_client.cosmosdb_client.close = AsyncMock()
    mock_init_cosmosdb_client.return_value = mock_cosmos_client

    async with create_app().test_request_context(
        "/history/delete", method="DELETE", headers=mock_request_headers
    ):
        response = await client.delete(
            "/history/delete", json={"conversation_id": "12345"}
        )
        response_json = await response.get_json()

    assert response.status_code == 200
    assert response_json == {
        "message": "Successfully deleted conversation and messages",
        "conversation_id": "12345",
    }
    mock_cosmos_client.delete_messages.assert_called_once_with("12345", "user123")
    mock_cosmos_client.delete_conversation.assert_called_once_with("user123", "12345")
    mock_cosmos_client.cosmosdb_client.close.assert_called_once()


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
async def test_delete_conversation_missing_conversation_id(
    mock_get_authenticated_user_details,
    mock_request_headers,
    client,
):
    # Mocking authenticated user details
    mock_get_authenticated_user_details.return_value = {"user_principal_id": "user123"}

    async with create_app().test_request_context(
        "/history/delete", method="DELETE", headers=mock_request_headers
    ):
        response = await client.delete("/history/delete", json={})
        response_json = await response.get_json()

    assert response.status_code == 400
    assert response_json == {"error": "conversation_id is required"}


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_delete_conversation_cosmos_not_configured(
    mock_init_cosmosdb_client,
    mock_get_authenticated_user_details,
    mock_request_headers,
    client,
):
    # Mocking authenticated user details
    mock_get_authenticated_user_details.return_value = {"user_principal_id": "user123"}

    # Mocking CosmosDB client not being configured
    mock_init_cosmosdb_client.return_value = None

    async with create_app().test_request_context(
        "/history/delete", method="DELETE", headers=mock_request_headers
    ):
        response = await client.delete(
            "/history/delete", json={"conversation_id": "12345"}
        )
        response_json = await response.get_json()

    assert response.status_code == 500
    assert response_json == {"error": "CosmosDB is not configured or not working"}


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_delete_conversation_exception(
    mock_init_cosmosdb_client,
    mock_get_authenticated_user_details,
    mock_request_headers,
    client,
):
    # Mocking authenticated user details
    mock_get_authenticated_user_details.return_value = {"user_principal_id": "user123"}

    # Mocking CosmosDB client to raise an exception
    mock_cosmos_client = MagicMock()
    mock_cosmos_client.delete_messages = AsyncMock(
        side_effect=Exception("Test exception")
    )
    mock_init_cosmosdb_client.return_value = mock_cosmos_client

    async with create_app().test_request_context(
        "/history/delete", method="DELETE", headers=mock_request_headers
    ):
        response = await client.delete(
            "/history/delete", json={"conversation_id": "12345"}
        )
        response_json = await response.get_json()

    assert response.status_code == 500
    assert response_json == {"error": "Test exception"}


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_update_message_success(
    mock_init_cosmosdb_client, mock_get_authenticated_user_details, client
):
    mock_get_authenticated_user_details.return_value = {
        "user_principal_id": "test_user"
    }
    mock_cosmos_client = AsyncMock()
    mock_cosmos_client.update_message_feedback.return_value = True
    mock_init_cosmosdb_client.return_value = mock_cosmos_client

    response = await client.post(
        "/history/message_feedback",
        json={"message_id": "123", "message_feedback": "positive"},
    )

    assert response.status_code == 200
    assert await response.get_json() == {
        "message": "Successfully updated message with feedback positive",
        "message_id": "123",
    }


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_update_message_missing_message_id(
    mock_init_cosmosdb_client, mock_get_authenticated_user_details, client
):
    response = await client.post(
        "/history/message_feedback", json={"message_feedback": "positive"}
    )

    assert response.status_code == 400
    assert await response.get_json() == {"error": "message_id is required"}


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_update_message_missing_message_feedback(
    mock_init_cosmosdb_client, mock_get_authenticated_user_details, client
):
    response = await client.post(
        "/history/message_feedback", json={"message_id": "123"}
    )

    assert response.status_code == 400
    assert await response.get_json() == {"error": "message_feedback is required"}


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_update_message_not_found(
    mock_init_cosmosdb_client, mock_get_authenticated_user_details, client
):
    mock_get_authenticated_user_details.return_value = {
        "user_principal_id": "test_user"
    }
    mock_cosmos_client = AsyncMock()
    mock_cosmos_client.update_message_feedback.return_value = False
    mock_init_cosmosdb_client.return_value = mock_cosmos_client

    response = await client.post(
        "/history/message_feedback",
        json={"message_id": "123", "message_feedback": "positive"},
    )

    assert response.status_code == 404
    assert await response.get_json() == {
        "error": "Unable to update message 123. It either does not exist or the user does not have access to it."
    }


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_update_message_exception(
    mock_init_cosmosdb_client, mock_get_authenticated_user_details, client
):
    mock_get_authenticated_user_details.return_value = {
        "user_principal_id": "test_user"
    }
    mock_cosmos_client = AsyncMock()
    mock_cosmos_client.update_message_feedback.side_effect = Exception("Test exception")
    mock_init_cosmosdb_client.return_value = mock_cosmos_client

    response = await client.post(
        "/history/message_feedback",
        json={"message_id": "123", "message_feedback": "positive"},
    )

    assert response.status_code == 500
    assert await response.get_json() == {"error": "Test exception"}


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_update_conversation_success(
    mock_init_cosmosdb_client, mock_get_authenticated_user_details, client
):
    mock_get_authenticated_user_details.return_value = {
        "user_principal_id": "test_user_id"
    }
    mock_request_json = {
        "conversation_id": "test_conversation_id",
        "messages": [
            {"role": "tool", "content": "tool message"},
            {
                "role": "assistant",
                "id": "assistant_message_id",
                "content": "assistant message",
            },
        ],
    }

    mock_cosmos_client = AsyncMock()
    mock_init_cosmosdb_client.return_value = mock_cosmos_client

    response = await client.post("/history/update", json=mock_request_json)
    res_json = await response.get_json()
    assert response.status_code == 200
    assert res_json == {"success": True}
    mock_cosmos_client.create_message.assert_called()


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_update_conversation_no_conversation_id(
    mock_init_cosmosdb_client, mock_get_authenticated_user_details, client
):
    mock_get_authenticated_user_details.return_value = {
        "user_principal_id": "test_user_id"
    }
    mock_request_json = {
        "messages": [
            {"role": "tool", "content": "tool message"},
            {
                "role": "assistant",
                "id": "assistant_message_id",
                "content": "assistant message",
            },
        ]
    }

    response = await client.post("/history/update", json=mock_request_json)
    res_json = await response.get_json()
    assert response.status_code == 500
    assert "No conversation_id found" in res_json["error"]


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_update_conversation_no_bot_messages(
    mock_init_cosmosdb_client, mock_get_authenticated_user_details, client
):
    mock_get_authenticated_user_details.return_value = {
        "user_principal_id": "test_user_id"
    }
    mock_request_json = {
        "conversation_id": "test_conversation_id",
        "messages": [{"role": "user", "content": "user message"}],
    }
    response = await client.post("/history/update", json=mock_request_json)
    res_json = await response.get_json()
    assert response.status_code == 500
    assert "No bot messages found" in res_json["error"]


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_update_conversation_cosmos_not_configured(
    mock_init_cosmosdb_client, mock_get_authenticated_user_details, client
):
    mock_get_authenticated_user_details.return_value = {
        "user_principal_id": "test_user_id"
    }
    mock_request_json = {
        "conversation_id": "test_conversation_id",
        "messages": [
            {"role": "tool", "content": "tool message"},
            {
                "role": "assistant",
                "id": "assistant_message_id",
                "content": "assistant message",
            },
        ],
    }

    mock_init_cosmosdb_client.return_value = None
    response = await client.post("/history/update", json=mock_request_json)
    res_json = await response.get_json()
    assert response.status_code == 500
    assert "CosmosDB is not configured or not working" in res_json["error"]


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
@patch("app.generate_title")
@patch("app.conversation_internal")
async def test_add_conversation_success(
    mock_conversation_internal,
    mock_generate_title,
    mock_init_cosmosdb_client,
    mock_get_authenticated_user_details,
    client,
):
    mock_get_authenticated_user_details.return_value = {
        "user_principal_id": "test_user"
    }
    mock_generate_title.return_value = "Test Title"
    mock_cosmos_client = AsyncMock()
    mock_cosmos_client.create_conversation.return_value = {
        "id": "test_conversation_id",
        "createdAt": "2024-10-01T00:00:00Z",
    }
    mock_cosmos_client.create_message.return_value = "Message Created"
    mock_init_cosmosdb_client.return_value = mock_cosmos_client
    mock_conversation_internal.return_value = "Chat response"

    response = await client.post(
        "/history/generate", json={"messages": [{"role": "user", "content": "Hello"}]}
    )

    assert response.status_code == 200


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_add_conversation_no_cosmos_config(
    mock_init_cosmosdb_client, mock_get_authenticated_user_details, client
):
    mock_get_authenticated_user_details.return_value = {
        "user_principal_id": "test_user"
    }
    mock_init_cosmosdb_client.return_value = None

    response = await client.post(
        "/history/generate", json={"messages": [{"role": "user", "content": "Hello"}]}
    )
    response_json = await response.get_json()

    assert response.status_code == 500
    assert "CosmosDB is not configured or not working" in response_json["error"]


@pytest.mark.asyncio
@patch("app.get_authenticated_user_details")
@patch("app.init_cosmosdb_client")
async def test_add_conversation_conversation_not_found(
    mock_init_cosmosdb_client, mock_get_authenticated_user_details, client
):
    mock_get_authenticated_user_details.return_value = {
        "user_principal_id": "test_user"
    }
    mock_cosmos_client = AsyncMock()
    mock_cosmos_client.create_message.return_value = "Conversation not found"
    mock_init_cosmosdb_client.return_value = mock_cosmos_client

    response = await client.post(
        "/history/generate",
        json={
            "messages": [{"role": "user", "content": "Hello"}],
            "conversation_id": "invalid_id",
        },
    )
    response_json = await response.get_json()

    assert response.status_code == 500
    assert (
        "Conversation not found for the given conversation ID" in response_json["error"]
    )


@pytest.mark.asyncio
@patch("app.init_openai_client")
async def test_generate_title_success(mock_init_openai_client):
    mock_openai_client = AsyncMock()
    mock_openai_client.chat.completions.create.return_value = MagicMock(
        choices=[
            MagicMock(message=MagicMock(content=json.dumps({"title": "Test Title"})))
        ]
    )
    mock_init_openai_client.return_value = mock_openai_client

    conversation_messages = [{"role": "user", "content": "Hello"}]
    title = await generate_title(conversation_messages)
    assert title == "Test Title"


@pytest.mark.asyncio
@patch("app.init_openai_client")
async def test_generate_title_exception(mock_init_openai_client):
    mock_openai_client = AsyncMock()
    mock_openai_client.chat.completions.create.side_effect = Exception("API error")
    mock_init_openai_client.return_value = mock_openai_client

    conversation_messages = [{"role": "user", "content": "Hello"}]
    title = await generate_title(conversation_messages)
    assert title == "Hello"


@pytest.mark.asyncio
async def test_conversation_route(client):
    request_body = {
        "history_metadata": {},
        "client_id": "test_client",
        "messages": [{"content": "test query"}],
    }
    request_headers = {"apim-request-id": "test_id"}

    with patch("app.stream_chat_request", new_callable=AsyncMock) as mock_stream:
        mock_stream.return_value = ["chunk1", "chunk2"]
        with patch(
            "app.complete_chat_request", new_callable=AsyncMock
        ) as mock_complete:
            mock_complete.return_value = {"response": "test response"}
            response = await client.post(
                "/conversation", json=request_body, headers=request_headers
            )

            assert response.status_code == 200


@pytest.mark.asyncio
async def test_invalid_json_format(client):
    request_body = "invalid json"
    request_headers = {"apim-request-id": "test_id"}

    response = await client.post(
        "/conversation", data=request_body, headers=request_headers
    )
    response_json = await response.get_json()
    assert response.status_code == 415
    assert response_json["error"] == "request must be json"


@pytest.mark.asyncio
async def test_timeout_in_stream_chat_request(client):
    request_body = {
        "history_metadata": {},
        "client_id": "test_client",
        "messages": [{"content": "test query"}],
    }
    request_headers = {"apim-request-id": "test_id"}

    with patch("app.stream_chat_request", new_callable=AsyncMock) as mock_stream:
        mock_stream.side_effect = TimeoutError("Timeout occurred")
        response = await client.post(
            "/conversation", json=request_body, headers=request_headers
        )
        response_json = await response.get_json()

        assert response.status_code == 500
        assert response_json["error"] == "Timeout occurred"


@pytest.mark.asyncio
async def test_unexpected_exception(client):
    request_body = {
        "history_metadata": {},
        "client_id": "test_client",
        "messages": [{"content": "test query"}],
    }
    request_headers = {"apim-request-id": "test_id"}

    with patch("app.stream_chat_request", new_callable=AsyncMock) as mock_stream:
        mock_stream.side_effect = Exception("Unexpected error")
        response = await client.post(
            "/conversation", json=request_body, headers=request_headers
        )
        response_json = await response.get_json()

        assert response.status_code == 500
        assert response_json["error"] == "Unexpected error"


# Helper function to create an async generator
async def async_generator(items):
    for item in items:
        yield item


# Mock object for delta
class MockDelta:
    def __init__(self, role, context=None):
        self.role = role
        self.context = context


# Mock object for chatCompletionChunk
class MockChoice:
    def __init__(self, messages, delta):
        self.messages = messages
        self.delta = delta


class MockChatCompletionChunk:
    def __init__(self, id, model, created, object, choices):
        self.id = id
        self.model = model
        self.created = created
        self.object = object
        self.choices = choices


# Simulated async generator for testing purposes
async def fake_internal_stream_response():
    # Simulating streaming data chunk by chunk
    chunks = ["chunk1", "chunk2"]
    for chunk in chunks:
        await asyncio.sleep(0.1)
        yield chunk


@pytest.mark.asyncio
async def test_stream_chat_request_with_internal_stream():
    # Test input data for stream_chat_request
    request_body = {
        "history_metadata": {},
        "client_id": "test_client",
        "messages": [{"content": "test query", "role": "user"}],
    }
    request_headers = {"apim-request-id": "test_id"}

    # Patch stream_response_from_wealth_assistant and USE_INTERNAL_STREAM
    with patch("app.stream_response_from_wealth_assistant", return_value=fake_internal_stream_response), \
         patch("app.USE_INTERNAL_STREAM", True):

        # Create the Quart app context for the test
        async with create_app().app_context():
            response = await stream_chat_request(request_body, request_headers)

            # Ensure that response is a Quart Response object
            assert isinstance(response, Response)

            # Await get_data to get the data content as text
            response_data = await response.get_data(as_text=True)

            # Create an async generator for iterating over the streamed content
            async def async_response_data():
                for chunk in response_data.split('\n'):
                    if chunk.strip():  # Ignore empty chunks
                        yield chunk

            # Collect all streamed chunks from the response using async for
            chunks = []
            async for chunk in async_response_data():
                chunks.append(chunk)

            # Ensure we got the expected number of chunks
            assert len(chunks) == 2
            assert "chunk1" in chunks[0]
            assert "chunk2" in chunks[1]
            assert "apim-request-id" in chunks[0]


@pytest.mark.asyncio
async def test_stream_chat_request_no_client_id():
    request_body = {"history_metadata": {}, "messages": [{"content": "test query"}]}
    request_headers = {"apim-request-id": "test_id"}

    async with create_app().app_context():
        with patch("app.USE_INTERNAL_STREAM", True):
            response, status_code = await stream_chat_request(
                request_body, request_headers
            )
            assert status_code == 400
            response_json = await response.get_json()
            assert response_json["error"] == "No client ID provided"


@pytest.mark.asyncio
async def test_stream_chat_request_without_azurefunction():
    request_body = {
        "history_metadata": {},
        "client_id": "test_client",
        "messages": [{"content": "test query"}],
    }
    request_headers = {"apim-request-id": "test_id"}

    with patch("app.USE_INTERNAL_STREAM", False):
        with patch("app.send_chat_request", new_callable=AsyncMock) as mock_send:
            mock_send.return_value = (
                async_generator(
                    [
                        MockChatCompletionChunk(
                            "id1",
                            "model1",
                            1234567890,
                            "object1",
                            [
                                MockChoice(
                                    ["message1"],
                                    MockDelta("assistant", {"key": "value"}),
                                )
                            ],
                        ),
                        MockChatCompletionChunk(
                            "id2",
                            "model2",
                            1234567891,
                            "object2",
                            [
                                MockChoice(
                                    ["message2"],
                                    MockDelta("assistant", {"key": "value"}),
                                )
                            ],
                        ),
                    ]
                ),
                "test_apim_request_id",
            )
            generator = await stream_chat_request(request_body, request_headers)
            chunks = [chunk async for chunk in generator]

            assert len(chunks) == 2
            assert "apim-request-id" in chunks[0]
