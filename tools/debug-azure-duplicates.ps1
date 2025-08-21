# Debug Azure AD Duplicates

Write-Host "Debugging Azure AD Duplicates..." -ForegroundColor Cyan

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

# Test separate user sources
Write-Host "`nTesting separate user sources..." -ForegroundColor Yellow

try {
    # Manual Users
    $manualResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users?provider=manual&limit=1000" -Method GET -Headers $headers
    Write-Host "Manual Users: $($manualResponse.data.users.length)" -ForegroundColor Green
    
    # Azure AD Users 
    $azureResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users?provider=azure-ad&limit=1000" -Method GET -Headers $headers
    Write-Host "Azure AD Users: $($azureResponse.data.users.length)" -ForegroundColor Yellow
    
    # Main Admin Users
    $mainResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users?provider=main&limit=1000" -Method GET -Headers $headers
    Write-Host "Main Admin Users: $($mainResponse.data.users.length)" -ForegroundColor Green
    
    # Bulk Users
    $bulkResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users?provider=bulk&limit=1000" -Method GET -Headers $headers  
    Write-Host "Bulk Users: $($bulkResponse.data.users.length)" -ForegroundColor Green
    
    # LDAP Users
    $ldapResponse = Invoke-RestMethod -Uri "$adminApiUrl/api/admin/users?provider=ldap&limit=1000" -Method GET -Headers $headers
    Write-Host "LDAP Users: $($ldapResponse.data.users.length)" -ForegroundColor Green
    
    Write-Host "`nTotal calculation: $($manualResponse.data.users.length + $azureResponse.data.users.length + $mainResponse.data.users.length + $bulkResponse.data.users.length + $ldapResponse.data.users.length)" -ForegroundColor Cyan
    
    # Check for duplicates in Azure AD
    if ($azureResponse.data.users.length -gt 0) {
        Write-Host "`nChecking Azure AD for duplicates..." -ForegroundColor Yellow
        
        $azureUsers = $azureResponse.data.users
        $uniqueEmails = @()
        $duplicateEmails = @()
        
        foreach ($user in $azureUsers) {
            if ($uniqueEmails -contains $user.email) {
                $duplicateEmails += $user.email
            } else {
                $uniqueEmails += $user.email
            }
        }
        
        Write-Host "Unique Azure emails: $($uniqueEmails.length)" -ForegroundColor Green
        Write-Host "Total Azure users: $($azureUsers.length)" -ForegroundColor Yellow
        
        if ($duplicateEmails.length -gt 0) {
            Write-Host "FOUND DUPLICATES: $($duplicateEmails.length)" -ForegroundColor Red
            Write-Host "Duplicate emails: $($duplicateEmails[0..4] -join ', ')..." -ForegroundColor Red
        } else {
            Write-Host "No email duplicates found in Azure AD" -ForegroundColor Green
        }
    }

} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nAnalysis complete!" -ForegroundColor Green
