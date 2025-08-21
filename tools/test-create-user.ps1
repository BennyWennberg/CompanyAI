# Test Script für Create User API - Admin Portal Integration
# Testet die manuelle User-Erstellung und Database-Integration

Write-Host "🧪 Admin Portal Create User API Test" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$adminApiUrl = "http://localhost:5005"

# Test 1: Backend Health Check
Write-Host "`n1️⃣ Backend Health Check..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/health" -Method GET
    if ($healthResponse.success) {
        Write-Host "✅ Backend ist erreichbar" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend-Health-Check fehlgeschlagen" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Backend nicht erreichbar: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Admin Login (Mock)
Write-Host "`n2️⃣ Admin Login Test..." -ForegroundColor Yellow
$loginData = @{
    email = "admin@company.com"
    password = "admin123"
} | ConvertTo-Json -Depth 3

try {
    $loginResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    if ($loginResponse.success) {
        $adminToken = $loginResponse.data.token
        Write-Host "✅ Admin Login erfolgreich" -ForegroundColor Green
    } else {
        Write-Host "❌ Admin Login fehlgeschlagen: $($loginResponse.message)" -ForegroundColor Red
        # Continue with test token
        $adminToken = "test-admin-token"
    }
} catch {
    Write-Host "⚠️ Admin Login nicht verfügbar, verwende Test-Token" -ForegroundColor Yellow
    $adminToken = "test-admin-token"
}

# Test 3: Create User API
Write-Host "`n3️⃣ Create User API Test..." -ForegroundColor Yellow

$testUser = @{
    email = "testuser-$(Get-Date -Format 'yyyyMMdd-HHmmss')@company.com"
    firstName = "Test"
    lastName = "User $(Get-Date -Format 'HHmm')"
    password = "testpassword123"
    role = "USER"
    department = "IT Test"
    position = "Test Developer"
    phone = "+43 1 234 56 78"
    isActive = $true
    permissions = @("chat.basic", "ai.access", "rag.read")
    quotas = @{
        dailyTokens = 10000
        monthlyTokens = 100000
        concurrentSessions = 3
    }
    notes = "Test-User erstellt durch PowerShell Script"
    source = "manual"
    createdBy = "admin@company.com"
} | ConvertTo-Json -Depth 3

$testUserInfo = $testUser | ConvertFrom-Json
Write-Host "📤 Sende User Creation Request..." -ForegroundColor Cyan
Write-Host "User: $($testUserInfo.email), $($testUserInfo.firstName) $($testUserInfo.lastName), Role: $($testUserInfo.role)" -ForegroundColor Gray

try {
    $headers = @{
        "Authorization" = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    
    $createResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users" -Method POST -Body $testUser -Headers $headers -ContentType "application/json"
    
    if ($createResponse.success) {
        Write-Host "✅ User erfolgreich erstellt!" -ForegroundColor Green
        Write-Host "📊 User Details:" -ForegroundColor Cyan
        Write-Host "  ID: $($createResponse.data.id)" -ForegroundColor Gray
        Write-Host "  Email: $($createResponse.data.email)" -ForegroundColor Gray
        Write-Host "  Name: $($createResponse.data.firstName) $($createResponse.data.lastName)" -ForegroundColor Gray
        Write-Host "  Role: $($createResponse.data.role)" -ForegroundColor Gray
        Write-Host "  Provider: $($createResponse.data.provider)" -ForegroundColor Gray
        Write-Host "  Status: $($createResponse.data.status)" -ForegroundColor Gray
        
        $createdUserId = $createResponse.data.id
    } else {
        Write-Host "❌ User Creation fehlgeschlagen: $($createResponse.message)" -ForegroundColor Red
        Write-Host "Error: $($createResponse.error)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Create User API Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "HTTP Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
    exit 1
}

# Test 4: Verify User in Database
Write-Host "`n4️⃣ Database Integration Test..." -ForegroundColor Yellow

try {
    $getUserResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users/$createdUserId" -Method GET -Headers $headers
    
    if ($getUserResponse.success) {
        Write-Host "✅ User wurde korrekt in Datenbank gespeichert!" -ForegroundColor Green
        Write-Host "📊 Database User Details:" -ForegroundColor Cyan
        Write-Host "  Provider: $($getUserResponse.data.provider)" -ForegroundColor Gray
        Write-Host "  CreatedAt: $($getUserResponse.data.createdAt)" -ForegroundColor Gray
        Write-Host "  Department: $($getUserResponse.data.department)" -ForegroundColor Gray
        Write-Host "  Position: $($getUserResponse.data.position)" -ForegroundColor Gray
    } else {
        Write-Host "❌ User nicht in Datenbank gefunden: $($getUserResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Database Verification Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Get All Users (Verify Multi-Source)
Write-Host "`n5️⃣ Multi-Source User Loading Test..." -ForegroundColor Yellow

try {
    $allUsersResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users?limit=100" -Method GET -Headers $headers
    
    if ($allUsersResponse.success) {
        $totalUsers = $allUsersResponse.data.users.Count
        $manualUsersArray = @($allUsersResponse.data.users | Where-Object { $_.provider -eq 'manual' })
        $azureUsersArray = @($allUsersResponse.data.users | Where-Object { $_.provider -eq 'azure-ad' })
        $manualUsers = $manualUsersArray.Count
        $azureUsers = $azureUsersArray.Count
        
        Write-Host "✅ Multi-Source User Loading funktioniert!" -ForegroundColor Green
        Write-Host "📊 User Statistics:" -ForegroundColor Cyan
        Write-Host "  Total Users: $totalUsers" -ForegroundColor Gray
        Write-Host "  Manual Users: $manualUsers" -ForegroundColor Gray
        Write-Host "  Azure Users: $azureUsers" -ForegroundColor Gray
        
        # Find our test user
        $testUserInList = $allUsersResponse.data.users | Where-Object { $_.id -eq $createdUserId }
        if ($testUserInList) {
            Write-Host "✅ Test-User ist in der Multi-Source-Liste enthalten!" -ForegroundColor Green
        } else {
            Write-Host "❌ Test-User nicht in Multi-Source-Liste gefunden" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Multi-Source User Loading fehlgeschlagen: $($allUsersResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Multi-Source Test Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎉 Create User Test abgeschlossen!" -ForegroundColor Green
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "  - Frontend Fixes: Icon-Imports + adminApi Integration" -ForegroundColor Gray
Write-Host "  - Backend Integration: Multi-Source Database Storage" -ForegroundColor Gray
Write-Host "  - Database: Manual User in separater ENV-gesteuerter DB" -ForegroundColor Gray
Write-Host "  - API: Korrekte /api/admin/users (POST) Route" -ForegroundColor Gray

# Test 6: Cleanup (Optional)
Write-Host "`n6️⃣ Test-User Cleanup..." -ForegroundColor Yellow
$cleanup = Read-Host "Soll der Test-User gelöscht werden? (y/N)"
if ($cleanup -eq "y" -or $cleanup -eq "Y") {
    try {
        $deleteResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users/$createdUserId" -Method DELETE -Headers $headers
        if ($deleteResponse.success) {
            Write-Host "✅ Test-User erfolgreich gelöscht" -ForegroundColor Green
        } else {
            Write-Host "❌ Test-User Löschung fehlgeschlagen: $($deleteResponse.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Delete Test User Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "ℹ️ Test-User bleibt bestehen: ID $createdUserId" -ForegroundColor Blue
}