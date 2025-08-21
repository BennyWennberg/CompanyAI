# Clean Azure AD Database

Write-Host "Cleaning Azure AD Database completely..." -ForegroundColor Cyan

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

# Test User Stats BEFORE cleanup
Write-Host "`nBEFORE Cleanup:" -ForegroundColor Yellow
$beforeStats = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users/stats" -Method GET -Headers $headers
Write-Host "  Total: $($beforeStats.data.total)" -ForegroundColor Gray
Write-Host "  Azure AD: $($beforeStats.data.byProvider.'azure-ad')" -ForegroundColor Gray
Write-Host "  Manual: $($beforeStats.data.byProvider.manual)" -ForegroundColor Gray

# Request Azure Database Cleanup (this API doesn't exist yet, we'll create it)
Write-Host "`nRequesting Azure Database cleanup..." -ForegroundColor Yellow

try {
    # We need to create this API endpoint
    $cleanupData = @{
        action = "clear_azure_database"
        confirm = "yes"
    } | ConvertTo-Json
    
    $cleanupResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/debug/clear-azure-db" -Method POST -Body $cleanupData -Headers $headers -ContentType "application/json"
    
    if ($cleanupResponse.success) {
        Write-Host "SUCCESS: Azure database cleared!" -ForegroundColor Green
        Write-Host "Deleted: $($cleanupResponse.data.deletedCount) users" -ForegroundColor Gray
    } else {
        Write-Host "ERROR: $($cleanupResponse.message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Cleanup endpoint not available yet - that's expected" -ForegroundColor Yellow
}

# Test fresh Azure Sync
Write-Host "`nRunning fresh Azure Sync..." -ForegroundColor Yellow

try {
    $syncResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/sync/azure-users" -Method POST -Headers $headers
    
    if ($syncResponse.success) {
        Write-Host "SUCCESS: Fresh Azure Sync completed!" -ForegroundColor Green
        Write-Host "Created: $($syncResponse.data.created)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "Sync error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test User Stats AFTER 
Write-Host "`nAFTER Sync:" -ForegroundColor Yellow
$afterStats = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users/stats" -Method GET -Headers $headers
Write-Host "  Total: $($afterStats.data.total)" -ForegroundColor Gray
Write-Host "  Azure AD: $($afterStats.data.byProvider.'azure-ad')" -ForegroundColor Gray
Write-Host "  Manual: $($afterStats.data.byProvider.manual)" -ForegroundColor Gray

Write-Host "`nCleanup test complete!" -ForegroundColor Green
