# Debug Backend Logs für Manual User Loading

Write-Host "Testing Manual User Database Loading..." -ForegroundColor Cyan

$adminApiUrl = "http://localhost:5005"

# Login first
$loginData = @{
    email = "admin@company.com"
    password = "admin123"
} | ConvertTo-Json

$loginResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/auth/login" -Method POST -Body $loginData -ContentType "application/json"
$adminToken = $loginResponse.data.token

Write-Host "Admin Token obtained: $($adminToken.Substring(0, 20))..." -ForegroundColor Green

# Get Users with detailed logging
Write-Host "`nTesting Get Users API..." -ForegroundColor Yellow

try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    
    $usersResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users?limit=100" -Method GET -Headers $headers
    
    Write-Host "API Response:" -ForegroundColor Cyan
    Write-Host "Success: $($usersResponse.success)" -ForegroundColor Gray
    Write-Host "Message: $($usersResponse.message)" -ForegroundColor Gray
    Write-Host "Total Users Returned: $($usersResponse.data.users.Count)" -ForegroundColor Gray
    
    # Analyze by provider
    $providers = $usersResponse.data.users | Group-Object provider
    Write-Host "`nUsers by Provider:" -ForegroundColor Cyan
    foreach ($provider in $providers) {
        Write-Host "  $($provider.Name): $($provider.Count) users" -ForegroundColor Gray
    }
    
    # Show manual users specifically
    $manualUsers = $usersResponse.data.users | Where-Object { $_.provider -eq 'manual' }
    Write-Host "`nManual Users Details:" -ForegroundColor Cyan
    if ($manualUsers.Count -eq 0) {
        Write-Host "  ❌ NO MANUAL USERS FOUND!" -ForegroundColor Red
        Write-Host "  This indicates getManualUsers() is not loading from the database correctly." -ForegroundColor Red
    } else {
        foreach ($user in $manualUsers) {
            Write-Host "  - $($user.firstName) $($user.lastName) ($($user.email))" -ForegroundColor Gray
            Write-Host "    ID: $($user.id)" -ForegroundColor DarkGray
            Write-Host "    Status: $($user.status)" -ForegroundColor DarkGray
            Write-Host "    Created: $($user.createdAt)" -ForegroundColor DarkGray
        }
    }
    
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nDebug complete!" -ForegroundColor Green
