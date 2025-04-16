import struct
from unittest.mock import MagicMock, patch

import db
import pyodbc

# Mock configuration
db.server = "mock_server"
db.username = "mock_user"
db.password = "mock_password"
db.database = "mock_database"
db.driver = "mock_driver"
db.mid_id = "mock_mid_id"  # Managed identity client ID if needed


@patch("db.pyodbc.connect")  # Mock pyodbc.connect
@patch("db.DefaultAzureCredential")  # Mock DefaultAzureCredential
def test_get_connection(mock_credential_class, mock_connect):
    # Mock the DefaultAzureCredential and get_token method
    mock_credential = MagicMock()
    mock_credential_class.return_value = mock_credential
    mock_token = MagicMock()
    mock_token.token = "mock_token"
    mock_credential.get_token.return_value = mock_token
    # Create a mock connection object
    mock_conn = MagicMock()
    mock_connect.return_value = mock_conn

    # Call the function
    conn = db.get_connection()

    # Assert that DefaultAzureCredential and get_token were called correctly
    mock_credential_class.assert_called_once_with(managed_identity_client_id=db.mid_id)
    mock_credential.get_token.assert_called_once_with("https://database.windows.net/.default")

    # Assert that pyodbc.connect was called with the correct parameters, including the token
    expected_attrs_before = {
        1256: struct.pack(f"<I{len(mock_token.token.encode('utf-16-LE'))}s", len(mock_token.token.encode("utf-16-LE")), mock_token.token.encode("utf-16-LE"))
    }
    mock_connect.assert_called_once_with(
        f"DRIVER={db.driver};SERVER={db.server};DATABASE={db.database};",
        attrs_before=expected_attrs_before
    )

    # Assert that the connection returned is the mock connection
    assert conn == mock_conn


@patch("db.pyodbc.connect")  # Mock pyodbc.connect
@patch("db.DefaultAzureCredential")  # Mock DefaultAzureCredential
def test_get_connection_token_failure(mock_credential_class, mock_connect):
    # Mock the DefaultAzureCredential and get_token method
    mock_credential = MagicMock()
    mock_credential_class.return_value = mock_credential
    mock_token = MagicMock()
    mock_token.token = "mock_token"
    mock_credential.get_token.return_value = mock_token

    # Create a mock connection object
    mock_conn = MagicMock()
    mock_connect.return_value = mock_conn

    # Simulate a failure in pyodbc.connect by raising pyodbc.Error on the first call
    mock_connect.side_effect = [pyodbc.Error("pyodbc connection error"), mock_conn]

    # Call the function and ensure fallback is used after the pyodbc error
    conn = db.get_connection()

    # Assert that pyodbc.connect was called with username and password as fallback
    mock_connect.assert_any_call(
        f"DRIVER={db.driver};SERVER={db.server};DATABASE={db.database};UID={db.username};PWD={db.password}",
        timeout=5
    )

    # Assert that the connection returned is the mock connection
    assert conn == mock_conn


def test_dict_cursor():
    # Create a mock cursor
    mock_cursor = MagicMock()

    # Simulate the cursor.description and cursor.fetchall
    mock_cursor.description = [("id",), ("name",), ("age",)]
    mock_cursor.fetchall.return_value = [(1, "Alice", 30), (2, "Bob", 25)]

    # Call the dict_cursor function
    result = db.dict_cursor(mock_cursor)

    # Verify the result
    expected_result = [{'id': 1, 'name': 'Alice', 'age': 30}, {'id': 2, 'name': 'Bob', 'age': 25}]
    assert result == expected_result
