# Clean Azure AD Duplicates

Write-Host "Cleaning Azure AD Duplicates..." -ForegroundColor Cyan

$adminApiUrl = "http://localhost:5005"

# Login
$loginData = @{
    email = "admin@company.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/auth/login" -Method POST -Body $loginData -ContentType "application/json"
$adminToken = $loginResponse.data.token
Write-Host "Login OK" -ForegroundColor Green

$headers = @{
    "Authorization" = "Bearer $adminToken"
    "Content-Type" = "application/json"
}

# Test Azure Sync to clean duplicates
Write-Host "`nRunning Azure Sync to clean duplicates..." -ForegroundColor Yellow

try {
    $syncResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/sync/azure-users" -Method POST -Headers $headers
    
    if ($syncResponse.success) {
        Write-Host "SUCCESS: Azure Sync completed!" -ForegroundColor Green
        Write-Host "Message: $($syncResponse.message)" -ForegroundColor Gray
        
        if ($syncResponse.data) {
            Write-Host "`nSync Results:" -ForegroundColor Cyan
            Write-Host "  Synced: $($syncResponse.data.synced)" -ForegroundColor Gray
            Write-Host "  Created: $($syncResponse.data.created)" -ForegroundColor Gray
            Write-Host "  Updated: $($syncResponse.data.updated)" -ForegroundColor Gray
            Write-Host "  Errors: $($syncResponse.data.errors.length)" -ForegroundColor Gray
        }
    } else {
        Write-Host "ERROR: $($syncResponse.message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

# Check user stats again
Write-Host "`nChecking new user stats..." -ForegroundColor Yellow

try {
    $statsResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users/stats" -Method GET -Headers $headers
    
    if ($statsResponse.success -and $statsResponse.data) {
        Write-Host "`nNew Statistics:" -ForegroundColor Cyan
        Write-Host "  Total Users: $($statsResponse.data.total)" -ForegroundColor Gray
        Write-Host "  Active: $($statsResponse.data.active)" -ForegroundColor Gray
        
        Write-Host "`nBy Provider:" -ForegroundColor Cyan
        $statsResponse.data.byProvider.PSObject.Properties | ForEach-Object {
            Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor Gray
        }
    }
    
} catch {
    Write-Host "ERROR loading stats: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nCleanup complete!" -ForegroundColor Green
