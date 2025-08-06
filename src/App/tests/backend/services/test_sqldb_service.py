import struct
from unittest.mock import MagicMock, patch

import pyodbc

import backend.services.sqldb_service as sql_db

# Mock configuration
sql_db.server = "mock_server"
sql_db.username = "mock_user"
sql_db.password = "mock_password"
sql_db.database = "mock_database"
sql_db.driver = "mock_driver"
sql_db.mid_id = "mock_mid_id"  # Managed identity client ID if needed


@patch("backend.services.sqldb_service.pyodbc.connect")  # Mock pyodbc.connect
@patch(
    "backend.services.sqldb_service.get_azure_credential"
)  # Mock AzureCliCredential
def test_get_connection(mock_credential_class, mock_connect):
    # Mock the AzureCliCredential and get_token method
    mock_credential = MagicMock()
    mock_credential_class.return_value = mock_credential
    mock_token = MagicMock()
    mock_token.token = "mock_token"
    mock_credential.get_token.return_value = mock_token
    # Create a mock connection object
    mock_conn = MagicMock()
    mock_connect.return_value = mock_conn

    # Call the function
    conn = sql_db.get_connection()

    # Assert that AzureCliCredential and get_token were called correctly
    mock_credential_class.assert_called_once_with(
        client_id=sql_db.mid_id
    )
    mock_credential.get_token.assert_called_once_with(
        "https://database.windows.net/.default"
    )

    # Assert that pyodbc.connect was called with the correct parameters, including the token
    expected_attrs_before = {
        1256: struct.pack(
            f"<I{len(mock_token.token.encode('utf-16-LE'))}s",
            len(mock_token.token.encode("utf-16-LE")),
            mock_token.token.encode("utf-16-LE"),
        )
    }
    mock_connect.assert_called_once_with(
        f"DRIVER={sql_db.driver};SERVER={sql_db.server};DATABASE={sql_db.database};",
        attrs_before=expected_attrs_before,
    )

    # Assert that the connection returned is the mock connection
    assert conn == mock_conn


