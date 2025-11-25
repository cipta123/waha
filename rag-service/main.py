import time
from fastapi import FastAPI, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
from typing import List, Optional, Dict, Any
from models import (
    DocumentInput,
    DocumentBatch,
    UrlInput,
    QueryInput,
    QueryResponse,
    HealthResponse,
    IngestResponse,
    DocumentListResponse,
    DeleteResponse,
    SearchRequest,
    SearchResult,
    QAInput,
    QABatchInput,
    QAItem,
    QAListResponse,
    QAResponse,
    WhatsAppMessage,
    WebhookResponse,
    LogMessage,
    LogMessage,
    ReportResponse
)
from rag_engine import RAGEngine
from document_parser import DocumentParser
from config import settings
from session_manager import SessionManager
from classifier import MessageRouter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global instances
rag_engine: Optional[RAGEngine] = None
session_manager: Optional[SessionManager] = None
message_router: Optional[MessageRouter] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for FastAPI app"""
    global rag_engine, session_manager, message_router
    
    # Startup
    logger.info("Initializing RAG Engine...")
    try:
        rag_engine = RAGEngine()
        session_manager = SessionManager()
        message_router = MessageRouter()
        logger.info("RAG Engine and components initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize components: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down RAG Engine...")


# Initialize FastAPI app
app = FastAPI(
    title="RAG Service API",
    description="Advanced Retrieval-Augmented Generation service with ChromaDB and LLM",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"],  <-- Cannot use '*' with allow_credentials=True
    allow_origin_regex="https?://.*",  # Allow any HTTP/HTTPS origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "RAG Service API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.post("/webhook/whatsapp", response_model=WebhookResponse, tags=["Integration"])
async def webhook_whatsapp(msg: WhatsAppMessage):
    """
    Handle incoming WhatsApp message
    
    - **sender_id**: Phone number or ID of the sender
    - **message**: Content of the message
    """
    start_time = time.time()
    try:
        logger.info(f"Received WhatsApp message from {msg.sender_id}: {msg.message[:50]}...")
        
        # Handle reset session command
        if msg.message == "__RESET_SESSION__":
            logger.info(f"Resetting session for {msg.sender_id} to AI mode")
            session_manager.set_ai_mode(msg.sender_id)
            return WebhookResponse(status="session_reset", reply=None)
        
        # 1. Check Session Status
        if not session_manager.should_ai_reply(msg.sender_id):
            logger.info(f"User {msg.sender_id} is in human mode. Ignoring.")
            # Log message but mark as ignored/human mode
            session_manager.add_history(msg.sender_id, "user", msg.message)
            return WebhookResponse(status="human_mode_active", reply=None)
            
        # 2. Classify Intent
        classification = message_router.classify(msg.message)
        logger.info(f"Classification for {msg.sender_id}: {classification}")
        
        action = classification.get("action")
        intent = classification.get("reason", "unknown") # Use reason as intent label for now
        
        # 3. Handle Based on Intent
        if action == "human_handoff":
            # Switch to Human Mode
            session_manager.set_human_mode(msg.sender_id)
            
            # Log user message with intent
            session_manager.add_history(msg.sender_id, "user", msg.message, intent=intent)
            
            # Optional: Send a handoff message
            handoff_msg = classification.get("suggested_response", "Baik, saya akan hubungkan dengan staf kami. Mohon tunggu sebentar.")
            
            # Log system reply
            session_manager.add_history(msg.sender_id, "assistant", handoff_msg, intent="handoff")
            
            return WebhookResponse(status="handoff_initiated", reply=handoff_msg)
            
        else: # ai_reply
            # Check if classifier provided a direct suggested response (small talk)
            suggested_response = classification.get("suggested_response")
            reason = classification.get("reason", "").lower()
            
            # If it's small talk/greeting, use suggested response directly
            is_small_talk = any(k in reason for k in ["sapaan", "salam", "greeting", "small talk", "basa-basi"])
            
            if suggested_response and is_small_talk:
                logger.info(f"Using suggested response for small talk: {suggested_response}")
                answer = suggested_response
                intent = "small_talk"
            else:
                # Generate RAG Answer for knowledge questions
                # Get history from session if needed (simplified here)
                session = session_manager.get_session(msg.sender_id)
                history = session.get("history", [])[-5:] # Last 5 messages
                
                # Perform RAG Query
                result = rag_engine.query(
                    query=msg.message,
                    history=history
                )
                answer = result["answer"]
                # intent remains from classifier or could be refined by RAG
            
            # Calculate response time
            end_time = time.time()
            response_time = end_time - start_time
            
            # Update Session
            session_manager.update_activity(msg.sender_id)
            
            # Save conversation history to DB with Analytics data
            session_manager.add_history(msg.sender_id, "user", msg.message, intent=intent)
            session_manager.add_history(msg.sender_id, "assistant", answer, intent=intent, response_time=response_time)
            
            return WebhookResponse(status="ai_replied", reply=answer)
            
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        # Fail safe: don't reply if error, let human handle
        return WebhookResponse(status="error", reply=None)


@app.get("/analytics", tags=["Statistics"])
async def get_analytics(days: int = 7):
    """Get analytics data for dashboard"""
    try:
        if session_manager and session_manager.db:
            return session_manager.db.get_analytics_summary(days)
        return {}
    except Exception as e:
        logger.error(f"Failed to get analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get analytics: {str(e)}"
        )


@app.post("/log-message", tags=["Integration"])
async def log_message(msg: LogMessage):
    """
    Log a message manually (e.g. sent by human agent)
    """
    try:
        logger.info(f"Logging message for {msg.sender_id} from {msg.agent_id or 'system'}")
        
        session_manager.add_history(
            user_id=msg.sender_id,
            role=msg.role,
            content=msg.message,
            agent_id=msg.agent_id
        )
        return {"status": "logged"}
    except Exception as e:
        logger.error(f"Failed to log message: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log message: {str(e)}"
        )


@app.get("/reports/messages", response_model=ReportResponse, tags=["Reports"])
async def get_message_reports(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    agent_id: Optional[str] = None,
    intent: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    Get filtered message logs for reporting
    """
    try:
        if session_manager and session_manager.db:
            result = session_manager.db.get_message_reports(
                start_date=start_date,
                end_date=end_date,
                agent_id=agent_id,
                intent=intent,
                search=search,
                limit=limit,
                offset=offset
            )
            return ReportResponse(**result)
        return ReportResponse(messages=[], total=0, limit=limit, offset=offset)
    except Exception as e:
        logger.error(f"Failed to get message reports: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get reports: {str(e)}"
        )


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    try:
        stats = rag_engine.get_collection_stats()
        return HealthResponse(
            status="healthy",
            vector_db_status="connected",
            documents_count=stats["documents_count"]
        )
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Service unhealthy: {str(e)}"
        )


