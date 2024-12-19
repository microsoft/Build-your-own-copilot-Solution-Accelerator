import dataclasses
import json
from unittest.mock import MagicMock, patch

import pytest
from backend.utils import (
    JSONEncoder,
    convert_to_pf_format,
    fetchUserGroups,
    format_as_ndjson,
    format_non_streaming_response,
    format_pf_non_streaming_response,
    format_stream_response,
    generateFilterString,
    parse_multi_columns,
)


@dataclasses.dataclass
class TestDataClass:
    field1: int
    field2: str


def test_json_encoder():
    obj = TestDataClass(1, "test")
    encoded = json.dumps(obj, cls=JSONEncoder)
    assert json.loads(encoded) == {"field1": 1, "field2": "test"}


# Test parse_multi_columns with edge cases
@pytest.mark.parametrize(
    "input_str, expected",
    [
        ("col1|col2|col3", ["col1", "col2", "col3"]),
        ("col1,col2,col3", ["col1", "col2", "col3"]),
        ("col1", ["col1"]),
        ("", [""]),
    ],
)
def test_parse_multi_columns(input_str, expected):
    assert parse_multi_columns(input_str) == expected


@patch("app.requests.get")
def test_fetch_user_groups(mock_get):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"value": [{"id": "group1"}]}
    mock_get.return_value = mock_response

    user_groups = fetchUserGroups("fake_token")
    assert user_groups == [{"id": "group1"}]

    # Test with nextLink
    mock_response.json.return_value = {
        "value": [{"id": "group1"}],
        "@odata.nextLink": "next_link",
    }
    mock_get.side_effect = [mock_response, mock_response]
    user_groups = fetchUserGroups("fake_token")
    assert user_groups == [{"id": "group1"}, {"id": "group1"}]


@patch("backend.utils.fetchUserGroups")
@patch("backend.utils.AZURE_SEARCH_PERMITTED_GROUPS_COLUMN", "your_column")
def test_generate_filter_string(mock_fetch_user_groups):
    mock_fetch_user_groups.return_value = [{"id": "group1"}, {"id": "group2"}]
    filter_string = generateFilterString("fake_token")
    assert filter_string == "your_column/any(g:search.in(g, 'group1, group2'))"


@pytest.mark.asyncio
async def test_format_as_ndjson():
    async def async_gen():
        yield {"event": "test"}

    r = async_gen()
    result = [item async for item in format_as_ndjson(r)]
    assert result == ['{"event": "test"}\n']


def test_format_non_streaming_response():
    # Create a mock chatCompletion object with the necessary attributes
    chatCompletion = MagicMock()
    chatCompletion.id = "id"
    chatCompletion.model = "model"
    chatCompletion.created = "created"
    chatCompletion.object = "object"

    # Create a mock choice object with a message attribute
    choice = MagicMock()
    choice.message = MagicMock()
    choice.message.content = "content"
    choice.message.context = {"key": "value"}

    # Assign the choice to the choices list
    chatCompletion.choices = [choice]

    # Call the function with the mock object
    response = format_non_streaming_response(chatCompletion, "history", "request_id")

    # Assert the response structure
    assert response["id"] == "id"
    assert response["choices"][0]["messages"][0]["content"] == '{"key": "value"}'
    assert response["choices"][0]["messages"][1]["content"] == "content"


# Test format_stream_response with edge cases
def test_format_stream_response():
    # Create a mock chatCompletionChunk object with the necessary attributes
    chatCompletionChunk = MagicMock()
    chatCompletionChunk.id = "id"
    chatCompletionChunk.model = "model"
    chatCompletionChunk.created = "created"
    chatCompletionChunk.object = "object"

    # Create a mock choice object with a delta attribute
    choice = MagicMock()
    choice.delta = MagicMock()
    choice.delta.content = "content"
    choice.delta.context = {"key": "value"}
    choice.delta.role = "assistant"

    # Assign the choice to the choices list
    chatCompletionChunk.choices = [choice]

    # Call the function with the mock object
    response = format_stream_response(chatCompletionChunk, "history", "request_id")

    # Assert the response structure
    assert response["id"] == "id"
    assert response["choices"][0]["messages"][0]["content"] == '{"key": "value"}'


# Test format_pf_non_streaming_response with edge cases
def test_format_pf_non_streaming_response():
    chatCompletion = {
        "id": "id",
        "response_field": "response",
        "citations_field": "citations",
    }
    response = format_pf_non_streaming_response(
        chatCompletion, "history", "response_field", "citations_field"
    )

    assert response["choices"][0]["messages"][0]["content"] == "response"
    assert response["choices"][0]["messages"][1]["content"] == "citations"


# Test convert_to_pf_format with edge cases
def test_convert_to_pf_format():
    input_json = {
        "messages": [
            {"role": "user", "content": "user message"},
            {"role": "assistant", "content": "assistant message"},
        ]
    }
    output_json = convert_to_pf_format(input_json, "request_field", "response_field")
    assert output_json == [
        {
            "inputs": {"request_field": "user message"},
            "outputs": {"response_field": "assistant message"},
        }
    ]
