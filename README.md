# WhatsApp Automation App with WAHA + RAG AI

Full-stack WhatsApp automation application with Sleekflow-style UI and AI-powered RAG (Retrieval-Augmented Generation) system. Built with NestJS backend, Next.js frontend, Python FastAPI RAG service, and WAHA (WhatsApp HTTP API) engine.

## ⚡ Quick Start

**Pemula? Mulai di sini:**
- 📖 **[QUICK_START.md](QUICK_START.md)** - Cara tercepat untuk mulai
- 🚀 **[START_ALL.md](START_ALL.md)** - Panduan lengkap startup semua service

**Otomatis start semua:**
```powershell
.\start-all.ps1
```

## 🚀 Features

- ✅ **Real-time messaging** - Send and receive WhatsApp messages
- ✅ **Webhook integration** - Auto-save incoming messages to database
- ✅ **Sleekflow-style UI** - Modern multi-column inbox interface
- ✅ **Auto-refresh** - Messages appear automatically without page reload
- ✅ **Persistent storage** - All conversations saved to MySQL
- ✅ **Session management** - View and control WhatsApp sessions

## 📁 Project Structure

```
./backend          # NestJS API (TypeORM + MySQL + WAHA connector)
./frontend         # Next.js WhatsApp Dashboard (App Router + Tailwind CSS)
./rag-service      # Python FastAPI RAG Service (ChromaDB + LLM)
  └── web/         # React RAG Web Interface (Vite + Tailwind CSS)
./media            # WhatsApp media files storage
./sessions         # WAHA session data
```

## 🌐 Service Ports

| Service | Port | URL |
|---------|------|-----|
| WAHA (WhatsApp) | 3000 | http://localhost:3000 |
| Frontend WA Dashboard | 3001 | http://localhost:3001 |
| RAG Web Interface | 3002 | http://localhost:3002 |
| Backend API | 4000 | http://localhost:4000 |
| RAG API | 8001 | http://localhost:8001 |

## 🛠️ Prerequisites

- **Node.js** 18+ and npm
- **Docker Desktop** (for WAHA engine)
- **MySQL 8** (XAMPP, standalone, or Docker)

## 📦 Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd waha
```

### 2. Setup Backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env`:
```ini
PORT=4000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_NAME=waha
DB_SYNC=true
DB_LOGGING=false

# WAHA API
WAHA_BASE_URL=http://localhost:3000
WAHA_API_KEY=your_waha_api_key
WAHA_DEFAULT_SESSION=default

# Webhook
WEBHOOK_SECRET=utserangkitasemua

# CORS
CORS_ORIGIN=http://localhost:3001
```

### 3. Setup Frontend

```bash
cd ../frontend
npm install
cp .env.example .env.local
```

Edit `frontend/.env.local`:
```ini
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

### 4. Setup MySQL Database

Create database:
```sql
CREATE DATABASE waha CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Tables will be auto-created when backend starts (with `DB_SYNC=true`).

### 5. Setup WAHA Engine

Run WAHA with Docker:
```bash
docker run -d \
  -p 3000:3000 \
  -e WAHA_API_KEY=your_waha_api_key \
  -e WAHA_DASHBOARD_USERNAME=admin \
  -e WAHA_DASHBOARD_PASSWORD=your_password \
  --name waha \
  devlikeapro/waha
```

**Configure WAHA Webhook:**
1. Open WAHA Dashboard: `http://localhost:3000/dashboard`
2. Login with credentials above
3. Go to Sessions → default → Webhooks
4. Add webhook:
   - **URL**: `http://host.docker.internal:4000/api/webhook/waha`
   - **Events**: Select `message` and `session.status`
   - **Custom Headers**: Add `X-Header-1: utserangkitasemua`
5. Click **Update** (session will restart)
6. Scan QR code to connect WhatsApp

## 🚀 Running the Application

### Start Backend
```bash
cd backend
npm run dev
```
Backend runs at `http://localhost:4000`

### Start Frontend
```bash
cd frontend
npm run dev
```
Frontend runs at `http://localhost:3001`

## 📱 Usage

1. Open `http://localhost:3001` in your browser
2. You'll see the Sleekflow-style inbox interface
3. Send a WhatsApp message to your connected account
4. Message appears automatically in the inbox (within 3-5 seconds)
5. Click the conversation to view messages
6. Type a reply and click Send

## 🔧 API Endpoints

### Backend API (`http://localhost:4000/api`)

- `GET /health` - Health check
- `GET /sessions` - List WhatsApp sessions
- `GET /messages/conversations` - List all conversations
- `GET /messages/:conversationId` - Get messages for a conversation
- `POST /messages/send-text` - Send a text message
- `POST /webhook/waha` - WAHA webhook endpoint (internal)

## 🗄️ Database Schema

### Tables

1. **conversation** - Stores chat conversations
   - `id`, `waChatId`, `status`, `title`, `lastMessageAt`

2. **message** - Stores individual messages
   - `id`, `conversationId`, `direction`, `text`, `senderName`, `waMessageId`, `payload`

3. **user** - User/agent management (future use)

## 🔐 Security Notes

- Never commit `.env` files to Git
- Change default passwords and API keys
- Use strong `WEBHOOK_SECRET` in production
- Enable HTTPS for production deployments

## 🐛 Troubleshooting

### Port 4000 already in use
```bash
# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:4000 | xargs kill -9
```

### WAHA webhook 401/400 errors
- Check `X-Header-1` matches `WEBHOOK_SECRET` in backend `.env`
- Verify webhook URL uses `host.docker.internal` if WAHA runs in Docker
- Check backend logs for actual error messages

### Frontend CORS errors
- Ensure `CORS_ORIGIN` in backend `.env` matches frontend URL
- Restart backend after changing `.env`

### Database connection failed
- Verify MySQL is running
- Check credentials in `backend/.env`
- Create `waha` database manually if needed

## 📝 Next Steps

- [ ] Add user authentication
- [ ] Implement AI message classifier
- [ ] Add message search and filtering
- [ ] Support media messages (images, videos, documents)
- [ ] Multi-session support
- [ ] Message templates
- [ ] Analytics dashboard

## 📄 License

MIT

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

## ntuk run waha pakai gows
docker run -e WHATSAPP_DEFAULT_ENGINE=GOWS -p 3000:3000 devlikeapro/waha