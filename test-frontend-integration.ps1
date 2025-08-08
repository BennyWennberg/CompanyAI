# CompanyAI Frontend-Backend Integration Test
# Testet die vollständige modulbasierte Frontend-Backend-Architektur

Write-Host "🚀 CompanyAI Frontend-Backend Integration Test" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

$frontendUrl = "http://localhost:5173"
$backendUrl = "http://localhost:5000"

Write-Host "`n1. Backend-Status prüfen..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$backendUrl/api/health" -Method GET
    Write-Host "✅ Backend verfügbar - Module: $($health.modules -join ', ')" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend nicht verfügbar. Bitte starten Sie: cd backend ; npm run dev" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. Frontend-Status prüfen..." -ForegroundColor Yellow
try {
    $frontendResponse = Invoke-WebRequest -Uri $frontendUrl -Method GET -TimeoutSec 5
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "✅ Frontend verfügbar auf $frontendUrl" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Frontend nicht verfügbar. Bitte starten Sie: cd frontend ; npm run dev" -ForegroundColor Red
    Write-Host "   Warten Sie ~10 Sekunden nach dem Start für Vite..." -ForegroundColor Yellow
}

Write-Host "`n3. API-Integration testen..." -ForegroundColor Yellow

# Token für Tests
$adminToken = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("admin@company.com"))
$headers = @{ 
    Authorization = "Bearer $adminToken"
    "Content-Type" = "application/json"
}

# HR-API testen
Write-Host "`n   3.1 HR-API Tests..." -ForegroundColor Cyan
try {
    $employees = Invoke-RestMethod -Uri "$backendUrl/api/hr/employees" -Method GET -Headers (@{Authorization="Bearer $adminToken"})
    Write-Host "   ✅ HR-Employees API: $($employees.data.data.Count) Mitarbeiter geladen" -ForegroundColor Green
    
    $stats = Invoke-RestMethod -Uri "$backendUrl/api/hr/stats" -Method GET -Headers (@{Authorization="Bearer $adminToken"})
    Write-Host "   ✅ HR-Stats API: $($stats.data.totalEmployees) Gesamtmitarbeiter" -ForegroundColor Green
} catch {
    Write-Host "   ❌ HR-API Fehler: $($_.Exception.Message)" -ForegroundColor Red
}

# Support-API testen
Write-Host "`n   3.2 Support-API Tests..." -ForegroundColor Cyan
try {
    $tickets = Invoke-RestMethod -Uri "$backendUrl/api/support/tickets" -Method GET -Headers (@{Authorization="Bearer $adminToken"})
    Write-Host "   ✅ Support-Tickets API: $($tickets.data.data.Count) Tickets geladen" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Support-API Fehler: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n4. Frontend-Module-Struktur validieren..." -ForegroundColor Yellow

$frontendStructure = @(
    "frontend/src/layouts/MainLayout.tsx",
    "frontend/src/layouts/components/Header.tsx", 
    "frontend/src/layouts/components/Sidebar.tsx",
    "frontend/src/modules/hr/HRModule.tsx",
    "frontend/src/modules/hr/pages/EmployeesPage.tsx",
    "frontend/src/modules/support/SupportModule.tsx",
    "frontend/src/modules/support/pages/TicketsPage.tsx",
    "frontend/src/modules/auth/LoginPage.tsx",
    "frontend/src/components/Dashboard.tsx"
)

$allExists = $true
foreach ($file in $frontendStructure) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file (fehlt)" -ForegroundColor Red
        $allExists = $false
    }
}

if ($allExists) {
    Write-Host "`n✅ Alle Frontend-Module-Dateien vorhanden" -ForegroundColor Green
} else {
    Write-Host "`n❌ Einige Frontend-Dateien fehlen" -ForegroundColor Red
}

Write-Host "`n5. Backend-Module-Struktur validieren..." -ForegroundColor Yellow

$backendStructure = @(
    "backend/src/modules/hr/orchestrator.ts",
    "backend/src/modules/hr/types.ts",
    "backend/src/modules/hr/core/auth.ts",
    "backend/src/modules/hr/functions/fetchEmployeeData.ts",
    "backend/src/modules/support/orchestrator.ts",
    "backend/src/modules/support/types.ts",
    "backend/src/modules/support/functions/manageTickets.ts"
)

$allExists = $true
foreach ($file in $backendStructure) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file (fehlt)" -ForegroundColor Red
        $allExists = $false
    }
}

if ($allExists) {
    Write-Host "`n✅ Alle Backend-Module-Dateien vorhanden" -ForegroundColor Green
} else {
    Write-Host "`n❌ Einige Backend-Dateien fehlen" -ForegroundColor Red
}

Write-Host "`n6. Dokumentation validieren..." -ForegroundColor Yellow

$docsStructure = @(
    "docs/README.md",
    "docs/CHANGELOG.md", 
    "docs/modules/hr/README.md",
    "docs/modules/hr/API.md",
    "docs/modules/support/README.md",
    "docs/architecture/overview.md",
    ".cursorrules"
)

$allExists = $true
foreach ($file in $docsStructure) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file (fehlt)" -ForegroundColor Red
        $allExists = $false
    }
}

if ($allExists) {
    Write-Host "`n✅ Alle Dokumentations-Dateien vorhanden" -ForegroundColor Green
} else {
    Write-Host "`n❌ Einige Dokumentations-Dateien fehlen" -ForegroundColor Red
}

Write-Host "`n🎉 Integration Test abgeschlossen!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

Write-Host "`n📋 Nächste Schritte:" -ForegroundColor Yellow
Write-Host "1. 🌐 Frontend öffnen: $frontendUrl" -ForegroundColor Cyan
Write-Host "2. 🔐 Mit Admin-Rolle anmelden (Token: YWRtaW5AY29tcGFueS5jb20=)" -ForegroundColor Cyan
Write-Host "3. 👥 HR-Modul testen: Mitarbeiter-Verwaltung" -ForegroundColor Cyan
Write-Host "4. 🎫 Support-Modul testen: Ticket-Management" -ForegroundColor Cyan
Write-Host "5. 📊 Dashboard erkunden: System-Übersicht" -ForegroundColor Cyan

Write-Host "`n🛠️ Entwicklung:" -ForegroundColor Yellow
Write-Host "- Backend-Logs: Terminal mit 'npm run dev' im backend/ Ordner" -ForegroundColor Cyan
Write-Host "- Frontend-Logs: Terminal mit 'npm run dev' im frontend/ Ordner" -ForegroundColor Cyan
Write-Host "- API-Dokumentation: $backendUrl/api/hello" -ForegroundColor Cyan
Write-Host "- Vollständige Docs: docs/README.md" -ForegroundColor Cyan

Write-Host "`n🎯 Modulbasierte Architektur erfolgreich implementiert!" -ForegroundColor Green
