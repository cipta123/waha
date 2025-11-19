# 🚀 Panduan Startup Semua Service

## 📋 Urutan Startup (PENTING!)

Ikuti urutan ini untuk menghindari error:

### 1️⃣ Database (MySQL)
**Harus jalan PERTAMA**

```bash
# Jika pakai XAMPP:
- Buka XAMPP Control Panel
- Start Apache
- Start MySQL

# Atau jika pakai MySQL standalone:
- Pastikan MySQL service sudah running
```

✅ **Cek**: Buka http://localhost/phpmyadmin

---

### 2️⃣ WAHA (WhatsApp Engine)
**Jalan KEDUA - sebelum backend**

```bash
# Terminal 1
docker run -it --rm -p 3000:3000/tcp --name waha devlikeapro/waha
```

✅ **Cek**: Buka http://localhost:3000
- Jika muncul "WAHA - WhatsApp HTTP API" → OK!

⏱️ **Tunggu ~30 detik** sampai fully ready

---

### 3️⃣ Backend (NestJS)
**Jalan KETIGA - setelah MySQL & WAHA ready**

```bash
# Terminal 2
cd backend
npm run start:dev
```

✅ **Cek**: 
- Terminal muncul "Nest application successfully started"
- Buka http://localhost:4000/api/health

⏱️ **Tunggu ~10 detik** sampai fully ready

---

### 4️⃣ RAG Service (Python FastAPI)
**Jalan KEEMPAT - independent service**

```bash
# Terminal 3
cd rag-service
python main.py
```

✅ **Cek**: 
- Terminal muncul "Application startup complete"
- Buka http://localhost:8001/health

⏱️ **Tunggu ~5 detik** sampai fully ready

---

### 5️⃣ Frontend WhatsApp Dashboard (Next.js)
**Jalan KELIMA - setelah backend ready**

```bash
# Terminal 4
cd frontend
npm run dev
```

✅ **Cek**: Buka http://localhost:3001

⏱️ **Tunggu ~5 detik** sampai fully ready

---

### 6️⃣ RAG Web Interface (React/Vite)
**Jalan TERAKHIR - optional, untuk manage knowledge base**

```bash
# Terminal 5
cd rag-service/web
npm run dev
```

✅ **Cek**: Buka http://localhost:3002

---

## 🎯 Quick Check - Semua Service Running?

Buka URL ini satu per satu:

| Service | URL | Status |
|---------|-----|--------|
| MySQL | http://localhost/phpmyadmin | ✅ |
| WAHA | http://localhost:3000 | ✅ |
| Backend | http://localhost:4000/api/health | ✅ |
| RAG API | http://localhost:8001/health | ✅ |
| WA Dashboard | http://localhost:3001 | ✅ |
| RAG Web | http://localhost:3002 | ✅ |

---

## ⚡ Startup Script (Windows PowerShell)

Gunakan script otomatis di `start-all.ps1`

```powershell
.\start-all.ps1
```

---

## 🛑 Shutdown Semua Service

### Manual:
1. Tekan `Ctrl+C` di setiap terminal
2. Stop Docker: `docker stop waha`
3. Stop MySQL di XAMPP

### Otomatis:
```powershell
.\stop-all.ps1
```

---

## 🐛 Troubleshooting

### Error: "Port already in use"
```bash
# Cek port yang dipakai
netstat -ano | findstr :3000
netstat -ano | findstr :4000
netstat -ano | findstr :8001

# Kill process
taskkill /PID <PID> /F
```

### Error: "Cannot connect to database"
- Pastikan MySQL sudah jalan
- Cek kredensial di `backend/.env`
- Test koneksi: `mysql -u root -p`

### Error: "WAHA not responding"
- Tunggu 30 detik setelah docker run
- Restart docker container
- Cek logs: `docker logs waha`

### Error: "Backend cannot connect to WAHA"
- Pastikan WAHA sudah fully ready
- Cek `WAHA_BASE_URL` di `backend/.env`
- Test: `curl http://localhost:3000`

---

## 💡 Tips

1. **Gunakan terminal multiplexer** seperti Windows Terminal dengan tabs
2. **Buat shortcut** untuk setiap terminal command
3. **Gunakan startup script** untuk otomatis
4. **Monitor logs** untuk detect error early
5. **Restart order**: Jika ada error, restart dari service yang bermasalah ke bawah

---

## 📝 Minimal Setup (Tanpa RAG)

Jika hanya mau WhatsApp automation tanpa AI:

1. MySQL ✅
2. WAHA ✅
3. Backend ✅
4. Frontend ✅

Skip: RAG Service & RAG Web Interface

---

## 🚀 Production Deployment

Untuk production, gunakan:
- **PM2** untuk Node.js services
- **systemd** atau **supervisor** untuk Python
- **Docker Compose** untuk orchestration
- **Nginx** sebagai reverse proxy

Lihat `DEPLOYMENT.md` untuk detail.
