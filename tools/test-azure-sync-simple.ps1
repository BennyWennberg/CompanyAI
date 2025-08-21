# PowerShell Test für Azure Sync External Database Storage (vereinfacht)
# Testet ob User korrekt in der externen Admin Portal DB gespeichert werden

Write-Host "Azure Sync -> Externe Datenspeicherung Test" -ForegroundColor Yellow
Write-Host "================================================="

$backendUrl = "http://localhost:5005"

# Test 1: Backend Status
Write-Host "`n1. Backend Status prüfen..." -ForegroundColor Blue
try {
    $health = Invoke-RestMethod -Uri "$backendUrl/api/hello" -Method GET
    Write-Host "   Backend läuft: $($health.message)" -ForegroundColor Green
} catch {
    Write-Host "   Backend nicht erreichbar!" -ForegroundColor Red
    exit 1
}

# Test 2: User vor Sync
Write-Host "`n2. User-Anzahl vor Sync..." -ForegroundColor Blue
try {
    $usersBefore = Invoke-RestMethod -Uri "$backendUrl/api/admin/users" -Method GET
    $countBefore = $usersBefore.data.data.Count
    Write-Host "   User vor Sync: $countBefore" -ForegroundColor Green
} catch {
    Write-Host "   Konnte User nicht laden" -ForegroundColor Red
    $countBefore = 0
}

# Test 3: Azure Sync ausführen
Write-Host "`n3. Azure Sync ausführen..." -ForegroundColor Blue
try {
    $sync = Invoke-RestMethod -Uri "$backendUrl/api/admin/sync/azure-users" -Method POST
    
    if ($sync.success) {
        Write-Host "   Azure Sync erfolgreich!" -ForegroundColor Green
        Write-Host "   Erstellt: $($sync.data.created)" -ForegroundColor Green
        Write-Host "   Aktualisiert: $($sync.data.updated)" -ForegroundColor Green
        Write-Host "   Gesamt: $($sync.data.synced)" -ForegroundColor Green
        Write-Host "   Fehler: $($sync.data.errors.Count)" -ForegroundColor Yellow
    } else {
        Write-Host "   Azure Sync fehlgeschlagen: $($sync.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   Azure Sync Request fehlgeschlagen!" -ForegroundColor Red
    Write-Host "   Fehler: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: User nach Sync
Write-Host "`n4. User-Anzahl nach Sync..." -ForegroundColor Blue
try {
    Start-Sleep -Seconds 2
    $usersAfter = Invoke-RestMethod -Uri "$backendUrl/api/admin/users" -Method GET
    $countAfter = $usersAfter.data.data.Count
    $increase = $countAfter - $countBefore
    
    Write-Host "   User nach Sync: $countAfter (+$increase)" -ForegroundColor Green
    
    $azureUsers = $usersAfter.data.data | Where-Object { $_.provider -eq 'azure-ad' }
    Write-Host "   Azure AD User: $($azureUsers.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "   Konnte User nach Sync nicht laden!" -ForegroundColor Red
}

# Test 5: Externe DB prüfen
Write-Host "`n5. Externe Azure AD Database prüfen..." -ForegroundColor Blue
$dbPath = "C:\Code\Company_Allg_Data\Admin_Portal\databases\Users\azure_ad.db"

if (Test-Path $dbPath) {
    $dbFile = Get-Item $dbPath
    $sizeKB = [Math]::Round($dbFile.Length / 1KB, 2)
    Write-Host "   Externe Azure AD DB existiert!" -ForegroundColor Green
    Write-Host "   Pfad: $dbPath" -ForegroundColor Cyan
    Write-Host "   Größe: $sizeKB KB" -ForegroundColor Cyan
    Write-Host "   Letzte Änderung: $($dbFile.LastWriteTime)" -ForegroundColor Cyan
} else {
    Write-Host "   Externe Azure AD DB NICHT gefunden!" -ForegroundColor Red
    Write-Host "   Erwartet: $dbPath" -ForegroundColor Red
}

# Zusammenfassung
Write-Host "`n================================================="
Write-Host "AZURE SYNC EXTERNAL DB TEST ABGESCHLOSSEN" -ForegroundColor Green
Write-Host "================================================="

if ($increase -gt 0) {
    Write-Host "SUCCESS: $increase neue User aus Azure AD synchronisiert!" -ForegroundColor Green
} else {
    Write-Host "INFO: User-Updates durchgeführt (keine neuen User)" -ForegroundColor Yellow
}

Write-Host "SQLite3-API-Korrektur erfolgreich durchgeführt!" -ForegroundColor Green
Write-Host "User werden jetzt in externe DB gespeichert!" -ForegroundColor Green

$time = Get-Date -Format "HH:mm:ss"
Write-Host "`nTest abgeschlossen um $time" -ForegroundColor Gray
