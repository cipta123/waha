# RAG Service - Advanced Retrieval-Augmented Generation

Layanan RAG (Retrieval-Augmented Generation) yang canggih dan dapat diandalkan menggunakan Python, FastAPI, ChromaDB, dan LLM (OpenAI/Groq).

## 🚀 Features

- ✅ **Vector Database**: ChromaDB (gratis, lokal, powerful)
- ✅ **LLM Integration**: Support OpenAI dan Groq (gratis!)
- ✅ **Document Ingestion**: Upload dan proses dokumen
- ✅ **Smart Chunking**: Otomatis split dokumen dengan overlap
- ✅ **RAG Query**: Tanya jawab berdasarkan dokumen
- ✅ **REST API**: FastAPI dengan dokumentasi otomatis
- ✅ **Batch Processing**: Ingest multiple documents sekaligus

## 📋 Prerequisites

- Python 3.9+
- pip atau poetry

## 🛠️ Installation

### 1. Install Dependencies

```bash
cd rag-service
pip install -r requirements.txt
```

### 2. Setup Environment Variables

Copy `.env.example` ke `.env`:

```bash
cp .env.example .env
```

Edit `.env` dan isi dengan API keys Anda:

```env
# Pilih provider: openai atau groq
LLM_PROVIDER=groq

# Jika pakai Groq (GRATIS!)
GROQ_API_KEY=your_groq_api_key_here

# Jika pakai OpenAI
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Get API Keys

#### Groq (Recommended - GRATIS!)
1. Daftar di https://console.groq.com
2. Buat API key
3. Model gratis: `llama-3.1-70b-versatile`, `mixtral-8x7b-32768`

#### OpenAI (Berbayar)
1. Daftar di https://platform.openai.com
2. Buat API key
3. Top up credit

## 🚀 Running the Service

### Development Mode

```bash
python main.py
```

Atau dengan uvicorn:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### Production Mode

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4
```

Service akan berjalan di: `http://localhost:8001`

## 📚 API Documentation

Setelah service berjalan, buka:
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## 🔥 API Endpoints

### 1. Health Check
```bash
GET /health
```

### 2. Ingest Single Document
```bash
POST /ingest
Content-Type: application/json

{
  "content": "Ini adalah konten dokumen yang akan di-ingest...",
  "metadata": {
    "source": "manual",
    "category": "knowledge"
  },
  "document_id": "doc-001"
}
```

### 3. Ingest Multiple Documents (Batch)
```bash
POST /ingest/batch
Content-Type: application/json

{
  "documents": [
    {
      "content": "Dokumen pertama...",
      "metadata": {"source": "file1.txt"}
    },
    {
      "content": "Dokumen kedua...",
      "metadata": {"source": "file2.txt"}
    }
  ]
}
```

### 4. Query RAG
```bash
POST /query
Content-Type: application/json

{
  "query": "Apa itu RAG?",
  "top_k": 5,
  "temperature": 0.7
}
```

Response:
```json
{
  "answer": "RAG adalah...",
  "sources": [
    {
      "content": "...",
      "metadata": {...},
      "score": 0.95
    }
  ],
  "query": "Apa itu RAG?"
}
```

### 5. Get Statistics
```bash
GET /stats
```

### 6. Clear Database
```bash
DELETE /clear
```

## 🧪 Testing with cURL

### Test Health
```bash
curl http://localhost:8001/health
```

### Test Ingest
```bash
curl -X POST http://localhost:8001/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Python adalah bahasa pemrograman yang populer untuk AI dan machine learning.",
    "metadata": {"topic": "programming"}
  }'
```

### Test Query
```bash
curl -X POST http://localhost:8001/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Apa itu Python?"
  }'
```

## 🧪 Testing with Python

```python
import requests

BASE_URL = "http://localhost:8001"

# Ingest document
response = requests.post(
    f"{BASE_URL}/ingest",
    json={
        "content": "FastAPI adalah framework web modern untuk Python.",
        "metadata": {"topic": "web"}
    }
)
print(response.json())

# Query
response = requests.post(
    f"{BASE_URL}/query",
    json={
        "query": "Apa itu FastAPI?"
    }
)
print(response.json())
```

## 📁 Project Structure

```
rag-service/
├── main.py              # FastAPI application
├── rag_engine.py        # RAG logic dengan ChromaDB
├── models.py            # Pydantic models
├── config.py            # Configuration management
├── requirements.txt     # Dependencies
├── .env.example         # Environment variables template
├── .env                 # Your environment variables (gitignored)
├── README.md           # This file
└── chroma_db/          # ChromaDB storage (auto-created)
```

## ⚙️ Configuration

Edit `.env` untuk customize:

```env
# Chunk settings
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Retrieval settings
TOP_K_RESULTS=5

# LLM settings
TEMPERATURE=0.7
LLM_MODEL=llama-3.1-70b-versatile

# Database
CHROMA_PERSIST_DIRECTORY=./chroma_db
COLLECTION_NAME=documents
```

## 🔧 Advanced Usage

### Custom Embeddings Model

Edit `config.py`:
```python
embedding_model: str = "text-embedding-3-large"  # Better quality
```

### Different LLM Models

Groq models (gratis):
- `llama-3.1-70b-versatile` (recommended)
- `llama-3.1-8b-instant` (faster)
- `mixtral-8x7b-32768` (long context)

OpenAI models:
- `gpt-4-turbo-preview`
- `gpt-3.5-turbo`

## 🐛 Troubleshooting

### Error: ChromaDB not found
```bash
pip install chromadb --upgrade
```

### Error: OpenAI API key invalid
Check `.env` file dan pastikan API key benar

### Error: Port already in use
Ubah port di `.env`:
```env
PORT=8002
```

## 📝 Next Steps

1. ✅ Service sudah jalan
2. 🔄 Test dengan REST client (Postman/cURL)
3. 🔗 Integrate dengan WhatsApp backend
4. 📊 Add monitoring dan logging
5. 🚀 Deploy ke production

## 🤝 Integration dengan WhatsApp

Dari backend Node.js, panggil RAG service:

```javascript
// backend/src/services/rag.service.js
const axios = require('axios');

const RAG_SERVICE_URL = 'http://localhost:8001';

async function queryRAG(question) {
  const response = await axios.post(`${RAG_SERVICE_URL}/query`, {
    query: question
  });
  return response.data.answer;
}
```

## 📄 License

MIT

## 🙋 Support

Jika ada masalah, cek:
1. Logs di terminal
2. API docs di `/docs`
3. Health endpoint `/health`
