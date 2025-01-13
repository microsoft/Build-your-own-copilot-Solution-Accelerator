import json
import os
from unittest.mock import MagicMock, Mock, patch
from flask import Flask, request
import pytest
import requests
import urllib

from app import (extract_value, fetchUserGroups, format_as_ndjson,
                 formatApiResponseNoStreaming, formatApiResponseStreaming,
                 generateFilterString, is_chat_model, parse_multi_columns,
                 prepare_body_headers_with_data, should_use_data,
                 stream_with_data, conversation_with_data, draft_document_generate)

AZURE_SEARCH_SERVICE = os.environ.get("AZURE_SEARCH_SERVICE", "")
AZURE_OPENAI_KEY = os.environ.get("AZURE_OPENAI_KEY", "")
AZURE_SEARCH_PERMITTED_GROUPS_COLUMN = os.environ.get(
    "AZURE_SEARCH_PERMITTED_GROUPS_COLUMN", ""
)

def test_parse_multi_columns():
    assert parse_multi_columns("a|b|c") == ["a", "b", "c"]
    assert parse_multi_columns("a,b,c") == ["a", "b", "c"]


@patch("requests.get")
def test_success_single_page(mock_get):
    # Mock response for a single page of groups
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {
        "value": [{"id": "group1"}, {"id": "group2"}]
    }

    userToken = "valid_token"
    result = fetchUserGroups(userToken)
    expected = [{"id": "group1"}, {"id": "group2"}]
    assert result == expected


def test_is_chat_model_with_gpt4():
    with patch("app.AZURE_OPENAI_MODEL_NAME", "gpt-4"):
        assert is_chat_model() is True


def test_is_chat_model_with_gpt35_turbo_4k():
    with patch("app.AZURE_OPENAI_MODEL_NAME", "gpt-35-turbo-4k"):
        assert is_chat_model() is True


def test_is_chat_model_with_gpt35_turbo_16k():
    with patch("app.AZURE_OPENAI_MODEL_NAME", "gpt-35-turbo-16k"):
        assert is_chat_model() is True


def test_is_chat_model_with_other_model():
    with patch("app.AZURE_OPENAI_MODEL_NAME", "some-other-model"):
        assert is_chat_model() is False


def test_should_use_data_with_service_and_key():
    with patch("app.AZURE_SEARCH_SERVICE", "my-service"):
        with patch("app.AZURE_SEARCH_KEY", "my-key"):
            with patch("app.DEBUG_LOGGING", False):
                assert should_use_data() is True


def test_should_use_data_with_service_no_key():
    with patch("app.AZURE_SEARCH_SERVICE", "my-service"):
        with patch("app.AZURE_SEARCH_KEY", None):
            assert should_use_data() is False


def test_should_use_data_with_key_no_service():
    with patch("app.AZURE_SEARCH_SERVICE", None):
        with patch("app.AZURE_SEARCH_KEY", "my-key"):
            assert should_use_data() is False


def test_should_use_data_with_neither():
    with patch("app.AZURE_SEARCH_SERVICE", None):
        with patch("app.AZURE_SEARCH_KEY", None):
            assert should_use_data() is False


def test_should_use_data_with_debug_logging():
    with patch("app.AZURE_SEARCH_SERVICE", "my-service"):
        with patch("app.AZURE_SEARCH_KEY", "my-key"):
            with patch("app.DEBUG_LOGGING", True):
                with patch("logging.debug") as mock_debug:
                    assert should_use_data() is True
                    mock_debug.assert_called_once_with("Using Azure Cognitive Search")


@patch("requests.get")
def test_success_multiple_pages(mock_get):
    # Mock response for multiple pages of groups
    mock_get.side_effect = [
        _mock_response(
            200,
            {
                "value": [{"id": "group1"}, {"id": "group2"}],
                "@odata.nextLink": "https://next.page",
            },
        ),
        _mock_response(200, {"value": [{"id": "group3"}]}),
    ]

    userToken = "valid_token"
    result = fetchUserGroups(userToken)
    expected = [{"id": "group1"}, {"id": "group2"}, {"id": "group3"}]
    assert result == expected


