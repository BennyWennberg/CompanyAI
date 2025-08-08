# CompanyAI v2.1.0 - Verbessertes Setup Script
# Dieses Script installiert alle Dependencies mit den neuen npm workspaces

Write-Host "🚀 CompanyAI v2.1.0 Setup - Verbessertes Grundkonstrukt" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green

Write-Host "`n📦 Installiere Dependencies mit npm workspaces..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Dependencies erfolgreich installiert!" -ForegroundColor Green
} else {
    Write-Host "❌ Fehler bei der Installation" -ForegroundColor Red
    exit 1
}

Write-Host "`n🔧 Verbesserungen in v2.1.0:" -ForegroundColor Cyan
Write-Host "  • Auth-Guard für Frontend-Sicherheit" -ForegroundColor White
Write-Host "  • Support-Module mit Berechtigungsprüfung" -ForegroundColor White  
Write-Host "  • Dynamischer Header mit User-Info" -ForegroundColor White
Write-Host "  • Vollständige Ticket-Validierung" -ForegroundColor White
Write-Host "  • Einheitliche Error-Typen" -ForegroundColor White
Write-Host "  • npm workspaces Setup" -ForegroundColor White
Write-Host "  • Zentrales Error-Handling" -ForegroundColor White

Write-Host "`n🎯 Nächste Schritte:" -ForegroundColor Yellow
Write-Host "1. npm run dev                    # Beide Services starten" -ForegroundColor Cyan
Write-Host "2. http://localhost:5173          # Frontend öffnen" -ForegroundColor Cyan  
Write-Host "3. Login mit Admin/HR-Rolle testen" -ForegroundColor Cyan
Write-Host "4. IMPROVEMENTS_ROADMAP.md lesen  # Weitere Verbesserungen" -ForegroundColor Cyan

Write-Host "`n✨ Setup abgeschlossen! Viel Erfolg mit dem verbesserten Grundkonstrukt!" -ForegroundColor Green
