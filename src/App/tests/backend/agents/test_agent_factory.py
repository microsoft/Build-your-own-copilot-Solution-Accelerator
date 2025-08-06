from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from backend.agents.agent_factory import AgentFactory


class TestAgentFactory:
    """Test suite for AgentFactory class."""

    @pytest.fixture
    def reset_singleton(self):
        """Fixture to reset the singleton between tests"""
        original_wealth_advisor = AgentFactory._wealth_advisor_agent
        original_search_agent = AgentFactory._search_agent
        AgentFactory._wealth_advisor_agent = None
        AgentFactory._search_agent = None
        yield
        AgentFactory._wealth_advisor_agent = original_wealth_advisor
        AgentFactory._search_agent = original_search_agent

    @pytest.mark.asyncio
    @patch("backend.agents.agent_factory.AzureAIAgent")
    @patch("backend.agents.agent_factory.get_azure_credential_async")
    @patch("backend.agents.agent_factory.AzureAIAgentSettings")
    @patch("backend.agents.agent_factory.ChatWithDataPlugin")
    async def test_get_wealth_advisor_agent_creates_agent_when_none_exists(
        self, mock_plugin, mock_settings, mock_credential, mock_agent, reset_singleton
    ):
        """Test that get_wealth_advisor_agent creates a new agent when none exists."""
        # Arrange
        mock_agent_instance = AsyncMock()
        mock_agent.return_value = mock_agent_instance
        mock_client = AsyncMock()
        mock_agent.create_client.return_value = mock_client
        mock_agent_definition = AsyncMock()
        mock_client.agents.create_agent.return_value = mock_agent_definition
        mock_settings_instance = MagicMock()
        mock_settings_instance.endpoint = "https://test.endpoint.com"
        mock_settings_instance.model_deployment_name = "test-model"
        mock_settings.return_value = mock_settings_instance

        # Act
        result = await AgentFactory.get_wealth_advisor_agent()

        # Assert
        assert result is not None
        assert AgentFactory._wealth_advisor_agent is not None
        assert AgentFactory._wealth_advisor_agent is result
        mock_agent.create_client.assert_called_once()
        mock_client.agents.create_agent.assert_called_once_with(
            model="test-model",
            name="WealthAdvisor",
            instructions='''You are a helpful assistant to a Wealth Advisor.
                If the question is unrelated to data but is conversational (e.g., greetings or follow-ups), respond appropriately using context, do not use external tools or perform any web searches for these conversational inputs.''',
        )
        mock_agent.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_wealth_advisor_agent_returns_existing_agent(
        self, reset_singleton
    ):
        """Test that get_wealth_advisor_agent returns existing agent when one exists."""
        # Arrange
        mock_instance = AsyncMock()
        AgentFactory._wealth_advisor_agent = mock_instance

        # Act
        result = await AgentFactory.get_wealth_advisor_agent()

        # Assert
        assert result is mock_instance

    @pytest.mark.asyncio
    @patch("backend.agents.agent_factory.config")
    @patch("backend.agents.agent_factory.AIProjectClient")
    @patch("backend.agents.agent_factory.get_azure_credential")
    async def test_get_search_agent_creates_agent_when_none_exists(
        self, mock_credential_sync, mock_ai_project_client, mock_config, reset_singleton
    ):
        """Test that get_search_agent creates a new agent when none exists."""
        # Arrange
        mock_config.CALL_TRANSCRIPT_SYSTEM_PROMPT = "Test search agent instructions"
        mock_config.AI_PROJECT_ENDPOINT = "https://test.ai.endpoint.com"
        mock_config.AZURE_OPENAI_MODEL = "test-search-model"

        mock_project_client_instance = MagicMock()
        mock_ai_project_client.return_value = mock_project_client_instance
        mock_agent = MagicMock()
        mock_project_client_instance.agents.create_agent.return_value = mock_agent

        # Act
        result = await AgentFactory.get_search_agent()

        # Assert
        assert result is not None
        assert AgentFactory._search_agent is not None
        assert AgentFactory._search_agent is result
        assert result["agent"] is mock_agent
        assert result["client"] is mock_project_client_instance
        mock_ai_project_client.assert_called_once_with(
            endpoint="https://test.ai.endpoint.com",
            credential=mock_credential_sync.return_value,
            api_version="2025-05-01",
        )
        mock_project_client_instance.agents.create_agent.assert_called_once_with(
            model="test-search-model",
            instructions="Test search agent instructions",
            name="CallTranscriptSearchAgent",
        )

    @pytest.mark.asyncio
    @patch("backend.agents.agent_factory.config")
    @patch("backend.agents.agent_factory.AIProjectClient")
    @patch("backend.agents.agent_factory.get_azure_credential")
    async def test_get_search_agent_with_default_instructions(
        self, mock_credential_sync, mock_ai_project_client, mock_config, reset_singleton
    ):
        """Test that get_search_agent uses default instructions when config is empty."""
        # Arrange
        mock_config.CALL_TRANSCRIPT_SYSTEM_PROMPT = None
        mock_config.AI_PROJECT_ENDPOINT = "https://test.ai.endpoint.com"
        mock_config.AZURE_OPENAI_MODEL = "test-search-model"

        mock_project_client_instance = MagicMock()
        mock_ai_project_client.return_value = mock_project_client_instance
        mock_agent = MagicMock()
        mock_project_client_instance.agents.create_agent.return_value = mock_agent

        # Act
        result = await AgentFactory.get_search_agent()

        # Assert
        assert result is not None
        expected_default_instructions = (
            "You are an assistant who supports wealth advisors in preparing for client meetings. "
            "You have access to the client's past meeting call transcripts via AI Search tool. "
            "When answering questions, especially summary requests, provide a detailed and structured response that includes key topics, concerns, decisions, and trends. "
            "If no data is available, state 'No relevant data found for previous meetings.'"
        )
        mock_project_client_instance.agents.create_agent.assert_called_once_with(
            model="test-search-model",
            instructions=expected_default_instructions,
            name="CallTranscriptSearchAgent",
        )

    @pytest.mark.asyncio
    async def test_get_search_agent_returns_existing_agent(self, reset_singleton):
        """Test that get_search_agent returns existing agent when one exists."""
        # Arrange
        mock_agent_dict = {"agent": MagicMock(), "client": MagicMock()}
        AgentFactory._search_agent = mock_agent_dict

        # Act
        result = await AgentFactory.get_search_agent()

        # Assert
        assert result is mock_agent_dict

    @pytest.mark.asyncio
    async def test_multiple_calls_return_same_wealth_advisor_instance(
        self, reset_singleton
    ):
        """Test that multiple calls to get_wealth_advisor_agent return the same instance."""
        # Arrange
        mock_client = AsyncMock()
        mock_agent_definition = AsyncMock()
        mock_agent_instance = AsyncMock()

        with patch("backend.agents.agent_factory.AzureAIAgent") as mock_agent_class:
            mock_agent_class.create_client.return_value = mock_client
            mock_client.agents.create_agent = AsyncMock(
                return_value=mock_agent_definition
            )
            mock_agent_class.return_value = mock_agent_instance

            with patch("backend.agents.agent_factory.get_azure_credential_async"):
                with patch("backend.agents.agent_factory.AzureAIAgentSettings"):
                    with patch("backend.agents.agent_factory.ChatWithDataPlugin"):
                        # Act
                        instance1 = await AgentFactory.get_wealth_advisor_agent()
                        instance2 = await AgentFactory.get_wealth_advisor_agent()

        # Assert
        assert instance1 is instance2

    @pytest.mark.asyncio
    async def test_multiple_calls_return_same_search_agent_instance(
        self, reset_singleton
    ):
        """Test that multiple calls to get_search_agent return the same instance."""
        with patch("backend.agents.agent_factory.config") as mock_config:
            with patch(
                "backend.agents.agent_factory.AIProjectClient"
            ) as mock_ai_project_client:
                with patch("backend.agents.agent_factory.get_azure_credential"):
                    mock_config.CALL_TRANSCRIPT_SYSTEM_PROMPT = "Test instructions"
                    mock_config.AI_PROJECT_ENDPOINT = "https://test.endpoint.com"
                    mock_config.AZURE_OPENAI_MODEL = "test-model"

                    mock_project_client_instance = MagicMock()
                    mock_ai_project_client.return_value = mock_project_client_instance
                    mock_agent = MagicMock()
                    mock_project_client_instance.agents.create_agent.return_value = (
                        mock_agent
                    )

                    # Act
                    instance1 = await AgentFactory.get_search_agent()
                    instance2 = await AgentFactory.get_search_agent()

                    # Assert
                    assert instance1 is instance2

    @pytest.mark.asyncio
    async def test_delete_all_agent_instance_when_none_exists(self, reset_singleton):
        """Test that delete_all_agent_instance handles when no agents exist."""
        # Arrange
        AgentFactory._wealth_advisor_agent = None
        AgentFactory._search_agent = None

        # Act
        await AgentFactory.delete_all_agent_instance()

        # Assert
        assert AgentFactory._wealth_advisor_agent is None
        assert AgentFactory._search_agent is None

    @pytest.mark.asyncio
    async def test_delete_all_agent_instance_removes_existing_agents(
        self, reset_singleton
    ):
        """Test that delete_all_agent_instance properly removes existing agents."""
        # Arrange
        mock_wealth_advisor_agent = AsyncMock()
        mock_wealth_advisor_agent.client = AsyncMock()
        mock_wealth_advisor_agent.id = "test-wealth-advisor-id"
        AgentFactory._wealth_advisor_agent = mock_wealth_advisor_agent

        mock_search_client = MagicMock()
        mock_search_agent = MagicMock()
        mock_search_agent.id = "test-search-agent-id"
        AgentFactory._search_agent = {
            "agent": mock_search_agent,
            "client": mock_search_client,
        }

        # Act
        await AgentFactory.delete_all_agent_instance()

        # Assert
        assert AgentFactory._wealth_advisor_agent is None
        assert AgentFactory._search_agent is None
        mock_wealth_advisor_agent.client.agents.delete_agent.assert_called_once_with(
            "test-wealth-advisor-id"
        )
        mock_search_client.agents.delete_agent.assert_called_once_with(
            "test-search-agent-id"
        )
        mock_search_client.close.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_all_agent_instance_handles_only_wealth_advisor(
        self, reset_singleton
    ):
        """Test that delete_all_agent_instance handles when only wealth advisor exists."""
        # Arrange
        mock_wealth_advisor_agent = AsyncMock()
        mock_wealth_advisor_agent.client = AsyncMock()
        mock_wealth_advisor_agent.id = "test-wealth-advisor-id"
        AgentFactory._wealth_advisor_agent = mock_wealth_advisor_agent
        AgentFactory._search_agent = None

        # Act
        await AgentFactory.delete_all_agent_instance()

        # Assert
        assert AgentFactory._wealth_advisor_agent is None
        assert AgentFactory._search_agent is None
        mock_wealth_advisor_agent.client.agents.delete_agent.assert_called_once_with(
            "test-wealth-advisor-id"
        )

    @pytest.mark.asyncio
    async def test_delete_all_agent_instance_handles_only_search_agent(
        self, reset_singleton
    ):
        """Test that delete_all_agent_instance handles when only search agent exists."""
        # Arrange
        mock_search_client = MagicMock()
        mock_search_agent = MagicMock()
        mock_search_agent.id = "test-search-agent-id"
        AgentFactory._wealth_advisor_agent = None
        AgentFactory._search_agent = {
            "agent": mock_search_agent,
            "client": mock_search_client,
        }

        # Act
        await AgentFactory.delete_all_agent_instance()

        # Assert
        assert AgentFactory._wealth_advisor_agent is None
        assert AgentFactory._search_agent is None
        mock_search_client.agents.delete_agent.assert_called_once_with(
            "test-search-agent-id"
        )
        mock_search_client.close.assert_called_once()
