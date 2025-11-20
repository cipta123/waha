# ⚡ Quick Start Guide

## 🎯 Untuk Pemula - Cara Tercepat

### Option 1: Otomatis (Recommended)

```powershell
# Di folder waha
.\start-all.ps1
```

Script akan otomatis start semua service dengan urutan yang benar!

### Option 2: Manual (Jika script error)

Buka 6 terminal dan jalankan satu per satu:

#### Terminal 1 - WAHA Plus
```bash
# Login first (use your WAHA Plus key)
docker login -u devlikeapro -p {YOUR_KEY}

# Run WAHA Plus
docker run -it --rm -p 3000:3000/tcp --name waha devlikeapro/waha-plus

# Logout after pulling
docker logout
```
⏱️ Tunggu 30 detik

**Note:** Get your WAHA Plus key from https://portal.devlike.pro

#### Terminal 2 - Backend
```bash
cd backend
npm run start:dev
```
⏱️ Tunggu 10 detik

#### Terminal 3 - RAG Service
```bash
cd rag-service
python main.py
```
⏱️ Tunggu 5 detik

#### Terminal 4 - Frontend WA
```bash
cd frontend
npm run dev
```

#### Terminal 5 - RAG Web
```bash
cd rag-service/web
npm run dev
```

---

## ✅ Verifikasi Semua Jalan

Buka browser dan cek:

1. http://localhost:3001 → WhatsApp Dashboard
2. http://localhost:3002 → RAG Knowledge Base
3. http://localhost:8001/docs → RAG API Docs

---

## 🎮 Cara Pakai

### 1. Setup WhatsApp
1. Buka http://localhost:3001
2. Scan QR code dengan WhatsApp
3. Tunggu "Connected"

### 2. Upload Knowledge Base
1. Buka http://localhost:3002
2. Tab "Upload Documents"
3. Upload dokumen atau paste text
4. Klik "Upload Document"

### 3. Test Chat AI
1. Di http://localhost:3002
2. Tab "Test Chat"
3. Tanya sesuatu tentang dokumen yang di-upload

### 4. Lihat WhatsApp Messages
1. Buka http://localhost:3001
2. Pilih conversation
3. Kirim/terima pesan

---

## 🛑 Stop Semua

```powershell
.\stop-all.ps1
```

Atau tekan `Ctrl+C` di setiap terminal.

---

## 🐛 Troubleshooting

### "Port already in use"
```powershell
# Kill semua dan start ulang
.\stop-all.ps1
.\start-all.ps1
```

### "Cannot connect to database"
- Pastikan XAMPP MySQL sudah jalan
- Buka http://localhost/phpmyadmin

### "WAHA not responding"
- Tunggu lebih lama (sampai 1 menit)
- Restart: `docker restart waha`

---

## 📖 Dokumentasi Lengkap

- **Startup Detail**: `START_ALL.md`
- **Architecture**: `README.md`
- **RAG Service**: `rag-service/README.md`
- **Deployment**: `DEPLOYMENT.md` (coming soon)

---

## 💡 Tips

1. **Gunakan Windows Terminal** dengan multiple tabs
2. **Bookmark URLs** untuk quick access
3. **Check logs** jika ada error
4. **Restart order matters** - ikuti urutan di `START_ALL.md`
