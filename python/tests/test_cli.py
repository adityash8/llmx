"""Tests for CLI functionality."""

import pytest
from unittest.mock import Mock, patch
from llmx.cli import create_parser, test_provider, main


class TestCLIParser:
    """Test CLI argument parser."""

    def test_parser_creation(self):
        """Test parser creation."""
        parser = create_parser()
        assert parser.prog == "llmx"

    def test_chat_command(self):
        """Test chat command parsing."""
        parser = create_parser()
        args = parser.parse_args(["chat", "--provider", "openai", "--model", "gpt-4"])

        assert args.command == "chat"
        assert args.provider == "openai"
        assert args.model == "gpt-4"

    def test_generate_command(self):
        """Test generate command parsing."""
        parser = create_parser()
        args = parser.parse_args(["generate", "--provider", "openai", "Hello world"])

        assert args.command == "generate"
        assert args.provider == "openai"
        assert args.prompt == "Hello world"

    def test_list_command(self):
        """Test list command parsing."""
        parser = create_parser()
        args = parser.parse_args(["list"])

        assert args.command == "list"

    def test_test_command(self):
        """Test test command parsing."""
        parser = create_parser()
        args = parser.parse_args(["test", "--provider", "openai"])

        assert args.command == "test"
        assert args.provider == "openai"


class TestCLIFunctions:
    """Test CLI helper functions."""

    @patch("llmx.cli.llm")
    @patch("builtins.print")
    def test_test_provider_success(self, mock_print, mock_llm):
        """Test successful provider test."""
        # Setup mock
        mock_generator = Mock()
        mock_response = Mock()
        mock_response.model = "gpt-3.5-turbo"
        mock_response.text = [Mock(content="Hello, world!")]
        mock_generator.generate.return_value = mock_response
        mock_llm.return_value = mock_generator

        result = test_provider("openai")

        assert result is True
        mock_llm.assert_called_once_with(provider="openai")
        mock_generator.generate.assert_called_once()

    @patch("llmx.cli.llm")
    @patch("builtins.print")
    def test_test_provider_failure(self, mock_print, mock_llm):
        """Test failed provider test."""
        # Setup mock to raise exception
        mock_llm.side_effect = Exception("API key not found")

        result = test_provider("openai")

        assert result is False
        mock_llm.assert_called_once_with(provider="openai")

    @patch("sys.argv", ["llmx", "list"])
    @patch("llmx.cli.print_providers")
    def test_main_list_command(self, mock_print_providers):
        """Test main function with list command."""
        main()
        mock_print_providers.assert_called_once()

    @patch("sys.argv", ["llmx"])
    @patch("llmx.cli.create_parser")
    def test_main_no_command(self, mock_create_parser):
        """Test main function with no command."""
        mock_parser = Mock()
        mock_parser.parse_args.return_value = Mock(command=None)
        mock_create_parser.return_value = mock_parser

        main()
        mock_parser.print_help.assert_called_once()