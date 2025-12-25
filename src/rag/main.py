from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from datetime import datetime
from pathlib import Path
from typing import List, Optional
import os
import tempfile
import shutil
from pydantic import BaseModel
from indexing import DocumentIndexer
from retrieval import DocumentRetriever, ChatGenerator

app = FastAPI(
    title="Learning RAG API",
    description="""# Learning RAG API

A Retrieval-Augmented Generation (RAG) system for indexing and querying learning materials.

## Features

* 📚 **Document Indexing**: Upload and index PDF, TXT, and Markdown files
* 🏷️ **Topic Management**: Organize documents by topics/categories
* 🔍 **Vector Search**: Semantic search powered by Qdrant and Ollama embeddings
* 💬 **RAG Chat**: Query your documents with natural language

## Getting Started

1. Upload documents via `/index/upload`
2. View your topics at `/topics`
3. Query documents (coming soon!)

## Technology Stack

- **Vector Database**: Qdrant
- **Embeddings**: Ollama (nomic-embed-text)
- **LLM**: Ollama (qwen2.5:0.5b)
- **Framework**: FastAPI + LangChain
""",
    version="1.0.0",
    contact={
        "name": "Learning RAG",
        "url": "http://localhost:8000",
    },
    openapi_tags=[
        {
            "name": "system",
            "description": "System health and information endpoints"
        },
        {
            "name": "indexing",
            "description": "Document indexing and management operations"
        },
        {
            "name": "topics",
            "description": "Topic and collection management"
        },
        {
            "name": "retrieval",
            "description": "Document search and retrieval operations"
        }
    ]
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update this with specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize indexer and retriever
indexer = DocumentIndexer(
    ollama_url=os.getenv("OLLAMA_URL", "http://localhost:11434"),
    qdrant_url=os.getenv("QDRANT_URL", "http://localhost:6333"),
    embedding_model=os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
)

retriever = DocumentRetriever(
    qdrant_url=os.getenv("QDRANT_URL", "http://localhost:6333"),
    ollama_url=os.getenv("OLLAMA_URL", "http://localhost:11434"),
    embedding_model=os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
)

chat_generator = ChatGenerator(
    ollama_url=os.getenv("OLLAMA_URL", "http://localhost:11434"),
    model=os.getenv("LLM_MODEL", "qwen2.5:0.5b")
)

# Default collection name
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "learning_materials")

# Request/Response models
class SearchRequest(BaseModel):
    query: str
    topics: Optional[List[str]] = None
    limit: int = 8

class ChatRequest(BaseModel):
    question: str
    topics: Optional[List[str]] = None
    limit: int = 8
    stream: bool = False


@app.get("/", tags=["system"])
async def root():
    """
    Root endpoint - API information and navigation
    
    Returns basic information about the API and links to documentation.
    """
    return {
        "message": "Learning RAG API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json"
    }

