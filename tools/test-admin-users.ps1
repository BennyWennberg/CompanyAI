# Test Admin Users API ohne Auth

Write-Host "Testing Admin Users API..." -ForegroundColor Cyan

$adminApiUrl = "http://localhost:5005"

# Test 1: Create User ohne Auth
Write-Host "`n1. Testing Create User..." -ForegroundColor Yellow

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

try {
    $createResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users" -Method POST -Body $testUser -ContentType "application/json"
    
    Write-Host "SUCCESS: User created!" -ForegroundColor Green
    Write-Host "User ID: $($createResponse.data.id)" -ForegroundColor Gray
    Write-Host "Provider: $($createResponse.data.provider)" -ForegroundColor Gray
    
    $createdUserId = $createResponse.data.id
    
} catch {
    Write-Host "ERROR Creating User: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Get All Users
Write-Host "`n2. Testing Get Users..." -ForegroundColor Yellow

try {
    $usersResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users?limit=100" -Method GET
    
    if ($usersResponse.success) {
        $totalUsers = $usersResponse.data.users.Count
        $manualUsers = @($usersResponse.data.users | Where-Object { $_.provider -eq 'manual' }).Count
        
        Write-Host "SUCCESS: Users loaded!" -ForegroundColor Green
        Write-Host "Total Users: $totalUsers" -ForegroundColor Gray
        Write-Host "Manual Users: $manualUsers" -ForegroundColor Gray
        
        # Show manual users
        $manualUsersList = $usersResponse.data.users | Where-Object { $_.provider -eq 'manual' }
        Write-Host "`nManual Users:" -ForegroundColor Cyan
        foreach ($user in $manualUsersList) {
            Write-Host "  - $($user.firstName) $($user.lastName) ($($user.email))" -ForegroundColor Gray
        }
        
    } else {
        Write-Host "ERROR: $($usersResponse.message)" -ForegroundColor Red
    }
    
} catch {
    Write-Host "ERROR Getting Users: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest complete!" -ForegroundColor Green
