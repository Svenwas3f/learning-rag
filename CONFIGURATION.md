# Configuration Guide

This guide explains how to configure Learning RAG for different environments.

## Environment Variables

All configuration is managed through the `.env` file in the project root.

### Quick Setup

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your preferred settings**

3. **Restart services:**
   ```bash
   docker compose down
   docker compose up -d
   ```

## Configuration Options

See `.env.example` for all available options with descriptions.

### Key Settings

- `LLM_MODEL` - Change the AI model (default: qwen2.5:0.5b)
- `EMBEDDING_MODEL` - Change embedding model (default: nomic-embed-text)
- `WEB_PORT` - Change UI port (default: 80)
- `API_EXTERNAL_PORT` - Change API port (default: 8000)
- `CORS_ORIGINS` - Set allowed origins (default: *)

## Frontend Configuration

Edit `src/ui/js/config.js` to change:
- API URL
- Collection name
- File size limits
- Search settings

## Need Help?

Check the `.env.example` file for detailed comments on each setting.
