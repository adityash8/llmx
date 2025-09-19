"""Async usage examples for LLMX."""

import asyncio
import time
from llmx import llm


async def basic_async_example():
    """Basic async generation example."""
    print("=== Basic Async Example ===")

    generator = llm(provider="openai")
    messages = [{"role": "user", "content": "Hello from async!"}]

    response = await generator.async_generate(messages)
    print(f"Response: {response.text[0].content}")


async def concurrent_generations():
    """Example of concurrent generations."""
    print("\n=== Concurrent Generations ===")

    generator = llm(provider="openai")

    # Create multiple different prompts
    prompts = [
        "What is Python?",
        "What is JavaScript?",
        "What is Rust?",
        "What is Go?",
    ]

    # Create tasks for concurrent execution
    tasks = []
    for prompt in prompts:
        messages = [{"role": "user", "content": prompt}]
        task = generator.async_generate(messages, max_tokens=50)
        tasks.append(task)

    # Time the execution
    start_time = time.time()

    # Execute all tasks concurrently
    responses = await asyncio.gather(*tasks)

    end_time = time.time()

    # Print results
    for i, response in enumerate(responses):
        print(f"Prompt: {prompts[i]}")
        print(f"Response: {response.text[0].content[:100]}...")
        print()

    print(f"Total time for {len(prompts)} concurrent requests: {end_time - start_time:.2f}s")


async def async_streaming_example():
    """Example of async streaming."""
    print("\n=== Async Streaming Example ===")

    generator = llm(provider="openai")
    messages = [{"role": "user", "content": "Tell me a short story about a robot"}]

    print("Streaming response:")
    print("Assistant: ", end="", flush=True)

    content = ""
    async for chunk in await generator.async_generate(messages, stream=True):
        print(chunk.content, end="", flush=True)
        content += chunk.content
        if chunk.done:
            break

    print("\n")
    print(f"Complete response received: {len(content)} characters")


async def async_with_error_handling():
    """Example of async with error handling."""
    print("\n=== Async Error Handling ===")

    try:
        # This might fail if no API key is set
        generator = llm(provider="openai")
        messages = [{"role": "user", "content": "Hello!"}]

        response = await generator.async_generate(messages)
        print(f"Success: {response.text[0].content}")

    except Exception as e:
        print(f"Error occurred: {e}")


async def async_with_fallback():
    """Example of async with fallback providers."""
    print("\n=== Async with Fallback ===")

    # Set up with fallback (you'd need multiple API keys for this to work fully)
    generator = llm(
        provider="openai",
        fallback_providers=["claude", "grok"]  # These would fallback if OpenAI fails
    )

    messages = [{"role": "user", "content": "Hello with fallback!"}]

    try:
        response = await generator.async_generate(messages)
        print(f"Response from {response.provider}: {response.text[0].content}")
    except Exception as e:
        print(f"All providers failed: {e}")


async def main():
    """Run all async examples."""
    await basic_async_example()
    await concurrent_generations()
    await async_streaming_example()
    await async_with_error_handling()
    await async_with_fallback()


if __name__ == "__main__":
    import os

    if not os.getenv("OPENAI_API_KEY"):
        print("Please set OPENAI_API_KEY environment variable to run these examples.")
        exit(1)

    asyncio.run(main())