@patch("requests.get")
def test_non_200_status_code(mock_get):
    # Mock response with a 403 Forbidden error
    mock_get.return_value.status_code = 403
    mock_get.return_value.text = "Forbidden"

    userToken = "valid_token"
    result = fetchUserGroups(userToken)
    expected = []
    assert result == expected


@patch("requests.get")
def test_exception_handling(mock_get):
    # Mock an exception when making the request
    mock_get.side_effect = Exception("Network error")

    userToken = "valid_token"
    result = fetchUserGroups(userToken)
    expected = []
    assert result == expected


@patch("requests.get")
def test_no_groups_found(mock_get):
    # Mock response with no groups found
    mock_get.return_value.status_code = 200
    mock_get.return_value.json.return_value = {"value": []}

    userToken = "valid_token"
    result = fetchUserGroups(userToken)
    expected = []
    assert result == expected


def _mock_response(status_code, json_data):
    """Helper method to create a mock response object."""
    mock_resp = Mock()
    mock_resp.status_code = status_code
    mock_resp.json.return_value = json_data
    return mock_resp


@patch("app.fetchUserGroups")
def test_generateFilterString(mock_fetchUserGroups):
    mock_fetchUserGroups.return_value = [{"id": "1"}, {"id": "2"}]
    userToken = "fake_token"

    filter_string = generateFilterString(userToken)
    print("filter string",filter_string)
    assert filter_string == "None/any(g:search.in(g, '1, 2'))"

def test_prepare_body_headers_with_data():
    # Create a mock request
    mock_request = MagicMock()
    mock_request.json = {"messages": ["Hello, world!"], "index_name": "grants"}
    mock_request.headers = {"X-MS-TOKEN-AAD-ACCESS-TOKEN": "mock_token"}

    with patch("app.AZURE_OPENAI_TEMPERATURE", 0.7), patch(
        "app.AZURE_OPENAI_MAX_TOKENS", 100
    ), patch("app.AZURE_OPENAI_TOP_P", 0.9), patch(
        "app.AZURE_SEARCH_SERVICE", "my-service"
    ), patch(
        "app.AZURE_SEARCH_KEY", "my-key"
    ), patch(
        "app.DEBUG_LOGGING", True
    ), patch(
        "app.AZURE_SEARCH_PERMITTED_GROUPS_COLUMN", "group_column"
    ), patch(
        "app.AZURE_SEARCH_ENABLE_IN_DOMAIN", "true"
    ), patch(
        "app.AZURE_SEARCH_TOP_K", 5
    ), patch(
        "app.AZURE_SEARCH_STRICTNESS", 1
    ):

        body, headers = prepare_body_headers_with_data(mock_request)
        print("indexName", body["dataSources"][0]["parameters"])
        assert body["messages"] == ["Hello, world!"]
        assert body["temperature"] == 0.7
        assert body["max_tokens"] == 100
        assert body["top_p"] == 0.9
        assert body["dataSources"]
        assert body["dataSources"][0]["type"] == "AzureCognitiveSearch"
        assert (
            body["dataSources"][0]["parameters"]["endpoint"]
            == "https://my-service.search.windows.net"
        )
        assert body["dataSources"][0]["parameters"]["key"] == "my-key"
        assert body["dataSources"][0]["parameters"]["inScope"] is True
        assert body["dataSources"][0]["parameters"]["topNDocuments"] == 5
        assert body["dataSources"][0]["parameters"]["strictness"] == 1

        assert headers["Content-Type"] == "application/json"
        assert headers["x-ms-useragent"] == "GitHubSampleWebApp/PublicAPI/3.0.0"


def test_invalid_datasource_type():
    mock_request = MagicMock()
    mock_request.json = {"messages": ["Hello, world!"], "index_name": "grants"}


    with patch("app.DATASOURCE_TYPE", "InvalidType"):
        with pytest.raises(Exception) as exc_info:
            prepare_body_headers_with_data(mock_request)
        assert "DATASOURCE_TYPE is not configured or unknown: InvalidType" in str(
            exc_info.value
        )