@app.post("/ingest", response_model=IngestResponse, tags=["Documents"])
async def ingest_document(document: DocumentInput):
    """
    Ingest a single document into the vector database
    
    - **content**: The document content to ingest
    - **metadata**: Optional metadata for the document
    - **document_id**: Optional unique identifier
    """
    try:
        logger.info(f"Ingesting document: {document.document_id or 'auto-generated ID'}")
        
        doc_id = rag_engine.ingest_document(
            content=document.content,
            metadata=document.metadata,
            document_id=document.document_id
        )
        
        logger.info(f"Document ingested successfully: {doc_id}")
        
        return IngestResponse(
            success=True,
            message="Document ingested successfully",
            documents_ingested=1,
            document_ids=[doc_id]
        )
    except Exception as e:
        logger.error(f"Failed to ingest document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest document: {str(e)}"
        )


@app.post("/ingest/url", response_model=IngestResponse, tags=["Documents"])
async def ingest_url(url_input: UrlInput):
    """
    Ingest a single document from a URL
    
    - **url**: The URL to scrape and ingest
    """
    try:
        logger.info(f"Ingesting from URL: {url_input.url}")
        
        # Parse URL
        parsed = DocumentParser.parse_url(url_input.url)
        
        # Ingest document
        doc_id = rag_engine.ingest_document(
            content=parsed["content"],
            metadata={
                "filename": parsed["filename"],
                "extension": parsed["extension"],
                "size": parsed["size"],
                "source_url": parsed["source_url"]
            }
        )
        
        logger.info(f"URL ingested successfully: {doc_id}")
        
        return IngestResponse(
            success=True,
            message=f"URL '{url_input.url}' ingested successfully",
            documents_ingested=1,
            document_ids=[doc_id]
        )
    except Exception as e:
        logger.error(f"Failed to ingest URL: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest URL: {str(e)}"
        )


@app.post("/ingest/batch", response_model=IngestResponse, tags=["Documents"])
async def ingest_documents_batch(batch: DocumentBatch):
    """
    Ingest multiple documents in batch
    
    - **documents**: List of documents to ingest
    """
    try:
        logger.info(f"Ingesting batch of {len(batch.documents)} documents")
        
        documents = [
            {
                "content": doc.content,
                "metadata": doc.metadata,
                "document_id": doc.document_id
            }
            for doc in batch.documents
        ]
        
        doc_ids = rag_engine.ingest_documents(documents)
        
        logger.info(f"Batch ingestion completed: {len(doc_ids)} documents")
        
        return IngestResponse(
            success=True,
            message="Documents ingested successfully",
            documents_ingested=len(doc_ids),
            document_ids=doc_ids
        )
    except Exception as e:
        logger.error(f"Failed to ingest batch: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest documents: {str(e)}"
        )


