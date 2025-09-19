"""Command line interface for LLMX."""

import argparse
import asyncio
import json
import os
import sys
from typing import Optional

from llmx import llm
from llmx.exceptions import LLMXError
from llmx.providers import list_providers


def create_parser() -> argparse.ArgumentParser:
    """Create the argument parser."""
    parser = argparse.ArgumentParser(
        prog="llmx",
        description="LLMX - A unified API for interacting with large language models",
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Chat command
    chat_parser = subparsers.add_parser("chat", help="Interactive chat with an LLM")
    chat_parser.add_argument(
        "--provider",
        required=True,
        choices=list_providers(),
        help="LLM provider to use",
    )
    chat_parser.add_argument("--model", help="Model to use (provider default if not specified)")
    chat_parser.add_argument("--prompt", help="Single prompt to send (non-interactive mode)")
    chat_parser.add_argument(
        "--max-tokens", type=int, help="Maximum tokens to generate"
    )
    chat_parser.add_argument(
        "--temperature", type=float, help="Sampling temperature (0.0 to 2.0)"
    )
    chat_parser.add_argument("--top-p", type=float, help="Top-p sampling parameter")
    chat_parser.add_argument(
        "--stream", action="store_true", help="Stream the response"
    )
    chat_parser.add_argument(
        "--no-cache", action="store_true", help="Disable caching"
    )
    chat_parser.add_argument(
        "--async", dest="use_async", action="store_true", help="Use async mode"
    )

    # Generate command (alias for chat with prompt)
    gen_parser = subparsers.add_parser("generate", help="Generate text from a prompt")
    gen_parser.add_argument(
        "--provider",
        required=True,
        choices=list_providers(),
        help="LLM provider to use",
    )
    gen_parser.add_argument("--model", help="Model to use")
    gen_parser.add_argument("prompt", help="Prompt to generate from")
    gen_parser.add_argument("--max-tokens", type=int, help="Maximum tokens to generate")
    gen_parser.add_argument("--temperature", type=float, help="Sampling temperature")
    gen_parser.add_argument("--top-p", type=float, help="Top-p sampling parameter")
    gen_parser.add_argument("--stream", action="store_true", help="Stream the response")
    gen_parser.add_argument("--no-cache", action="store_true", help="Disable caching")
    gen_parser.add_argument(
        "--async", dest="use_async", action="store_true", help="Use async mode"
    )

    # List command
    list_parser = subparsers.add_parser("list", help="List available providers")

    # Test command
    test_parser = subparsers.add_parser("test", help="Test provider connectivity")
    test_parser.add_argument(
        "--provider",
        choices=list_providers(),
        help="Provider to test (tests all if not specified)",
    )

    return parser


def print_providers():
    """Print available providers."""
    providers = list_providers()
    print("Available providers:")
    for provider in providers:
        print(f"  - {provider}")


def test_provider(provider_name: str) -> bool:
    """Test a single provider."""
    try:
        print(f"Testing {provider_name}...")
        generator = llm(provider=provider_name)

        # Try a simple generation
        messages = [{"role": "user", "content": "Hello"}]
        response = generator.generate(messages, max_tokens=10)

        print(f"✓ {provider_name}: Connected successfully")
        print(f"  Model: {response.model}")
        print(f"  Response: {response.text[0].content[:50]}...")
        return True

    except Exception as e:
        print(f"✗ {provider_name}: Failed - {e}")
        return False


def test_providers(provider_name: Optional[str] = None):
    """Test provider connectivity."""
    if provider_name:
        test_provider(provider_name)
    else:
        providers = list_providers()
        print(f"Testing {len(providers)} providers...")
        print()

        passed = 0
        for provider in providers:
            if test_provider(provider):
                passed += 1
            print()

        print(f"Results: {passed}/{len(providers)} providers working")


async def async_chat_mode(generator, stream: bool = False):
    """Async interactive chat mode."""
    print("LLMX Chat (async mode) - Type 'quit' to exit")
    print("-" * 40)

    messages = []

    while True:
        try:
            user_input = input("\nYou: ").strip()
            if user_input.lower() in ["quit", "exit", "q"]:
                break

            if not user_input:
                continue

            messages.append({"role": "user", "content": user_input})

            print("Assistant: ", end="", flush=True)

            if stream:
                content = ""
                async for chunk in await generator.async_generate(messages, stream=True):
                    print(chunk.content, end="", flush=True)
                    content += chunk.content
                    if chunk.done:
                        break
                print()  # New line after streaming
                messages.append({"role": "assistant", "content": content})
            else:
                response = await generator.async_generate(messages)
                content = response.text[0].content
                print(content)
                messages.append({"role": "assistant", "content": content})

        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"\nError: {e}")


