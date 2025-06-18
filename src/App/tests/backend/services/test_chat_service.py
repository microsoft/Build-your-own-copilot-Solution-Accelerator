import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from backend.services.chat_service import stream_response_from_wealth_assistant


class TestChatService:
    """Test suite for chat service functions."""

    @pytest.mark.asyncio
    async def test_stream_response_happy_path(self):
        """Test successful streaming response with default prompt."""
        # Arrange
        query = "What is the portfolio value for my client?"
        client_id = "123"
        client_name = "John Doe"
        
        # Create mock agent
        mock_agent = MagicMock()
        mock_thread = MagicMock()
        mock_thread.delete = AsyncMock()
        mock_chunk = MagicMock()
        mock_chunk.content = "Response chunk"
        mock_chunk.thread = mock_thread
        
        # Create a simple async generator function
        async def mock_stream():
            yield mock_chunk
        
        # Mock invoke_stream to return the async generator
        mock_agent.invoke_stream = MagicMock(return_value=mock_stream())
        
        # Mock current_app.agent
        mock_current_app = MagicMock()
        mock_current_app.agent = mock_agent
        
        # Mock config
        mock_config = MagicMock()
        mock_config.STREAM_TEXT_SYSTEM_PROMPT = ""  # Use default prompt
        
        with patch("backend.services.chat_service.current_app", mock_current_app), \
             patch("backend.services.chat_service.get_client_name_from_db", return_value=client_name), \
             patch("backend.services.chat_service.config", mock_config):
            
            # Act
            generator_func = await stream_response_from_wealth_assistant(query, client_id)
            response_chunks = []
            async for chunk in generator_func():
                response_chunks.append(chunk)
            
            # Assert
            assert len(response_chunks) == 1
            assert response_chunks[0] == "Response chunk"
            mock_agent.invoke_stream.assert_called_once()
            
            # Verify the additional_instructions were set correctly
            call_args = mock_agent.invoke_stream.call_args
            assert call_args[1]['additional_instructions'].find(client_name) != -1
            assert call_args[1]['additional_instructions'].find(client_id) != -1
            mock_thread.delete.assert_called_once()

    @pytest.mark.asyncio
    async def test_stream_response_exception_handling(self):
        """Test that exceptions are properly handled."""
        # Arrange
        query = "Test query"
        client_id = "999"
        client_name = "Test Client"
        
        mock_agent = MagicMock()
        mock_agent.invoke_stream.side_effect = Exception("Test exception")
        
        mock_current_app = MagicMock()
        mock_current_app.agent = mock_agent
        
        mock_config = MagicMock()
        mock_config.STREAM_TEXT_SYSTEM_PROMPT = "Test prompt"
        
        with patch("backend.services.chat_service.current_app", mock_current_app), \
             patch("backend.services.chat_service.get_client_name_from_db", return_value=client_name), \
             patch("backend.services.chat_service.config", mock_config):
            
            # Act & Assert
            with pytest.raises(Exception, match="Test exception"):
                await stream_response_from_wealth_assistant(query, client_id)

    @pytest.mark.asyncio
    async def test_stream_response_empty_iterator(self):
        """Test behavior with empty iterator (no chunks) - tests the UnboundLocalError bug."""
        # Arrange
        query = "Test query"
        client_id = "123"
        client_name = "Test Client"
        
        mock_agent = MagicMock()
        
        # Empty iterator - no chunks yielded
        async def mock_stream():
            # Empty generator - yields nothing
            return
            yield  # This line never executes
        
        mock_agent.invoke_stream = MagicMock(return_value=mock_stream())
        
        mock_current_app = MagicMock()
        mock_current_app.agent = mock_agent
        
        mock_config = MagicMock()
        mock_config.STREAM_TEXT_SYSTEM_PROMPT = ""
        
        with patch("backend.services.chat_service.current_app", mock_current_app), \
             patch("backend.services.chat_service.get_client_name_from_db", return_value=client_name), \
             patch("backend.services.chat_service.config", mock_config):
            
            # Act - This should catch the UnboundLocalError from the implementation
            with pytest.raises(UnboundLocalError, match="cannot access local variable 'chunk'"):
                generator_func = await stream_response_from_wealth_assistant(query, client_id)
                response_chunks = []
                async for chunk in generator_func():
                    response_chunks.append(chunk)

    @pytest.mark.asyncio
    async def test_default_prompt_formatting(self):
        """Test the default prompt template replacement logic."""
        # Arrange
        query = "Investment question"
        client_id = "client_123"
        client_name = "Alice Cooper"
        
        mock_agent = MagicMock()
        mock_thread = MagicMock()
        mock_thread.delete = AsyncMock()
        mock_chunk = MagicMock()
        mock_chunk.content = "Default prompt response"
        mock_chunk.thread = mock_thread
        
        async def mock_stream():
            yield mock_chunk
        
        mock_agent.invoke_stream = MagicMock(return_value=mock_stream())
        
        mock_current_app = MagicMock()
        mock_current_app.agent = mock_agent
        
        mock_config = MagicMock()
        mock_config.STREAM_TEXT_SYSTEM_PROMPT = ""  # Empty, should use default
        
        with patch("backend.services.chat_service.current_app", mock_current_app), \
             patch("backend.services.chat_service.get_client_name_from_db", return_value=client_name), \
             patch("backend.services.chat_service.config", mock_config):
            
            # Act
            generator_func = await stream_response_from_wealth_assistant(query, client_id)
            response_chunks = []
            async for chunk in generator_func():
                response_chunks.append(chunk)
            
            # Assert
            call_args = mock_agent.invoke_stream.call_args
            additional_instructions = call_args[1]['additional_instructions']
            
            # Verify the default prompt contains expected elements
            assert client_name in additional_instructions
            assert client_id in additional_instructions
            assert "selected client" in additional_instructions.lower()
            assert "sql" in additional_instructions.lower()
            mock_thread.delete.assert_called_once()