"""
Query and retrieval operations for the RAG system
"""

from typing import List, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchAny
from langchain_community.embeddings import OllamaEmbeddings


class DocumentRetriever:
    """Handles document retrieval and querying from vector database"""
    
    def __init__(
        self, 
        qdrant_url: str = "http://localhost:6333",
        ollama_url: str = "http://localhost:11434",
        embedding_model: str = "nomic-embed-text"
    ):
        """
        Initialize the document retriever
        
        Args:
            qdrant_url: URL for Qdrant vector database
            ollama_url: URL for Ollama service
            embedding_model: Name of the embedding model
        """
        self.qdrant_url = qdrant_url
        self.ollama_url = ollama_url
        self.qdrant_client = QdrantClient(url=qdrant_url)
        
        # Initialize embeddings
        self.embeddings = OllamaEmbeddings(
            base_url=ollama_url,
            model=embedding_model,
            model_kwargs={}  # Use only default supported parameters
        )
    
    def get_topics(self, collection_name: str) -> List[dict]:
        """
        Get all unique topics from a collection
        
        Args:
            collection_name: Name of the collection
            
        Returns:
            List of topics with metadata (name, document_count, chunk_count)
        """
        try:
            # Check if collection exists
            collections = self.qdrant_client.get_collections()
            collection_names = [col.name for col in collections.collections]
            
            if collection_name not in collection_names:
                return []
            
            # Scroll through all points to get topics
            scroll_result = self.qdrant_client.scroll(
                collection_name=collection_name,
                limit=10000,
                with_payload=True,
                with_vectors=False
            )
            
            # Extract unique topics
            topics_dict = {}
            for point in scroll_result[0]:
                # Check for topic in metadata (newer format) or directly in payload (legacy)
                topic = None
                source_file = None
                
                if point.payload:
                    if 'metadata' in point.payload:
                        topic = point.payload['metadata'].get('topic')
                        source_file = point.payload['metadata'].get('source_file')
                    elif 'topic' in point.payload:
                        topic = point.payload['topic']
                        source_file = point.payload.get('source_file')
                
                if topic:
                    if topic not in topics_dict:
                        topics_dict[topic] = {
                            'name': topic,
                            'document_count': 0,
                            'chunk_count': 0
                        }
                    topics_dict[topic]['chunk_count'] += 1
                    
                    # Count unique source files
                    if source_file:
                        if 'files' not in topics_dict[topic]:
                            topics_dict[topic]['files'] = set()
                        topics_dict[topic]['files'].add(source_file)
            
            # Convert to list and calculate document counts
            topics_list = []
            for topic_data in topics_dict.values():
                if 'files' in topic_data:
                    topic_data['document_count'] = len(topic_data['files'])
                    del topic_data['files']  # Remove the set from response
                topics_list.append(topic_data)
            
            return sorted(topics_list, key=lambda x: x['name'])
            
        except Exception as e:
            print(f"Error getting topics: {e}")
            return []
    
    def get_topic_files(self, topic_name: str, collection_name: str) -> List[dict]:
        """
        Get all unique files for a specific topic
        
        Args:
            topic_name: Name of the topic
            collection_name: Name of the collection
            
        Returns:
            List of files with metadata (filename, chunk_count, uploaded_at)
        """
        try:
            # Check if collection exists
            collections = self.qdrant_client.get_collections()
            collection_names = [col.name for col in collections.collections]
            
            if collection_name not in collection_names:
                return []
            
            # Scroll through all points for this topic
            scroll_result = self.qdrant_client.scroll(
                collection_name=collection_name,
                limit=10000,
                with_payload=True,
                with_vectors=False
            )
            
            # Extract unique files for this topic
            files_dict = {}
            for point in scroll_result[0]:
                if point.payload and 'metadata' in point.payload:
                    metadata = point.payload['metadata']
                    point_topic = metadata.get('topic')
                    
                    if point_topic == topic_name:
                        source_file = metadata.get('source_file') or metadata.get('original_filename')
                        uploaded_at = metadata.get('uploaded_at', '')
                        
                        if source_file:
                            if source_file not in files_dict:
                                files_dict[source_file] = {
                                    'filename': source_file,
                                    'chunk_count': 0,
                                    'uploaded_at': uploaded_at
                                }
                            files_dict[source_file]['chunk_count'] += 1
            
            # Convert to list and sort by filename
            files_list = list(files_dict.values())
            return sorted(files_list, key=lambda x: x['filename'])
            
        except Exception as e:
            print(f"Error getting topic files: {e}")
            return []
    
    def search_documents(
        self, 
        query: str, 
        collection_name: str,
        topics: Optional[List[str]] = None,
        limit: int = 8
    ) -> List[dict]:
        """
        Search for relevant document chunks
        
        Args:
            query: The search query
            collection_name: Name of the collection to search
            topics: Optional list of topics to filter by
            limit: Maximum number of results to return
            
        Returns:
            List of relevant document chunks with metadata
        """
        try:
            # Generate query embedding
            query_vector = self.embeddings.embed_query(query)
            
            # Build filter for topics if provided
            query_filter = None
            if topics and len(topics) > 0:
                query_filter = Filter(
                    must=[
                        FieldCondition(
                            key="metadata.topic",
                            match=MatchAny(any=topics)
                        )
                    ]
                )
            
            # Search in Qdrant
            search_results = self.qdrant_client.search(
                collection_name=collection_name,
                query_vector=query_vector,
                query_filter=query_filter,
                limit=limit,
                with_payload=True
            )
            
            # Format results
            chunks = []
            for result in search_results:
                chunk = {
                    'content': result.payload.get('page_content', ''),
                    'score': result.score,
                    'metadata': {
                        'topic': result.payload.get('metadata', {}).get('topic', ''),
                        'source_file': result.payload.get('metadata', {}).get('source_file', ''),
                        'page': result.payload.get('metadata', {}).get('page', None)
                    }
                }
                chunks.append(chunk)
            
            return chunks
            
        except Exception as e:
            print(f"Error searching documents: {e}")
            return []
    
    def delete_file_from_topic(
        self, 
        topic_name: str, 
        filename: str, 
        collection_name: str
    ) -> dict:
        """
        Delete all chunks of a specific file from a topic
        
        Args:
            topic_name: Name of the topic
            filename: Name of the file to delete
            collection_name: Name of the collection
            
        Returns:
            Dict with deletion results
        """
        try:
            # Build filter for topic and filename
            delete_filter = Filter(
                must=[
                    FieldCondition(
                        key="metadata.topic",
                        match={"value": topic_name}
                    ),
                    FieldCondition(
                        key="metadata.source_file",
                        match={"value": filename}
                    )
                ]
            )
            
            # Delete points matching the filter
            result = self.qdrant_client.delete(
                collection_name=collection_name,
                points_selector=delete_filter
            )
            
            return {
                "success": True,
                "message": f"Deleted file '{filename}' from topic '{topic_name}'",
                "operation_id": result.operation_id if hasattr(result, 'operation_id') else None
            }
            
        except Exception as e:
            print(f"Error deleting file from topic: {e}")
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }
    
    def delete_topic(self, topic_name: str, collection_name: str) -> dict:
        """
        Delete all documents/chunks belonging to a topic
        
        Args:
            topic_name: Name of the topic to delete
            collection_name: Name of the collection
            
        Returns:
            Dict with deletion results
        """
        try:
            # Build filter for topic
            delete_filter = Filter(
                must=[
                    FieldCondition(
                        key="metadata.topic",
                        match={"value": topic_name}
                    )
                ]
            )
            
            # Delete all points matching the filter
            result = self.qdrant_client.delete(
                collection_name=collection_name,
                points_selector=delete_filter
            )
            
            return {
                "success": True,
                "message": f"Deleted topic '{topic_name}' and all its documents",
                "operation_id": result.operation_id if hasattr(result, 'operation_id') else None
            }
            
        except Exception as e:
            print(f"Error deleting topic: {e}")
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }
    
    def rename_topic(
        self, 
        old_topic_name: str, 
        new_topic_name: str, 
        collection_name: str
    ) -> dict:
        """
        Rename a topic by updating all chunks' metadata
        
        Args:
            old_topic_name: Current name of the topic
            new_topic_name: New name for the topic
            collection_name: Name of the collection
            
        Returns:
            Dict with rename results
        """
        try:
            # First, get all points with the old topic name
            scroll_result = self.qdrant_client.scroll(
                collection_name=collection_name,
                scroll_filter=Filter(
                    must=[
                        FieldCondition(
                            key="metadata.topic",
                            match={"value": old_topic_name}
                        )
                    ]
                ),
                limit=10000,
                with_payload=True,
                with_vectors=False
            )
            
            points = scroll_result[0]
            
            if not points:
                return {
                    "success": False,
                    "message": f"Topic '{old_topic_name}' not found"
                }
            
            # Update each point's metadata
            updated_count = 0
            for point in points:
                if point.payload and 'metadata' in point.payload:
                    # Update the topic in metadata
                    point.payload['metadata']['topic'] = new_topic_name
                    
                    # Update the point in Qdrant
                    self.qdrant_client.set_payload(
                        collection_name=collection_name,
                        payload=point.payload,
                        points=[point.id]
                    )
                    updated_count += 1
            
            return {
                "success": True,
                "message": f"Renamed topic '{old_topic_name}' to '{new_topic_name}' ({updated_count} chunks updated)",
                "updated_count": updated_count
            }
            
        except Exception as e:
            print(f"Error renaming topic: {e}")
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }
