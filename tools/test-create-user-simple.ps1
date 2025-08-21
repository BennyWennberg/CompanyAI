# Einfacher Test für Create User API

Write-Host "Testing Create User API..." -ForegroundColor Cyan

$adminApiUrl = "http://localhost:5005"
$adminToken = "test-admin-token"

$testUser = @{
    email = "testuser-$(Get-Date -Format 'yyyyMMdd-HHmmss')@company.com"
    firstName = "Test"
    lastName = "User"
    password = "testpassword123"
    role = "USER"
    department = "IT Test"
    position = "Test Developer"
    phone = "+43 1 234 56 78"
    isActive = $true
    source = "manual"
    createdBy = "admin@company.com"
} | ConvertTo-Json -Depth 3

Write-Host "Creating user..." -ForegroundColor Yellow

try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    
    $createResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users" -Method POST -Body $testUser -Headers $headers
    
    Write-Host "SUCCESS: API Response received!" -ForegroundColor Green
    Write-Host "Success: $($createResponse.success)" -ForegroundColor Gray
    Write-Host "Message: $($createResponse.message)" -ForegroundColor Gray
    
    if ($createResponse.data) {
        Write-Host "User ID: $($createResponse.data.id)" -ForegroundColor Gray
        Write-Host "Provider: $($createResponse.data.provider)" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host "Test complete!" -ForegroundColor Green