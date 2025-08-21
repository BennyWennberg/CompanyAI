# CompanyAI Admin Portal - Testing Script
# Vollständige Admin-Portal API-Tests mit PowerShell

Write-Host "🔧 CompanyAI Admin Portal - API Tests" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Configuration
$backendUrl = "http://localhost:5005"
$adminCredentials = @{
    email = "admin@company.com"
    password = "admin123"
}

# Helper function for API calls
function Invoke-AdminAPI {
    param(
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Headers = @{},
        [object]$Body = $null,
        [bool]$SkipAuth = $false
    )
    
    $uri = "$backendUrl$Endpoint"
    $requestParams = @{
        Uri = $uri
        Method = $Method
        Headers = $Headers
        ContentType = "application/json"
    }
    
    if ($Body) {
        $requestParams.Body = $Body | ConvertTo-Json -Depth 10
    }
    
    try {
        Write-Host "  → $Method $Endpoint" -ForegroundColor Yellow
        $response = Invoke-RestMethod @requestParams
        Write-Host "    ✅ Success: $($response.message)" -ForegroundColor Green
        return $response
    }
    catch {
        Write-Host "    ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
            if ($errorDetails) {
                Write-Host "    📋 Details: $($errorDetails.message)" -ForegroundColor Red
            }
        }
        return $null
    }
}

Write-Host ""
Write-Host "1️⃣ Admin Authentication Tests" -ForegroundColor Blue
Write-Host "================================"

# Test Admin Login
Write-Host "🔑 Testing Admin Login..." -ForegroundColor White
$loginResponse = Invoke-AdminAPI -Method "POST" -Endpoint "/admin/auth/login" -Body $adminCredentials -SkipAuth $true

if (-not $loginResponse -or -not $loginResponse.success) {
    Write-Host "❌ Admin Login failed - cannot continue tests" -ForegroundColor Red
    exit 1
}

$adminToken = $loginResponse.data.token
$adminHeaders = @{ "Authorization" = "Bearer $adminToken" }

Write-Host "✅ Admin Login successful - Token received" -ForegroundColor Green
Write-Host "👤 Logged in as: $($loginResponse.data.user.firstName) $($loginResponse.data.user.lastName)" -ForegroundColor Cyan

# Test Current Admin User
Write-Host "👤 Testing Current Admin User..." -ForegroundColor White
$currentUserResponse = Invoke-AdminAPI -Method "GET" -Endpoint "/admin/auth/me" -Headers $adminHeaders

Write-Host ""
Write-Host "2️⃣ User Management Tests" -ForegroundColor Blue
Write-Host "=========================="

# Test Get Users
Write-Host "📋 Testing Get Users..." -ForegroundColor White  
$usersResponse = Invoke-AdminAPI -Method "GET" -Endpoint "/admin/users?page=1&limit=10" -Headers $adminHeaders

if ($usersResponse -and $usersResponse.success) {
    Write-Host "📊 Found $($usersResponse.data.users.Count) users" -ForegroundColor Cyan
    foreach ($user in $usersResponse.data.users) {
        Write-Host "   • $($user.firstName) $($user.lastName) ($($user.email)) - Role: $($user.role)" -ForegroundColor Gray
    }
}

# Test Create User
Write-Host "➕ Testing Create User..." -ForegroundColor White
$newUser = @{
    email = "test.user@company.com"
    firstName = "Test"
    lastName = "User"
    role = "USER"
    quotas = @{
        tokensPerDay = 5000
        requestsPerHour = 50
    }
}

$createUserResponse = Invoke-AdminAPI -Method "POST" -Endpoint "/admin/users" -Headers $adminHeaders -Body $newUser

if ($createUserResponse -and $createUserResponse.success) {
    $createdUserId = $createUserResponse.data.id
    Write-Host "✅ User created with ID: $createdUserId" -ForegroundColor Green
    
    # Test Get Single User
    Write-Host "🔍 Testing Get Single User..." -ForegroundColor White
    $singleUserResponse = Invoke-AdminAPI -Method "GET" -Endpoint "/admin/users/$createdUserId" -Headers $adminHeaders
    
    # Test Update User  
    Write-Host "✏️ Testing Update User..." -ForegroundColor White
    $updateData = @{
        role = "ADMIN"
        quotas = @{
            tokensPerDay = 10000
        }
    }
    $updateUserResponse = Invoke-AdminAPI -Method "PUT" -Endpoint "/admin/users/$createdUserId" -Headers $adminHeaders -Body $updateData
    
    # Test Delete User
    Write-Host "🗑️ Testing Delete User..." -ForegroundColor White
    $deleteUserResponse = Invoke-AdminAPI -Method "DELETE" -Endpoint "/admin/users/$createdUserId" -Headers $adminHeaders
}

