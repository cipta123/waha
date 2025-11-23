# Open Firewall Ports for WAHA Dev
# Run this as Administrator

Write-Host "Opening Firewall Ports 3000, 4000, 8001 for Local Network Access..." -ForegroundColor Cyan

# Frontend
New-NetFirewallRule -DisplayName "WAHA Frontend (3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -Profile Private,Domain

# Backend Auth
New-NetFirewallRule -DisplayName "WAHA Backend (4000)" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow -Profile Private,Domain

# RAG Service
New-NetFirewallRule -DisplayName "WAHA RAG Service (8001)" -Direction Inbound -LocalPort 8001 -Protocol TCP -Action Allow -Profile Private,Domain

Write-Host "Ports 3000, 4000, 8001 are now open!" -ForegroundColor Green
Write-Host "Please try accessing from your mobile device again."
