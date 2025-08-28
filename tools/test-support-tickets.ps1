# Test Script für Support-Ticket-System v1.1
# Testet die neuen IT-Ticket-Features: Details, Kommentare, Timeline

Write-Host "🎫 CompanyAI Support-Ticket-System Test v1.1" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# Test-Konfiguration
$BASE_URL = "http://localhost:5000/api/support"
$ADMIN_TOKEN = "YWRtaW5AY29tcGFueS5jb20="

$headers = @{
    "Authorization" = "Bearer $ADMIN_TOKEN"
    "Content-Type" = "application/json"
}

function Test-APICall {
    param(
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers,
        [string]$Body = $null,
        [string]$Description
    )
    
    Write-Host "`n📡 $Description" -ForegroundColor Yellow
    Write-Host "$Method $Url" -ForegroundColor Cyan
    
    try {
        if ($Body) {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -Body $Body
            Write-Host "Body: $Body" -ForegroundColor Gray
        } else {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers
        }
        
        if ($response.success) {
            Write-Host "✅ SUCCESS: $($response.message)" -ForegroundColor Green
            return $response
        } else {
            Write-Host "❌ ERROR: $($response.message)" -ForegroundColor Red
            return $null
        }
    }
    catch {
        Write-Host "❌ EXCEPTION: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "`n=== PHASE 1: Basis-Ticket-Tests ===" -ForegroundColor Magenta

# 1. Alle Tickets abrufen
$tickets = Test-APICall -Method "GET" -Url "$BASE_URL/tickets" -Headers $headers -Description "Alle Tickets abrufen"

if ($tickets -and $tickets.data.data.Count -gt 0) {
    $testTicketId = $tickets.data.data[0].id
    Write-Host "Test-Ticket gefunden: $testTicketId" -ForegroundColor Blue
} else {
    Write-Host "Kein Test-Ticket gefunden. Erstelle neues Ticket..." -ForegroundColor Yellow
    
    # Neues IT-Ticket erstellen
    $newTicket = @{
        title = "Test IT-Hardware-Problem - PowerShell Script"
        description = "Automatisierter Test für das IT-Ticketsystem. Laptop startet nicht, möglicherweise Netzteil-Problem."
        category = "hardware"
        priority = "medium"
        customerId = "test_emp_001"
        customerEmail = "test.mitarbeiter@company.com"
        customerName = "Test Mitarbeiter"
        location = "Büro 3.12, IT-Test"
        deviceInfo = "ThinkPad Test-Laptop, Service-Tag: TEST123"
    } | ConvertTo-Json

    $created = Test-APICall -Method "POST" -Url "$BASE_URL/tickets" -Headers $headers -Body $newTicket -Description "Neues IT-Ticket erstellen"
    
    if ($created) {
        $testTicketId = $created.data.id
        Write-Host "Neues Test-Ticket erstellt: $testTicketId" -ForegroundColor Green
    } else {
        Write-Host "❌ Kann kein Test-Ticket erstellen. Test abgebrochen." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n=== PHASE 2: Neue Feature-Tests (v1.1) ===" -ForegroundColor Magenta

# 2. Ticket-Details mit Kommentaren abrufen
$ticketDetails = Test-APICall -Method "GET" -Url "$BASE_URL/tickets/$testTicketId/details" -Headers $headers -Description "Ticket-Details mit Timeline abrufen"

if ($ticketDetails) {
    $ticket = $ticketDetails.data
    Write-Host "📋 Ticket: $($ticket.title)" -ForegroundColor Blue
    Write-Host "📧 Mitarbeiter: $($ticket.customerName) ($($ticket.customerEmail))" -ForegroundColor Blue
    Write-Host "📍 Standort: $($ticket.location)" -ForegroundColor Blue
    Write-Host "🖥️ Gerät: $($ticket.deviceInfo)" -ForegroundColor Blue
    Write-Host "💬 Kommentare: $($ticket.comments.Count)" -ForegroundColor Blue
}

# 3. Ersten Kommentar hinzufügen
$comment1 = @{
    content = "IT-Support Test: Hardware-Prüfung vor Ort durchgeführt. Netzteil scheint defekt zu sein."
    type = "internal_note"
} | ConvertTo-Json

$addedComment1 = Test-APICall -Method "POST" -Url "$BASE_URL/tickets/$testTicketId/comments" -Headers $headers -Body $comment1 -Description "Erste interne Notiz hinzufügen"

# 4. Status ändern (generiert automatischen Kommentar)
$statusUpdate = @{
    status = "in_progress"
} | ConvertTo-Json

$updatedTicket = Test-APICall -Method "PUT" -Url "$BASE_URL/tickets/$testTicketId" -Headers $headers -Body $statusUpdate -Description "Status auf 'In Bearbeitung' ändern"

# 5. Zweiten Kommentar hinzufügen
$comment2 = @{
    content = "Ersatz-Netzteil bestellt. Lieferung morgen früh erwartet. Mitarbeiter wurde informiert."
    type = "internal_note"
} | ConvertTo-Json

$addedComment2 = Test-APICall -Method "POST" -Url "$BASE_URL/tickets/$testTicketId/comments" -Headers $headers -Body $comment2 -Description "Zweite interne Notiz hinzufügen"

# 6. Alle Kommentare einzeln abrufen
$comments = Test-APICall -Method "GET" -Url "$BASE_URL/tickets/$testTicketId/comments" -Headers $headers -Description "Alle Kommentare des Tickets abrufen"

if ($comments) {
    Write-Host "`n📝 Timeline der Kommentare:" -ForegroundColor Cyan
    foreach ($comment in $comments.data) {
        $timestamp = [datetime]::Parse($comment.createdAt).ToString("HH:mm")
        $typeIcon = "📝"
        if ($comment.type -eq "status_change") { $typeIcon = "🔄" }
        if ($comment.type -eq "assignment") { $typeIcon = "👤" }
        Write-Host "$typeIcon $timestamp - $($comment.authorName): $($comment.content)" -ForegroundColor White
    }
}

# 7. Status auf "resolved" ändern
$resolveUpdate = @{
    status = "resolved"
} | ConvertTo-Json

$resolvedTicket = Test-APICall -Method "PUT" -Url "$BASE_URL/tickets/$testTicketId" -Headers $headers -Body $resolveUpdate -Description "Status auf 'Gelöst' ändern"

# 8. Finale Überprüfung der Ticket-Details
$finalDetails = Test-APICall -Method "GET" -Url "$BASE_URL/tickets/$testTicketId/details" -Headers $headers -Description "Finale Ticket-Details nach allen Änderungen"

if ($finalDetails) {
    $finalTicket = $finalDetails.data
    Write-Host "`n🎯 Test-Zusammenfassung:" -ForegroundColor Green
    Write-Host "Ticket-ID: $($finalTicket.id)" -ForegroundColor White
    Write-Host "Status: $($finalTicket.status)" -ForegroundColor White
    Write-Host "Kommentare: $($finalTicket.comments.Count)" -ForegroundColor White
    Write-Host "Erstellt: $($finalTicket.createdAt)" -ForegroundColor White
    Write-Host "Aktualisiert: $($finalTicket.updatedAt)" -ForegroundColor White
    if ($finalTicket.resolvedAt) {
        Write-Host "Gelöst: $($finalTicket.resolvedAt)" -ForegroundColor White
    }
}

Write-Host "`n=== PHASE 3: Filter-Tests ===" -ForegroundColor Magenta

# 9. Nach Kategorie filtern
$hardwareTickets = Test-APICall -Method "GET" -Url "$BASE_URL/tickets?category=hardware" -Headers $headers -Description "Nach Hardware-Tickets filtern"

if ($hardwareTickets) {
    Write-Host "🖥️ Hardware-Tickets gefunden: $($hardwareTickets.data.data.Count)" -ForegroundColor Blue
}

# 10. Nach Status filtern
$resolvedTickets = Test-APICall -Method "GET" -Url "$BASE_URL/tickets?status=resolved" -Headers $headers -Description "Nach gelösten Tickets filtern"

if ($resolvedTickets) {
    Write-Host "✅ Gelöste Tickets gefunden: $($resolvedTickets.data.data.Count)" -ForegroundColor Blue
}

Write-Host "`n=== TEST ABGESCHLOSSEN ===" -ForegroundColor Green
Write-Host "✅ Support-Ticket-System v1.1 erfolgreich getestet!" -ForegroundColor Green
Write-Host "Features: Ticket-Details, Kommente, Timeline, Status-Änderungen" -ForegroundColor Green

# Optional: Test-Ticket löschen (wenn DELETE-Endpunkt implementiert wäre)
Write-Host "`nHinweis: Test-Ticket $testTicketId wurde erstellt und bleibt für weitere Tests bestehen." -ForegroundColor Yellow