def test_invalid_datasource_type():
    mock_request = MagicMock()
    mock_request.json = {"messages": ["Hello, world!"], "index_name": "grants"}

    with patch("app.DATASOURCE_TYPE", "InvalidType"):
        with pytest.raises(Exception) as exc_info:
            prepare_body_headers_with_data(mock_request)
        assert "DATASOURCE_TYPE is not configured or unknown: InvalidType" in str(
            exc_info.value
        )


# stream_with_data function
def mock_format_as_ndjson(data):
    # Ensure data is in a JSON serializable format (like a list or dict)
    if isinstance(data, set):
        data = list(data)  # Convert set to list
    return json.dumps(data)


def test_stream_with_data_azure_success():
    body = {
        "messages": [
            {
                "id": "0e29210d-5584-38df-df76-2dfb40147ee7",
                "role": "user",
                "content": "influenza and its effets ",
                "date": "2025-01-09T04:42:25.896Z",
            },
            {
                "id": "ab42add2-0fba-d6bb-47c0-5d11b7cdb83a",
                "role": "user",
                "content": "influenza and its effectd",
                "date": "2025-01-09T10:14:11.638Z",
            },
            {
                "id": "1f6dc8e2-c5fe-ce77-b28c-5ec9ba80e94d",
                "role": "user",
                "content": "influenza and its effects",
                "date": "2025-01-09T10:34:15.187Z",
            },
        ],
        "temperature": 0.0,
        "max_tokens": 1000,
        "top_p": 1.0,
        "stop": "None",
        "stream": True,
        "dataSources": [
            {
                "type": "AzureCognitiveSearch",
                "parameters": {
                    "endpoint": "https://ututut-cs.search.windows.net",
                    "key": "",
                    "indexName": "articlesindex",
                    "fieldsMapping": {
                        "contentFields": ["content"],
                        "titleField": "title",
                        "urlField": "publicurl",
                        "filepathField": "chunk_id",
                        "vectorFields": ["titleVector", "contentVector"],
                    },
                    "inScope": False,
                    "topNDocuments": "5",
                    "queryType": "vectorSemanticHybrid",
                    "semanticConfiguration": "my-semantic-config",
                    "roleInformation": "You are an AI assistant that helps people find information.",
                    "filter": "None",
                    "strictness": 3,
                    "embeddingDeploymentName": "text-embedding-ada-002",
                },
            }
        ],
    }
    headers = {
        "Content-Type": "application/json",
        "api-key": "",
        "x-ms-useragent": "GitHubSampleWebApp/PublicAPI/3.0.0",
    }
    history_metadata = {}

    with patch("requests.Session.post") as mock_post:
        mock_response = MagicMock()
        mock_response.iter_lines.return_value = [
            b'data: {"id":"1","model":"gpt-35-turbo-16k","created":1736397875,"object":"extensions.chat.completion.chunk","choices":[{"index":0,"delta":{"context":{"messages":[{"role":"tool","content":"hello","end_turn":false}]}},"end_turn":false,"finish_reason":"None"}]}'
        ]
        mock_response.headers = {"apim-request-id": "test-request-id"}
        mock_post.return_value.__enter__.return_value = mock_response

        with patch("app.format_as_ndjson", side_effect=mock_format_as_ndjson):
            results = list(
                stream_with_data(
                    body, headers, "https://mock-endpoint.com", history_metadata
                )
            )  # Convert generator to a list
            print(results, "result test case")
            assert len(results) == 1

# Mock constants
USE_AZURE_AI_STUDIO = "true"
AZURE_OPENAI_PREVIEW_API_VERSION = "2023-06-01-preview"
DEBUG_LOGGING = False

AZURE_SEARCH_SERVICE = os.environ.get("AZURE_SEARCH_SERVICE", "mysearchservice")