@patch("backend.services.sqldb_service.pyodbc.connect")  # Mock pyodbc.connect
@patch(
    "backend.services.sqldb_service.get_azure_credential"
)  # Mock AzureCliCredential
def test_get_connection_token_failure(mock_credential_class, mock_connect):
    # Mock the AzureCliCredential and get_token method
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
    conn = sql_db.get_connection()

    # Assert that pyodbc.connect was called with username and password as fallback
    mock_connect.assert_any_call(
        f"DRIVER={sql_db.driver};SERVER={sql_db.server};DATABASE={sql_db.database};UID={sql_db.username};PWD={sql_db.password}",
        timeout=5,
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
    result = sql_db.dict_cursor(mock_cursor)

    # Verify the result
    expected_result = [
        {"id": 1, "name": "Alice", "age": 30},
        {"id": 2, "name": "Bob", "age": 25},
    ]
    assert result == expected_result


@patch.object(sql_db, "get_connection")
def test_get_client_name_from_db_success(mock_get_connection):
    """Test successful retrieval of client name."""
    # Setup mocks
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.fetchone.return_value = ("John Doe",)
    mock_get_connection.return_value = mock_conn

    # Call the function
    result = sql_db.get_client_name_from_db("client123")

    # Verify the result
    assert result == "John Doe"

    # Verify the function calls
    mock_get_connection.assert_called_once()
    mock_conn.cursor.assert_called_once()
    mock_cursor.execute.assert_called_once_with(
        "SELECT Client FROM Clients WHERE ClientId = ?", ("client123",)
    )
    mock_cursor.fetchone.assert_called_once()
    mock_conn.close.assert_called_once()


@patch.object(sql_db, "get_connection")
def test_get_client_name_from_db_not_found(mock_get_connection):
    """Test when client is not found."""
    # Setup mocks
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.fetchone.return_value = None
    mock_get_connection.return_value = mock_conn

    # Call the function
    result = sql_db.get_client_name_from_db("nonexistent_client")

    # Verify the result
    assert result == ""

    # Verify the function calls
    mock_get_connection.assert_called_once()
    mock_cursor.execute.assert_called_once_with(
        "SELECT Client FROM Clients WHERE ClientId = ?", ("nonexistent_client",)
    )
    mock_conn.close.assert_called_once()


@patch.object(sql_db, "get_connection")
def test_get_client_name_from_db_exception(mock_get_connection):
    """Test exception handling during database operation."""
    # Setup mocks
    mock_get_connection.side_effect = Exception("Database connection failed")

    # Call the function and expect exception to be raised
    try:
        sql_db.get_client_name_from_db("client123")
        assert False, "Expected exception was not raised"
    except Exception as e:
        assert str(e) == "Database connection failed"


@patch.object(sql_db, "update_sample_data")
@patch.object(sql_db, "dict_cursor")
@patch.object(sql_db, "get_connection")
def test_get_client_data_success_no_update_needed(
    mock_get_connection, mock_dict_cursor, mock_update_sample_data
):
    """Test successful retrieval of client data when update is not needed."""
    # Setup mocks
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_get_connection.return_value = mock_conn

    # Mock dict_cursor return with enough records (> 6)
    mock_client_data = [
        {
            "ClientId": "client1",
            "Client": "John Doe",
            "Email": "john@example.com",
            "AssetValue": "100,000",
            "ClientSummary": "High net worth client",
            "NextMeetingFormatted": "Monday January 1, 2024",
            "NextMeetingStartTime": "10:00 AM",
            "NextMeetingEndTime": "11:00 AM",
            "LastMeetingDateFormatted": "Friday December 15, 2023",
            "LastMeetingStartTime": "02:00 PM",
            "LastMeetingEndTime": "03:00 PM",
        },
        # Add 6 more records to trigger no update
        *[
            {
                "ClientId": f"client{i}",
                "Client": f"Client {i}",
                "Email": f"client{i}@example.com",
                "AssetValue": "50,000",
                "ClientSummary": f"Client {i} summary",
                "NextMeetingFormatted": "Monday January 1, 2024",
                "NextMeetingStartTime": "10:00 AM",
                "NextMeetingEndTime": "11:00 AM",
                "LastMeetingDateFormatted": "Friday December 15, 2023",
                "LastMeetingStartTime": "02:00 PM",
                "LastMeetingEndTime": "03:00 PM",
            }
            for i in range(2, 8)
        ],
    ]
    mock_dict_cursor.return_value = mock_client_data

    # Call the function
    result = sql_db.get_client_data()

    # Verify the result
    assert len(result) == 7
    assert result[0]["ClientId"] == "client1"
    assert result[0]["ClientName"] == "John Doe"
    assert result[0]["ClientEmail"] == "john@example.com"
    assert result[0]["AssetValue"] == "100,000"

    # Verify function calls
    mock_get_connection.assert_called_once()
    mock_conn.cursor.assert_called_once()
    mock_cursor.execute.assert_called_once()
    mock_dict_cursor.assert_called_once_with(mock_cursor)
    mock_update_sample_data.assert_not_called()  # Should not be called when > 6 records
    mock_conn.close.assert_called_once()


@patch.object(sql_db, "update_sample_data")
@patch.object(sql_db, "dict_cursor")
@patch.object(sql_db, "get_connection")
def test_get_client_data_success_with_update(
    mock_get_connection, mock_dict_cursor, mock_update_sample_data
):
    """Test successful retrieval of client data when update is needed."""
    # Setup mocks
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_get_connection.return_value = mock_conn

    # Mock dict_cursor return with few records (<= 6)
    mock_client_data = [
        {
            "ClientId": "client1",
            "Client": "John Doe",
            "Email": "john@example.com",
            "AssetValue": "100,000",
            "ClientSummary": "High net worth client",
            "NextMeetingFormatted": "Monday January 1, 2024",
            "NextMeetingStartTime": "10:00 AM",
            "NextMeetingEndTime": "11:00 AM",
            "LastMeetingDateFormatted": "Friday December 15, 2023",
            "LastMeetingStartTime": "02:00 PM",
            "LastMeetingEndTime": "03:00 PM",
        }
    ]
    mock_dict_cursor.return_value = mock_client_data

    # Call the function
    result = sql_db.get_client_data()

    # Verify the result
    assert len(result) == 1
    assert result[0]["ClientName"] == "John Doe"

    # Verify function calls
    mock_get_connection.assert_called_once()
    mock_update_sample_data.assert_called_once_with(
        mock_conn
    )  # Should be called when <= 6 records
    mock_conn.close.assert_called_once()


@patch.object(sql_db, "get_connection")
def test_get_client_data_exception_with_finally(mock_get_connection):
    """Test exception handling with proper cleanup in finally block."""
    # Setup mocks
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.execute.side_effect = Exception("Database query failed")
    mock_get_connection.return_value = mock_conn

    # Call the function and expect exception to be raised
    try:
        sql_db.get_client_data()
        assert False, "Expected exception was not raised"
    except Exception as e:
        assert str(e) == "Database query failed"

    # Verify connection is closed even when exception occurs
    mock_conn.close.assert_called_once()


@patch.object(sql_db, "get_connection")
def test_get_client_data_exception_no_connection(mock_get_connection):
    """Test exception handling when connection fails."""
    # Setup mocks
    mock_get_connection.side_effect = Exception("Connection failed")

    # Call the function and expect exception to be raised
    try:
        sql_db.get_client_data()
        assert False, "Expected exception was not raised"
    except Exception as e:
        assert str(e) == "Connection failed"


@patch.object(sql_db, "dict_cursor")
def test_update_sample_data_all_updates_needed(mock_dict_cursor):
    """Test update_sample_data when all tables need updates."""
    # Setup mocks
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor

    # Mock dict_cursor return indicating updates needed
    mock_dict_cursor.return_value = [
        {
            "ClientMeetingDaysDifference": 10,
            "AssetMonthsDifference": 3,
            "StatusMonthsDifference": 2,
        }
    ]

    # Call the function
    sql_db.update_sample_data(mock_conn)

    # Verify function calls
    mock_conn.cursor.assert_called_once()
    mock_cursor.execute.assert_any_call(
        "UPDATE ClientMeetings SET StartTime = DATEADD(day, 10, StartTime), EndTime = DATEADD(day, 10, EndTime)"
    )
    mock_cursor.execute.assert_any_call(
        "UPDATE Assets SET AssetDate = DATEADD(month, 3, AssetDate)"
    )
    mock_cursor.execute.assert_any_call(
        "UPDATE Retirement SET StatusDate = DATEADD(month, 2, StatusDate)"
    )

    # Verify commits were called
    assert mock_conn.commit.call_count == 3


@patch.object(sql_db, "dict_cursor")
def test_update_sample_data_no_updates_needed(mock_dict_cursor):
    """Test update_sample_data when no updates are needed."""
    # Setup mocks
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor

    # Mock dict_cursor return indicating no updates needed
    mock_dict_cursor.return_value = [
        {
            "ClientMeetingDaysDifference": 0,
            "AssetMonthsDifference": 0,
            "StatusMonthsDifference": 0,
        }
    ]

    # Call the function
    sql_db.update_sample_data(mock_conn)

    # Verify function calls - only the initial query should be executed
    assert mock_cursor.execute.call_count == 1  # Only the combined_stmt query
    mock_conn.commit.assert_not_called()  # No commits should happen


@patch.object(sql_db, "dict_cursor")
def test_update_sample_data_empty_result(mock_dict_cursor):
    """Test update_sample_data when dict_cursor returns empty result."""
    # Setup mocks
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor

    # Mock dict_cursor return empty
    mock_dict_cursor.return_value = []

    # Call the function
    sql_db.update_sample_data(mock_conn)

    # Verify function calls - only the initial query should be executed
    assert mock_cursor.execute.call_count == 1  # Only the combined_stmt query
    mock_conn.commit.assert_not_called()  # No commits should happen


@patch.object(sql_db, "dict_cursor")
def test_update_sample_data_exception_handling(mock_dict_cursor):
    """Test exception handling in update_sample_data."""
    # Setup mocks
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.execute.side_effect = Exception("Update query failed")

    # Call the function and expect exception to be raised
    try:
        sql_db.update_sample_data(mock_conn)
        assert False, "Expected exception was not raised"
    except Exception as e:
        assert str(e) == "Update query failed"
    """Test suite for get_client_name_from_db function."""

    @patch.object(sql_db, "get_connection")
    def test_get_client_name_from_db_success(self, mock_get_connection):
        """Test successful retrieval of client name."""
        # Setup mocks
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = ("John Doe",)
        mock_get_connection.return_value = mock_conn

        # Call the function
        result = sql_db.get_client_name_from_db("client123")

        # Verify the result
        assert result == "John Doe"

        # Verify the function calls
        mock_get_connection.assert_called_once()
        mock_conn.cursor.assert_called_once()
        mock_cursor.execute.assert_called_once_with(
            "SELECT Client FROM Clients WHERE ClientId = ?", ("client123",)
        )
        mock_cursor.fetchone.assert_called_once()
        mock_conn.close.assert_called_once()
