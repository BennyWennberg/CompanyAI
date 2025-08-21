# Test Admin Login und User Creation

Write-Host "Testing Admin Portal Login & User Creation..." -ForegroundColor Cyan

$adminApiUrl = "http://localhost:5005"

# Step 1: Admin Login
Write-Host "`n1. Admin Login..." -ForegroundColor Yellow

$loginData = @{
    email = "admin@company.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    if ($loginResponse.success) {
        $adminToken = $loginResponse.data.token
        Write-Host "SUCCESS: Admin Login OK!" -ForegroundColor Green
        Write-Host "Token: $($adminToken.Substring(0, 20))..." -ForegroundColor Gray
    } else {
        Write-Host "ERROR: Login failed - $($loginResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "ERROR: Login request failed - $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2: Create Manual User
Write-Host "`n2. Create Manual User..." -ForegroundColor Yellow

$testUser = @{
    email = "manual-user-$(Get-Date -Format 'yyyyMMdd-HHmmss')@company.com"
    firstName = "Manual"
    lastName = "TestUser"
    password = "testpassword123"
    role = "USER"
    department = "IT Test"
    position = "Test Developer"
    phone = "+43 1 234 56 78"
    isActive = $true
    source = "manual"
    createdBy = "admin@company.com"
} | ConvertTo-Json

try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    
    $createResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users" -Method POST -Body $testUser -Headers $headers
    
    Write-Host "SUCCESS: Manual User created!" -ForegroundColor Green
    Write-Host "User ID: $($createResponse.data.id)" -ForegroundColor Gray
    Write-Host "Email: $($createResponse.data.email)" -ForegroundColor Gray
    Write-Host "Provider: $($createResponse.data.provider)" -ForegroundColor Gray
    
    $createdUserId = $createResponse.data.id
    
} catch {
    Write-Host "ERROR Creating User: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorStream)
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}

# Step 3: Get All Users
Write-Host "`n3. Get All Users..." -ForegroundColor Yellow

try {
    $usersResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users?limit=100" -Method GET -Headers $headers
    
    Write-Host "SUCCESS: Users loaded!" -ForegroundColor Green
    Write-Host "Total Users: $($usersResponse.data.users.Count)" -ForegroundColor Gray
    
    $manualUsers = @($usersResponse.data.users | Where-Object { $_.provider -eq 'manual' })
    Write-Host "Manual Users: $($manualUsers.Count)" -ForegroundColor Gray
    
    Write-Host "`nAll Manual Users:" -ForegroundColor Cyan
    foreach ($user in $manualUsers) {
        Write-Host "  - $($user.firstName) $($user.lastName) ($($user.email)) - Status: $($user.status)" -ForegroundColor Gray
    }
    
    # Check if our created user is there
    if ($createdUserId) {
        $foundUser = $usersResponse.data.users | Where-Object { $_.id -eq $createdUserId }
        if ($foundUser) {
            Write-Host "`nSUCCESS: Created user found in list!" -ForegroundColor Green
        } else {
            Write-Host "`nERROR: Created user NOT found in list!" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "ERROR Getting Users: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest complete!" -ForegroundColor Green
