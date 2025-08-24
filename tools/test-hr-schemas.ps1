# PowerShell Test Script für HR Schema-basierte Zusatzinformationen
# Tests das neue 2-Ebenen-System: Global Schemas + Individual Values

param(
    [string]$BaseUrl = "http://localhost:5000",
    [string]$TestToken = "aHIubWFuYWdlckBjb21wYW55LmNvbQ=="
)

Write-Host "[TEST] HR Schema-basierte Zusatzinformationen - API Tests" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "Base URL: $BaseUrl" -ForegroundColor Gray
Write-Host ""

# Headers
$headers = @{
    "Authorization" = "Bearer $TestToken"
    "Content-Type" = "application/json"
}

# Test Employee ID (ersetze mit gültiger ID)
$testEmployeeId = "emp_001"

# Test Helper Function
function Test-ApiCall {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Endpoint,
        [hashtable]$Body = $null
    )
    
    Write-Host "[TEST] $Name" -ForegroundColor Yellow
    Write-Host "   $Method $Endpoint" -ForegroundColor Gray
    
    try {
        $uri = "$BaseUrl$Endpoint"
        $params = @{
            Uri = $uri
            Method = $Method
            Headers = $headers
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 3)
            Write-Host "   Body: $($params.Body)" -ForegroundColor Gray
        }
        
        $response = Invoke-RestMethod @params
        
        if ($response.success) {
            Write-Host "   [SUCCESS] $($response.message)" -ForegroundColor Green
            if ($response.data -and $response.data.GetType().Name -eq "Object[]") {
                Write-Host "   [DATA] $($response.data.Count) items" -ForegroundColor Gray
            } elseif ($response.data) {
                Write-Host "   [DATA] Properties available" -ForegroundColor Gray
            }
        } else {
            Write-Host "   [ERROR] $($response.message)" -ForegroundColor Red
        }
        
        return $response
    } catch {
        Write-Host "   [EXCEPTION] $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
    
    Write-Host ""
}

Write-Host "[SECTION] FIELD SCHEMAS MANAGEMENT (GLOBAL)" -ForegroundColor Magenta
Write-Host ""

# 1. Get all schemas
$schemas = Test-ApiCall "Get All Field Schemas" "GET" "/api/hr/field-schemas"

# 2. Get categories
$categories = Test-ApiCall "Get Schema Categories" "GET" "/api/hr/field-schemas/categories"

# 3. Create new schema
$newSchemaBody = @{
    name = "Test Gehalt PowerShell"
    type = "number"
    category = "Finanzen"
    unit = "EUR"
    required = $false
    defaultValue = "50000"
}
$newSchema = Test-ApiCall "Create New Schema" "POST" "/api/hr/field-schemas" $newSchemaBody

# Store schema ID for later tests
$createdSchemaId = if ($newSchema -and $newSchema.data) { $newSchema.data.id } else { $null }

# 4. Update schema (if created successfully)
if ($createdSchemaId) {
    $updateSchemaBody = @{
        name = "Test Gehalt PowerShell (Updated)"
        unit = "Euro"
        required = $true
    }
    Test-ApiCall "Update Schema" "PUT" "/api/hr/field-schemas/$createdSchemaId" $updateSchemaBody
}

Write-Host "[SECTION] USER VALUES MANAGEMENT (INDIVIDUAL)" -ForegroundColor Magenta
Write-Host ""

# 5. Get employee additional info
$additionalInfo = Test-ApiCall "Get Employee Additional Info" "GET" "/api/hr/employees/$testEmployeeId/additional-info"

# 6. Update employee values
if ($additionalInfo -and $additionalInfo.data -and $additionalInfo.data.Count -gt 0) {
    # Use first available schema for test
    $testSchemaId = $additionalInfo.data[0].schema.id
    
    $updateValuesBody = @{
        values = @(
            @{
                schemaId = $testSchemaId
                value = "75000"
            }
        )
    }
    
    if ($createdSchemaId) {
        # Also set value for our created schema
        $updateValuesBody.values += @{
            schemaId = $createdSchemaId
            value = "60000"
        }
    }
    
    Test-ApiCall "Update Employee Values" "PUT" "/api/hr/employees/$testEmployeeId/additional-info" $updateValuesBody
}

