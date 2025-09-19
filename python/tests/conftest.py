"""Test configuration and fixtures."""

import pytest
from unittest.mock import Mock, patch
from llmx.types import Response, Choice, Usage


@pytest.fixture
def mock_response():
    """Mock response for testing."""
    return Response(
        text=[Choice(content="Hello, world!", finish_reason="stop")],
        usage=Usage(prompt_tokens=10, completion_tokens=5, total_tokens=15),
        provider="test",
        model="test-model",
        cached=False,
    )


@pytest.fixture
def mock_openai_response():
    """Mock OpenAI API response."""
    return {
        "choices": [
            {
                "message": {"content": "Hello, world!"},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 10,
            "completion_tokens": 5,
            "total_tokens": 15,
        },
    }


@pytest.fixture
def mock_claude_response():
    """Mock Claude API response."""
    return {
        "content": [{"type": "text", "text": "Hello, world!"}],
        "stop_reason": "end_turn",
        "usage": {
            "input_tokens": 10,
            "output_tokens": 5,
        },
    }


@pytest.fixture
def sample_messages():
    """Sample messages for testing."""
    return [
        {"role": "user", "content": "Hello!"},
    ]