"""Streaming examples for LLMX."""

import asyncio
from llmx import llm


def basic_streaming():
    """Basic streaming example."""
    print("=== Basic Streaming ===")

    generator = llm(provider="openai")
    messages = [{"role": "user", "content": "Write a short story about a time traveler"}]

    print("Assistant: ", end="", flush=True)

    full_content = ""
    for chunk in generator.generate(messages, stream=True, max_tokens=200):
        print(chunk.content, end="", flush=True)
        full_content += chunk.content

        if chunk.done:
            print(f"\n\n[Stream completed. Total characters: {len(full_content)}]")
            break


def streaming_with_processing():
    """Streaming with real-time processing."""
    print("\n=== Streaming with Processing ===")

    generator = llm(provider="openai")
    messages = [{"role": "user", "content": "List 10 programming languages and briefly describe each"}]

    print("Processing stream in real-time:")
    print("Assistant: ", end="", flush=True)

    word_count = 0
    char_count = 0

    for chunk in generator.generate(messages, stream=True):
        print(chunk.content, end="", flush=True)

        # Process chunk in real-time
        char_count += len(chunk.content)
        word_count += len(chunk.content.split())

        if chunk.done:
            print(f"\n\n[Final stats: {word_count} words, {char_count} characters]")
            break


async def async_streaming():
    """Async streaming example."""
    print("\n=== Async Streaming ===")

    generator = llm(provider="openai")
    messages = [{"role": "user", "content": "Explain machine learning in simple terms"}]

    print("Assistant: ", end="", flush=True)

    async for chunk in await generator.async_generate(messages, stream=True, max_tokens=150):
        print(chunk.content, end="", flush=True)

        if chunk.done:
            print("\n\n[Async stream completed]")
            break


def streaming_conversation():
    """Interactive streaming conversation."""
    print("\n=== Streaming Conversation ===")

    generator = llm(provider="openai")
    messages = []

    print("Interactive streaming chat (type 'quit' to exit)")
    print("-" * 50)

    while True:
        user_input = input("\nYou: ").strip()
        if user_input.lower() in ['quit', 'exit', 'q']:
            break

        if not user_input:
            continue

        messages.append({"role": "user", "content": user_input})

        print("Assistant: ", end="", flush=True)

        response_content = ""
        for chunk in generator.generate(messages, stream=True):
            print(chunk.content, end="", flush=True)
            response_content += chunk.content

            if chunk.done:
                break

        messages.append({"role": "assistant", "content": response_content})
        print()  # New line after response


def streaming_with_interruption():
    """Streaming with interruption handling."""
    print("\n=== Streaming with Interruption ===")

    generator = llm(provider="openai")
    messages = [{"role": "user", "content": "Write a very long essay about the history of computers"}]

    print("Streaming response (Press Ctrl+C to interrupt):")
    print("Assistant: ", end="", flush=True)

    try:
        for chunk in generator.generate(messages, stream=True):
            print(chunk.content, end="", flush=True)

            if chunk.done:
                print("\n\n[Stream completed naturally]")
                break

    except KeyboardInterrupt:
        print("\n\n[Stream interrupted by user]")


def compare_streaming_vs_non_streaming():
    """Compare streaming vs non-streaming response times."""
    print("\n=== Streaming vs Non-streaming Comparison ===")

    generator = llm(provider="openai")
    messages = [{"role": "user", "content": "Explain quantum computing"}]

    import time

    # Non-streaming
    print("Non-streaming mode:")
    start_time = time.time()
    response = generator.generate(messages, max_tokens=100)
    end_time = time.time()

    print(f"Response: {response.text[0].content}")
    print(f"Time to complete: {end_time - start_time:.2f}s")
    print(f"Time to first token: {end_time - start_time:.2f}s (same as completion)")

    # Streaming
    print("\nStreaming mode:")
    start_time = time.time()
    first_token_time = None

    print("Assistant: ", end="", flush=True)
    for chunk in generator.generate(messages, stream=True, max_tokens=100):
        if first_token_time is None and chunk.content:
            first_token_time = time.time()

        print(chunk.content, end="", flush=True)

        if chunk.done:
            end_time = time.time()
            break

    print(f"\nTime to first token: {first_token_time - start_time:.2f}s")
    print(f"Time to complete: {end_time - start_time:.2f}s")


if __name__ == "__main__":
    import os

    if not os.getenv("OPENAI_API_KEY"):
        print("Please set OPENAI_API_KEY environment variable to run these examples.")
        exit(1)

    basic_streaming()
    streaming_with_processing()

    # Run async example
    asyncio.run(async_streaming())

    # Uncomment these for interactive examples
    # streaming_conversation()
    # streaming_with_interruption()

    compare_streaming_vs_non_streaming()