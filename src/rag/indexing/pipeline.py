"""
Indexing pipeline for document processing and vector storage
"""

import os
from typing import List
from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader, TextLoader, UnstructuredMarkdownLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.vectorstores import Qdrant
from qdrant_client import QdrantClient

class DocumentIndexer:
    """Handles document loading, processing, and indexing into vector database"""
    
    def __init__(
        self,
        ollama_url: str = "http://localhost:11434",
        qdrant_url: str = "http://localhost:6333",
        embedding_model: str = "nomic-embed-text",
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ):
        """
        Initialize the document indexer
        
        Args:
            ollama_url: URL for Ollama service
            qdrant_url: URL for Qdrant vector database
            embedding_model: Name of the embedding model to use
            chunk_size: Size of text chunks for splitting
            chunk_overlap: Overlap between chunks
        """
        self.ollama_url = ollama_url
        self.qdrant_url = qdrant_url
        self.embedding_model = embedding_model
        
        # Initialize embeddings
        self.embeddings = OllamaEmbeddings(
            base_url=ollama_url,
            model=embedding_model,
            model_kwargs={}  # Use only default supported parameters
        )
        
        # Initialize text splitter
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        
        # Initialize Qdrant client
        self.qdrant_client = QdrantClient(url=qdrant_url)
    
    def load_document(self, file_path: str) -> List:
        """
        Load a document based on its file type
        
        Args:
            file_path: Path to the document
            
        Returns:
            List of loaded documents
        """
        file_extension = Path(file_path).suffix.lower()
        
        if file_extension == '.pdf':
            loader = PyPDFLoader(file_path)
        elif file_extension in ['.txt', '.text']:
            loader = TextLoader(file_path)
        elif file_extension in ['.md', '.markdown']:
            loader = UnstructuredMarkdownLoader(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")
        
        return loader.load()
    
    def process_documents(self, documents: List) -> List:
        """
        Split documents into chunks
        
        Args:
            documents: List of documents to process
            
        Returns:
            List of document chunks
        """
        return self.text_splitter.split_documents(documents)
    
    def index_documents(self, chunks: List, collection_name: str, metadata: dict = None) -> None:
        """
        Index document chunks into Qdrant
        
        Args:
            chunks: List of document chunks
            collection_name: Name of the Qdrant collection
            metadata: Additional metadata to add to all chunks
        """
        # Add metadata if provided
        if metadata:
            for chunk in chunks:
                chunk.metadata.update(metadata)
        
        # Create or update vector store
        Qdrant.from_documents(
            documents=chunks,
            embedding=self.embeddings,
            url=self.qdrant_url,
            collection_name=collection_name,
            force_recreate=False
        )
    
    def index_file(self, file_path: str, collection_name: str, topic: str, metadata: dict = None) -> dict:
        """
        Complete pipeline: load, process, and index a single file
        
        Args:
            file_path: Path to the file
            collection_name: Name of the Qdrant collection
            topic: Topic/category for this document
            metadata: Additional metadata
            
        Returns:
            Dictionary with indexing statistics
        """
        # Load document
        documents = self.load_document(file_path)
        
        # Process into chunks
        chunks = self.process_documents(documents)
        
        # Add file metadata including topic
        file_metadata = {
            "source_file": Path(file_path).name,
            "file_path": file_path,
            "topic": topic,
            **(metadata or {})
        }
        
        # Index chunks
        self.index_documents(chunks, collection_name, file_metadata)
        
        return {
            "file": Path(file_path).name,
            "num_chunks": len(chunks),
            "collection": collection_name,
            "topic": topic,
            "status": "success"
        }
    
    def index_directory(self, directory_path: str, collection_name: str, topic: str, metadata: dict = None) -> List[dict]:
        """
        Index all supported files in a directory
        
        Args:
            directory_path: Path to the directory
            collection_name: Name of the Qdrant collection
            topic: Topic/category for these documents
            metadata: Additional metadata
            
        Returns:
            List of indexing results for each file
        """
        results = []
        directory = Path(directory_path)
        
        # Supported file extensions
        supported_extensions = ['.pdf', '.txt', '.text', '.md', '.markdown']
        
        for file_path in directory.rglob('*'):
            if file_path.is_file() and file_path.suffix.lower() in supported_extensions:
                try:
                    result = self.index_file(str(file_path), collection_name, topic, metadata)
                    results.append(result)
                except Exception as e:
                    results.append({
                        "file": file_path.name,
                        "status": "error",
                        "error": str(e)
                    })
        
        return results
    
    def delete_collection(self, collection_name: str) -> None:
        """
        Delete a collection from Qdrant
        
        Args:
            collection_name: Name of the collection to delete
        """
        self.qdrant_client.delete_collection(collection_name)
    
    def list_collections(self) -> List[str]:
        """
        List all collections in Qdrant
        
        Returns:
            List of collection names
        """
        collections = self.qdrant_client.get_collections()
        return [col.name for col in collections.collections]
