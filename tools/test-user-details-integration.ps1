# Test Script für user_details.txt Integration
# Tests ob Schema-basierte Zusatzinformationen in user_details.txt geschrieben werden

param(
    [string]$BaseUrl = "http://localhost:5000",
    [string]$TestToken = "aHIubWFuYWdlckBjb21wYW55LmNvbQ==",
    [string]$TestEmployeeId = "emp_001"
)

Write-Host "[TEST] user_details.txt Integration Test" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host "Employee ID: $TestEmployeeId" -ForegroundColor Gray
Write-Host ""

# Headers
$headers = @{
    "Authorization" = "Bearer $TestToken"
    "Content-Type" = "application/json"
}

function Test-ApiCall {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Body = $null
    )
    
    Write-Host "[STEP] $Name" -ForegroundColor Yellow
    
    try {
        $uri = "$BaseUrl$Endpoint"
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $headers
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 3)
        }
        
        $response = Invoke-RestMethod @params
        
        if ($response.success) {
            Write-Host "   [SUCCESS] $($response.message)" -ForegroundColor Green
            return $response
        } else {
            Write-Host "   [ERROR] $($response.message)" -ForegroundColor Red
            return $null
        }
    }
    catch {
        Write-Host "   [EXCEPTION] $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "[PHASE 1] Test Backend Connection" -ForegroundColor Magenta
Write-Host ""

# 1. Teste Backend Connection
try {
    $healthResponse = Invoke-RestMethod -Uri "$BaseUrl/api/health" -Method GET
    Write-Host "[SUCCESS] Backend is running: $($healthResponse.message)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Backend not reachable: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[PHASE 2] Test Schema APIs" -ForegroundColor Magenta
Write-Host ""

# 2. Teste Schema APIs
$schemas = Test-ApiCall "Get All Field Schemas" "GET" "/api/hr/field-schemas"
$categories = Test-ApiCall "Get Schema Categories" "GET" "/api/hr/field-schemas/categories"

# 3. Erstelle Test-Schema falls nicht existiert
$testSchemaBody = @{
    name = "Test UserDetails Integration"
    type = "text"
    category = "Test"
    required = $false
    defaultValue = "Test Value"
}

$testSchema = Test-ApiCall "Create Test Schema" "POST" "/api/hr/field-schemas" $testSchemaBody
$testSchemaId = if ($testSchema -and $testSchema.data) { $testSchema.data.id } else { $null }

Write-Host ""
Write-Host "[PHASE 3] Test User Values" -ForegroundColor Magenta
Write-Host ""

# 4. Lade aktuelle Additional Info
$additionalInfo = Test-ApiCall "Get Employee Additional Info" "GET" "/api/hr/employees/$TestEmployeeId/additional-info"

# 5. Setze Test-Wert
if ($testSchemaId) {
    $setValueBody = @{
        values = @(
            @{
                schemaId = $testSchemaId
                value = "Integration Test Wert $(Get-Date -Format 'HH:mm:ss')"
            }
        )
    }
    
    $setValueResult = Test-ApiCall "Set Test Value" "PUT" "/api/hr/employees/$TestEmployeeId/additional-info" $setValueBody
    
    Write-Host ""
    Write-Host "[PHASE 4] Test user_details.txt Update" -ForegroundColor Magenta
    Write-Host ""
    
    # 6. Manuell user_details.txt aktualisieren
    $updateDetailsResult = Test-ApiCall "Update user_details.txt File" "PUT" "/api/hr/employees/$TestEmployeeId/details-file"
    
    if ($updateDetailsResult) {
        Write-Host ""
        Write-Host "[SUCCESS] user_details.txt Integration seems to be working!" -ForegroundColor Green
        Write-Host "[INFO] Check the file at: C:\Code\Company_Allg_Data\HR_Module\{UserName}\user_details.txt" -ForegroundColor Cyan
    }
    
    # 7. Cleanup - Test Schema löschen
    Write-Host ""
    Write-Host "[CLEANUP] Removing test schema..." -ForegroundColor Yellow
    Test-ApiCall "Delete Test Schema" "DELETE" "/api/hr/field-schemas/$testSchemaId"
}

Write-Host ""
Write-Host "[COMPLETED] Integration Test finished!" -ForegroundColor Green
Write-Host ""
Write-Host "[NEXT STEPS]" -ForegroundColor Cyan
Write-Host "1. Check if user_details.txt file was updated"
Write-Host "2. Create schema in Frontend and set value"
Write-Host "3. Check if file gets updated automatically"
