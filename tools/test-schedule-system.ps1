# Test Schedule-System im Admin Portal
# Testet die Schedule-Management-Endpoints

$baseUrl = "http://localhost:5000"
$token = "demo-token-admin"

Write-Host "Test Schedule-System..." -ForegroundColor Yellow

try {
    # 1. Health Check
    Write-Host "`n1. Backend Health Check..." -ForegroundColor Cyan
    $healthResponse = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method GET
    Write-Host "Backend laeuft: $($healthResponse.StatusCode)" -ForegroundColor Green
    
    # 2. Schedules laden
    Write-Host "`n2. Lade Schedule-Konfigurationen..." -ForegroundColor Cyan
    $headers = @{
        'Authorization' = "Bearer $token"
        'Content-Type' = 'application/json'
    }
    
    $schedulesResponse = Invoke-WebRequest -Uri "$baseUrl/api/admin-portal/schedules" -Method GET -Headers $headers
    $schedulesData = $schedulesResponse.Content | ConvertFrom-Json
    
    if ($schedulesData.success) {
        Write-Host "Schedules geladen: $($schedulesData.data.Count) Eintraege" -ForegroundColor Green
        
        foreach ($schedule in $schedulesData.data) {
            $status = if ($schedule.enabled) { "Aktiv" } else { "Inaktiv" }
            Write-Host "   $($schedule.source): $($schedule.cronExpression) - $status" -ForegroundColor White
        }
    } else {
        Write-Host "Schedules-Fehler: $($schedulesData.message)" -ForegroundColor Red
    }
    
    # 3. Sync-Historie laden
    Write-Host "`n3. Lade Sync-Historie..." -ForegroundColor Cyan
    $historyResponse = Invoke-WebRequest -Uri "$baseUrl/api/admin-portal/schedules/history?limit=5" -Method GET -Headers $headers
    $historyData = $historyResponse.Content | ConvertFrom-Json
    
    if ($historyData.success) {
        Write-Host "Historie geladen: $($historyData.data.Count) Eintraege" -ForegroundColor Green
        
        foreach ($entry in $historyData.data) {
            $statusIcon = switch ($entry.status) {
                'completed' { "OK" }
                'failed' { "FAIL" }
                'running' { "RUN" }
                default { "UNKNOWN" }
            }
            Write-Host "   [$statusIcon] $($entry.source) - $($entry.triggerType)" -ForegroundColor White
        }
    } else {
        Write-Host "Historie-Fehler: $($historyData.message)" -ForegroundColor Red
    }
    
    Write-Host "`nSchedule-System-Test erfolgreich!" -ForegroundColor Green
    
} catch {
    Write-Host "Test-Fehler: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Message -like "*Verbindung*" -or $_.Exception.Message -like "*connection*") {
        Write-Host "Tipp: Backend muss laufen (npm run dev)" -ForegroundColor Yellow
    }
}