@app.post("/query", response_model=QueryResponse, tags=["Query"])
async def query_rag(query_input: QueryInput):
    """
    Query the RAG system with a question
    
    - **query**: The question to answer
    - **top_k**: Optional number of documents to retrieve
    - **temperature**: Optional LLM temperature
    """
    try:
        logger.info(f"Processing query: {query_input.query[:100]}...")
        
        result = rag_engine.query(
            query=query_input.query,
            top_k=query_input.top_k,
            temperature=query_input.temperature,
            history=[msg.dict() for msg in query_input.history]  # Pass history
        )
        
        logger.info(f"Query processed successfully")
        
        return QueryResponse(**result)
    except Exception as e:
        logger.error(f"Failed to process query: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process query: {str(e)}"
        )


@app.get("/stats", tags=["Statistics"])
async def get_stats():
    """Get statistics about the vector database"""
    try:
        stats = rag_engine.get_collection_stats()
        return stats
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get statistics: {str(e)}"
        )


@app.delete("/clear", tags=["Documents"])
async def clear_database():
    """Clear all documents from the vector database (use with caution!)"""
    try:
        logger.warning("Clearing all documents from database")
        rag_engine.clear_collection()
        logger.info("Database cleared successfully")
        return {"message": "Database cleared successfully"}
    except Exception as e:
        logger.error(f"Failed to clear database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear database: {str(e)}"
        )


@app.post("/upload/file", response_model=IngestResponse, tags=["Documents"])
async def upload_file(file: UploadFile = File(...)):
    """
    Upload and ingest a file (PDF, DOCX, TXT)
    
    - **file**: File to upload (PDF, DOCX, TXT, MD, CSV)
    """
    try:
        logger.info(f"Uploading file: {file.filename}")
        
        # Read file content
        content = await file.read()
        
        # Parse file based on extension
        parsed = DocumentParser.parse_file(content, file.filename)
        
        # Ingest document
        doc_id = rag_engine.ingest_document(
            content=parsed["content"],
            metadata={
                "filename": parsed["filename"],
                "extension": parsed["extension"],
                "size": parsed["size"]
            },
            filename=parsed["filename"]
        )
        
        logger.info(f"File uploaded successfully: {doc_id}")
        
        return IngestResponse(
            success=True,
            message=f"File '{file.filename}' uploaded successfully",
            documents_ingested=1,
            document_ids=[doc_id]
        )
    except Exception as e:
        logger.error(f"Failed to upload file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload file: {str(e)}"
        )


@app.post("/upload/files", response_model=IngestResponse, tags=["Documents"])
async def upload_files(files: List[UploadFile] = File(...)):
    """
    Upload and ingest multiple files (batch upload)
    
    - **files**: List of files to upload
    """
    try:
        logger.info(f"Uploading {len(files)} files")
        
        doc_ids = []
        for file in files:
            # Read file content
            content = await file.read()
            
            # Parse file
            parsed = DocumentParser.parse_file(content, file.filename)
            
            # Ingest document
            doc_id = rag_engine.ingest_document(
                content=parsed["content"],
                metadata={
                    "filename": parsed["filename"],
                    "extension": parsed["extension"],
                    "size": parsed["size"]
                },
                filename=parsed["filename"]
            )
            
            doc_ids.append(doc_id)
        
        logger.info(f"Batch upload completed: {len(doc_ids)} files")
        
        return IngestResponse(
            success=True,
            message=f"{len(doc_ids)} files uploaded successfully",
            documents_ingested=len(doc_ids),
            document_ids=doc_ids
        )
    except Exception as e:
        logger.error(f"Failed to upload files: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload files: {str(e)}"
        )


@app.get("/documents", response_model=DocumentListResponse, tags=["Documents"])
async def list_documents():
    """
    List all documents in the knowledge base
    
    Returns list of documents with metadata
    """
    try:
        documents = rag_engine.list_documents()
        return DocumentListResponse(
            documents=documents,
            total=len(documents)
        )
    except Exception as e:
        logger.error(f"Failed to list documents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list documents: {str(e)}"
        )


@app.delete("/documents/{document_id}", response_model=DeleteResponse, tags=["Documents"])
async def delete_document(document_id: str):
    """
    Delete a document from the knowledge base
    
    - **document_id**: ID of the document to delete
    """
    try:
        logger.info(f"Deleting document: {document_id}")
        deleted_count = rag_engine.delete_document(document_id)
        
        if deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document not found: {document_id}"
            )
        
        logger.info(f"Document deleted: {document_id} ({deleted_count} chunks)")
        
        return DeleteResponse(
            success=True,
            message=f"Document deleted successfully",
            deleted_count=deleted_count
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete document: {str(e)}"
        )


