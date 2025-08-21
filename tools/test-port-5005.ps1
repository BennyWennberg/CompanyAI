# Test Script: Port 5005 Migration und Azure Integration
# Testet ob Backend auf Port 5005 läuft und Azure-Daten verfügbar sind

Write-Host "Testing Port 5005 Migration und Azure Integration" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$backendUrl = "http://localhost:5005"
$adminToken = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("admin@company.com"))

# 1. Backend Health Check
Write-Host "1. Backend Health Check (Port 5005)..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$backendUrl/api/health" -Method GET -TimeoutSec 10
    Write-Host "   ✅ Backend erreichbar auf Port 5005" -ForegroundColor Green
    Write-Host "   Status: $($health.status)" -ForegroundColor Cyan
    Write-Host "   Module: $($health.modules -join ', ')" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ Backend nicht erreichbar auf Port 5005" -ForegroundColor Red
    Write-Host "   🔧 Starten Sie Backend mit: cd backend && npm run dev" -ForegroundColor Yellow
    exit 1
}

# 2. API-Dokumentation testen
Write-Host "`n2. 📚 API Documentation..." -ForegroundColor Yellow
try {
    $hello = Invoke-RestMethod -Uri "$backendUrl/api/hello" -Method GET
    Write-Host "   ✅ API-Dokumentation verfügbar" -ForegroundColor Green
    Write-Host "   🔗 Verfügbare Endpunkte: $($hello.endpoints.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "   ❌ API-Dokumentation nicht erreichbar" -ForegroundColor Red
}

# 3. Data Sources testen
Write-Host "`n3. 📊 Data Sources (Azure + Manual)..." -ForegroundColor Yellow
try {
    $headers = @{
        'Authorization' = "Bearer $adminToken"
        'Content-Type' = 'application/json'
    }
    
    # Test Combined Users Endpoint
    $users = Invoke-RestMethod -Uri "$backendUrl/api/data/users?source=all`&limit=5" -Headers $headers
    Write-Host "   ✅ Data Sources API erreichbar" -ForegroundColor Green
    
    if ($users.success -and $users.data) {
        $userCount = $users.data.Count
        Write-Host "   User gefunden: $userCount" -ForegroundColor Cyan
        
        if ($userCount -gt 0) {
            $sampleUser = $users.data[0]
            Write-Host "   📝 Sample User: $($sampleUser.displayName)" -ForegroundColor Cyan
            Write-Host "   📧 Email: $($sampleUser.mail)" -ForegroundColor Cyan
            Write-Host "   🏢 Department: $($sampleUser.department)" -ForegroundColor Cyan
            
            # Prüfe Source-Typ
            if ($sampleUser.source) {
                Write-Host "   🔍 Source-Typ: $($sampleUser.source)" -ForegroundColor Cyan
            }
        }
    } else {
        Write-Host "   ⚠️ Keine User-Daten verfügbar" -ForegroundColor Yellow
        Write-Host "   📝 Response: $($users.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Fehler beim Zugriff auf Data Sources" -ForegroundColor Red
    Write-Host "   🔍 Fehler: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Azure/Entra Sync Status
Write-Host "`n4. 🔄 Azure/Entra Sync Status..." -ForegroundColor Yellow
try {
    # Test Manual Sync Trigger
    $syncResult = Invoke-RestMethod -Uri "$backendUrl/api/data/sync" -Method POST -Headers $headers -Body "{}"
    
    if ($syncResult.success) {
        Write-Host "   ✅ Sync-API funktioniert" -ForegroundColor Green
        Write-Host "   📊 Sync-Status: $($syncResult.message)" -ForegroundColor Cyan
        
        if ($syncResult.data) {
            Write-Host "   📈 Details: $($syncResult.data | ConvertTo-Json -Compress)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ⚠️ Sync-API erreichbar, aber nicht erfolgreich" -ForegroundColor Yellow
        Write-Host "   📝 Nachricht: $($syncResult.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Sync-API nicht verfügbar" -ForegroundColor Red
    Write-Host "   🔍 Fehler: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Frontend API Base URL Test
Write-Host "`n5. 🎨 Frontend API Base URL Check..." -ForegroundColor Yellow
$frontendEnv = Get-Content "frontend/.env" -Raw
if ($frontendEnv -match "VITE_API_BASE_URL=http://localhost:5005") {
    Write-Host "   ✅ Frontend .env korrekt konfiguriert (Port 5005)" -ForegroundColor Green
} else {
    Write-Host "   ❌ Frontend .env nicht korrekt - prüfen Sie VITE_API_BASE_URL" -ForegroundColor Red
}

# 6. Admin Portal API Base URL Test
Write-Host "`n6. 🔧 Admin Portal API Base URL Check..." -ForegroundColor Yellow
$adminEnv = Get-Content "admin-portal/.env" -Raw
if ($adminEnv -match "VITE_API_BASE_URL=http://localhost:5005") {
    Write-Host "   ✅ Admin Portal .env korrekt konfiguriert (Port 5005)" -ForegroundColor Green
} else {
    Write-Host "   ❌ Admin Portal .env nicht korrekt - prüfen Sie VITE_API_BASE_URL" -ForegroundColor Red
}

Write-Host "`n🎉 Port 5005 Migration Test abgeschlossen!" -ForegroundColor Green
Write-Host "`n📝 Nächste Schritte:" -ForegroundColor Yellow
Write-Host "   1. Frontend starten: cd frontend && npm run dev" -ForegroundColor Cyan
Write-Host "   2. Admin Portal starten: cd admin-portal && npm run dev" -ForegroundColor Cyan
Write-Host "   3. Alle Apps testen: npm run dev (im Root)" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 URLs:" -ForegroundColor Yellow
Write-Host "   Backend:     http://localhost:5005" -ForegroundColor Cyan
Write-Host "   Chat-App:    http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Admin Portal: http://localhost:3002" -ForegroundColor Cyan
Write-Host ""
