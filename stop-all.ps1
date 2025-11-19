# PowerShell Script untuk Stop Semua Service
# Usage: .\stop-all.ps1

Write-Host "🛑 Stopping All Services..." -ForegroundColor Red
Write-Host ""

# Stop Docker WAHA
Write-Host "Stopping WAHA (Docker)..." -ForegroundColor Yellow
docker stop waha 2>$null
if ($?) {
    Write-Host "   ✅ WAHA stopped" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  WAHA not running or already stopped" -ForegroundColor Yellow
}
Write-Host ""

# Stop Node.js processes (Backend & Frontends)
Write-Host "Stopping Node.js services..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "   ✅ Node.js services stopped" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  No Node.js processes found" -ForegroundColor Yellow
}
Write-Host ""

# Stop Python processes (RAG Service)
Write-Host "Stopping Python services..." -ForegroundColor Yellow
$pythonProcesses = Get-Process python -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    $pythonProcesses | Stop-Process -Force
    Write-Host "   ✅ Python services stopped" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  No Python processes found" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "✅ All services stopped!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Note: MySQL/XAMPP not stopped automatically" -ForegroundColor Yellow
Write-Host "   Stop manually if needed via XAMPP Control Panel" -ForegroundColor Yellow
Write-Host ""
