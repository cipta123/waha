from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # LLM Provider
    llm_provider: Literal["openai", "groq", "gemini"] = "groq"
    
    # API Keys
    openai_api_key: str = ""
    groq_api_key: str = ""
    google_api_key: str = ""
    
    # Model Configuration
    embedding_model: str = "text-embedding-3-small"
    llm_model: str = "llama-3.1-70b-versatile"
    
    # ChromaDB Configuration
    chroma_persist_directory: str = "./chroma_db"
    collection_name: str = "documents"
    
    # RAG Configuration
    chunk_size: int = 3000  # Increased for better table handling
    chunk_overlap: int = 500  # Increased overlap for context continuity
    top_k_results: int = 15  # Increased retrieval for comprehensive answers (especially for curriculum)
    temperature: float = 0.4  # Focused and concise while remaining clear
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8001
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
