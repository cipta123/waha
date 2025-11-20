# PowerShell Script untuk Start Semua Service (Inline Version)
# Usage: .\start-all-inline.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting All Services..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if MySQL is running
Write-Host "[1/6] Checking MySQL..." -ForegroundColor Yellow
$mysqlRunning = Get-Process mysqld -ErrorAction SilentlyContinue
if ($mysqlRunning) {
    Write-Host "      [OK] MySQL is running (PID: $($mysqlRunning.Id))" -ForegroundColor Green
} else {
    Write-Host "      [WARNING] MySQL not detected!" -ForegroundColor Red
    Write-Host "      Please start XAMPP or MySQL service manually" -ForegroundColor Red
    $continue = Read-Host "      Continue anyway? (y/n)"
    if ($continue -ne "y") {
        Write-Host "Exiting..." -ForegroundColor Red
        exit
    }
}
Write-Host ""

# Start WAHA Plus (Docker)
Write-Host "[2/6] Starting WAHA Plus (WhatsApp Engine)..." -ForegroundColor Yellow
$wahaRunning = docker ps --filter "name=waha" --format "{{.Names}}" 2>$null
if ($wahaRunning -eq "waha") {
    Write-Host "      [OK] WAHA Plus is already running" -ForegroundColor Green
} else {
    Write-Host "      Starting WAHA Plus in Docker..." -ForegroundColor Cyan
    Write-Host "      Command: docker run -d -p 3000:3000 --name waha devlikeapro/waha-plus:gows" -ForegroundColor Gray
    Write-Host "      Dashboard Credentials: admin / admin123" -ForegroundColor Cyan
    
    $dockerResult = docker run -d -p 3000:3000 --name waha -e WAHA_DASHBOARD_USERNAME=admin -e WAHA_DASHBOARD_PASSWORD=admin123 -e WHATSAPP_API_KEY=7201ae973dda43719c1b8701304a2fb2 devlikeapro/waha-plus:gows 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "      [OK] WAHA Plus started successfully!" -ForegroundColor Green
        Write-Host "      Container ID: $dockerResult" -ForegroundColor Gray
        Write-Host "      Waiting 30 seconds for initialization..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    } else {
        Write-Host "      [ERROR] Failed to start WAHA Plus!" -ForegroundColor Red
        Write-Host "      Error: $dockerResult" -ForegroundColor Red
        Write-Host ""
        Write-Host "      Troubleshooting:" -ForegroundColor Yellow
        Write-Host "      1. Make sure you've logged in: docker login -u devlikeapro -p {YOUR_KEY}" -ForegroundColor Yellow
        Write-Host "      2. Check if image exists: docker images | findstr waha-plus" -ForegroundColor Yellow
        Write-Host "      3. Check logs: docker logs waha" -ForegroundColor Yellow
        exit
    }
}
Write-Host ""

# Check WAHA Health
Write-Host "      Checking WAHA health..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "      [OK] WAHA is healthy!" -ForegroundColor Green
} catch {
    Write-Host "      [WARNING] WAHA health check failed (might still be starting)" -ForegroundColor Yellow
}
Write-Host ""

# Start Backend
Write-Host "[3/6] Starting Backend (NestJS)..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "backend"
if (Test-Path $backendPath) {
    Write-Host "      Path: $backendPath" -ForegroundColor Gray
    Write-Host "      Opening new terminal for Backend..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '=== Backend (NestJS) ===' -ForegroundColor Green; npm run start:dev"
    Write-Host "      [OK] Backend terminal opened" -ForegroundColor Green
    Write-Host "      Waiting 10 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
} else {
    Write-Host "      [ERROR] Backend path not found: $backendPath" -ForegroundColor Red
}
Write-Host ""

# Start RAG Service
Write-Host "[4/6] Starting RAG Service (Python)..." -ForegroundColor Yellow
$ragPath = Join-Path $PSScriptRoot "rag-service"
if (Test-Path $ragPath) {
    Write-Host "      Path: $ragPath" -ForegroundColor Gray
    Write-Host "      Opening new terminal for RAG Service..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ragPath'; Write-Host '=== RAG Service (Python) ===' -ForegroundColor Green; python main.py"
    Write-Host "      [OK] RAG Service terminal opened" -ForegroundColor Green
    Write-Host "      Waiting 5 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
} else {
    Write-Host "      [ERROR] RAG Service path not found: $ragPath" -ForegroundColor Red
}
Write-Host ""

# Start Frontend
Write-Host "[5/6] Starting Frontend (Next.js)..." -ForegroundColor Yellow
$frontendPath = Join-Path $PSScriptRoot "frontend"
if (Test-Path $frontendPath) {
    Write-Host "      Path: $frontendPath" -ForegroundColor Gray
    Write-Host "      Opening new terminal for Frontend..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '=== Frontend (Next.js) ===' -ForegroundColor Green; npm run dev"
    Write-Host "      [OK] Frontend terminal opened" -ForegroundColor Green
    Write-Host "      Waiting 5 seconds..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
} else {
    Write-Host "      [ERROR] Frontend path not found: $frontendPath" -ForegroundColor Red
}
Write-Host ""

# Start RAG Web Interface
Write-Host "[6/6] Starting RAG Web Interface (React)..." -ForegroundColor Yellow
$ragWebPath = Join-Path $PSScriptRoot "rag-service\web"
if (Test-Path $ragWebPath) {
    Write-Host "      Path: $ragWebPath" -ForegroundColor Gray
    Write-Host "      Opening new terminal for RAG Web..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ragWebPath'; Write-Host '=== RAG Web Interface ===' -ForegroundColor Green; npm run dev"
    Write-Host "      [OK] RAG Web terminal opened" -ForegroundColor Green
} else {
    Write-Host "      [ERROR] RAG Web path not found: $ragWebPath" -ForegroundColor Red
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] All services started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan
Write-Host "  1. WAHA Plus API:      http://localhost:3000" -ForegroundColor White
Write-Host "  2. WAHA Dashboard:     http://localhost:3000/dashboard" -ForegroundColor White
Write-Host "  3. WA Dashboard:       http://localhost:3001" -ForegroundColor White
Write-Host "  4. RAG Web:            http://localhost:3002" -ForegroundColor White
Write-Host "  5. Backend API:        http://localhost:4000" -ForegroundColor White
Write-Host "  6. RAG API Docs:       http://localhost:8001/docs" -ForegroundColor White
Write-Host ""
Write-Host "Check the opened terminal windows for each service status!" -ForegroundColor Yellow
Write-Host "To stop: Run .\stop-all.ps1 or press Ctrl+C in each terminal" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
