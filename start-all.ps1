# PowerShell Script untuk Start Semua Service
# Usage: .\start-all.ps1

Write-Host "🚀 Starting All Services..." -ForegroundColor Green
Write-Host ""

# Function to open new terminal
function Start-ServiceInNewTerminal {
    param(
        [string]$Title,
        [string]$Command,
        [string]$WorkingDirectory
    )
    
    Write-Host "Starting $Title..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$WorkingDirectory'; Write-Host '=== $Title ===' -ForegroundColor Green; $Command"
}

# Check if MySQL is running
Write-Host "1️⃣ Checking MySQL..." -ForegroundColor Yellow
$mysqlRunning = Get-Process mysqld -ErrorAction SilentlyContinue
if ($mysqlRunning) {
    Write-Host "   ✅ MySQL is running" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  MySQL not detected. Please start XAMPP or MySQL service manually" -ForegroundColor Red
    Write-Host "   Press any key to continue anyway..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
Write-Host ""

# Start WAHA (Docker)
Write-Host "2️⃣ Starting WAHA (WhatsApp Engine)..." -ForegroundColor Yellow
$wahaRunning = docker ps --filter "name=waha" --format "{{.Names}}" 2>$null
if ($wahaRunning -eq "waha") {
    Write-Host "   ✅ WAHA is already running" -ForegroundColor Green
} else {
    Write-Host "   Starting WAHA in Docker..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '=== WAHA (WhatsApp Engine) ===' -ForegroundColor Green; docker run -it --rm -p 3000:3000/tcp --name waha devlikeapro/waha"
    Write-Host "   ⏱️  Waiting 30 seconds for WAHA to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30
}
Write-Host ""

# Start Backend
Write-Host "3️⃣ Starting Backend (NestJS)..." -ForegroundColor Yellow
$backendPath = Join-Path $PSScriptRoot "backend"
Start-ServiceInNewTerminal -Title "Backend (NestJS)" -Command "npm run start:dev" -WorkingDirectory $backendPath
Write-Host "   ⏱️  Waiting 10 seconds for Backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 10
Write-Host ""

# Start RAG Service
Write-Host "4️⃣ Starting RAG Service (Python)..." -ForegroundColor Yellow
$ragPath = Join-Path $PSScriptRoot "rag-service"
Start-ServiceInNewTerminal -Title "RAG Service (Python)" -Command "python main.py" -WorkingDirectory $ragPath
Write-Host "   ⏱️  Waiting 5 seconds for RAG Service to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host ""

# Start Frontend
Write-Host "5️⃣ Starting Frontend (Next.js)..." -ForegroundColor Yellow
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-ServiceInNewTerminal -Title "Frontend (Next.js)" -Command "npm run dev" -WorkingDirectory $frontendPath
Write-Host "   ⏱️  Waiting 5 seconds for Frontend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host ""

# Start RAG Web Interface
Write-Host "6️⃣ Starting RAG Web Interface (React)..." -ForegroundColor Yellow
$ragWebPath = Join-Path $PSScriptRoot "rag-service\web"
Start-ServiceInNewTerminal -Title "RAG Web Interface" -Command "npm run dev" -WorkingDirectory $ragWebPath
Write-Host ""

Write-Host "✅ All services started!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Service URLs:" -ForegroundColor Cyan
Write-Host "   WAHA:              http://localhost:3000" -ForegroundColor White
Write-Host "   WA Dashboard:      http://localhost:3001" -ForegroundColor White
Write-Host "   RAG Web:           http://localhost:3002" -ForegroundColor White
Write-Host "   Backend API:       http://localhost:4000" -ForegroundColor White
Write-Host "   RAG API:           http://localhost:8001" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tip: Check each terminal window for startup status" -ForegroundColor Yellow
Write-Host "🛑 To stop: Run .\stop-all.ps1 or press Ctrl+C in each terminal" -ForegroundColor Yellow
Write-Host ""