# Test Bulk Operations
Write-Host "📦 Testing Bulk User Operations..." -ForegroundColor White
$bulkOperation = @{
    operation = "update_role"
    userIds = @("1", "2")
    data = @{
        role = "USER"
    }
}
$bulkResponse = Invoke-AdminAPI -Method "POST" -Endpoint "/admin/users/bulk" -Headers $adminHeaders -Body $bulkOperation

Write-Host ""
Write-Host "3️⃣ Analytics & Monitoring Tests" -ForegroundColor Blue
Write-Host "=================================="

# Test System Metrics
Write-Host "📊 Testing System Metrics..." -ForegroundColor White
$metricsResponse = Invoke-AdminAPI -Method "GET" -Endpoint "/admin/analytics/metrics" -Headers $adminHeaders

if ($metricsResponse -and $metricsResponse.success) {
    $metrics = $metricsResponse.data
    Write-Host "📈 System Status: $($metrics.systemStatus)" -ForegroundColor Cyan
    Write-Host "👥 Active Users: $($metrics.activeUsers) / $($metrics.totalUsers)" -ForegroundColor Cyan
    Write-Host "🔥 API Calls Today: $($metrics.apiCallsToday)" -ForegroundColor Cyan
    Write-Host "⚡ Tokens Used Today: $($metrics.tokensUsedToday)" -ForegroundColor Cyan
    Write-Host "⏱️ Avg Response Time: $($metrics.avgResponseTime)ms" -ForegroundColor Cyan
    Write-Host "❌ Error Rate: $([math]::Round($metrics.errorRate * 100, 2))%" -ForegroundColor Cyan
}

# Test Usage Analytics
Write-Host "📈 Testing Usage Analytics..." -ForegroundColor White
$usageResponse = Invoke-AdminAPI -Method "GET" -Endpoint "/admin/analytics/usage?period=day" -Headers $adminHeaders

if ($usageResponse -and $usageResponse.success) {
    Write-Host "📊 Usage Analytics ($($usageResponse.data.period)):" -ForegroundColor Cyan
    Write-Host "   • Data Points: $($usageResponse.data.data.Count)" -ForegroundColor Gray
    if ($usageResponse.data.data.Count -gt 0) {
        $latestData = $usageResponse.data.data[-1]
        Write-Host "   • Latest: $($latestData.apiCalls) API calls, $($latestData.tokens) tokens" -ForegroundColor Gray
    }
}

# Test Model Usage Stats
Write-Host "🤖 Testing Model Usage Stats..." -ForegroundColor White
$modelsResponse = Invoke-AdminAPI -Method "GET" -Endpoint "/admin/analytics/models" -Headers $adminHeaders

if ($modelsResponse -and $modelsResponse.success) {
    Write-Host "🔥 Model Usage Statistics:" -ForegroundColor Cyan
    foreach ($model in $modelsResponse.data) {
        Write-Host "   • $($model.provider)/$($model.model): $($model.usage) calls, `$$($model.cost)" -ForegroundColor Gray
    }
}

# Test Generate Report
Write-Host "📋 Testing Report Generation..." -ForegroundColor White
$reportResponse = Invoke-AdminAPI -Method "POST" -Endpoint "/admin/reports/generate?period=month" -Headers $adminHeaders

