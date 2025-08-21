# Test User Stats API

Write-Host "Testing User Stats API..." -ForegroundColor Cyan

$adminApiUrl = "http://localhost:5005"

# Login
$loginData = @{
    email = "admin@company.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/auth/login" -Method POST -Body $loginData -ContentType "application/json"
$adminToken = $loginResponse.data.token
Write-Host "Login OK" -ForegroundColor Green

# Test User Stats API
$headers = @{
    "Authorization" = "Bearer $adminToken"
    "Content-Type" = "application/json"
}

Write-Host "`nTesting /api/admin/users/stats..." -ForegroundColor Yellow

try {
    $statsResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users/stats" -Method GET -Headers $headers
    
    Write-Host "SUCCESS: User Stats loaded!" -ForegroundColor Green
    Write-Host "Message: $($statsResponse.message)" -ForegroundColor Gray
    
    if ($statsResponse.data) {
        Write-Host "`nTotal Statistics:" -ForegroundColor Cyan
        Write-Host "  Total Users: $($statsResponse.data.total)" -ForegroundColor Gray
        Write-Host "  Active: $($statsResponse.data.active)" -ForegroundColor Gray
        Write-Host "  Inactive: $($statsResponse.data.inactive)" -ForegroundColor Gray
        
        Write-Host "`nBy Provider:" -ForegroundColor Cyan
        $statsResponse.data.byProvider.PSObject.Properties | ForEach-Object {
            Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor Gray
        }
        
        Write-Host "`nBy Role:" -ForegroundColor Cyan
        $statsResponse.data.byRole.PSObject.Properties | ForEach-Object {
            Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host "`nTest complete!" -ForegroundColor Green
