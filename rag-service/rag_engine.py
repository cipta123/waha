import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_community.vectorstores import Chroma
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime
from config import settings
from groq import Groq
import google.generativeai as genai


class RAGEngine:
    """Advanced RAG Engine with ChromaDB and LLM integration"""
    
    def __init__(self):
        self.settings = settings
        self._initialize_vector_db()
        self._initialize_llm()
        self._initialize_text_splitter()
        
    def _initialize_vector_db(self):
        """Initialize ChromaDB vector database"""
        self.chroma_client = chromadb.PersistentClient(
            path=self.settings.chroma_persist_directory,
            settings=ChromaSettings(
                anonymized_telemetry=False,
                allow_reset=True
            )
        )
        
        # Initialize embeddings
        if self.settings.llm_provider == "openai":
            self.embeddings = OpenAIEmbeddings(
                model=self.settings.embedding_model,
                openai_api_key=self.settings.openai_api_key
            )
        else:
            # For Groq, we'll use OpenAI embeddings (they're separate services)
            self.embeddings = OpenAIEmbeddings(
                model=self.settings.embedding_model,
                openai_api_key=self.settings.openai_api_key
            )
        
        # Get or create collection
        try:
            self.collection = self.chroma_client.get_collection(
                name=self.settings.collection_name
            )
        except:
            self.collection = self.chroma_client.create_collection(
                name=self.settings.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        
        # Initialize LangChain Chroma wrapper
        self.vector_store = Chroma(
            client=self.chroma_client,
            collection_name=self.settings.collection_name,
            embedding_function=self.embeddings
        )
    
    def _initialize_llm(self):
        """Initialize LLM based on provider"""
        if self.settings.llm_provider == "openai":
            self.llm = ChatOpenAI(
                model=self.settings.llm_model,
                temperature=self.settings.temperature,
                openai_api_key=self.settings.openai_api_key
            )
            self.use_groq = False
            self.use_gemini = False
        elif self.settings.llm_provider == "gemini":
            # Configure Gemini
            genai.configure(api_key=self.settings.google_api_key)
            self.llm = ChatGoogleGenerativeAI(
                model=self.settings.llm_model,
                temperature=self.settings.temperature,
                google_api_key=self.settings.google_api_key
            )
            self.use_groq = False
            self.use_gemini = True
        else:
            # For Groq, we'll use their native client
            self.groq_client = Groq(api_key=self.settings.groq_api_key)
            self.use_groq = True
            self.use_gemini = False
    
    def _initialize_text_splitter(self):
        """Initialize text splitter for chunking documents"""
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.settings.chunk_size,
            chunk_overlap=self.settings.chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
    
    def ingest_document(
        self, 
        content: str, 
        metadata: Optional[Dict[str, Any]] = None,
        document_id: Optional[str] = None,
        filename: Optional[str] = None
    ) -> str:
        """
        Ingest a single document into the vector database
        
        Args:
            content: The document content
            metadata: Optional metadata for the document
            document_id: Optional unique identifier
            
        Returns:
            The document ID
        """
        if document_id is None:
            document_id = str(uuid.uuid4())
        
        if metadata is None:
            metadata = {}
        
        metadata["document_id"] = document_id
        metadata["created_at"] = datetime.now().isoformat()
        metadata["char_count"] = len(content)
        if filename:
            metadata["filename"] = filename
        
        # Split document into chunks
        chunks = self.text_splitter.split_text(content)
        
        # Add chunks to vector store in batches to avoid token limits
        batch_size = 50  # Process 50 chunks at a time
        total_chunks = len(chunks)
        
        for batch_start in range(0, total_chunks, batch_size):
            batch_end = min(batch_start + batch_size, total_chunks)
            batch_chunks = chunks[batch_start:batch_end]
            
            # Prepare metadata for this batch
            batch_metadatas = [
                {**metadata, "chunk_index": i, "total_chunks": total_chunks}
                for i in range(batch_start, batch_end)
            ]
            
            batch_ids = [f"{document_id}_chunk_{i}" for i in range(batch_start, batch_end)]
            
            # Add batch to vector store
            self.vector_store.add_texts(
                texts=batch_chunks,
                metadatas=batch_metadatas,
                ids=batch_ids
            )
            
            print(f"Processed chunks {batch_start+1}-{batch_end} of {total_chunks}")
        
        return document_id
    
    def ingest_documents(
        self, 
        documents: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Ingest multiple documents in batch
        
        Args:
            documents: List of documents with 'content', 'metadata', and optional 'document_id'
            
        Returns:
            List of document IDs
        """
        document_ids = []
        for doc in documents:
            doc_id = self.ingest_document(
                content=doc.get("content"),
                metadata=doc.get("metadata", {}),
                document_id=doc.get("document_id")
            )
            document_ids.append(doc_id)
        
        return document_ids
    
    def query(
        self, 
        query: str, 
        top_k: Optional[int] = None,
        temperature: Optional[float] = None,
        history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Query the RAG system with a question
        
        Args:
            query: The question to answer
            top_k: Number of documents to retrieve (default from settings)
            temperature: LLM temperature (default from settings)
            
        Returns:
            Dictionary with answer and sources
        """
        if top_k is None:
            top_k = self.settings.top_k_results
        
        if temperature is None:
            temperature = self.settings.temperature
        
        # Preprocess query for better retrieval
        # Add common variations and synonyms
        query_expanded = query
        if "manajemen" in query.lower():
            query_expanded = f"{query} OR management OR pengelolaan"
        elif "ekonomi" in query.lower():
            query_expanded = f"{query} OR economy OR bisnis"
        elif "hukum" in query.lower():
            query_expanded = f"{query} OR law OR legal"
        elif "kurikulum" in query.lower():
            query_expanded = f"{query} OR curriculum OR mata kuliah OR course OR struktur kurikulum"
        
        # Retrieve relevant documents with improved search
        # Use MMR (Maximal Marginal Relevance) for diverse results
        retriever = self.vector_store.as_retriever(
            search_type="mmr",  # More diverse results
            search_kwargs={
                "k": top_k,
                "fetch_k": top_k * 3,  # Fetch 3x more candidates
                "lambda_mult": 0.7  # Balance between relevance and diversity
            }
        )
        
        docs = retriever.get_relevant_documents(query_expanded)
        
        # Prepare context from retrieved documents
        context = "\n\n".join([doc.page_content for doc in docs])
        
        # Build conversation history string
        history_str = ""
        if history:
            for msg in history:
                role = "User" if msg['role'] == 'user' else "Assistant"
                history_str += f"{role}: {msg['content']}\n"

        # Create prompt with history
        prompt = f"""Anda adalah asisten customer service yang profesional dan membantu.

INSTRUKSI:
1. Jawab pertanyaan dengan JELAS dan INFORMATIF berdasarkan RIWAYAT PERCAKAPAN dan KONTEKS.
2. Gunakan informasi dari KONTEKS untuk memberikan jawaban yang AKURAT dan LENGKAP.
3. Jika ada tabel/daftar (kurikulum, mata kuliah, dll), tampilkan dalam format yang RAPI dan MUDAH DIBACA.
4. Sertakan detail penting (kode, SKS, nama, deskripsi singkat) untuk memberikan pemahaman yang baik.
5. Berikan penjelasan yang cukup agar user mengerti, tapi hindari bertele-tele.
6. Format jawaban dengan struktur yang jelas (gunakan bullet points, numbering, atau paragraf pendek).
7. Jika tidak ada informasi, katakan: "Informasi tidak tersedia dalam dokumen".

RIWAYAT PERCAKAPAN:
{history_str}
KONTEKS:
{context}

Pertanyaan: {query}

Jawaban:"""
        
        # Generate answer
        try:
            if self.use_groq:
                response = self.groq_client.chat.completions.create(
                    model=self.settings.llm_model,
                    messages=[
                        {"role": "system", "content": "Anda adalah asisten customer service yang profesional dan membantu. Berikan jawaban yang jelas, informatif, dan mudah dipahami dengan struktur yang baik."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=temperature,
                    max_tokens=1024  # Concise length for Gemini
                )
                answer = response.choices[0].message.content
            elif self.use_gemini:
                # For Gemini, use LangChain wrapper
                response = self.llm.invoke(prompt)
                answer = response.content if hasattr(response, 'content') else str(response)
            else:
                # For OpenAI
                response = self.llm.invoke(prompt)
                answer = response.content if hasattr(response, 'content') else str(response)
        except Exception as e:
            raise Exception(f"LLM generation failed: {str(e)}")
        
        # Prepare sources
        sources = []
        for doc in docs:
            sources.append({
                "content": doc.page_content,
                "metadata": doc.metadata,
                "score": 0.0  # ChromaDB doesn't return scores in this interface
            })
        
        return {
            "answer": answer,
            "sources": sources,
            "query": query
        }
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector database collection"""
        count = self.collection.count()
        return {
            "documents_count": count,
            "collection_name": self.settings.collection_name
        }
    
    def clear_collection(self):
        """Clear all documents from the collection"""
        self.chroma_client.delete_collection(name=self.settings.collection_name)
        self.collection = self.chroma_client.create_collection(
            name=self.settings.collection_name,
            metadata={"hnsw:space": "cosine"}
        )
        self._initialize_vector_db()
    
    def list_documents(self) -> List[Dict[str, Any]]:
        """
        List all documents in the collection with metadata
        
        Returns:
            List of document metadata
        """
        try:
            # Get all items from collection
            results = self.collection.get()
            
            # Group by document_id
            documents_map = {}
            for i, metadata in enumerate(results['metadatas']):
                doc_id = metadata.get('document_id')
                if doc_id and doc_id not in documents_map:
                    documents_map[doc_id] = {
                        'document_id': doc_id,
                        'filename': metadata.get('filename'),
                        'extension': metadata.get('extension'),
                        'size': metadata.get('size'),
                        'char_count': metadata.get('char_count'),
                        'chunk_count': metadata.get('total_chunks', 0),
                        'created_at': metadata.get('created_at', ''),
                        'metadata': {k: v for k, v in metadata.items() 
                                   if k not in ['document_id', 'filename', 'extension', 
                                              'size', 'char_count', 'chunk_index', 
                                              'total_chunks', 'created_at']}
                    }
            
            return list(documents_map.values())
        except Exception as e:
            print(f"Error listing documents: {e}")
            return []
    
    def delete_document(self, document_id: str) -> int:
        """
        Delete a document and all its chunks from the collection
        
        Args:
            document_id: The document ID to delete
            
        Returns:
            Number of chunks deleted
        """
        try:
            # Get all chunk IDs for this document
            results = self.collection.get(
                where={"document_id": document_id}
            )
            
            if results['ids']:
                self.collection.delete(ids=results['ids'])
                return len(results['ids'])
            return 0
        except Exception as e:
            raise Exception(f"Failed to delete document: {e}")
    
    def search_documents(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search documents by semantic similarity
        
        Args:
            query: Search query
            limit: Maximum number of results
            
        Returns:
            List of search results with scores
        """
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=limit
            )
            
            search_results = []
            if results['documents'] and results['documents'][0]:
                for i, doc in enumerate(results['documents'][0]):
                    metadata = results['metadatas'][0][i] if results['metadatas'] else {}
                    distance = results['distances'][0][i] if results['distances'] else 0
                    
                    # Convert distance to similarity score (0-1)
                    score = 1 / (1 + distance)
                    
                    search_results.append({
                        'document_id': metadata.get('document_id', ''),
                        'content': doc,
                        'metadata': metadata,
                        'score': round(score, 4)
                    })
            
            return search_results
        except Exception as e:
            raise Exception(f"Search failed: {e}")
    
    def add_qa_pair(
        self,
        question: str,
        answer: str,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        qa_id: Optional[str] = None
    ) -> str:
        """
        Add a Q&A pair to the knowledge base
        
        Args:
            question: The question
            answer: The answer
            category: Category/topic
            tags: List of tags
            metadata: Additional metadata
            qa_id: Optional unique identifier
            
        Returns:
            The Q&A ID
        """
        if qa_id is None:
            qa_id = str(uuid.uuid4())
        
        if metadata is None:
            metadata = {}
        
        if tags is None:
            tags = []
        
        # Prepare metadata
        qa_metadata = {
            "qa_id": qa_id,
            "type": "qa_pair",
            "question": question,
            "category": category,
            "tags": ",".join(tags) if tags else "",
            "created_at": datetime.now().isoformat(),
            **metadata
        }
        
        # Combine question and answer for embedding
        # Format: "Q: {question}\nA: {answer}"
        combined_text = f"Q: {question}\nA: {answer}"
        
        # Add to vector store
        self.vector_store.add_texts(
            texts=[combined_text],
            metadatas=[qa_metadata],
            ids=[f"qa_{qa_id}"]
        )
        
        return qa_id
    
    def add_qa_batch(self, qa_pairs: List[Dict[str, Any]]) -> List[str]:
        """
        Add multiple Q&A pairs in batch
        
        Args:
            qa_pairs: List of Q&A pair dictionaries
            
        Returns:
            List of Q&A IDs
        """
        qa_ids = []
        for qa in qa_pairs:
            qa_id = self.add_qa_pair(
                question=qa.get('question'),
                answer=qa.get('answer'),
                category=qa.get('category'),
                tags=qa.get('tags'),
                metadata=qa.get('metadata', {})
            )
            qa_ids.append(qa_id)
        
        return qa_ids
    
    def list_qa_pairs(self) -> List[Dict[str, Any]]:
        """
        List all Q&A pairs in the knowledge base
        
        Returns:
            List of Q&A pairs with metadata
        """
        try:
            # Get all items from collection
            results = self.collection.get()
            
            qa_pairs = []
            for i, metadata in enumerate(results['metadatas']):
                if metadata.get('type') == 'qa_pair':
                    qa_pairs.append({
                        'qa_id': metadata.get('qa_id'),
                        'question': metadata.get('question'),
                        'answer': results['documents'][i].split('\nA: ', 1)[1] if '\nA: ' in results['documents'][i] else '',
                        'category': metadata.get('category'),
                        'tags': metadata.get('tags', '').split(',') if metadata.get('tags') else [],
                        'created_at': metadata.get('created_at', ''),
                        'metadata': {k: v for k, v in metadata.items() 
                                   if k not in ['qa_id', 'type', 'question', 'category', 
                                              'tags', 'created_at']}
                    })
            
            return qa_pairs
        except Exception as e:
            print(f"Error listing Q&A pairs: {e}")
            return []
    
    def delete_qa_pair(self, qa_id: str) -> bool:
        """
        Delete a Q&A pair from the knowledge base
        
        Args:
            qa_id: The Q&A ID to delete
            
        Returns:
            True if deleted, False if not found
        """
        try:
            # Try to delete the Q&A pair
            self.collection.delete(ids=[f"qa_{qa_id}"])
            return True
        except Exception as e:
            print(f"Error deleting Q&A pair: {e}")
            return False
