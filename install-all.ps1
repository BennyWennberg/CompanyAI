# PowerShell Script um alle Abhängigkeiten zu installieren
Write-Host "🚀 Installiere alle Abhängigkeiten für CompanyAI..." -ForegroundColor Green

Write-Host "📦 Root Abhängigkeiten installieren..." -ForegroundColor Yellow
npm install

Write-Host "📦 Frontend Abhängigkeiten installieren..." -ForegroundColor Yellow  
Set-Location frontend
npm install

Write-Host "📦 Backend Abhängigkeiten installieren..." -ForegroundColor Yellow
Set-Location ../backend  
npm install

Write-Host "📦 Zurück zum Root Verzeichnis..." -ForegroundColor Yellow
Set-Location ..

Write-Host "✅ Alle Abhängigkeiten erfolgreich installiert!" -ForegroundColor Green
Write-Host "🎯 Führe 'npm run dev' aus um beide Services zu starten" -ForegroundColor Cyan
