from unittest.mock import MagicMock, patch

from backend.plugins.chat_with_data_plugin import ChatWithDataPlugin


class TestChatWithDataPlugin:
    """Test suite for ChatWithDataPlugin class."""

    def setup_method(self):
        """Setup method to initialize plugin instance for each test."""
        self.plugin = ChatWithDataPlugin()

    @patch.object(ChatWithDataPlugin, "get_openai_client")
    def test_greeting_returns_response(self, mock_get_openai_client):
        """Test that greeting method calls OpenAI and returns response."""
        # Setup mock
        mock_client = MagicMock()
        mock_get_openai_client.return_value = mock_client

        mock_completion = MagicMock()
        mock_completion.choices = [MagicMock()]
        mock_completion.choices[0].message.content = (
            "Hello! I'm your Wealth Assistant. How can I help you today?"
        )
        mock_client.chat.completions.create.return_value = mock_completion

        result = self.plugin.greeting("Hello")

        assert result == "Hello! I'm your Wealth Assistant. How can I help you today?"
        mock_client.chat.completions.create.assert_called_once()

    @patch("backend.plugins.chat_with_data_plugin.config")
    @patch("backend.plugins.chat_with_data_plugin.openai.AzureOpenAI")
    @patch("backend.plugins.chat_with_data_plugin.get_bearer_token_provider")
    @patch("backend.plugins.chat_with_data_plugin.DefaultAzureCredential")
    def test_get_openai_client_success(
        self,
        mock_default_credential,
        mock_token_provider,
        mock_azure_openai,
        mock_config,
    ):
        """Test successful creation of OpenAI client with AAD authentication."""
        # Mock config values
        mock_config.AZURE_OPENAI_ENDPOINT = "https://test.openai.azure.com"
        mock_config.AZURE_OPENAI_PREVIEW_API_VERSION = "2025-04-01-preview"

        mock_client = MagicMock()
        mock_azure_openai.return_value = mock_client
        mock_credential = MagicMock()
        mock_default_credential.return_value = mock_credential
        mock_token = MagicMock()
        mock_token_provider.return_value = mock_token

        result = self.plugin.get_openai_client()

        assert result == mock_client
        mock_default_credential.assert_called_once()
        mock_token_provider.assert_called_once_with(
            mock_credential, "https://cognitiveservices.azure.com/.default"
        )
        mock_azure_openai.assert_called_once_with(
            azure_endpoint="https://test.openai.azure.com",
            azure_ad_token_provider=mock_token,
            api_version="2025-04-01-preview",
        )

    @patch("backend.plugins.chat_with_data_plugin.config")
    @patch("backend.plugins.chat_with_data_plugin.AIProjectClient")
    @patch("backend.plugins.chat_with_data_plugin.DefaultAzureCredential")
    def test_get_project_openai_client_success(
        self, mock_default_credential, mock_ai_project_client, mock_config
    ):
        """Test successful creation of project OpenAI client."""
        # Mock config values
        mock_config.AI_PROJECT_ENDPOINT = "https://test.ai.azure.com"
        mock_config.AZURE_OPENAI_PREVIEW_API_VERSION = "2025-04-01-preview"

        mock_credential = MagicMock()
        mock_default_credential.return_value = mock_credential

        mock_project_instance = MagicMock()
        mock_openai_client = MagicMock()
        mock_project_instance.inference.get_azure_openai_client.return_value = (
            mock_openai_client
        )
        mock_ai_project_client.return_value = mock_project_instance

        result = self.plugin.get_project_openai_client()

        assert result == mock_openai_client
        mock_default_credential.assert_called_once()
        mock_ai_project_client.assert_called_once_with(
            endpoint="https://test.ai.azure.com", credential=mock_credential
        )
        mock_project_instance.inference.get_azure_openai_client.assert_called_once_with(
            api_version="2025-04-01-preview"
        )

    @patch("backend.plugins.chat_with_data_plugin.get_connection")
    @patch.object(ChatWithDataPlugin, "get_openai_client")
    def test_get_sql_response_success(
        self, mock_get_openai_client, mock_get_connection
    ):
        """Test successful SQL response generation with AAD authentication."""
        # Setup mocks
        mock_client = MagicMock()
        mock_get_openai_client.return_value = mock_client

        mock_completion = MagicMock()
        mock_completion.choices = [MagicMock()]
        mock_completion.choices[0].message.content = (
            "SELECT * FROM Clients WHERE ClientId = 'client123';"
        )
        mock_client.chat.completions.create.return_value = mock_completion

        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [
            ("John Doe", "john@example.com", "Engineer")
        ]
        mock_connection.cursor.return_value = mock_cursor
        mock_get_connection.return_value = mock_connection

        result = self.plugin.get_SQL_Response("Find client details", "client123")

        # Verify the result
        assert "John Doe" in result
        assert "john@example.com" in result
        assert "Engineer" in result

        # Verify OpenAI was called
        mock_client.chat.completions.create.assert_called_once()

        # Verify database operations using AAD authentication
        mock_get_connection.assert_called_once()
        mock_cursor.execute.assert_called_once()
        mock_cursor.fetchall.assert_called_once()
        mock_connection.close.assert_called_once()

    @patch("backend.plugins.chat_with_data_plugin.get_connection")
    @patch.object(ChatWithDataPlugin, "get_openai_client")
    def test_get_sql_response_database_error(
        self, mock_get_openai_client, mock_get_connection
    ):
        """Test SQL response when database connection fails."""
        mock_client = MagicMock()
        mock_get_openai_client.return_value = mock_client

        mock_completion = MagicMock()
        mock_completion.choices = [MagicMock()]
        mock_completion.choices[0].message.content = "SELECT * FROM Clients;"
        mock_client.chat.completions.create.return_value = mock_completion

        # Simulate database connection error
        mock_get_connection.side_effect = Exception("Database connection failed")

        result = self.plugin.get_SQL_Response("Get all clients", "client123")

        assert "Error retrieving data from SQL" in result
        assert "Database connection failed" in result

    @patch.object(ChatWithDataPlugin, "get_openai_client")
    def test_get_sql_response_openai_error(self, mock_get_openai_client):
        """Test SQL response when OpenAI call fails."""
        mock_client = MagicMock()
        mock_get_openai_client.return_value = mock_client

        # Simulate OpenAI error
        mock_client.chat.completions.create.side_effect = Exception("OpenAI API error")

        result = self.plugin.get_SQL_Response("Get client data", "client123")

        assert "Error retrieving data from SQL" in result
        assert "OpenAI API error" in result

    @patch.object(ChatWithDataPlugin, "get_openai_client")
    def test_get_answers_from_calltranscripts_success(self, mock_get_openai_client):
        """Test successful retrieval of answers from call transcripts using AAD authentication."""
        # Setup mocks
        mock_client = MagicMock()
        mock_get_openai_client.return_value = mock_client

        # Mock OpenAI response (this method uses extra_body with data_sources)
        mock_completion = MagicMock()
        mock_completion.choices = [MagicMock()]
        mock_completion.choices[0].message.content = (
            "Based on call transcripts, the customer discussed investment options and risk tolerance."
        )
        mock_client.chat.completions.create.return_value = mock_completion

        result = self.plugin.get_answers_from_calltranscripts(
            "What did the customer discuss?", "client123"
        )

        # Verify the result
        assert "Based on call transcripts" in result
        assert "investment options" in result

        # Verify OpenAI was called with data_sources for Azure Search
        mock_client.chat.completions.create.assert_called_once()
        call_args = mock_client.chat.completions.create.call_args
        assert "extra_body" in call_args[1]
        assert "data_sources" in call_args[1]["extra_body"]

        # Verify the filter contains the client ID
        data_sources = call_args[1]["extra_body"]["data_sources"]
        assert len(data_sources) > 0
        assert "client_id eq 'client123'" in data_sources[0]["parameters"]["filter"]

    @patch.object(ChatWithDataPlugin, "get_openai_client")
    def test_get_answers_from_calltranscripts_no_results(self, mock_get_openai_client):
        """Test call transcripts search with no results."""
        mock_client = MagicMock()
        mock_get_openai_client.return_value = mock_client

        # Mock empty response
        mock_completion = MagicMock()
        mock_completion.choices = []
        mock_client.chat.completions.create.return_value = mock_completion

        result = self.plugin.get_answers_from_calltranscripts(
            "Nonexistent query", "client123"
        )

        assert "No data found for that client." in result

    @patch.object(ChatWithDataPlugin, "get_openai_client")
    def test_get_answers_from_calltranscripts_openai_error(
        self, mock_get_openai_client
    ):
        """Test call transcripts with OpenAI processing error."""
        mock_client = MagicMock()
        mock_get_openai_client.return_value = mock_client

        # Simulate OpenAI error
        mock_client.chat.completions.create.side_effect = Exception(
            "OpenAI processing failed"
        )

        result = self.plugin.get_answers_from_calltranscripts("Test query", "client123")

        assert "Error retrieving data from call transcripts" in result
        assert "OpenAI processing failed" in result

    def test_get_sql_response_missing_client_id(self):
        """Test SQL response with missing ClientId."""
        result = self.plugin.get_SQL_Response("Test query", "")
        assert "Error: ClientId is required" in result

        result = self.plugin.get_SQL_Response("Test query", None)
        assert "Error: ClientId is required" in result

    def test_get_sql_response_missing_input(self):
        """Test SQL response with missing input query."""
        result = self.plugin.get_SQL_Response("", "client123")
        assert "Error: Query input is required" in result

        result = self.plugin.get_SQL_Response(None, "client123")
        assert "Error: Query input is required" in result

    def test_get_answers_from_calltranscripts_missing_client_id(self):
        """Test call transcripts search with missing ClientId."""
        result = self.plugin.get_answers_from_calltranscripts("Test query", "")
        assert "Error: ClientId is required" in result

        result = self.plugin.get_answers_from_calltranscripts("Test query", None)
        assert "Error: ClientId is required" in result

    def test_get_answers_from_calltranscripts_missing_question(self):
        """Test call transcripts search with missing question."""
        result = self.plugin.get_answers_from_calltranscripts("", "client123")
        assert "Error: Question input is required" in result

        result = self.plugin.get_answers_from_calltranscripts(None, "client123")
        assert "Error: Question input is required" in result
