import pytest
from unittest.mock import patch, AsyncMock

from backend.agents.agent_factory import AgentFactory


class TestAgentFactory:
    """Test suite for AgentFactory class."""

    @pytest.fixture
    def reset_singleton(self):
        """Fixture to reset the singleton between tests"""
        original_instance = AgentFactory._instance
        AgentFactory._instance = None
        yield
        AgentFactory._instance = original_instance

    @pytest.mark.asyncio
    @patch("backend.agents.agent_factory.AzureAIAgent")
    @patch("backend.agents.agent_factory.DefaultAzureCredential")
    @patch("backend.agents.agent_factory.AzureAIAgentSettings")
    async def test_get_instance_creates_agent_when_none_exists(
        self, mock_settings, mock_credential, mock_agent, reset_singleton
    ):
        """Test that get_instance creates a new agent when none exists."""
        # Arrange
        mock_agent_instance = AsyncMock()
        mock_agent.return_value = mock_agent_instance
        mock_client = AsyncMock()
        mock_agent.create_client.return_value = mock_client
        
        # Act
        result = await AgentFactory.get_instance()
        
        # Assert
        assert result is not None
        assert AgentFactory._instance is not None
        assert AgentFactory._instance is result
        assert mock_agent.create_client.called
        assert mock_agent.called

    @pytest.mark.asyncio
    async def test_get_instance_returns_existing_agent(self, reset_singleton):
        """Test that get_instance returns existing agent when one exists."""
        # Arrange
        mock_instance = AsyncMock()
        AgentFactory._instance = mock_instance
        
        # Act
        result = await AgentFactory.get_instance()
        
        # Assert
        assert result is mock_instance

    @pytest.mark.asyncio
    async def test_multiple_calls_return_same_instance(self, reset_singleton):
        """Test that multiple calls to get_instance return the same instance."""
        # Arrange
        mock_agent = AsyncMock()
        mock_client = AsyncMock()
        mock_agent_definition = AsyncMock()
        mock_agent_instance = AsyncMock()
        
        with patch("backend.agents.agent_factory.AzureAIAgent") as mock_agent_class:
            mock_agent_class.create_client.return_value = mock_client
            mock_client.agents.create_agent = AsyncMock(return_value=mock_agent_definition)
            mock_agent_class.return_value = mock_agent_instance
            
            with patch("backend.agents.agent_factory.DefaultAzureCredential"):
                with patch("backend.agents.agent_factory.AzureAIAgentSettings"):
                    # Act
                    instance1 = await AgentFactory.get_instance()
                    instance2 = await AgentFactory.get_instance()
        
        # Assert
        assert instance1 is instance2

    @pytest.mark.asyncio
    async def test_delete_instance_when_none_exists(self, reset_singleton):
        """Test that delete_instance handles when no agent exists."""
        # Arrange
        AgentFactory._instance = None
        
        # Act
        await AgentFactory.delete_instance()
        
        # Assert
        assert AgentFactory._instance is None

    @pytest.mark.asyncio
    async def test_delete_instance_removes_existing_agent(self, reset_singleton):
        """Test that delete_instance properly removes an existing agent."""
        # Arrange
        mock_agent = AsyncMock()
        mock_agent.client = AsyncMock()
        mock_agent.id = "test-agent-id"
        AgentFactory._instance = mock_agent
        
        # Act
        await AgentFactory.delete_instance()
        
        # Assert
        assert AgentFactory._instance is None
        mock_agent.client.agents.delete_agent.assert_called_once_with(mock_agent.id)