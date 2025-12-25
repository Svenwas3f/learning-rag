# Learning RAG 🤖📚

A powerful Retrieval-Augmented Generation (RAG) system that lets you upload your learning materials and ask questions about them using AI. Built with FastAPI, Qdrant, and Ollama.

![Python](https://img.shields.io/badge/python-3.11-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115.5-green.svg)

## ✨ Features

- 📄 **Document Upload**: Support for PDF, TXT, and Markdown files
- 🏷️ **Topic Organization**: Group documents by topics/categories
- 🔍 **Semantic Search**: Vector-based search powered by Qdrant and Ollama embeddings
- 💬 **AI Chat**: Ask questions and get answers based on your documents
- ⚡ **Real-time Processing**: Fast document indexing and retrieval
- 🎨 **Modern UI**: Clean, responsive web interface
- 🐳 **Docker Ready**: Easy deployment with Docker Compose

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed
- At least 4GB of RAM available
- 10GB of free disk space

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Svenwas3f/learning-rag.git
   cd learning-rag
   ```

2. **Configure environment (optional)**
   ```bash
   cp .env.example .env
   # Edit .env to customize settings (ports, models, etc.)
   ```

3. **Start the application**
   ```bash
   docker compose up -d
   ```

4. **Wait for models to download** (first time only, ~2-3 minutes)
   ```bash
   docker compose logs -f ollama
   ```
   Wait until you see "qwen2.5:0.5b" and "nomic-embed-text" pulled successfully.

5. **Access the application**
   - Web UI: http://localhost:80
   - API Documentation: http://localhost:8000/docs
   - Alternative API access: http://localhost:8000

That's it! 🎉

> 💡 **Tip:** Check [CONFIGURATION.md](CONFIGURATION.md) to customize ports, models, and other settings.

## 📖 Usage

### Uploading Documents

1. Click the **"+ Add New Topic"** button in the sidebar
2. Enter a topic name (e.g., "Machine Learning", "Python Programming")
3. Select one or more files (PDF, TXT, or Markdown)
4. Click **"Create & Upload"**
5. Wait for the upload to complete

### Asking Questions

1. Select topics from the sidebar by checking the boxes
2. Type your question in the chat input
3. Press Enter or click the send button
4. The AI will answer based on your uploaded documents

### Managing Topics

- **Edit Topic**: Click the menu icon (⋮) on a topic → Edit
- **Add Files**: In the edit modal, click "Add Files" and select files
- **Rename Topic**: Change the topic name in the edit modal
- **Delete Files**: Click the X button next to any file
- **Delete Topic**: Click the menu icon (⋮) → Delete Topic

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Web UI    │────▶│   FastAPI    │────▶│   Qdrant    │
│  (Nginx)    │     │   Backend    │     │  Vector DB  │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │    Ollama    │
                    │  LLM + Embed │
                    └──────────────┘
```

### Technology Stack

**Backend:**
- FastAPI 0.115.5 - Modern Python web framework
- LangChain - Document processing and RAG pipeline
- Qdrant - Vector database for embeddings
- Ollama - Local LLM and embedding models

**Frontend:**
- Vanilla JavaScript - No framework dependencies
- Custom CSS with modern design
- Responsive layout

**Infrastructure:**
- Docker & Docker Compose - Containerization
- Nginx - Web server for static files

**Models:**
- `qwen2.5:0.5b` - Fast, lightweight LLM (500MB)
- `nomic-embed-text` - High-quality embeddings (274MB)

## 🐳 Deployment

### Docker Compose (Recommended)

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Stop and remove volumes (clears all data)
docker compose down -v
```

### Configuration

All settings are managed through environment variables in the `.env` file.

**Quick Start:**
```bash
# Copy example configuration
cp .env.example .env

# Edit with your settings
nano .env

# Apply changes
docker compose down
docker compose up -d
```

**Common Configuration Options:**

| Setting | Default | Description |
|---------|---------|-------------|
| `WEB_PORT` | `80` | Web UI port |
| `API_EXTERNAL_PORT` | `8000` | API port |
| `LLM_MODEL` | `qwen2.5:0.5b` | LLM model to use |
| `EMBEDDING_MODEL` | `nomic-embed-text` | Embedding model |
| `COLLECTION_NAME` | `learning_materials` | Default collection |
| `CORS_ORIGINS` | `*` | Allowed CORS origins |

**📖 See [CONFIGURATION.md](CONFIGURATION.md) for complete documentation.**

### Port Configuration

Default ports:
- **80**: Web UI (Nginx) - Configure with `WEB_PORT`
- **8000**: FastAPI API - Configure with `API_EXTERNAL_PORT`
- **6333**: Qdrant REST API - Configure with `QDRANT_REST_PORT`
- **6334**: Qdrant gRPC API - Configure with `QDRANT_GRPC_PORT`
- **11434**: Ollama API - Configure with `OLLAMA_PORT`

**Example: Change web port to 8080**

Edit `.env`:
```env
WEB_PORT=8080
```

### Production Deployment

For production environments:

1. **Update CORS settings** in `src/rag/main.py`:
   ```python
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://yourdomain.com"],  # Specific domains
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

2. **Use environment variables** for sensitive configuration

3. **Enable HTTPS** with a reverse proxy (nginx, Caddy, Traefik)

4. **Set up backups** for Qdrant data:
   ```bash
   docker compose exec vector-db qdrant-backup
   ```

5. **Monitor resources**:
   ```bash
   docker stats
   ```

## 🛠️ Development

### Project Structure

```
learning-rag/
├── docker-compose.yml          # Docker services configuration
├── nginx.conf                  # Nginx web server config
├── src/
│   ├── rag/                   # Backend application
│   │   ├── main.py            # FastAPI application
│   │   ├── requirements.txt   # Python dependencies
│   │   ├── Dockerfile         # Backend container
│   │   ├── indexing/          # Document indexing
│   │   │   ├── __init__.py
│   │   │   └── pipeline.py    # Text splitting & embedding
│   │   └── retrieval/         # Search & retrieval
│   │       ├── __init__.py
│   │       ├── query.py       # Vector search
│   │       └── chat.py        # LLM response generation
│   └── ui/                    # Frontend application
│       ├── index.html         # Main HTML
│       ├── css/
│       │   └── styles.css     # Application styles
│       ├── js/
│       │   └── app.js         # Application logic
│       └── assets/            # Icons and images
└── README.md
```

### Local Development

1. **Clone and enter the project**
   ```bash
   git clone https://github.com/Svenwas3f/learning-rag.git
   cd learning-rag
   ```

2. **Start services**
   ```bash
   docker compose up -d
   ```

3. **Enable auto-reload for backend development**
   
   The FastAPI backend already has `reload=True` enabled in development mode.
   Edit files in `src/rag/` and the server will automatically restart.

4. **Frontend development**
   
   Edit files in `src/ui/` and refresh your browser.
   No build step required!

5. **View logs**
   ```bash
   # All services
   docker compose logs -f
   
   # Specific service
   docker compose logs -f rag
   docker compose logs -f ollama
   docker compose logs -f vector-db
   ```

### Running Tests

```bash
# Python backend tests
docker compose exec rag pytest

# Check Python code style
docker compose exec rag flake8 .

# Type checking
docker compose exec rag mypy .
```

### API Documentation

Interactive API documentation is available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Reporting Issues

1. Check if the issue already exists
2. Use the issue template
3. Include:
   - Clear description of the problem
   - Steps to reproduce
   - Expected vs actual behavior
   - System information (OS, Docker version)
   - Relevant logs

### Submitting Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/learning-rag.git
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add comments for complex logic
   - Update documentation if needed

4. **Test your changes**
   ```bash
   docker compose up -d
   # Test manually or run automated tests
   ```

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

   Use conventional commit messages:
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `style:` Code style changes (formatting)
   - `refactor:` Code refactoring
   - `test:` Adding tests
   - `chore:` Maintenance tasks

6. **Push and create a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

### Development Guidelines

- **Python**: Follow PEP 8 style guide
- **JavaScript**: Use ES6+ features, consistent indentation
- **Documentation**: Update README for new features
- **Testing**: Add tests for new functionality
- **Comments**: Write clear, concise comments

### Areas for Contribution

- 🐛 Bug fixes and improvements
- ✨ New features (file type support, export options)
- 📝 Documentation improvements
- 🧪 Test coverage
- 🎨 UI/UX enhancements
- 🌍 Internationalization (i18n)
- ⚡ Performance optimizations

## 🔧 Troubleshooting

### Common Issues

**Issue: Ollama models not downloading**
```bash
# Check Ollama logs
docker compose logs ollama

# Manually pull models
docker compose exec ollama ollama pull qwen2.5:0.5b
docker compose exec ollama ollama pull nomic-embed-text
```

**Issue: Out of memory**
```bash
# Check resource usage
docker stats

# Increase Docker memory limit in Docker Desktop
# Settings → Resources → Memory (recommend 4GB minimum)
```

**Issue: Port already in use**
```bash
# Find process using port 80
sudo lsof -i :80

# Change port in docker-compose.yml
ports:
  - "8080:80"  # Use port 8080 instead
```

**Issue: Documents not indexing**
```bash
# Check backend logs
docker compose logs rag

# Verify Qdrant is running
curl http://localhost:6333/collections

# Restart services
docker compose restart
```

**Issue: UI not loading**
```bash
# Check nginx logs
docker compose logs web

# Verify nginx is running
docker compose ps

# Access API directly
curl http://localhost:8000/health
```

### Getting Help

- 📖 Check the [API Documentation](http://localhost:8000/docs)
- 🐛 [Open an issue](https://github.com/Svenwas3f/learning-rag/issues)
- 💬 Join our community discussions

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern web framework
- [LangChain](https://www.langchain.com/) - RAG framework
- [Qdrant](https://qdrant.tech/) - Vector database
- [Ollama](https://ollama.ai/) - Local LLM platform
- [Qwen](https://github.com/QwenLM/Qwen) - Language model
- [Nomic](https://www.nomic.ai/) - Embedding model

## 📊 Project Status

- ✅ Document upload and indexing
- ✅ Topic management
- ✅ Semantic search
- ✅ RAG-based chat
- ✅ File and topic deletion
- ✅ Topic renaming
- 🚧 Advanced filters (in progress)
- 🚧 Export conversations (planned)
- 🚧 Multi-language support (planned)

## 📧 Contact

- **Repository**: https://github.com/Svenwas3f/learning-rag
- **Issues**: https://github.com/Svenwas3f/learning-rag/issues

---

Made with ❤️ by the Learning RAG team
