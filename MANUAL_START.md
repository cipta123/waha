# Manual Start Instructions

Berikut adalah panduan manual untuk menjalankan 5 service aplikasi WAHA secara terpisah.
Disarankan untuk menjalankan setiap service di **tab terminal atau window PowerShell yang berbeda** agar log bisa terpantau.

## Prasyarat
Pastikan **MySQL** sudah berjalan (via XAMPP atau service manual).

---

## 1. WAHA Plus (Docker)
Pastikan Docker Desktop sudah running. atau langsung saja nyalakan di docker desktp container
Jalankan command berikut untuk menjalankan container WAHA:

```powershell
docker run -d -p 3000:3000 --name waha -e WAHA_DASHBOARD_USERNAME=admin -e WAHA_DASHBOARD_PASSWORD=admin123 -e WHATSAPP_API_KEY=7201ae973dda43719c1b8701304a2fb2 devlikeapro/waha-plus:gows
```

*Catatan: Jika container sudah ada tetapi stopped, cukup gunakan `docker start waha`.*

---

## 2. Backend (NestJS)
Buka terminal baru (Terminal 2), arahkan ke folder root project, lalu jalankan:

```powershell
cd backend
npm run start:dev
```
*Tunggu hingga muncul "Nest application successfully started".*

---

## 3. RAG Service (Python AI)
Buka terminal baru (Terminal 3), arahkan ke folder root project, lalu jalankan:

```powershell
cd rag-service
# Pastikan dependencies sudah terinstall (pip install -r requirements.txt)
python main.py
```
*Tunggu hingga muncul "Application startup complete".*

---

## 4. Frontend (Next.js Dashboard)
Buka terminal baru (Terminal 4), arahkan ke folder root project, lalu jalankan:

```powershell
cd frontend
npm run dev
```
*Akses di: http://localhost:3001*

---

## 5. RAG Web Interface
Buka terminal baru (Terminal 5), arahkan ke folder root project, lalu jalankan:

```powershell
cd rag-service\web
npm run dev
```
*Akses di: http://localhost:3002*

---

## Ringkasan URL

| Service | URL |
|---------|-----|
| WAHA API/Dashboard | http://localhost:3000 / http://localhost:3000/dashboard |
| WA Dashboard (Frontend) | http://localhost:3001 |
| RAG Web Interface | http://localhost:3002 |
| Backend API | http://localhost:4000 |
| RAG Service Docs | http://localhost:8001/docs |
