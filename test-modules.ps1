# CompanyAI Module Test Script
# Testet die modulbasierte API-Struktur

Write-Host "🚀 CompanyAI Module Tests" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green

$baseUrl = "http://localhost:5000"
$adminToken = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("admin@company.com"))
$hrToken = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("hr.manager@company.com"))

Write-Host "`n1. Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET
    Write-Host "✅ Backend läuft - Module verfügbar: $($health.modules -join ', ')" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend nicht erreichbar. Bitte starten Sie das Backend mit 'npm run dev'" -ForegroundColor Red
    exit 1
}

Write-Host "`n2. API Übersicht..." -ForegroundColor Yellow
try {
    $api = Invoke-RestMethod -Uri "$baseUrl/api/hello" -Method GET
    Write-Host "✅ Verfügbare Module:" -ForegroundColor Green
    foreach ($module in $api.availableModules.PSObject.Properties) {
        Write-Host "   - $($module.Name): $($module.Value.description)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ API-Übersicht nicht verfügbar" -ForegroundColor Red
}

Write-Host "`n3. Authentifizierung Info..." -ForegroundColor Yellow
try {
    $auth = Invoke-RestMethod -Uri "$baseUrl/api/auth/info" -Method GET
    Write-Host "✅ Authentifizierung verfügbar" -ForegroundColor Green
    Write-Host "   Admin Token: $($auth.testTokens.admin)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Auth-Info nicht verfügbar" -ForegroundColor Red
}

Write-Host "`n4. HR-Modul Tests..." -ForegroundColor Yellow

# HR: Mitarbeiter auflisten
try {
    $headers = @{ Authorization = "Bearer $hrToken" }
    $employees = Invoke-RestMethod -Uri "$baseUrl/api/hr/employees" -Method GET -Headers $headers
    Write-Host "✅ HR: Mitarbeiter geladen ($($employees.data.data.Count) gefunden)" -ForegroundColor Green
} catch {
    Write-Host "❌ HR: Fehler beim Laden der Mitarbeiter" -ForegroundColor Red
    Write-Host "   Fehler: $($_.Exception.Message)" -ForegroundColor Red
}

# HR: Neuen Mitarbeiter erstellen
try {
    $newEmployee = @{
        firstName = "Test"
        lastName = "Mitarbeiter"
        email = "test@company.com"
        department = "IT"
        position = "Test Developer"
        startDate = (Get-Date).ToString("yyyy-MM-dd")
        status = "active"
    }
    $headers = @{ 
        Authorization = "Bearer $hrToken"
        "Content-Type" = "application/json"
    }
    $created = Invoke-RestMethod -Uri "$baseUrl/api/hr/employees" -Method POST -Headers $headers -Body ($newEmployee | ConvertTo-Json)
    Write-Host "✅ HR: Neuer Mitarbeiter erstellt (ID: $($created.data.id))" -ForegroundColor Green
} catch {
    Write-Host "❌ HR: Fehler beim Erstellen des Mitarbeiters" -ForegroundColor Red
}

# HR: Onboarding-Plan erstellen
try {
    $onboardingPlan = @{
        employeeId = "emp_test_001"
        department = "IT"
        position = "Developer"
        customTasks = @(
            @{
                title = "Git-Setup"
                description = "Repository-Zugang einrichten"
                category = "equipment"
            }
        )
    }
    $created = Invoke-RestMethod -Uri "$baseUrl/api/hr/onboarding/plans" -Method POST -Headers $headers -Body ($onboardingPlan | ConvertTo-Json -Depth 3)
    Write-Host "✅ HR: Onboarding-Plan erstellt ($($created.data.tasks.Count) Aufgaben)" -ForegroundColor Green
} catch {
    Write-Host "❌ HR: Fehler beim Erstellen des Onboarding-Plans" -ForegroundColor Red
}

# HR: Statistiken abrufen
try {
    $stats = Invoke-RestMethod -Uri "$baseUrl/api/hr/stats" -Method GET -Headers $headers
    Write-Host "✅ HR: Statistiken geladen (Total: $($stats.data.totalEmployees))" -ForegroundColor Green
} catch {
    Write-Host "❌ HR: Fehler beim Laden der Statistiken" -ForegroundColor Red
}

Write-Host "`n5. Support-Modul Tests..." -ForegroundColor Yellow

# Support: Ticket erstellen
try {
    $newTicket = @{
        title = "Test Ticket"
        description = "Dies ist ein Test-Support-Ticket"
        category = "technical"
        priority = "medium"
        customerId = "test_customer_001"
        customerEmail = "test@kunde.de"
    }
    $headers = @{ 
        Authorization = "Bearer $adminToken"
        "Content-Type" = "application/json"
    }
    $created = Invoke-RestMethod -Uri "$baseUrl/api/support/tickets" -Method POST -Headers $headers -Body ($newTicket | ConvertTo-Json)
    Write-Host "✅ Support: Ticket erstellt (ID: $($created.data.id))" -ForegroundColor Green
    
    # Ticket aktualisieren
    $update = @{
        status = "in_progress"
        assignedTo = "support@company.com"
    }
    $updated = Invoke-RestMethod -Uri "$baseUrl/api/support/tickets/$($created.data.id)" -Method PUT -Headers $headers -Body ($update | ConvertTo-Json)
    Write-Host "✅ Support: Ticket aktualisiert (Status: $($updated.data.status))" -ForegroundColor Green
} catch {
    Write-Host "❌ Support: Fehler beim Ticket-Management" -ForegroundColor Red
}

# Support: Tickets auflisten
try {
    $tickets = Invoke-RestMethod -Uri "$baseUrl/api/support/tickets" -Method GET -Headers $headers
    Write-Host "✅ Support: Tickets geladen ($($tickets.data.data.Count) gefunden)" -ForegroundColor Green
} catch {
    Write-Host "❌ Support: Fehler beim Laden der Tickets" -ForegroundColor Red
}

Write-Host "`n🎉 Module Tests abgeschlossen!" -ForegroundColor Green
Write-Host "`nWeitere Tests:" -ForegroundColor Yellow
Write-Host "- Öffnen Sie http://localhost:5000/api/hello für API-Dokumentation" -ForegroundColor Cyan
Write-Host "- Verwenden Sie Postman oder curl für detaillierte Tests" -ForegroundColor Cyan
Write-Host "- Backend-Logs zeigen alle API-Aufrufe und Authentifizierungs-Events" -ForegroundColor Cyan
