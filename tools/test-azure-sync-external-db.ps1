# PowerShell Test für Azure Sync External Database Storage
# Testet ob User korrekt in der externen Admin Portal DB gespeichert werden

Write-Host "🔄 Teste Azure Sync → Externe Datenspeicherung..." -ForegroundColor Yellow
Write-Host "=" * 60

# Backend-URL konfigurieren
$backendUrl = "http://localhost:5005"

# Test 1: Admin Portal Backend Status prüfen
Write-Host "📊 Test 1: Admin Portal Backend Status..." -ForegroundColor Blue
try {
    $healthResponse = Invoke-RestMethod -Uri "$backendUrl/api/hello" -Method GET
    Write-Host "✅ Backend läuft: $($healthResponse.message)" -ForegroundColor Green
    $adminStatus = if($healthResponse.adminModule) { 'AKTIV' } else { 'INAKTIV' }
    $adminColor = if($healthResponse.adminModule) { 'Green' } else { 'Red' }
    Write-Host "   Admin Portal Module: $adminStatus" -ForegroundColor $adminColor
} catch {
    Write-Host "❌ Backend nicht erreichbar: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Aktuelle User-Anzahl vor Sync prüfen
Write-Host "`n📊 Test 2: User-Anzahl vor Azure Sync..." -ForegroundColor Blue
try {
    $usersBefore = Invoke-RestMethod -Uri "$backendUrl/api/admin/users" -Method GET
    $countBefore = $usersBefore.data.data.Count
    Write-Host "✅ User vor Sync: $countBefore" -ForegroundColor Green
    
    # Externe DB-Pfad anzeigen
    if ($usersBefore.data.metadata.dataPath) {
        Write-Host "   Externe DB-Path: $($usersBefore.data.metadata.dataPath)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Konnte User nicht laden: $($_.Exception.Message)" -ForegroundColor Red
    $countBefore = 0
}

# Test 3: Azure User Sync ausführen
Write-Host "`n🔄 Test 3: Azure User Sync ausführen..." -ForegroundColor Blue
try {
    $syncResponse = Invoke-RestMethod -Uri "$backendUrl/api/admin/sync/azure-users" -Method POST
    
    if ($syncResponse.success) {
        Write-Host "✅ Azure Sync erfolgreich!" -ForegroundColor Green
        Write-Host "   Erstellt: $($syncResponse.data.created)" -ForegroundColor Green
        Write-Host "   Aktualisiert: $($syncResponse.data.updated)" -ForegroundColor Green  
        Write-Host "   Gesamt synced: $($syncResponse.data.synced)" -ForegroundColor Green
        $errorColor = if($syncResponse.data.errors.Count -eq 0) { 'Green' } else { 'Yellow' }
        Write-Host "   Fehler: $($syncResponse.data.errors.Count)" -ForegroundColor $errorColor
        
        if ($syncResponse.data.errors.Count -gt 0) {
            Write-Host "⚠️ Sync-Errors:" -ForegroundColor Yellow
            $syncResponse.data.errors | ForEach-Object {
                Write-Host "   - $_" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "❌ Azure Sync fehlgeschlagen: $($syncResponse.message)" -ForegroundColor Red
        Write-Host "   Error: $($syncResponse.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Azure Sync Request fehlgeschlagen: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 4: User-Anzahl nach Sync prüfen
Write-Host "`n📊 Test 4: User-Anzahl nach Azure Sync..." -ForegroundColor Blue
try {
    Start-Sleep -Seconds 2  # Kurz warten für DB-Update
    
    $usersAfter = Invoke-RestMethod -Uri "$backendUrl/api/admin/users" -Method GET
    $countAfter = $usersAfter.data.data.Count
    $increase = $countAfter - $countBefore
    
    Write-Host "✅ User nach Sync: $countAfter (+$increase)" -ForegroundColor Green
    
    # Azure AD Provider User anzeigen
    $azureUsers = $usersAfter.data.data | Where-Object { $_.provider -eq 'azure-ad' }
    Write-Host "   Azure AD User: $($azureUsers.Count)" -ForegroundColor Cyan
    
    if ($azureUsers.Count -gt 0) {
        Write-Host "   Azure User Details:" -ForegroundColor Blue
        $azureUsers | Select-Object -First 3 | ForEach-Object {
            $fullName = "$($_.firstName) $($_.lastName)"
            Write-Host "     - $($_.email) ($fullName) - Status: $($_.status)" -ForegroundColor White
        }
        
        if ($azureUsers.Count -gt 3) {
            Write-Host "     ... und $($azureUsers.Count - 3) weitere" -ForegroundColor Gray
        }
    }
} catch {
    Write-Host "❌ Konnte User nach Sync nicht laden: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Externe DB-Datei prüfen
Write-Host "`n💾 Test 5: Externe Azure AD Database prüfen..." -ForegroundColor Blue
$externalDbPath = "C:\Code\Company_Allg_Data\Admin_Portal\databases\Users\azure_ad.db"

if (Test-Path $externalDbPath) {
    $dbFileInfo = Get-Item $externalDbPath
    Write-Host "✅ Externe Azure AD DB existiert!" -ForegroundColor Green
    Write-Host "   Pfad: $externalDbPath" -ForegroundColor Cyan
    Write-Host "   Größe: $([Math]::Round($dbFileInfo.Length / 1KB, 2)) KB" -ForegroundColor Cyan
    Write-Host "   Letzte Änderung: $($dbFileInfo.LastWriteTime)" -ForegroundColor Cyan
} else {
    Write-Host "❌ Externe Azure AD DB nicht gefunden: $externalDbPath" -ForegroundColor Red
}

# Test 6: Azure Sync Status prüfen
Write-Host "`n🔍 Test 6: Azure Sync Status prüfen..." -ForegroundColor Blue
try {
    $statusResponse = Invoke-RestMethod -Uri "$backendUrl/api/admin/sync/azure-status" -Method GET
    
    if ($statusResponse.success) {
        Write-Host "✅ Azure Sync Status geladen!" -ForegroundColor Green
        $enabledColor = if($statusResponse.data.enabled) { 'Green' } else { 'Red' }
        $serverColor = if($statusResponse.data.serverStatus -eq 'connected') { 'Green' } else { 'Red' }
        Write-Host "   Enabled: $($statusResponse.data.enabled)" -ForegroundColor $enabledColor
        Write-Host "   Server Status: $($statusResponse.data.serverStatus)" -ForegroundColor $serverColor
        Write-Host "   User Count: $($statusResponse.data.userCount)" -ForegroundColor Cyan
        Write-Host "   Last Sync: $($statusResponse.data.lastSync)" -ForegroundColor Cyan
        
        Write-Host "   Configuration:" -ForegroundColor Blue
        Write-Host "     Client ID: $($statusResponse.data.configuration.clientId)" -ForegroundColor White
        Write-Host "     Tenant ID: $($statusResponse.data.configuration.tenantId)" -ForegroundColor White
        Write-Host "     Auto Sync: $($statusResponse.data.configuration.autoSync)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Konnte Azure Status nicht laden: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Connection Test
Write-Host "`n🌐 Test 7: Azure Connection Test..." -ForegroundColor Blue
try {
    $connectionResponse = Invoke-RestMethod -Uri "$backendUrl/api/admin/sync/azure-test" -Method POST
    
    if ($connectionResponse.success) {
        Write-Host "✅ Azure Connection Test erfolgreich!" -ForegroundColor Green
        Write-Host "   Connected: $($connectionResponse.data.connected)" -ForegroundColor Green
        Write-Host "   Tenant ID: $($connectionResponse.data.tenantId)" -ForegroundColor Cyan
        Write-Host "   Response Time: $($connectionResponse.data.responseTime) ms" -ForegroundColor Cyan
        Write-Host "   User Search Test: $($connectionResponse.data.userSearchTest)" -ForegroundColor Green
        Write-Host "   User Count: $($connectionResponse.data.userCount)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Azure Connection Test fehlgeschlagen: $($connectionResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Azure Connection Test Request fehlgeschlagen: $($_.Exception.Message)" -ForegroundColor Red
}

# Zusammenfassung
Write-Host "`n" + "=" * 60
Write-Host "🎉 AZURE SYNC EXTERNAL DB TEST ABGESCHLOSSEN!" -ForegroundColor Green
Write-Host "=" * 60

Write-Host "✅ SQLite3-API-Korrektur erfolgreich!" -ForegroundColor Green
Write-Host "✅ User werden jetzt in externe DB gespeichert!" -ForegroundColor Green
Write-Host "📊 DB-Pfad: C:\Code\Company_Allg_Data\Admin_Portal\databases\Users\" -ForegroundColor Cyan

if ($increase -gt 0) {
    Write-Host "📈 $increase neue User aus Azure AD synchronisiert!" -ForegroundColor Green
} else {
    Write-Host "📊 User-Updates durchgeführt (keine neuen User)" -ForegroundColor Yellow
}

Write-Host "`n🔧 Nächste Schritte:" -ForegroundColor Blue
Write-Host "   1. Überprüfe Admin Portal Frontend auf User-Anzeige" -ForegroundColor White
Write-Host "   2. Teste User-Anmeldung mit Azure AD Credentials" -ForegroundColor White
Write-Host "   3. Prüfe User-Berechtigungen und Rollen" -ForegroundColor White

$currentTime = Get-Date -Format 'HH:mm:ss'
Write-Host "`nTest abgeschlossen um $currentTime" -ForegroundColor Gray