@app.get("/health", tags=["system"])
async def health():
    """
    Health check endpoint
    
    Returns the current health status of the API service.
    Useful for monitoring and load balancer health checks.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "learning-rag-api"
    }

@app.post("/index/upload", tags=["indexing"])
async def index_document(
    file: UploadFile = File(..., description="PDF, TXT, or Markdown file to index"),
    topic: str = Form(..., description="Topic/category for this document"),
    collection_name: str = Form(default=COLLECTION_NAME, description="Collection name (optional)")
):
    """
    Upload and index a document into the vector database
    
    This endpoint accepts document files and indexes them for semantic search.
    Documents are split into chunks and embedded using Ollama's nomic-embed-text model.
    
    **Supported File Types:**
    - PDF (.pdf)
    - Text (.txt, .text)
    - Markdown (.md, .markdown)
    
    **Parameters:**
    - **file**: The document file to upload and index
    - **topic**: Topic/category for organizing this document (required)
    - **collection_name**: Vector database collection name (optional, defaults to 'learning_materials')
    
    **Returns:**
    - Success message with indexing statistics (number of chunks created, topic, etc.)
    
    **Example Usage:**
    ```bash
    curl -X POST "http://localhost:8000/index/upload" \\
      -F "file=@document.pdf" \\
      -F "topic=machine-learning"
    ```
    """
    # Validate file type
    file_extension = Path(file.filename).suffix.lower()
    supported_extensions = ['.pdf', '.txt', '.text', '.md', '.markdown']
    
    if file_extension not in supported_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_extension}. Supported types: {', '.join(supported_extensions)}"
        )
    
    # Save uploaded file to temporary location
    temp_dir = tempfile.mkdtemp()
    temp_file_path = Path(temp_dir) / file.filename
    
    try:
        # Write uploaded file
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Index the document
        result = indexer.index_file(
            file_path=str(temp_file_path),
            collection_name=collection_name,
            topic=topic,
            metadata={
                "uploaded_at": datetime.utcnow().isoformat(),
                "original_filename": file.filename
            }
        )
        
        return {
            "message": "Document indexed successfully",
            "result": result
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error indexing document: {str(e)}")
    
    finally:
        # Clean up temporary file
        if temp_file_path.exists():
            temp_file_path.unlink()
        if Path(temp_dir).exists():
            shutil.rmtree(temp_dir)

@app.get("/collections", tags=["topics"])
async def list_collections():
    """
    List all available collections in the vector database
    
    Returns a list of all collection names currently stored in Qdrant.
    Collections are containers for related document embeddings.
    """
    try:
        collections = indexer.list_collections()
        return {
            "collections": collections,
            "count": len(collections)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing collections: {str(e)}")

@app.delete("/collections/{collection_name}", tags=["topics"])
async def delete_collection(collection_name: str):
    """
    Delete a collection and all its documents
    
    **Warning:** This permanently deletes the collection and all indexed documents within it.
    This action cannot be undone.
    
    **Parameters:**
    - **collection_name**: Name of the collection to delete
    """
    try:
        indexer.delete_collection(collection_name)
        return {
            "message": f"Collection '{collection_name}' deleted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting collection: {str(e)}")

@app.get("/topics", tags=["topics"])
async def get_topics(collection_name: str = COLLECTION_NAME):
    """
    Get all unique topics from a collection
    
    Returns a list of all topics/categories found in the specified collection,
    along with metadata about each topic including document counts and chunk counts.
    
    **Parameters:**
    - **collection_name**: Collection name (optional, defaults to 'learning_materials')
    
    **Returns:**
    - List of topics with:
        - `name`: Topic name
        - `document_count`: Number of unique documents in this topic
        - `chunk_count`: Total number of text chunks indexed for this topic
    
    **Example Response:**
    ```json
    {
      "topics": [
        {
          "name": "machine-learning",
          "document_count": 5,
          "chunk_count": 142
        }
      ],
      "count": 1,
      "collection": "learning_materials"
    }
    ```
    """
    try:
        topics = retriever.get_topics(collection_name)
        return {
            "topics": topics,
            "count": len(topics),
            "collection": collection_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting topics: {str(e)}")

@app.get("/topics/{topic_name}/files", tags=["topics"])
async def get_topic_files(topic_name: str, collection_name: str = COLLECTION_NAME):
    """
    Get all files for a specific topic
    
    Returns a list of all unique files (documents) that belong to the specified topic.
    
    **Parameters:**
    - **topic_name**: Name of the topic
    - **collection_name**: Collection name (optional, defaults to 'learning_materials')
    
    **Returns:**
    - List of files with metadata (filename, chunk_count, uploaded_at)
    """
    try:
        files = retriever.get_topic_files(topic_name, collection_name)
        return {
            "topic": topic_name,
            "files": files,
            "count": len(files),
            "collection": collection_name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting topic files: {str(e)}")

@app.delete("/topics/{topic_name}/files/{filename}", tags=["topics"])
async def delete_file_from_topic(
    topic_name: str, 
    filename: str, 
    collection_name: str = COLLECTION_NAME
):
    """
    Delete a specific file from a topic
    
    Removes all chunks/vectors associated with the specified file in the given topic.
    
    **Parameters:**
    - **topic_name**: Name of the topic containing the file
    - **filename**: Name of the file to delete
    - **collection_name**: Collection name (optional, defaults to 'learning_materials')
    
    **Returns:**
    - Success status and message
    
    **Example:**
    ```
    DELETE /topics/machine-learning/files/neural-networks.pdf
    ```
    """
    try:
        result = retriever.delete_file_from_topic(topic_name, filename, collection_name)
        
        if result["success"]:
            return {
                "message": result["message"],
                "topic": topic_name,
                "filename": filename,
                "collection": collection_name
            }
        else:
            raise HTTPException(status_code=500, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting file: {str(e)}")

@app.delete("/topics/{topic_name}", tags=["topics"])
async def delete_topic(topic_name: str, collection_name: str = COLLECTION_NAME):
    """
    Delete an entire topic and all its documents
    
    Removes all chunks/vectors associated with the specified topic. This action cannot be undone.
    
    **Parameters:**
    - **topic_name**: Name of the topic to delete
    - **collection_name**: Collection name (optional, defaults to 'learning_materials')
    
    **Returns:**
    - Success status and message
    
    **Example:**
    ```
    DELETE /topics/machine-learning
    ```
    """
    try:
        result = retriever.delete_topic(topic_name, collection_name)
        
        if result["success"]:
            return {
                "message": result["message"],
                "topic": topic_name,
                "collection": collection_name
            }
        else:
            raise HTTPException(status_code=500, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting topic: {str(e)}")

@app.put("/topics/{topic_name}", tags=["topics"])
async def rename_topic(
    topic_name: str, 
    new_name: str = Query(..., description="New name for the topic"),
    collection_name: str = COLLECTION_NAME
):
    """
    Rename a topic
    
    Updates the topic name for all chunks/vectors associated with the specified topic.
    
    **Parameters:**
    - **topic_name**: Current name of the topic
    - **new_name**: New name for the topic
    - **collection_name**: Collection name (optional, defaults to 'learning_materials')
    
    **Returns:**
    - Success status, message, and count of updated chunks
    
    **Example:**
    ```
    PUT /topics/machine-learning?new_name=ml-basics
    ```
    """
    try:
        result = retriever.rename_topic(topic_name, new_name, collection_name)
        
        if result["success"]:
            return {
                "message": result["message"],
                "old_name": topic_name,
                "new_name": new_name,
                "updated_count": result.get("updated_count", 0),
                "collection": collection_name
            }
        else:
            raise HTTPException(status_code=500, detail=result["message"])
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error renaming topic: {str(e)}")

@app.post("/search", tags=["retrieval"])
async def search_documents(request: SearchRequest, collection_name: str = COLLECTION_NAME):
    """
    Search for relevant document chunks using semantic search
    
    Retrieves the most relevant document chunks based on a query and optional topic filters.
    Uses vector similarity search with embeddings.
    
    **Request Body:**
    - **query**: The search query text
    - **topics**: Optional list of topic names to filter results (only search within these topics)
    - **limit**: Maximum number of chunks to return (default: 8)
    
    **Returns:**
    - List of relevant chunks with:
        - `content`: The text content of the chunk
        - `score`: Relevance score (0-1, higher is more relevant)
        - `metadata`: Source file, topic, and page information
    
    **Example Request:**
    ```json
    {
      "query": "What is machine learning?",
      "topics": ["machine-learning", "ai-basics"],
      "limit": 8
    }
    ```
    """
    try:
        chunks = retriever.search_documents(
            query=request.query,
            collection_name=collection_name,
            topics=request.topics,
            limit=request.limit
        )
        
        return {
            "query": request.query,
            "chunks": chunks,
            "count": len(chunks),
            "topics_filter": request.topics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching documents: {str(e)}")

@app.post("/chat", tags=["retrieval"])
async def chat(request: ChatRequest, collection_name: str = COLLECTION_NAME):
    """
    Chat with your documents using RAG (Retrieval-Augmented Generation)
    
    Retrieves relevant document chunks and generates an AI response based on the context.
    The LLM will answer questions using information from your indexed documents.
    
    **Request Body:**
    - **question**: Your question to the AI assistant
    - **topics**: Optional list of topics to search within
    - **limit**: Number of context chunks to retrieve (default: 8)
    - **stream**: Whether to stream the response (default: false)
    
    **Returns:**
    - AI-generated response based on retrieved document context
    - List of source chunks used for the response
    
    **Example Request:**
    ```json
    {
      "question": "Explain neural networks",
      "topics": ["machine-learning"],
      "limit": 8,
      "stream": false
    }
    ```
    """
    try:
        # Retrieve relevant chunks
        chunks = retriever.search_documents(
            query=request.question,
            collection_name=collection_name,
            topics=request.topics,
            limit=request.limit
        )
        
        if not chunks:
            return {
                "question": request.question,
                "answer": "I couldn't find any relevant information in your documents to answer this question. Try adding more documents or selecting different topics.",
                "chunks": [],
                "topics_filter": request.topics
            }
        
        # Generate response
        if request.stream:
            # Return streaming response
            def generate():
                for chunk in chat_generator.generate_response_stream(request.question, chunks):
                    yield chunk
            
            return StreamingResponse(generate(), media_type="text/plain")
        else:
            # Return complete response
            answer = chat_generator.generate_response(request.question, chunks)
            
            return {
                "question": request.question,
                "answer": answer,
                "chunks": chunks,
                "topics_filter": request.topics
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating chat response: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