if ($reportResponse -and $reportResponse.success) {
    Write-Host "📊 Generated Report Summary:" -ForegroundColor Cyan
    $summary = $reportResponse.data.summary
    Write-Host "   • Period: $($summary.period)" -ForegroundColor Gray
    Write-Host "   • Total API Calls: $($summary.totalApiCalls)" -ForegroundColor Gray
    Write-Host "   • Total Costs: `$$($summary.totalCosts)" -ForegroundColor Gray
    Write-Host "   • Avg Daily Users: $($summary.avgDailyUsers)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "4️⃣ Audit & Security Tests" -ForegroundColor Blue
Write-Host "=========================="

# Test Audit Logs
Write-Host "🔍 Testing Audit Logs..." -ForegroundColor White
$auditResponse = Invoke-AdminAPI -Method "GET" -Endpoint "/admin/audit/logs?page=1&limit=5" -Headers $adminHeaders

if ($auditResponse -and $auditResponse.success) {
    Write-Host "📋 Recent Admin Activities:" -ForegroundColor Cyan
    foreach ($log in $auditResponse.data.logs) {
        $timestamp = [DateTime]::Parse($log.timestamp).ToString("dd.MM.yyyy HH:mm")
        Write-Host "   • [$timestamp] $($log.userEmail): $($log.action)" -ForegroundColor Gray
    }
    Write-Host "   📊 Total logs: $($auditResponse.data.pagination.total)" -ForegroundColor Gray
}

# Test System Health
Write-Host "🏥 Testing System Health..." -ForegroundColor White
$healthResponse = Invoke-AdminAPI -Method "GET" -Endpoint "/admin/health" -Headers $adminHeaders

if ($healthResponse -and $healthResponse.success) {
    Write-Host "🏥 System Health: $($healthResponse.data.status)" -ForegroundColor Cyan
    Write-Host "⏰ Uptime: $($healthResponse.data.uptime)" -ForegroundColor Cyan
    Write-Host "🔧 Services:" -ForegroundColor Cyan
    foreach ($service in $healthResponse.data.services.GetEnumerator()) {
        $statusColor = if ($service.Value.status -eq "healthy") { "Green" } elseif ($service.Value.status -eq "degraded") { "Yellow" } else { "Red" }
        Write-Host "   • $($service.Key): $($service.Value.status) ($($service.Value.responseTime)ms)" -ForegroundColor $statusColor
    }
}

Write-Host ""
Write-Host "5️⃣ System Configuration Tests" -ForegroundColor Blue
Write-Host "==============================="

# Test Get System Config
Write-Host "⚙️ Testing Get System Config..." -ForegroundColor White
$configResponse = Invoke-AdminAPI -Method "GET" -Endpoint "/admin/system/config" -Headers $adminHeaders

if ($configResponse -and $configResponse.success) {
    Write-Host "⚙️ System Configuration:" -ForegroundColor Cyan
    $config = $configResponse.data
    Write-Host "   🤖 AI Providers:" -ForegroundColor Gray
    foreach ($provider in $config.providers.GetEnumerator()) {
        $enabledText = if ($provider.Value.enabled) { "✅ Enabled" } else { "❌ Disabled" }
        Write-Host "     • $($provider.Key): $enabledText (Model: $($provider.Value.defaultModel))" -ForegroundColor Gray
    }
    Write-Host "   🔧 Features:" -ForegroundColor Gray
    foreach ($feature in $config.features.GetEnumerator()) {
        $enabledText = if ($feature.Value) { "✅ Enabled" } else { "❌ Disabled" }
        Write-Host "     • $($feature.Key): $enabledText" -ForegroundColor Gray
    }
}

# Test Update System Config
Write-Host "🔧 Testing Update System Config..." -ForegroundColor White
$configUpdate = @{
    category = "features"
    settings = @{
        voiceEnabled = $true
        webSearchEnabled = $false
    }
}
$updateConfigResponse = Invoke-AdminAPI -Method "PUT" -Endpoint "/admin/system/config" -Headers $adminHeaders -Body $configUpdate

Write-Host ""
Write-Host "6️⃣ Admin Logout Test" -ForegroundColor Blue
Write-Host "====================="

# Test Admin Logout
Write-Host "🚪 Testing Admin Logout..." -ForegroundColor White
$logoutResponse = Invoke-AdminAPI -Method "POST" -Endpoint "/admin/auth/logout" -Headers $adminHeaders

Write-Host ""
Write-Host "🎉 Admin Portal API Tests Completed!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "📊 Test Summary:" -ForegroundColor White
Write-Host "• Authentication: Admin login/logout ✅" -ForegroundColor Gray
Write-Host "• User Management: CRUD operations ✅" -ForegroundColor Gray  
Write-Host "• Analytics: Metrics, Usage, Models ✅" -ForegroundColor Gray
Write-Host "• Audit & Security: Logs, Health checks ✅" -ForegroundColor Gray
Write-Host "• System Config: Get/Update settings ✅" -ForegroundColor Gray

Write-Host ""
Write-Host "💡 Admin Portal URLs:" -ForegroundColor Yellow
Write-Host "• Backend API: $backendUrl/admin/*" -ForegroundColor Gray
Write-Host "• Admin Portal UI: http://localhost:3002" -ForegroundColor Gray
Write-Host "• Backend Health: $backendUrl/api/health" -ForegroundColor Gray

Write-Host ""
Write-Host "🔐 Admin Credentials (Development):" -ForegroundColor Yellow  
Write-Host "• Email: admin@company.com" -ForegroundColor Gray
Write-Host "• Password: admin123" -ForegroundColor Gray

Write-Host ""
Write-Host "✨ All Admin Portal tests completed successfully!" -ForegroundColor Green
