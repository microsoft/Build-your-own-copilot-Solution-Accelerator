import pytest
import asyncio
import json
from app import format_as_ndjson  # Assuming 'app' is your module name

@pytest.mark.asyncio
async def test_format_as_ndjson():
    # Mock an async generator that yields a single object
    async def mock_stream():
        yield {"message": "I ❤️ 🐍 \n and escaped newlines"}

    # Collect the results from the async generator
    results = []
    async for result in format_as_ndjson(mock_stream()):
        results.append(result)

    # Verify the output
    expected = json.dumps({"message": "I ❤️ 🐍 \n and escaped newlines"}) + "\n"
    assert results == [expected]

