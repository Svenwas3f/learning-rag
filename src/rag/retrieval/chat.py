"""
Chat and LLM response generation
"""

from typing import List
import requests


class ChatGenerator:
    """Handles chat responses using Ollama LLM"""
    
    def __init__(
        self,
        ollama_url: str = "http://localhost:11434",
        model: str = "qwen2.5:0.5b",
        system_prompt: str = None
    ):
        """
        Initialize the chat generator
        
        Args:
            ollama_url: URL for Ollama service
            model: Name of the LLM model to use
            system_prompt: Custom system prompt (optional)
        """
        self.ollama_url = ollama_url
        self.model = model
        self.system_prompt = system_prompt or self._get_default_system_prompt()
    
    def _get_default_system_prompt(self) -> str:
        """Get the default system prompt"""
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
    
    def generate_response(
        self,
        question: str,
        context_chunks: List[dict],
        stream: bool = False
    ) -> str:
        """
        Generate a response to a question using retrieved context
        
        Args:
            question: The user's question
            context_chunks: List of relevant document chunks
            stream: Whether to stream the response
            
        Returns:
            Generated response text
        """
        # Build context from chunks
        context_text = "\n\n".join([
            f"[Quelle: {chunk['metadata']['source_file']}]\n{chunk['content']}"
            for chunk in context_chunks
        ])
        
        # Create prompt with system prompt
        prompt = f"""{self.system_prompt}

Kontext aus den Lernmaterialien:
{context_text}

Frage: {question}

Antwort:"""
        
        # Call Ollama API
        try:
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": stream,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "top_k": 40
                    }
                },
                timeout=300  # 5 minutes timeout
            )
            
            if response.status_code == 200:
                if stream:
                    # For streaming, return the response object
                    return response
                else:
                    # For non-streaming, extract the full response
                    result = response.json()
                    return result.get("response", "")
            else:
                return f"Error: Unable to generate response (status {response.status_code})"
                
        except requests.exceptions.Timeout:
            print(f"Ollama timeout after 300 seconds")
            return "Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es mit einer kürzeren Frage oder weniger Kontext."
        except requests.exceptions.ConnectionError as e:
            print(f"Cannot connect to Ollama: {e}")
            return "Verbindung zum LLM-Service fehlgeschlagen. Bitte stellen Sie sicher, dass Ollama läuft."
        except Exception as e:
            print(f"Error generating response: {e}")
            return f"Ein Fehler ist aufgetreten: {str(e)}"
    
    def generate_response_stream(
        self,
        question: str,
        context_chunks: List[dict]
    ):
        """
        Generate a streaming response
        
        Args:
            question: The user's question
            context_chunks: List of relevant document chunks
            
        Yields:
            Response chunks as they're generated
        """
        # Build context from chunks
        context_text = "\n\n".join([
            f"[Quelle: {chunk['metadata']['source_file']}]\n{chunk['content']}"
            for chunk in context_chunks
        ])
        
        # Create prompt with system prompt
        prompt = f"""{self.system_prompt}

Kontext aus den Lernmaterialien:
{context_text}

Frage: {question}

Antwort:"""
        
        # Call Ollama API with streaming
        try:
            response = requests.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": True,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "top_k": 40
                    }
                },
                stream=True,
                timeout=300  # 5 minutes timeout
            )
            
            if response.status_code == 200:
                import json
                for line in response.iter_lines():
                    if line:
                        chunk = json.loads(line)
                        if "response" in chunk:
                            yield chunk["response"]
            else:
                yield f"Error: Unable to generate response (status {response.status_code})"
                
        except requests.exceptions.Timeout:
            print(f"Ollama streaming timeout after 300 seconds")
            yield "Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es mit einer kürzeren Frage."
        except requests.exceptions.ConnectionError as e:
            print(f"Cannot connect to Ollama for streaming: {e}")
            yield "Verbindung zum LLM-Service fehlgeschlagen."
        except Exception as e:
            print(f"Error generating streaming response: {e}")
            yield f"Ein Fehler ist aufgetreten: {str(e)}"
