from unittest.mock import MagicMock, patch

import pytest

from backend.plugins.chat_with_data_plugin import ChatWithDataPlugin


class TestChatWithDataPlugin:
    """Test suite for ChatWithDataPlugin class."""

    def setup_method(self):
        """Setup method to initialize plugin instance for each test."""
        self.plugin = ChatWithDataPlugin()

    @patch("backend.plugins.chat_with_data_plugin.config")
    @patch("backend.plugins.chat_with_data_plugin.openai.AzureOpenAI")
    @patch("backend.plugins.chat_with_data_plugin.get_bearer_token_provider")
    @patch("backend.plugins.chat_with_data_plugin.get_azure_credential")
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
    @patch("backend.plugins.chat_with_data_plugin.get_azure_credential")
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

    @pytest.mark.asyncio
    @patch("backend.plugins.chat_with_data_plugin.get_connection")
    @patch("backend.plugins.chat_with_data_plugin.config")
    @patch("backend.agents.agent_factory.AgentFactory.get_sql_agent")
    async def test_get_sql_response_success(self, mock_get_sql_agent, mock_config, mock_get_connection):
        mock_config.AI_PROJECT_ENDPOINT = "https://dummy.endpoint"
        mock_config.AZURE_OPENAI_MODEL = "gpt-4o-mini"
        mock_config.SQL_SYSTEM_PROMPT = "Test prompt"

        mock_agent = MagicMock()
        mock_agent.id = "mock-agent-id"
        mock_project_client = MagicMock()

        mock_thread = MagicMock()
        mock_thread.id = "thread123"
        mock_project_client.agents.threads.create.return_value = mock_thread

        mock_run = MagicMock()
        mock_run.status = "completed"
        mock_project_client.agents.runs.create_and_process.return_value = mock_run

        mock_message = MagicMock()
        mock_message.text.value = "SELECT * FROM Clients WHERE ClientId = 'client123';"
        mock_project_client.agents.messages.get_last_message_text_by_role.return_value = mock_message

        mock_get_sql_agent.return_value = {"agent": mock_agent, "client": mock_project_client}

        # Mock DB execution
        mock_connection = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [("John Doe", "john@example.com", "Engineer")]
        mock_connection.cursor.return_value = mock_cursor
        mock_get_connection.return_value = mock_connection

        result = await self.plugin.get_SQL_Response("Find client details", "client123")

        assert "John Doe" in result
        assert "john@example.com" in result
        assert "Engineer" in result

    @pytest.mark.asyncio
    @patch("backend.plugins.chat_with_data_plugin.get_connection")
    @patch("backend.plugins.chat_with_data_plugin.config")
    @patch("backend.agents.agent_factory.AgentFactory.get_sql_agent")
    async def test_get_sql_response_database_error(self, mock_get_sql_agent, mock_config, mock_get_connection):
        mock_config.AI_PROJECT_ENDPOINT = "https://dummy.endpoint"
        mock_config.AZURE_OPENAI_MODEL = "gpt-4o-mini"

        mock_agent = MagicMock()
        mock_agent.id = "mock-agent-id"
        mock_project_client = MagicMock()

        mock_thread = MagicMock()
        mock_thread.id = "thread123"
        mock_project_client.agents.threads.create.return_value = mock_thread

        mock_run = MagicMock()
        mock_run.status = "completed"
        mock_project_client.agents.runs.create_and_process.return_value = mock_run

        mock_message = MagicMock()
        mock_message.text.value = "SELECT * FROM Clients;"
        mock_project_client.agents.messages.get_last_message_text_by_role.return_value = mock_message

        mock_get_sql_agent.return_value = {"agent": mock_agent, "client": mock_project_client}

        mock_get_connection.side_effect = Exception("Database connection failed")

        result = await self.plugin.get_SQL_Response("Get all clients", "client123")

        assert "Error retrieving SQL data" in result
        assert "Database connection failed" in result

    @pytest.mark.asyncio
    @patch("backend.plugins.chat_with_data_plugin.config")
    @patch("backend.agents.agent_factory.AgentFactory.get_sql_agent")
    async def test_get_sql_response_openai_error(self, mock_get_sql_agent, mock_config):
        mock_config.AI_PROJECT_ENDPOINT = "https://dummy.endpoint"
        mock_config.AZURE_OPENAI_MODEL = "gpt-4o-mini"

        mock_agent = MagicMock()
        mock_agent.id = "mock-agent-id"
        mock_project_client = MagicMock()

        mock_thread = MagicMock()
        mock_thread.id = "thread123"
        mock_project_client.agents.threads.create.return_value = mock_thread

        # Simulate error during run processing
        mock_project_client.agents.runs.create_and_process.side_effect = Exception("OpenAI API error")

        mock_get_sql_agent.return_value = {"agent": mock_agent, "client": mock_project_client}

        plugin = ChatWithDataPlugin()
        result = await plugin.get_SQL_Response("Get client data", "client123")

        assert "Error retrieving SQL data" in result
        assert "OpenAI API error" in result

    @pytest.mark.asyncio
    @patch("backend.agents.agent_factory.AgentFactory.get_search_agent")
    async def test_get_answers_from_calltranscripts_success(
        self, mock_get_search_agent
    ):
        """Test successful retrieval of answers from call transcripts using AI Search Agent."""
        # Setup mocks for agent factory
        mock_agent = MagicMock()
        mock_agent.id = "test-agent-id"

        mock_project_client = MagicMock()
        mock_get_search_agent.return_value = {
            "agent": mock_agent,
            "client": mock_project_client,
        }

        # Mock project index creation
        mock_index = MagicMock()
        mock_index.name = "project-index-test"
        mock_index.version = "1"
        mock_project_client.indexes.create_or_update.return_value = mock_index

        # Mock agent update
        mock_project_client.agents.update_agent.return_value = mock_agent

        # Mock thread creation
        mock_thread = MagicMock()
        mock_thread.id = "test-thread-id"
        mock_project_client.agents.threads.create.return_value = mock_thread

        # Mock run creation and processing
        mock_run = MagicMock()
        mock_run.status = "completed"
        mock_project_client.agents.runs.create_and_process.return_value = mock_run

        # Mock message response
        mock_message = MagicMock()
        mock_message.text.value = "Based on call transcripts, the customer discussed investment options and risk tolerance."
        mock_project_client.agents.messages.get_last_message_text_by_role.return_value = (
            mock_message
        )

        result = await self.plugin.get_answers_from_calltranscripts(
            "What did the customer discuss?", "client123"
        )

        # Verify the result
        assert "Based on call transcripts" in result
        assert "investment options" in result

        # Verify agent factory was called
        mock_get_search_agent.assert_called_once()

        # Verify project index was created/updated
        mock_project_client.indexes.create_or_update.assert_called_once()

        # Verify agent was updated with search tool
        mock_project_client.agents.update_agent.assert_called_once()

        # Verify thread was created and deleted
        mock_project_client.agents.threads.create.assert_called_once()
        mock_project_client.agents.threads.delete.assert_called_once_with(
            "test-thread-id"
        )

        # Verify message was created and run was processed
        mock_project_client.agents.messages.create.assert_called_once()
        mock_project_client.agents.runs.create_and_process.assert_called_once()

    @pytest.mark.asyncio
    @patch("backend.agents.agent_factory.AgentFactory.get_search_agent")
    async def test_get_answers_from_calltranscripts_no_results(
        self, mock_get_search_agent
    ):
        """Test call transcripts search with no results."""
        # Setup mocks for agent factory
        mock_agent = MagicMock()
        mock_agent.id = "test-agent-id"

        mock_project_client = MagicMock()
        mock_get_search_agent.return_value = {
            "agent": mock_agent,
            "client": mock_project_client,
        }

        # Mock project index creation
        mock_index = MagicMock()
        mock_index.name = "project-index-test"
        mock_index.version = "1"
        mock_project_client.indexes.create_or_update.return_value = mock_index

        # Mock agent update
        mock_project_client.agents.update_agent.return_value = mock_agent

        # Mock thread creation
        mock_thread = MagicMock()
        mock_thread.id = "test-thread-id"
        mock_project_client.agents.threads.create.return_value = mock_thread

        # Mock run creation and processing
        mock_run = MagicMock()
        mock_run.status = "completed"
        mock_project_client.agents.runs.create_and_process.return_value = mock_run

        # Mock empty message response
        mock_project_client.agents.messages.get_last_message_text_by_role.return_value = (
            None
        )

        result = await self.plugin.get_answers_from_calltranscripts(
            "Nonexistent query", "client123"
        )

        assert "No data found for that client." in result

    @pytest.mark.asyncio
    @patch("backend.agents.agent_factory.AgentFactory.get_search_agent")
    async def test_get_answers_from_calltranscripts_openai_error(
        self, mock_get_search_agent
    ):
        """Test call transcripts with AI Search processing error."""
        # Setup mocks for agent factory
        mock_agent = MagicMock()
        mock_agent.id = "test-agent-id"

        mock_project_client = MagicMock()
        mock_get_search_agent.return_value = {
            "agent": mock_agent,
            "client": mock_project_client,
        }

        # Mock project index creation
        mock_index = MagicMock()
        mock_index.name = "project-index-test"
        mock_index.version = "1"
        mock_project_client.indexes.create_or_update.return_value = mock_index

        # Mock agent update
        mock_project_client.agents.update_agent.return_value = mock_agent

        # Mock thread creation
        mock_thread = MagicMock()
        mock_thread.id = "test-thread-id"
        mock_project_client.agents.threads.create.return_value = mock_thread

        # Simulate AI Search error
        mock_project_client.agents.runs.create_and_process.side_effect = Exception(
            "AI Search processing failed"
        )

        result = await self.plugin.get_answers_from_calltranscripts(
            "Test query", "client123"
        )

        assert "Error retrieving data from call transcripts" in result

    @pytest.mark.asyncio
    @patch("backend.agents.agent_factory.AgentFactory.get_search_agent")
    async def test_get_answers_from_calltranscripts_failed_run(
        self, mock_get_search_agent
    ):
        """Test call transcripts with failed AI Search run."""
        # Setup mocks for agent factory
        mock_agent = MagicMock()
        mock_agent.id = "test-agent-id"

        mock_project_client = MagicMock()
        mock_get_search_agent.return_value = {
            "agent": mock_agent,
            "client": mock_project_client,
        }

        # Mock project index creation
        mock_index = MagicMock()
        mock_index.name = "project-index-test"
        mock_index.version = "1"
        mock_project_client.indexes.create_or_update.return_value = mock_index

        # Mock agent update
        mock_project_client.agents.update_agent.return_value = mock_agent

        # Mock thread creation
        mock_thread = MagicMock()
        mock_thread.id = "test-thread-id"
        mock_project_client.agents.threads.create.return_value = mock_thread

        # Mock failed run
        mock_run = MagicMock()
        mock_run.status = "failed"
        mock_run.last_error = "AI Search run failed"
        mock_project_client.agents.runs.create_and_process.return_value = mock_run

        result = await self.plugin.get_answers_from_calltranscripts(
            "Test query", "client123"
        )

        assert "Error retrieving data from call transcripts" in result

    @pytest.mark.asyncio
    @patch("backend.agents.agent_factory.AgentFactory.get_search_agent")
    async def test_get_answers_from_calltranscripts_empty_response(
        self, mock_get_search_agent
    ):
        """Test call transcripts with empty response text."""
        # Setup mocks for agent factory
        mock_agent = MagicMock()
        mock_agent.id = "test-agent-id"

        mock_project_client = MagicMock()
        mock_get_search_agent.return_value = {
            "agent": mock_agent,
            "client": mock_project_client,
        }

        # Mock project index creation
        mock_index = MagicMock()
        mock_index.name = "project-index-test"
        mock_index.version = "1"
        mock_project_client.indexes.create_or_update.return_value = mock_index

        # Mock agent update
        mock_project_client.agents.update_agent.return_value = mock_agent

        # Mock thread creation
        mock_thread = MagicMock()
        mock_thread.id = "test-thread-id"
        mock_project_client.agents.threads.create.return_value = mock_thread

        # Mock run creation and processing
        mock_run = MagicMock()
        mock_run.status = "completed"
        mock_project_client.agents.runs.create_and_process.return_value = mock_run

        # Mock message with empty response
        mock_message = MagicMock()
        mock_message.text.value = "   "  # Empty/whitespace response
        mock_project_client.agents.messages.get_last_message_text_by_role.return_value = (
            mock_message
        )

        result = await self.plugin.get_answers_from_calltranscripts(
            "Test query", "client123"
        )

        assert "No data found for that client." in result

    @pytest.mark.asyncio
    async def test_get_sql_response_missing_client_id(self):
        """Test SQL response with missing ClientId."""
        result = await self.plugin.get_SQL_Response("Test query", "")
        assert "Error: ClientId is required" in result

        result = await self.plugin.get_SQL_Response("Test query", None)
        assert "Error: ClientId is required" in result

    @pytest.mark.asyncio
    async def test_get_sql_response_missing_input(self):
        """Test SQL response with missing input query."""
        result = await self.plugin.get_SQL_Response("", "client123")
        assert "Error: Query input is required" in result

        result = await self.plugin.get_SQL_Response(None, "client123")
        assert "Error: Query input is required" in result

    @pytest.mark.asyncio
    async def test_get_answers_from_calltranscripts_missing_client_id(self):
        """Test call transcripts search with missing ClientId."""
        result = await self.plugin.get_answers_from_calltranscripts("Test query", "")
        assert "Error: ClientId is required" in result

        result = await self.plugin.get_answers_from_calltranscripts("Test query", None)
        assert "Error: ClientId is required" in result

    @pytest.mark.asyncio
    async def test_get_answers_from_calltranscripts_missing_question(self):
        """Test call transcripts search with missing question."""
        result = await self.plugin.get_answers_from_calltranscripts("", "client123")
        assert "Error: Question input is required" in result

        result = await self.plugin.get_answers_from_calltranscripts(None, "client123")
        assert "Error: Question input is required" in result
