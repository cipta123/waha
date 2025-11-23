from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class DocumentInput(BaseModel):
    """Input model for document ingestion"""
    content: str = Field(..., description="The document content to ingest")
    metadata: Optional[dict] = Field(default={}, description="Optional metadata for the document")
    document_id: Optional[str] = Field(None, description="Optional unique identifier for the document")


class DocumentBatch(BaseModel):
    """Input model for batch document ingestion"""
    documents: List[DocumentInput] = Field(..., description="List of documents to ingest")

class UrlInput(BaseModel):
    """Input model for URL ingestion"""
    url: str = Field(..., description="The URL to ingest")


class ChatMessage(BaseModel):
    """Model for a single chat message"""
    role: str = Field(..., description="Role of the message sender (user or assistant)")
    content: str = Field(..., description="Content of the message")

class QueryInput(BaseModel):
    """Input model for RAG query"""
    query: str = Field(..., description="The question or query to answer")
    top_k: Optional[int] = Field(None, description="Number of relevant documents to retrieve")
    temperature: Optional[float] = Field(None, description="LLM temperature for response generation")
    history: Optional[List[ChatMessage]] = Field(default=[], description="Conversation history")


class RetrievedDocument(BaseModel):
    """Model for retrieved document chunk"""
    content: str
    metadata: dict
    score: float


class QueryResponse(BaseModel):
    """Response model for RAG query"""
    answer: str = Field(..., description="The generated answer")
    sources: List[RetrievedDocument] = Field(..., description="Retrieved source documents")
    query: str = Field(..., description="The original query")


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    vector_db_status: str
    documents_count: int


class IngestResponse(BaseModel):
    """Response for document ingestion"""
    success: bool
    message: str
    documents_ingested: int
    document_ids: List[str]


class DocumentMetadata(BaseModel):
    """Document metadata model"""
    document_id: str
    filename: Optional[str] = None
    extension: Optional[str] = None
    size: Optional[int] = None
    char_count: Optional[int] = None
    chunk_count: int
    created_at: str
    metadata: dict = {}


class DocumentListResponse(BaseModel):
    """Response for listing documents"""
    documents: List[DocumentMetadata]
    total: int


class DeleteResponse(BaseModel):
    """Response for document deletion"""
    success: bool
    message: str
    deleted_count: int


class SearchRequest(BaseModel):
    """Request for searching documents"""
    query: str = Field(..., description="Search query")
    limit: Optional[int] = Field(10, description="Maximum number of results")


class SearchResult(BaseModel):
    """Search result item"""
    document_id: str
    content: str
    metadata: dict
    score: float


class QAInput(BaseModel):
    """Input model for Q&A pair"""
    question: str = Field(..., description="The question")
    answer: str = Field(..., description="The answer")
    category: Optional[str] = Field(None, description="Category/topic of Q&A")
    tags: Optional[List[str]] = Field(default=[], description="Tags for categorization")
    metadata: Optional[dict] = Field(default={}, description="Additional metadata")


class QABatchInput(BaseModel):
    """Input model for batch Q&A pairs"""
    qa_pairs: List[QAInput] = Field(..., description="List of Q&A pairs")


class QAItem(BaseModel):
    """Q&A item with ID"""
    qa_id: str
    question: str
    answer: str
    category: Optional[str] = None
    tags: List[str] = []
    created_at: str
    metadata: dict = {}


class QAListResponse(BaseModel):
    """Response for listing Q&A pairs"""
    qa_pairs: List[QAItem]
    total: int


class QAResponse(BaseModel):
    """Response for Q&A operations"""
    success: bool
    message: str
    qa_ids: List[str]


# --- Webhook and Chat Models ---

class WhatsAppMessage(BaseModel):
    """Incoming WhatsApp message model"""
    sender_id: str = Field(..., description="Unique ID of the sender (e.g., phone number)")
    message: str = Field(..., description="The text content of the message")


class LogMessage(BaseModel):
    """Input model for logging a message manually"""
    sender_id: str = Field(..., description="The user ID (chat partner)")
    message: str = Field(..., description="The message content")
    role: str = Field(..., description="user or assistant")
    agent_id: Optional[str] = Field(None, description="ID of the human agent if applicable")
    timestamp: Optional[float] = Field(None, description="Unix timestamp")


class WebhookResponse(BaseModel):
    """Response for webhook processing"""
    status: str = Field(..., description="Status of the processing (e.g., 'ai_replied', 'human_handoff', 'ignored')")
    reply: Optional[str] = Field(None, description="The reply message sent to the user, if any")


class ReportResponse(BaseModel):
    """Response for message reports"""
    messages: List[dict]
    total: int
    limit: int
    offset: int
