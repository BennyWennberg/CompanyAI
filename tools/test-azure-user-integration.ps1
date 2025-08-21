# Azure AD User Integration Test
# Testet den kompletten Data-Flow: Azure AD → Admin Portal Database → Admin Portal Frontend

param(
    [string]$BackendUrl = "http://localhost:5005",
    [string]$AdminPortalUrl = "http://localhost:3002"
)

Write-Host "🧪 AZURE AD USER INTEGRATION TEST" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# 1. Admin Portal Login testen
Write-Host "1. 🔐 Admin Portal Login testen..." -ForegroundColor Cyan
try {
    $loginResponse = Invoke-RestMethod -Uri "$BackendUrl/api/admin/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body '{"email":"admin@company.com","password":"admin123"}'

    if ($loginResponse.success) {
        Write-Host "   ✅ Admin Login erfolgreich" -ForegroundColor Green
        $token = $loginResponse.data.token
        $headers = @{ "Authorization" = "Bearer $token" }
    } else {
        Write-Host "   ❌ Admin Login fehlgeschlagen: $($loginResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Admin Login Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Manuelle Azure AD User Sync auslösen
Write-Host "2. 🔄 Manuelle Azure AD User Sync auslösen..." -ForegroundColor Cyan
try {
    $syncResponse = Invoke-RestMethod -Uri "$BackendUrl/api/admin/sync/azure-users" `
        -Method POST `
        -Headers $headers

    if ($syncResponse.success) {
        Write-Host "   ✅ Azure AD Sync erfolgreich:" -ForegroundColor Green
        Write-Host "      📊 Synchronisierte Users: $($syncResponse.data.synced)" -ForegroundColor White
        Write-Host "      ❌ Fehler: $($syncResponse.data.totalErrors)" -ForegroundColor White
        Write-Host "      📅 Sync-Zeit: $($syncResponse.data.syncedAt)" -ForegroundColor White
        
        if ($syncResponse.data.errors.Count -gt 0) {
            Write-Host "   ⚠️ Sync-Fehler:" -ForegroundColor Yellow
            $syncResponse.data.errors | ForEach-Object {
                Write-Host "      - $_" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "   ❌ Azure AD Sync fehlgeschlagen: $($syncResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Azure AD Sync Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. User-Liste von Admin Portal API abrufen
Write-Host "3. 👥 Admin Portal User API testen..." -ForegroundColor Cyan
try {
    $usersResponse = Invoke-RestMethod -Uri "$BackendUrl/api/admin/users?page=1&limit=20" `
        -Method GET `
        -Headers $headers

    if ($usersResponse.success -and $usersResponse.data.users) {
        $users = $usersResponse.data.users
        $pagination = $usersResponse.data.pagination
        
        Write-Host "   ✅ Users erfolgreich geladen:" -ForegroundColor Green
        Write-Host "      📊 Gesamt Users: $($pagination.total)" -ForegroundColor White
        Write-Host "      📄 Seite $($pagination.page) (Limit: $($pagination.limit))" -ForegroundColor White
        Write-Host "      📧 Aktuell angezeigt: $($users.Count)" -ForegroundColor White
        Write-Host "      📝 API Message: $($usersResponse.message)" -ForegroundColor White
        Write-Host ""
        
        # User-Details anzeigen
        Write-Host "   👤 USER ÜBERSICHT:" -ForegroundColor Yellow
        $azureUsers = @()
        $mockUsers = @()
        
        foreach ($user in $users) {
            $provider = if ($user.provider -eq "azure-ad") { "🔵 Azure" } else { "👤 Mock" }
            $status = if ($user.status -eq "active") { "✅" } else { "❌" }
            
            Write-Host "      $provider | $status | $($user.email) | $($user.firstName) $($user.lastName) | $($user.role)" -ForegroundColor White
            
            if ($user.provider -eq "azure-ad") {
                $azureUsers += $user
            } else {
                $mockUsers += $user
            }
        }
        
        Write-Host ""
        Write-Host "   📊 USER STATISTIKEN:" -ForegroundColor Yellow
        Write-Host "      🔵 Azure AD Users: $($azureUsers.Count)" -ForegroundColor Cyan
        Write-Host "      👤 Mock Users: $($mockUsers.Count)" -ForegroundColor Green
        Write-Host "      ✅ Aktive Users: $(($users | Where-Object { $_.status -eq 'active' }).Count)" -ForegroundColor Green
        Write-Host "      ❌ Inaktive Users: $(($users | Where-Object { $_.status -eq 'inactive' }).Count)" -ForegroundColor Red
        
    } else {
        Write-Host "   ❌ User API fehlgeschlagen: $($usersResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ User API Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 4. External Data Test
Write-Host "4. 🗂️ External Data Management Test..." -ForegroundColor Cyan
try {
    $externalResponse = Invoke-RestMethod -Uri "$BackendUrl/api/admin/external/test" `
        -Method GET `
        -Headers $headers

    if ($externalResponse.success) {
        Write-Host "   ✅ External Data Management OK:" -ForegroundColor Green
        Write-Host "      📂 External Data Path: $($externalResponse.data.externalDataPath)" -ForegroundColor White
        Write-Host "      🎛️ Config Manager: $($externalResponse.data.configManager)" -ForegroundColor White
        Write-Host "      📊 DB Manager: $($externalResponse.data.dbManager)" -ForegroundColor White
        Write-Host "      👥 User Service: $($externalResponse.data.userService)" -ForegroundColor White
        
        if ($externalResponse.data.databases) {
            Write-Host "   💽 DATABASE STATUS:" -ForegroundColor Yellow
            $externalResponse.data.databases.PSObject.Properties | ForEach-Object {
                $status = if ($_.Value -eq "connected") { "✅" } else { "❌" }
                Write-Host "      $status $($_.Name): $($_.Value)" -ForegroundColor White
            }
        }
    } else {
        Write-Host "   ❌ External Data Test fehlgeschlagen: $($externalResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ External Data Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 5. Admin Portal Frontend Connectivity Test
Write-Host "5. 🌐 Admin Portal Frontend Test..." -ForegroundColor Cyan
try {
    $frontendResponse = Invoke-WebRequest -Uri "$AdminPortalUrl/admin" -Method GET -UseBasicParsing
    
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "   ✅ Admin Portal Frontend erreichbar (Status: $($frontendResponse.StatusCode))" -ForegroundColor Green
        Write-Host "   🎯 URL: $AdminPortalUrl/admin/users/list" -ForegroundColor Cyan
    } else {
        Write-Host "   ⚠️ Admin Portal Frontend antwortet mit Status: $($frontendResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Admin Portal Frontend nicht erreichbar: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Zusammenfassung
Write-Host "🎉 INTEGRATION TEST ABGESCHLOSSEN!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 NEXT STEPS:" -ForegroundColor Yellow
Write-Host "   1. Admin Portal öffnen: $AdminPortalUrl/admin" -ForegroundColor Cyan
Write-Host "   2. Mit admin@company.com / admin123 anmelden" -ForegroundColor Cyan
Write-Host "   3. Navigation: User Management → Users List" -ForegroundColor Cyan
Write-Host "   4. Azure AD Users sollten jetzt sichtbar sein! 🎯" -ForegroundColor Green
Write-Host ""
Write-Host "🔄 AZURE AD SYNC:" -ForegroundColor Yellow
Write-Host "   - Automatisch: Bei jedem EntraAC Sync" -ForegroundColor White
Write-Host "   - Manuell: POST /api/admin/sync/azure-users" -ForegroundColor White
Write-Host "   - Frontend: User Management → Azure AD Sync (geplant)" -ForegroundColor White
Write-Host ""

# Test-Datei Info
Write-Host "📝 Test durchgeführt am: $(Get-Date)" -ForegroundColor Gray
Write-Host "🔗 Backend: $BackendUrl" -ForegroundColor Gray
Write-Host "🎛️ Admin Portal: $AdminPortalUrl" -ForegroundColor Gray