@app.post("/search", response_model=List[SearchResult], tags=["Search"])
async def search_documents(request: SearchRequest):
    """
    Search documents by semantic similarity
    
    - **query**: Search query
    - **limit**: Maximum number of results (default: 10)
    """
    try:
        logger.info(f"Searching documents: {request.query[:50]}...")
        results = rag_engine.search_documents(request.query, request.limit)
        return results
    except Exception as e:
        logger.error(f"Failed to search documents: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search documents: {str(e)}"
        )


@app.post("/qa", response_model=QAResponse, tags=["Q&A Knowledge Base"])
async def add_qa_pair(qa: QAInput):
    """
    Add a Q&A pair to the knowledge base
    
    - **question**: The question
    - **answer**: The answer
    - **category**: Optional category/topic
    - **tags**: Optional tags for categorization
    """
    try:
        logger.info(f"Adding Q&A pair: {qa.question[:50]}...")
        
        qa_id = rag_engine.add_qa_pair(
            question=qa.question,
            answer=qa.answer,
            category=qa.category,
            tags=qa.tags,
            metadata=qa.metadata
        )
        
        logger.info(f"Q&A pair added: {qa_id}")
        
        return QAResponse(
            success=True,
            message="Q&A pair added successfully",
            qa_ids=[qa_id]
        )
    except Exception as e:
        logger.error(f"Failed to add Q&A pair: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add Q&A pair: {str(e)}"
        )


@app.post("/qa/batch", response_model=QAResponse, tags=["Q&A Knowledge Base"])
async def add_qa_batch(batch: QABatchInput):
    """
    Add multiple Q&A pairs in batch
    
    - **qa_pairs**: List of Q&A pairs to add
    """
    try:
        logger.info(f"Adding {len(batch.qa_pairs)} Q&A pairs...")
        
        qa_pairs_dict = [qa.dict() for qa in batch.qa_pairs]
        qa_ids = rag_engine.add_qa_batch(qa_pairs_dict)
        
        logger.info(f"Batch Q&A added: {len(qa_ids)} pairs")
        
        return QAResponse(
            success=True,
            message=f"{len(qa_ids)} Q&A pairs added successfully",
            qa_ids=qa_ids
        )
    except Exception as e:
        logger.error(f"Failed to add Q&A batch: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add Q&A batch: {str(e)}"
        )


@app.get("/qa", response_model=QAListResponse, tags=["Q&A Knowledge Base"])
async def list_qa_pairs():
    """
    List all Q&A pairs in the knowledge base
    
    Returns list of Q&A pairs with metadata
    """
    try:
        qa_pairs = rag_engine.list_qa_pairs()
        return QAListResponse(
            qa_pairs=qa_pairs,
            total=len(qa_pairs)
        )
    except Exception as e:
        logger.error(f"Failed to list Q&A pairs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list Q&A pairs: {str(e)}"
        )


@app.put("/qa/{qa_id}", response_model=QAResponse, tags=["Q&A Knowledge Base"])
async def update_qa_pair(qa_id: str, qa: QAInput):
    """
    Update a Q&A pair in the knowledge base
    
    - **qa_id**: ID of the Q&A pair to update
    - **question**: The new question
    - **answer**: The new answer
    - **category**: Optional category/topic
    - **tags**: Optional tags
    """
    try:
        logger.info(f"Updating Q&A pair: {qa_id}")
        
        success = rag_engine.update_qa_pair(
            qa_id=qa_id,
            question=qa.question,
            answer=qa.answer,
            category=qa.category,
            tags=qa.tags,
            metadata=qa.metadata
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Q&A pair not found: {qa_id}"
            )
        
        logger.info(f"Q&A pair updated: {qa_id}")
        
        return QAResponse(
            success=True,
            message="Q&A pair updated successfully",
            qa_ids=[qa_id]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update Q&A pair: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update Q&A pair: {str(e)}"
        )


@app.delete("/qa/{qa_id}", tags=["Q&A Knowledge Base"])
async def delete_qa_pair(qa_id: str):
    """
    Delete a Q&A pair from the knowledge base
    
    - **qa_id**: ID of the Q&A pair to delete
    """
    try:
        logger.info(f"Deleting Q&A pair: {qa_id}")
        success = rag_engine.delete_qa_pair(qa_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Q&A pair not found: {qa_id}"
            )
        
        logger.info(f"Q&A pair deleted: {qa_id}")
        
        return {"success": True, "message": "Q&A pair deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete Q&A pair: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete Q&A pair: {str(e)}"
        )





if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