def chat_mode(generator, stream: bool = False):
    """Interactive chat mode."""
    print("LLMX Chat - Type 'quit' to exit")
    print("-" * 30)

    messages = []

    while True:
        try:
            user_input = input("\nYou: ").strip()
            if user_input.lower() in ["quit", "exit", "q"]:
                break

            if not user_input:
                continue

            messages.append({"role": "user", "content": user_input})

            print("Assistant: ", end="", flush=True)

            if stream:
                content = ""
                for chunk in generator.generate(messages, stream=True):
                    print(chunk.content, end="", flush=True)
                    content += chunk.content
                    if chunk.done:
                        break
                print()  # New line after streaming
                messages.append({"role": "assistant", "content": content})
            else:
                response = generator.generate(messages)
                content = response.text[0].content
                print(content)
                messages.append({"role": "assistant", "content": content})

        except KeyboardInterrupt:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"\nError: {e}")


async def async_single_prompt(generator, prompt: str, **kwargs):
    """Handle async single prompt."""
    messages = [{"role": "user", "content": prompt}]

    if kwargs.get("stream"):
        async for chunk in await generator.async_generate(messages, **kwargs):
            print(chunk.content, end="", flush=True)
            if chunk.done:
                break
        print()  # New line after streaming
    else:
        response = await generator.async_generate(messages, **kwargs)
        print(response.text[0].content)


def single_prompt(generator, prompt: str, **kwargs):
    """Handle single prompt."""
    messages = [{"role": "user", "content": prompt}]

    if kwargs.get("stream"):
        for chunk in generator.generate(messages, **kwargs):
            print(chunk.content, end="", flush=True)
            if chunk.done:
                break
        print()  # New line after streaming
    else:
        response = generator.generate(messages, **kwargs)
        print(response.text[0].content)


def main():
    """Main CLI entry point."""
    parser = create_parser()
    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    try:
        if args.command == "list":
            print_providers()

        elif args.command == "test":
            test_providers(args.provider)

        elif args.command in ["chat", "generate"]:
            # Create generator
            generator = llm(
                provider=args.provider,
                model=args.model,
            )

            # Prepare generation kwargs
            gen_kwargs = {
                "use_cache": not args.no_cache,
                "stream": args.stream,
            }

            if args.max_tokens:
                gen_kwargs["max_tokens"] = args.max_tokens
            if args.temperature is not None:
                gen_kwargs["temperature"] = args.temperature
            if args.top_p is not None:
                gen_kwargs["top_p"] = args.top_p

            if args.command == "generate":
                # Single prompt mode
                if args.use_async:
                    asyncio.run(async_single_prompt(generator, args.prompt, **gen_kwargs))
                else:
                    single_prompt(generator, args.prompt, **gen_kwargs)

            else:  # chat command
                if hasattr(args, "prompt") and args.prompt:
                    # Single prompt mode
                    if args.use_async:
                        asyncio.run(async_single_prompt(generator, args.prompt, **gen_kwargs))
                    else:
                        single_prompt(generator, args.prompt, **gen_kwargs)
                else:
                    # Interactive mode
                    if args.use_async:
                        asyncio.run(async_chat_mode(generator, args.stream))
                    else:
                        chat_mode(generator, args.stream)

    except LLMXError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nGoodbye!")
        sys.exit(0)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()