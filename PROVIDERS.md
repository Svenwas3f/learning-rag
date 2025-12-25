# LLM Provider Configuration Guide

This document explains how to switch between different LLM providers in the Learning RAG application.

## Table of Contents

- [Default Provider (Ollama)](#default-provider-ollama)
- [OpenAI](#openai)
- [Anthropic Claude](#anthropic-claude)
- [Google Gemini](#google-gemini)
- [Custom Providers](#custom-providers)

## Default Provider (Ollama)

Ollama is the default provider and requires no API keys. It runs locally in a Docker container.

### Configuration

```env
# .env
LLM_MODEL=qwen2.5:0.5b
EMBEDDING_MODEL=nomic-embed-text
OLLAMA_URL=http://ollama:11434
```

### Available Models

You can use any model available in Ollama. Some popular options:

- `qwen2.5:0.5b` - Fast, lightweight (default)
- `llama3.2:1b` - Meta's Llama, small size
- `llama3.2:3b` - Meta's Llama, balanced
- `mistral:7b` - Mistral AI's model
- `gemma2:2b` - Google's Gemma

To download additional models:

```bash
docker compose exec ollama ollama pull llama3.2:3b
```

## OpenAI

### Installation

Uncomment the OpenAI dependency in `src/rag/requirements.txt`:

```txt
langchain-openai==0.2.14
```

Rebuild the container:

```bash
docker compose up -d --build rag
```

### Configuration

Add to your `.env` file:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
# OPENAI_ORG_ID=org-...  # Optional
```

### Code Changes

Update `src/rag/main.py` to use OpenAI:

```python
from retrieval.chat import ChatGenerator, create_openai_chat

# Replace the ChatGenerator initialization
chat_generator = ChatGenerator(
    llm=create_openai_chat(
        api_key=os.getenv("OPENAI_API_KEY"),
        model=os.getenv("OPENAI_MODEL", "gpt-4")
    )
)
```

### Available Models

- `gpt-4` - Most capable
- `gpt-4-turbo` - Faster GPT-4
- `gpt-3.5-turbo` - Fast and economical

## Anthropic Claude

### Installation

Uncomment the Anthropic dependency in `src/rag/requirements.txt`:

```txt
langchain-anthropic==0.3.11
```

Rebuild the container:

```bash
docker compose up -d --build rag
```

### Configuration

Add to your `.env` file:

```env
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-sonnet-20240229
```

### Code Changes

Update `src/rag/main.py` to use Anthropic:

```python
from retrieval.chat import ChatGenerator, create_anthropic_chat

# Replace the ChatGenerator initialization
chat_generator = ChatGenerator(
    llm=create_anthropic_chat(
        api_key=os.getenv("ANTHROPIC_API_KEY"),
        model=os.getenv("ANTHROPIC_MODEL", "claude-3-sonnet-20240229")
    )
)
```

### Available Models

- `claude-3-opus-20240229` - Most capable
- `claude-3-sonnet-20240229` - Balanced performance
- `claude-3-haiku-20240307` - Fast and economical
- `claude-2.1` - Previous generation

## Google Gemini

### Installation

Uncomment the Google dependency in `src/rag/requirements.txt`:

```txt
langchain-google-genai==2.0.10
```

Rebuild the container:

```bash
docker compose up -d --build rag
```

### Configuration

Add to your `.env` file:

```env
GOOGLE_API_KEY=AIza...
GOOGLE_MODEL=gemini-pro
```

### Code Changes

Update `src/rag/main.py` to use Google:

```python
from retrieval.chat import ChatGenerator, create_google_chat

# Replace the ChatGenerator initialization
chat_generator = ChatGenerator(
    llm=create_google_chat(
        api_key=os.getenv("GOOGLE_API_KEY"),
        model=os.getenv("GOOGLE_MODEL", "gemini-pro")
    )
)
```

### Available Models

- `gemini-pro` - Text generation
- `gemini-pro-vision` - Multimodal (text and images)

## Custom Providers

To add a custom LLM provider, you can use any LangChain-compatible chat model:

```python
from langchain_community.chat_models import ChatYourProvider
from retrieval.chat import ChatGenerator

# Create your custom LLM instance
llm = ChatYourProvider(
    api_key="your-api-key",
    model="your-model",
    temperature=0.7,
    # ... other parameters
)

# Initialize ChatGenerator with your LLM
chat_generator = ChatGenerator(llm=llm)
```

## Temperature and Parameters

All providers support these common parameters:

```env
LLM_TEMPERATURE=0.7  # Creativity (0.0-1.0)
LLM_TOP_P=0.9        # Nucleus sampling
LLM_TOP_K=40         # Top-k sampling
LLM_TIMEOUT=300      # Request timeout in seconds
```

These can be set in your `.env` file or passed directly to the provider's constructor.

## Best Practices

1. **Local Development**: Use Ollama for free local development
2. **Production**: Consider cloud providers for better reliability
3. **Cost**: OpenAI GPT-3.5 and Claude Haiku are most economical
4. **Quality**: GPT-4 and Claude Opus for highest quality
5. **Privacy**: Use Ollama if data privacy is critical

## Troubleshooting

### API Key Issues

```
Error: Invalid API key
```

Ensure your API key is correctly set in `.env` and the file is loaded:

```bash
docker compose down
docker compose up -d
```

### Model Not Found

```
Error: Model not found
```

Verify the model name is correct. Check the provider's documentation for available models.

### Timeout Errors

```
Error: Request timeout
```

Increase the timeout in `.env`:

```env
LLM_TIMEOUT=600  # 10 minutes
```

### Rate Limits

Cloud providers have rate limits. Consider:

- Using a lower model tier
- Implementing request queuing
- Upgrading your API plan

## Cost Comparison

Approximate costs per 1M tokens (input/output):

| Provider | Model | Input | Output |
|----------|-------|-------|--------|
| Ollama | Any | Free | Free |
| OpenAI | GPT-4 | $30 | $60 |
| OpenAI | GPT-3.5 | $0.50 | $1.50 |
| Anthropic | Claude Opus | $15 | $75 |
| Anthropic | Claude Sonnet | $3 | $15 |
| Anthropic | Claude Haiku | $0.25 | $1.25 |
| Google | Gemini Pro | $0.50 | $1.50 |

Prices as of 2024. Check provider websites for current pricing.

## Additional Resources

- [LangChain Documentation](https://python.langchain.com/docs/get_started/introduction)
- [OpenAI API](https://platform.openai.com/docs/introduction)
- [Anthropic Documentation](https://docs.anthropic.com/)
- [Google AI Studio](https://ai.google.dev/)
- [Ollama Documentation](https://ollama.ai/docs)
