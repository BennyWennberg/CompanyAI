# Test Manual Users specifically

Write-Host "Testing Manual Users Loading..." -ForegroundColor Cyan

$adminApiUrl = "http://localhost:5005"

# Login
$loginData = @{
    email = "admin@company.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/auth/login" -Method POST -Body $loginData -ContentType "application/json"
$adminToken = $loginResponse.data.token
Write-Host "Login OK" -ForegroundColor Green

# Test Manual Users with provider filter
$headers = @{
    "Authorization" = "Bearer $adminToken"
    "Content-Type" = "application/json"
}

Write-Host "`nTesting provider=manual filter..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users?provider=manual&limit=50" -Method GET -Headers $headers
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Manual Users Count: $($response.data.users.Count)" -ForegroundColor Gray
    Write-Host "Message: $($response.message)" -ForegroundColor Gray
    
    if ($response.data.users.Count -gt 0) {
        Write-Host "`nManual Users Found:" -ForegroundColor Cyan
        foreach ($user in $response.data.users) {
            Write-Host "  - $($user.firstName) $($user.lastName) ($($user.email))" -ForegroundColor Gray
            Write-Host "    Provider: $($user.provider), Status: $($user.status)" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "No manual users found with provider filter" -ForegroundColor Red
    }
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest complete!" -ForegroundColor Green