def test_stream_with_data_azure_error():
    
    body = {
        "messages": [
            {
                "id": "0e29210d-5584-38df-df76-2dfb40147ee7",
                "role": "user",
                "content": "influenza and its effets ",
                "date": "2025-01-09T04:42:25.896Z",
            },
            {
                "id": "ab42add2-0fba-d6bb-47c0-5d11b7cdb83a",
                "role": "user",
                "content": "influenza and its effectd",
                "date": "2025-01-09T10:14:11.638Z",
            },
            {
                "id": "1f6dc8e2-c5fe-ce77-b28c-5ec9ba80e94d",
                "role": "user",
                "content": "influenza and its effects",
                "date": "2025-01-09T10:34:15.187Z",
            },
        ],
        "temperature": 0.0,
        "max_tokens": 1000,
        "top_p": 1.0,
        "stop": "None",
        "stream": True,
        "dataSources": [
            {
                "type": "AzureCognitiveSearch",
                "parameters": {
                    "endpoint": "https://ututut-cs.search.windows.net",
                    "key": "",
                    "indexName": "articlesindex",
                    "fieldsMapping": {
                        "contentFields": ["content"],
                        "titleField": "title",
                        "urlField": "publicurl",
                        "filepathField": "chunk_id",
                        "vectorFields": ["titleVector", "contentVector"],
                    },
                    "inScope": False,
                    "topNDocuments": "5",
                    "queryType": "vectorSemanticHybrid",
                    "semanticConfiguration": "my-semantic-config",
                    "roleInformation": "You are an AI assistant that helps people find information.",
                    "filter": "None",
                    "strictness": 3,
                    "embeddingDeploymentName": "text-embedding-ada-002",
                },
            }
        ],
    }
    
    if USE_AZURE_AI_STUDIO.lower() == "true":
        body = body
            
    headers = {
        "Content-Type": "application/json",
        "api-key": "",
        "x-ms-useragent": "GitHubSampleWebApp/PublicAPI/3.0.0",
    }
    history_metadata = {}

    with patch("requests.Session.post") as mock_post:
        # if USE_AZURE_AI_STUDIO.lower() == "true":
        #     body = mock_body
        mock_response = MagicMock()
        mock_response.iter_lines.return_value = [
            b'data: {"id":"1","model":"gpt-35-turbo-16k","created":1736397875,"object":"extensions.chat.completion.chunk","choices":[{"index":0,"delta":{"context":{"messages":[{"role":"tool","content":"hello","end_turn":false}]}},"end_turn":false,"finish_reason":"None"}]}'
        ]
        mock_response.headers = {"apim-request-id": "test-request-id"}
        mock_post.return_value.__enter__.return_value = mock_response

        with patch("app.format_as_ndjson", side_effect=mock_format_as_ndjson):
            results = list(
                stream_with_data(
                    body, headers, "https://mock-endpoint.com", history_metadata
                )
            )  # Convert generator to a list
            print(results, "result test case")
            assert len(results) == 1

def test_formatApiResponseNoStreaming():
    rawResponse = {
        "id": "1",
        "model": "gpt-3",
        "created": 123456789,
        "object": "response",
        "choices": [
            {
                "message": {
                    "context": {"messages": [{"content": "Hello from tool"}]},
                    "content": "Hello from assistant",
                }
            }
        ],
    }
    response = formatApiResponseNoStreaming(rawResponse)
    assert "choices" in response
    assert response["choices"][0]["messages"][0]["content"] == "Hello from tool"


def test_formatApiResponseStreaming():
    rawResponse = {
        "id": "1",
        "model": "gpt-3",
        "created": 123456789,
        "object": "response",
        "choices": [{"delta": {"role": "assistant", "content": "Hello"}}],
    }

    response = formatApiResponseStreaming(rawResponse)

    # Print response to debug
    print(response)  # Optional for debugging, remove in production

    assert "choices" in response
    assert "messages" in response["choices"][0]
    assert len(response["choices"][0]["messages"]) == 1

    # Check if the content is included under the correct structure
    delta_content = response["choices"][0]["messages"][0]["delta"]
    assert "role" in delta_content  # Check for role
    assert (
        "content" not in delta_content
    )  # content should not be present as per current logic


def test_extract_value():
    text = "'code': 'content_filter', 'status': '400'"
    assert extract_value("code", text) == "content_filter"
    assert extract_value("status", text) == "400"
    assert extract_value("unknown", text) == "N/A"

