"""Basic usage examples for LLMX."""

import os
from llmx import llm


def basic_example():
    """Basic text generation example."""
    print("=== Basic Example ===")

    # Initialize generator
    generator = llm(provider="openai", model="gpt-3.5-turbo")

    # Simple conversation
    messages = [
        {"role": "user", "content": "Hello! Can you help me write a Python function?"}
    ]

    response = generator.generate(messages)
    print(f"Response: {response.text[0].content}")
    print(f"Model: {response.model}")
    print(f"Usage: {response.usage}")


def multi_turn_conversation():
    """Multi-turn conversation example."""
    print("\n=== Multi-turn Conversation ===")

    generator = llm(provider="openai")
    messages = []

    # First message
    messages.append({"role": "user", "content": "What's the capital of France?"})
    response = generator.generate(messages)
    assistant_response = response.text[0].content
    messages.append({"role": "assistant", "content": assistant_response})
    print(f"User: What's the capital of France?")
    print(f"Assistant: {assistant_response}")

    # Follow-up message
    messages.append({"role": "user", "content": "What's the population of that city?"})
    response = generator.generate(messages)
    assistant_response = response.text[0].content
    print(f"User: What's the population of that city?")
    print(f"Assistant: {assistant_response}")


def different_providers():
    """Example using different providers."""
    print("\n=== Different Providers ===")

    providers_to_try = ["openai"]  # Add more if you have API keys

    messages = [{"role": "user", "content": "Say hello in a creative way!"}]

    for provider in providers_to_try:
        try:
            generator = llm(provider=provider)
            response = generator.generate(messages)
            print(f"{provider.upper()}: {response.text[0].content}")
        except Exception as e:
            print(f"{provider.upper()}: Error - {e}")


def with_parameters():
    """Example with custom parameters."""
    print("\n=== With Custom Parameters ===")

    generator = llm(provider="openai")
    messages = [{"role": "user", "content": "Write a very short poem about AI"}]

    # Conservative generation
    response = generator.generate(
        messages,
        max_tokens=50,
        temperature=0.3,
        top_p=0.8
    )
    print(f"Conservative (temp=0.3): {response.text[0].content}")

    # Creative generation
    response = generator.generate(
        messages,
        max_tokens=50,
        temperature=0.9,
        top_p=0.95
    )
    print(f"Creative (temp=0.9): {response.text[0].content}")


def caching_example():
    """Example demonstrating caching."""
    print("\n=== Caching Example ===")

    generator = llm(provider="openai")
    messages = [{"role": "user", "content": "What is 2+2?"}]

    # First call
    print("First call (should hit API):")
    response1 = generator.generate(messages)
    print(f"Response: {response1.text[0].content}")
    print(f"Cached: {response1.cached}")

    # Second call with same input
    print("\nSecond call (should be cached):")
    response2 = generator.generate(messages)
    print(f"Response: {response2.text[0].content}")
    print(f"Cached: {response2.cached}")

    # Third call with cache disabled
    print("\nThird call (cache disabled):")
    response3 = generator.generate(messages, use_cache=False)
    print(f"Response: {response3.text[0].content}")
    print(f"Cached: {response3.cached}")


if __name__ == "__main__":
    # Check if OpenAI API key is available
    if not os.getenv("OPENAI_API_KEY"):
        print("Please set OPENAI_API_KEY environment variable to run these examples.")
        exit(1)

    basic_example()
    multi_turn_conversation()
    different_providers()
    with_parameters()
    caching_example()