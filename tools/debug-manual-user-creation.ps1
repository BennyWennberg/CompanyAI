# Debug Manual User Creation - Full Flow Test

Write-Host "Debugging Manual User Creation..." -ForegroundColor Cyan

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

# Step 2: Create Manual User WITH DEBUG
Write-Host "`n2. Create Manual User (FULL DEBUG)..." -ForegroundColor Yellow

$testUser = @{
    email = "debug-user-$(Get-Date -Format 'HHmmss')@company.com"
    firstName = "Debug"
    lastName = "User"
    password = "debugpassword123"
    role = "USER"
    department = "IT Debug"
    position = "Debug Developer"
    phone = "+43 1 234 56 78"
    isActive = $true
    permissions = @()
    quotas = @{
        dailyTokens = 10000
        monthlyTokens = 100000
        concurrentSessions = 3
    }
    notes = "Debug User für Manual Creation Test"
    source = "manual"
    createdBy = "admin@company.com"
} | ConvertTo-Json -Depth 3

Write-Host "Sending Create Request..." -ForegroundColor Cyan

try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    
    $createResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users" -Method POST -Body $testUser -Headers $headers
    
    Write-Host "SUCCESS: User Creation Response!" -ForegroundColor Green
    Write-Host "Success: $($createResponse.success)" -ForegroundColor Gray
    Write-Host "Message: $($createResponse.message)" -ForegroundColor Gray
    
    if ($createResponse.data) {
        Write-Host "User Details:" -ForegroundColor Cyan
        Write-Host "  ID: $($createResponse.data.id)" -ForegroundColor Gray
        Write-Host "  Email: $($createResponse.data.email)" -ForegroundColor Gray
        Write-Host "  Provider: $($createResponse.data.provider)" -ForegroundColor Gray
        Write-Host "  Status: $($createResponse.data.status)" -ForegroundColor Gray
        
        $createdUserId = $createResponse.data.id
        $createdUserEmail = $createResponse.data.email
        
        Write-Host "`nSUCCESS: User $createdUserEmail created with ID $createdUserId" -ForegroundColor Green
    }
    
} catch {
    Write-Host "ERROR Creating User: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        try {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $responseBody = $reader.ReadToEnd()
            Write-Host "Error Response: $responseBody" -ForegroundColor Red
        } catch {
            Write-Host "Could not read error response" -ForegroundColor Red
        }
    }
    exit 1
}

# Step 3: IMMEDIATE Get Users Test
Write-Host "`n3. IMMEDIATE Get Users Test..." -ForegroundColor Yellow

try {
    $usersResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users?limit=100" -Method GET -Headers $headers
    
    Write-Host "SUCCESS: Users Response!" -ForegroundColor Green
    Write-Host "Total Users: $($usersResponse.data.users.Count)" -ForegroundColor Gray
    
    $manualUsers = @($usersResponse.data.users | Where-Object { $_.provider -eq 'manual' })
    Write-Host "Manual Users Found: $($manualUsers.Count)" -ForegroundColor Gray
    
    Write-Host "`nAll Manual Users:" -ForegroundColor Cyan
    foreach ($user in $manualUsers) {
        $isOurUser = if ($user.id -eq $createdUserId) { " ⭐ (NEWLY CREATED)" } else { "" }
        Write-Host "  - $($user.firstName) $($user.lastName) ($($user.email))$isOurUser" -ForegroundColor Gray
    }
    
    # Check if our newly created user is in the list
    $foundOurUser = $usersResponse.data.users | Where-Object { $_.id -eq $createdUserId }
    if ($foundOurUser) {
        Write-Host "`nSUCCESS: Our newly created user IS in the users list!" -ForegroundColor Green
        Write-Host "User found with provider: $($foundOurUser.provider)" -ForegroundColor Gray
    } else {
        Write-Host "`nPROBLEM: Our newly created user is NOT in the users list!" -ForegroundColor Red
        Write-Host "Created User ID: $createdUserId" -ForegroundColor Red
        Write-Host "This indicates a database loading issue." -ForegroundColor Red
    }
    
} catch {
    Write-Host "ERROR Getting Users: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nDEBUG TEST COMPLETE!" -ForegroundColor Green
