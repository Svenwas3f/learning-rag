"""
Chat and LLM response generation using LangChain.

This module provides a flexible chat interface that can work with multiple
LLM providers through LangChain's unified API. Easily switch between:
- Ollama (local)
- OpenAI
- Anthropic
- Google Gemini
- AWS Bedrock
- And more...

Configuration is done via environment variables or direct instantiation.
"""

import os
from typing import List, Dict, Any, Generator, Optional
from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough


class ChatGenerator:
    """
    Handles chat responses using LangChain's LLM abstraction.
    
    Supports multiple LLM providers through LangChain's unified interface.
    Default provider is Ollama for local deployment.
    
    Attributes:
        llm: The LangChain LLM instance
        system_prompt: Default system prompt for the assistant
        chain: The LangChain processing chain
    
    Example:
        >>> # Using Ollama (default)
        >>> chat = ChatGenerator(model="qwen2.5:0.5b")
        >>> 
        >>> # Using OpenAI (if configured)
        >>> from langchain_openai import ChatOpenAI
        >>> llm = ChatOpenAI(model="gpt-4")
        >>> chat = ChatGenerator(llm=llm)
    """
    
    def __init__(
        self,
        ollama_url: str = None,
        model: str = None,
        system_prompt: str = None,
        llm: Any = None,
        temperature: float = 0.7,
        top_p: float = 0.9,
        top_k: int = 40,
        timeout: int = 300
    ):
        """
        Initialize the chat generator.
        
        Args:
            ollama_url: URL for Ollama service (only used if llm not provided)
            model: Model name (only used if llm not provided)
            system_prompt: Custom system prompt (optional)
            llm: Pre-configured LangChain LLM instance (optional)
                If provided, ollama_url and model are ignored
            temperature: Sampling temperature (0.0-1.0)
            top_p: Nucleus sampling parameter
            top_k: Top-k sampling parameter
            timeout: Request timeout in seconds
            
        Raises:
            ValueError: If neither llm nor model is provided
        """
        # Store configuration
        self.temperature = temperature
        self.top_p = top_p
        self.top_k = top_k
        self.timeout = timeout
        
        # Use provided LLM or create Ollama instance
        if llm is not None:
            self.llm = llm
            self.provider = "custom"
        else:
            # Default to Ollama
            model = model or os.getenv("LLM_MODEL", "qwen2.5:0.5b")
            ollama_url = ollama_url or os.getenv("OLLAMA_URL", "http://localhost:11434")
            
            self.llm = ChatOllama(
                base_url=ollama_url,
                model=model,
                temperature=temperature,
                top_p=top_p,
                top_k=top_k,
                timeout=timeout
            )
            self.provider = "ollama"
        
        # Set system prompt
        self.system_prompt = system_prompt or self._get_default_system_prompt()
        
        # Build the LangChain processing chain
        self._build_chain()
    
    def _get_default_system_prompt(self) -> str:
        """
        Get the default system prompt.
        
        Returns:
            Default system prompt for the learning assistant
        """
        return """Du bist ein hilfreicher Lernassistent. Deine Aufgabe ist es, Fragen basierend auf den bereitgestellten Lernmaterialien zu beantworten.

Richtlinien:
- Antworte basierend auf dem bereitgestellten Kontext
- Wenn der Kontext nicht genug Informationen enthält, sage dies klar und deutlich
- Sei präzise, klar und gut strukturiert
- Vermeide es, Informationen zu erfinden oder zu spekulieren
- Verwende Markdown-Formatierung für bessere Lesbarkeit:
  * **Fettschrift** für wichtige Konzepte
  * *Kursiv* für Betonungen
  * Aufzählungslisten für mehrere Punkte
  * Nummerierte Listen für Schritte oder Reihenfolgen
  * `Code` für technische Begriffe
- Beantworte auf Deutsch, es sei denn, die Frage ist in einer anderen Sprache gestellt"""
    
    def _build_chain(self):
        """
        Build the LangChain processing chain.
        
        Creates a chain that:
        1. Formats context from retrieved chunks
        2. Applies the system prompt
        3. Processes the user question
        4. Generates the response
        """
        # Create prompt template
        prompt = ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            ("system", "Kontext aus den Lernmaterialien:\n\n{context}"),
            ("human", "{question}")
        ])
        
        # Build chain: prompt -> llm -> output parser
        self.chain = (
            {
                "context": lambda x: self._format_context(x["context_chunks"]),
                "question": lambda x: x["question"]
            }
            | prompt
            | self.llm
            | StrOutputParser()
        )
    
    def _format_context(self, context_chunks: List[Dict[str, Any]]) -> str:
        """
        Format context chunks into a single text block.
        
        Args:
            context_chunks: List of retrieved document chunks with metadata
            
        Returns:
            Formatted context string with source information
        """
        if not context_chunks:
            return "Kein relevanter Kontext gefunden."
        
        formatted_chunks = []
        for chunk in context_chunks:
            metadata = chunk.get("metadata", {})
            content = chunk.get("content", "")
            source = metadata.get("source_file", "Unbekannte Quelle")
            
            formatted_chunks.append(f"[Quelle: {source}]\n{content}")
        
        return "\n\n".join(formatted_chunks)
    
    def generate_response(
        self,
        question: str,
        context_chunks: List[Dict[str, Any]]
    ) -> str:
        """
        Generate a response to a question using retrieved context.
        
        Uses LangChain's invoke method for synchronous generation.
        
        Args:
            question: The user's question
            context_chunks: List of relevant document chunks with metadata
            
        Returns:
            Generated response text
            
        Raises:
            Exception: If generation fails
            
        Example:
            >>> chunks = [{"content": "...", "metadata": {"source_file": "doc.pdf"}}]
            >>> response = chat_gen.generate_response("What is RAG?", chunks)
        """
        try:
            # Invoke the chain
            response = self.chain.invoke({
                "question": question,
                "context_chunks": context_chunks
            })
            
            return response
            
        except TimeoutError:
            error_msg = f"Die Anfrage hat zu lange gedauert (>{self.timeout}s). Bitte versuchen Sie es mit einer kürzeren Frage."
            print(f"LLM timeout after {self.timeout} seconds")
            return error_msg
            
        except ConnectionError as e:
            error_msg = "Verbindung zum LLM-Service fehlgeschlagen. Bitte stellen Sie sicher, dass der Service läuft."
            print(f"Cannot connect to LLM service: {e}")
            return error_msg
            
        except Exception as e:
            error_msg = f"Ein Fehler ist aufgetreten: {str(e)}"
            print(f"Error generating response: {e}")
            return error_msg
    
    def generate_response_stream(
        self,
        question: str,
        context_chunks: List[Dict[str, Any]]
    ) -> Generator[str, None, None]:
        """
        Generate a streaming response.
        
        Uses LangChain's stream method for token-by-token generation.
        
        Args:
            question: The user's question
            context_chunks: List of relevant document chunks
            
        Yields:
            Response tokens as they're generated
            
        Example:
            >>> for token in chat_gen.generate_response_stream("Explain RAG", chunks):
            ...     print(token, end="", flush=True)
        """
        try:
            # Stream the chain
            for chunk in self.chain.stream({
                "question": question,
                "context_chunks": context_chunks
            }):
                yield chunk
                
        except TimeoutError:
            error_msg = f"Die Anfrage hat zu lange gedauert (>{self.timeout}s)."
            print(f"LLM streaming timeout after {self.timeout} seconds")
            yield error_msg
            
        except ConnectionError as e:
            error_msg = "Verbindung zum LLM-Service fehlgeschlagen."
            print(f"Cannot connect to LLM for streaming: {e}")
            yield error_msg
            
        except Exception as e:
            error_msg = f"Ein Fehler ist aufgetreten: {str(e)}"
            print(f"Error generating streaming response: {e}")
            yield error_msg