app = Flask(__name__)
app.add_url_rule("/draft_document/generate_section", "draft_document_generate", draft_document_generate, methods=["POST"])


# Helper to create a mock response
class MockResponse:
    def __init__(self, json_data, status_code):
        self.json_data = json_data
        self.status_code = status_code

    def read(self):
        return json.dumps(self.json_data).encode('utf-8')

    def getcode(self):
        return self.status_code


@pytest.fixture
def client():
    with app.test_client() as client:
        yield client


# Test the successful response case
@patch("urllib.request.urlopen")
@patch("os.environ.get")
def test_draft_document_generate_success(mock_os_environ, mock_urlopen, client):
    mock_os_environ.side_effect = lambda key: {
        "AI_STUDIO_DRAFT_FLOW_ENDPOINT": "https://fakeurl.com",
        "AI_STUDIO_DRAFT_FLOW_API_KEY": "fakeapikey",
        "AI_STUDIO_DRAFT_FLOW_DEPLOYMENT_NAME": "fake_deployment_name"
    }.get(key)

    # Mock the successful API response
    mock_urlopen.return_value = MockResponse({"reply": "Generated content for section."}, 200)

    # Sample input payload
    payload = {
        "grantTopic": "Artificial Intelligence",
        "sectionTitle": "Introduction",
        "sectionContext": ""
    }

    response = client.post("/draft_document/generate_section", json=payload)

    # Assertions
    assert response.status_code == 200
    response_json = response.get_json()
    assert "content" in response_json
    assert response_json["content"] == "Generated content for section."


# Test the scenario where "sectionContext" is provided
@patch("urllib.request.urlopen")
@patch("os.environ.get")
def test_draft_document_generate_with_context(mock_os_environ, mock_urlopen, client):
    mock_os_environ.side_effect = lambda key: {
        "AI_STUDIO_DRAFT_FLOW_ENDPOINT": "https://fakeurl.com",
        "AI_STUDIO_DRAFT_FLOW_API_KEY": "fakeapikey",
        "AI_STUDIO_DRAFT_FLOW_DEPLOYMENT_NAME": "fake_deployment_name"
    }.get(key)

    # Mock the successful API response
    mock_urlopen.return_value = MockResponse({"reply": "Generated content with context."}, 200)

    payload = {
        "grantTopic": "Quantum Computing",
        "sectionTitle": "Background",
        "sectionContext": "The section should explain the significance of quantum computing."
    }

    response = client.post("/draft_document/generate_section", json=payload)

    # Assertions
    assert response.status_code == 200
    response_json = response.get_json()
    assert "content" in response_json
    assert response_json["content"] == "Generated content with context."

@pytest.fixture
def clients():
    app = Flask(__name__)
    app.route('/draft_document/generate_section', methods=['POST'])(draft_document_generate)
    client = app.test_client()
    yield client

@patch("urllib.request.urlopen")
@patch("os.environ.get")
def test_draft_document_generate_http_error(mock_env_get, mock_urlopen, client):
    # Mock environment variables
    mock_env_get.side_effect = lambda key: {
        "AI_STUDIO_DRAFT_FLOW_ENDPOINT": "http://mock_endpoint",
        "AI_STUDIO_DRAFT_FLOW_API_KEY": "mock_api_key",
        "AI_STUDIO_DRAFT_FLOW_DEPLOYMENT_NAME": "mock_deployment"
    }.get(key)

    # Mock urllib.request.urlopen to raise an HTTPError
    error_response = json.dumps({"error": {"message": "content_filter", "code": "400"}}).encode('utf-8')
    mock_urlopen.side_effect = urllib.error.HTTPError(
        url="http://mock_endpoint",
        code=400,
        msg="Bad Request",
        hdrs=None,
        fp=MagicMock(read=MagicMock(return_value=error_response))
    )

    # Mock request data
    request_data = {
        "grantTopic": "Climate Change Research",
        "sectionTitle": "Introduction",
        "sectionContext": "This research focuses on reducing carbon emissions."
    }

    response = client.post(
        "/draft_document/generate_section",
        data=json.dumps(request_data),
        content_type="application/json",
    )

    assert response.status_code == 200


