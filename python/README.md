# LLMX v2.0

A unified API for interacting with chat fine-tuned large language models across multiple providers.

[![PyPI version](https://badge.fury.io/py/llmx.svg)](https://badge.fury.io/py/llmx)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- **🔌 Unified API** - Same interface across OpenAI, Claude, Grok, Cohere, and HuggingFace
- **⚡ Async Support** - Full async/await support for high-throughput applications
- **🌊 Streaming** - Real-time response streaming for interactive UIs
- **💾 Smart Caching** - In-memory and Redis-backed caching with automatic cache invalidation
- **🔄 Fallback Chains** - Automatic failover between providers on errors
- **🛡️ Rate Limiting** - Built-in exponential backoff and retry logic
- **🎯 Type Safety** - Full type hints and Pydantic models
- **🖥️ CLI Tool** - Command-line interface for quick testing and prototyping

## 🚀 Quick Start

### Installation

```bash
pip install llmx
```

For Redis caching:
```bash
pip install "llmx[redis]"
```

For HuggingFace support:
```bash
pip install "llmx[huggingface]"
```

For everything:
```bash
pip install "llmx[all]"
```

### Basic Usage

```python
from llmx import llm

# Initialize with OpenAI
generator = llm(provider="openai", model="gpt-4")

# Generate text
messages = [{"role": "user", "content": "Hello, world!"}]
response = generator.generate(messages)
print(response.text[0].content)
```

### Provider Support

```python
# OpenAI
generator = llm(provider="openai", model="gpt-4")

# Anthropic Claude
generator = llm(provider="claude", model="claude-3-sonnet-20240229")

# xAI Grok
generator = llm(provider="grok", model="grok-beta")

# Cohere
generator = llm(provider="cohere", model="command-r-plus")

# HuggingFace
generator = llm(provider="huggingface", model="mistralai/Mistral-7B-Instruct-v0.1")
```

## 🔧 Advanced Features

### Async Support

```python
import asyncio
from llmx import llm

async def main():
    generator = llm(provider="openai")

    messages = [{"role": "user", "content": "Hello!"}]
    response = await generator.async_generate(messages)
    print(response.text[0].content)

asyncio.run(main())
```

### Streaming Responses

```python
generator = llm(provider="openai")
messages = [{"role": "user", "content": "Tell me a story"}]

for chunk in generator.generate(messages, stream=True):
    print(chunk.content, end="", flush=True)
    if chunk.done:
        break
```

### Caching

```python
from llmx import llm
from llmx.types import CacheConfig

# Redis caching
cache_config = CacheConfig(
    redis_url="redis://localhost:6379",
    ttl=3600  # 1 hour TTL
)

generator = llm(
    provider="openai",
    cache_config=cache_config
)

# First call hits the API
response1 = generator.generate(messages)

# Second call returns cached result
response2 = generator.generate(messages)
print(response2.cached)  # True
```

### Fallback Providers

```python
generator = llm(
    provider="openai",
    fallback_providers=["claude", "grok"]
)

# If OpenAI fails, automatically tries Claude, then Grok
response = generator.generate(messages)
```

### Configuration Options

```python
generator = llm(
    provider="openai",
    model="gpt-4",
    api_key="your-api-key",  # or set OPENAI_API_KEY env var
    timeout=30,
    max_retries=3
)

response = generator.generate(
    messages,
    max_tokens=100,
    temperature=0.7,
    top_p=0.9
)
```

## 🖥️ CLI Usage

### Interactive Chat

```bash
# Chat with OpenAI
llmx chat --provider openai

# Chat with Claude
llmx chat --provider claude --model claude-3-sonnet-20240229

# Enable streaming
llmx chat --provider openai --stream
```

### Single Generation

```bash
# Generate a response
llmx generate --provider openai "Write a Python function to calculate fibonacci"

# With custom parameters
llmx generate --provider claude --max-tokens 500 --temperature 0.2 "Explain quantum computing"
```

### Provider Testing

```bash
# Test all providers
llmx test

# Test specific provider
llmx test --provider openai

# List available providers
llmx list
```

## 🔑 Authentication

Set environment variables for your chosen providers:

```bash
# OpenAI
export OPENAI_API_KEY="your-openai-key"

# Anthropic Claude
export ANTHROPIC_API_KEY="your-anthropic-key"

# xAI Grok
export XAI_API_KEY="your-xai-key"

# Cohere
export COHERE_API_KEY="your-cohere-key"

# HuggingFace (optional for public models)
export HUGGINGFACE_API_TOKEN="your-hf-token"
```

## 📊 Error Handling

```python
from llmx import llm
from llmx.exceptions import RateLimitError, AuthenticationError, ProviderError

try:
    generator = llm(provider="openai")
    response = generator.generate(messages)
except AuthenticationError:
    print("Check your API key")
except RateLimitError as e:
    print(f"Rate limited. Retry after {e.retry_after} seconds")
except ProviderError as e:
    print(f"Provider error: {e}")
```

## 🏗️ Development

### Setup

```bash
git clone https://github.com/llmx-dev/llmx
cd llmx/python
pip install -e ".[dev]"
```

### Running Tests

```bash
pytest
```

### Code Quality

```bash
black llmx tests
isort llmx tests
mypy llmx
ruff llmx tests
```

## 📈 Roadmap

### v2.1 (Planned)
- [ ] More providers (Gemini, Perplexity, Groq)
- [ ] Function calling support
- [ ] Token counting utilities
- [ ] Response validation

### v2.2 (Planned)
- [ ] Batch processing
- [ ] Cost tracking
- [ ] Advanced retry strategies
- [ ] Provider health monitoring

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📧 Email: support@llmx.dev
- 🐛 Issues: [GitHub Issues](https://github.com/llmx-dev/llmx/issues)
- 📖 Docs: [docs.llmx.dev](https://docs.llmx.dev)

## 🙏 Acknowledgments

Built with ❤️ for the AI community. Special thanks to all the LLM providers making this possible.

---

**Star ⭐ this repo if you find it useful!**