Write-Host "[SECTION] STATISTICS" -ForegroundColor Magenta
Write-Host ""

# 7. Get statistics
Test-ApiCall "Get Additional Info Stats" "GET" "/api/hr/additional-info/stats"

Write-Host "[SECTION] CLEANUP" -ForegroundColor Magenta
Write-Host ""

# 8. Delete created schema
if ($createdSchemaId) {
    Test-ApiCall "Delete Created Schema" "DELETE" "/api/hr/field-schemas/$createdSchemaId"
}

Write-Host "[DONE] TESTS COMPLETED" -ForegroundColor Green
Write-Host ""

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Admin: Use 'Zusätzliche Informationen' button to manage schemas"
Write-Host "2. HR User: Use 'Bearbeiten' button per employee to set values"
Write-Host "3. System automatically syncs schemas to all employees"
Write-Host ""

# Test verschiedene Field Types
Write-Host "[SECTION] FIELD TYPES TESTS" -ForegroundColor Magenta
Write-Host ""

# Test Boolean Field
$booleanSchemaBody = @{
    name = "Test Führerschein"
    type = "boolean"
    category = "Personal"
    required = $false
    defaultValue = "false"
}
$booleanSchema = Test-ApiCall "Create Boolean Schema" "POST" "/api/hr/field-schemas" $booleanSchemaBody
$booleanSchemaId = if ($booleanSchema -and $booleanSchema.data) { $booleanSchema.data.id } else { $null }

# Test Date Field
$dateSchemaBody = @{
    name = "Test Einstellungsdatum"
    type = "date"
    category = "HR"
    required = $false
}
$dateSchema = Test-ApiCall "Create Date Schema" "POST" "/api/hr/field-schemas" $dateSchemaBody
$dateSchemaId = if ($dateSchema -and $dateSchema.data) { $dateSchema.data.id } else { $null }

# Test Select Field
$selectSchemaBody = @{
    name = "Test Arbeitsmodell"
    type = "select"
    category = "HR"
    required = $false
    selectOptions = @("Remote", "Hybrid", "Office", "Flexibel")
    defaultValue = "Hybrid"
}
$selectSchema = Test-ApiCall "Create Select Schema" "POST" "/api/hr/field-schemas" $selectSchemaBody
$selectSchemaId = if ($selectSchema -and $selectSchema.data) { $selectSchema.data.id } else { $null }

# Test with different value types
if ($booleanSchemaId -or $dateSchemaId -or $selectSchemaId) {
    Write-Host "Testing different field type values..." -ForegroundColor Yellow
    
    $mixedValuesBody = @{
        values = @()
    }
    
    if ($booleanSchemaId) {
        $mixedValuesBody.values += @{
            schemaId = $booleanSchemaId
            value = "true"
        }
    }
    
    if ($dateSchemaId) {
        $mixedValuesBody.values += @{
            schemaId = $dateSchemaId
            value = "2024-01-15"
        }
    }
    
    if ($selectSchemaId) {
        $mixedValuesBody.values += @{
            schemaId = $selectSchemaId
            value = "Remote"
        }
    }
    
    Test-ApiCall "Set Mixed Field Type Values" "PUT" "/api/hr/employees/$testEmployeeId/additional-info" $mixedValuesBody
}

# Cleanup test schemas
Write-Host "Cleaning up test schemas..." -ForegroundColor Yellow
if ($booleanSchemaId) { 
    Test-ApiCall "Delete Boolean Schema" "DELETE" "/api/hr/field-schemas/$booleanSchemaId"
}
if ($dateSchemaId) { 
    Test-ApiCall "Delete Date Schema" "DELETE" "/api/hr/field-schemas/$dateSchemaId"
}
if ($selectSchemaId) { 
    Test-ApiCall "Delete Select Schema" "DELETE" "/api/hr/field-schemas/$selectSchemaId"
}

Write-Host "[COMPLETED] All tests finished successfully!" -ForegroundColor Green