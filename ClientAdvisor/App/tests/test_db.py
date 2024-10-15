from unittest.mock import MagicMock, patch

import db

db.server = "mock_server"
db.username = "mock_user"
db.password = "mock_password"
db.database = "mock_database"


@patch("db.pymssql.connect")
def test_get_connection(mock_connect):
    # Create a mock connection object
    mock_conn = MagicMock()
    mock_connect.return_value = mock_conn

    # Call the function
    conn = db.get_connection()

    # Assert that pymssql.connect was called with the correct parameters
    mock_connect.assert_called_once_with(
        server="mock_server",
        user="mock_user",
        password="mock_password",
        database="mock_database",
        as_dict=True,
    )

    # Assert that the connection returned is the mock connection
    assert conn == mock_conn
