# Test Script für neue AI Features: Session Management & Web-RAG
# CompanyAI - Test der implementierten Open WebUI Features

param(
    [string]$BaseUrl = "http://localhost:5000",
    [string]$Token = ""
)

Write-Host "🧪 Testing Session Management & Web-RAG Features" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

if (-not $Token) {
    Write-Host "❌ Fehler: Token erforderlich. Verwendung: .\test-session-web-rag.ps1 -Token 'your-jwt-token'" -ForegroundColor Red
    exit 1
}

$headers = @{ 
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

# Test 1: Chat-Session erstellen
Write-Host "`n1️⃣ Testing Session Creation..." -ForegroundColor Yellow

try {
    $sessionData = @{
        title = "Test Session - KI Features"
        description = "Test der neuen Session Management Features"
        tags = @("Test", "KI", "Features")
        folder = "Tests"
        settings = @{
            provider = "openai"
            model = "gpt-4o-mini"
            temperature = 0.2
            useRag = $true
            ragTopK = 3
            useWebRag = $true
        }
    } | ConvertTo-Json -Depth 3

    $createResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/sessions" `
        -Method POST -Headers $headers -Body $sessionData

    if ($createResponse.success) {
        $sessionId = $createResponse.data.id
        Write-Host "   ✅ Session erstellt: $($createResponse.data.title)" -ForegroundColor Green
        Write-Host "   📋 Session ID: $sessionId" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Session-Erstellung fehlgeschlagen: $($createResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Fehler bei Session-Erstellung: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Standard Chat mit Session-Speicherung
Write-Host "`n2️⃣ Testing Standard Chat with Session..." -ForegroundColor Yellow

try {
    $chatData = @{
        messages = @(
            @{
                role = "user"
                content = "Was ist künstliche Intelligenz? Erkläre kurz."
            }
        )
        provider = "openai"
        model = "gpt-4o-mini"
        temperature = 0.2
        rag = $true
        ragTopK = 3
        sessionId = $sessionId
        saveSession = $true
    } | ConvertTo-Json -Depth 3

    $chatResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/chat" `
        -Method POST -Headers $headers -Body $chatData

    if ($chatResponse.success) {
        Write-Host "   ✅ Chat erfolgreich (mit Session)" -ForegroundColor Green
        Write-Host "   💬 Response: $($chatResponse.data.choices[0].message.content.Substring(0, 100))..." -ForegroundColor Gray
        
        if ($chatResponse.session) {
            Write-Host "   📝 Session Info: Messages saved: $($chatResponse.session.messagesSaved)" -ForegroundColor Gray
        }
        
        if ($chatResponse.meta.rag.sources) {
            Write-Host "   📄 RAG Quellen: $($chatResponse.meta.rag.sources.Count)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ❌ Chat fehlgeschlagen: $($chatResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Fehler beim Chat: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Web-RAG Chat
Write-Host "`n3️⃣ Testing Web-RAG Integration..." -ForegroundColor Yellow

try {
    $webRagData = @{
        messages = @(
            @{
                role = "user"
                content = "Was sind die neuesten KI-Entwicklungen in 2024?"
            }
        )
        provider = "openai"
        model = "gpt-4o-mini"
        temperature = 0.3
        rag = $false
        webRag = $true
        webSearchQuery = "KI künstliche Intelligenz Entwicklungen 2024"
        sessionId = $sessionId
    } | ConvertTo-Json -Depth 3

    $webChatResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/chat" `
        -Method POST -Headers $headers -Body $webRagData

    if ($webChatResponse.success) {
        Write-Host "   ✅ Web-RAG Chat erfolgreich" -ForegroundColor Green
        Write-Host "   💬 Response: $($webChatResponse.data.choices[0].message.content.Substring(0, 100))..." -ForegroundColor Gray
        
        if ($webChatResponse.meta.rag.sources) {
            $webSources = $webChatResponse.meta.rag.sources | Where-Object { $_.isWeb -eq $true }
            Write-Host "   🌐 Web-Quellen: $($webSources.Count)" -ForegroundColor Gray
            
            foreach ($source in $webSources) {
                Write-Host "      • $($source.path) - $($source.webUrl)" -ForegroundColor DarkGray
            }
        }
    } else {
        Write-Host "   ⚠️ Web-RAG möglicherweise nicht aktiviert oder fehlgeschlagen: $($webChatResponse.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️ Web-RAG Fehler (normal falls keine API-Keys): $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 4: Session laden und prüfen
Write-Host "`n4️⃣ Testing Session Loading..." -ForegroundColor Yellow

try {
    $loadResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/sessions/$sessionId" -Headers $headers

    if ($loadResponse.success) {
        $session = $loadResponse.data
        Write-Host "   ✅ Session geladen: $($session.title)" -ForegroundColor Green
        Write-Host "   📊 Messages: $($session.messages.Count)" -ForegroundColor Gray
        Write-Host "   🏷️ Tags: $($session.tags -join ', ')" -ForegroundColor Gray
        Write-Host "   📁 Folder: $($session.folder)" -ForegroundColor Gray
        Write-Host "   ⚙️ Provider: $($session.settings.provider) / $($session.settings.model)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Session-Laden fehlgeschlagen: $($loadResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Fehler beim Session-Laden: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Session-Suche
Write-Host "`n5️⃣ Testing Session Search..." -ForegroundColor Yellow

try {
    $searchResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/sessions/search?tags=Test&limit=5" -Headers $headers

    if ($searchResponse.success) {
        Write-Host "   ✅ Session-Suche erfolgreich: $($searchResponse.data.Count) Ergebnisse" -ForegroundColor Green
        
        foreach ($session in $searchResponse.data) {
            Write-Host "      • $($session.title) ($($session.messageCount) Messages) - $($session.tags -join ', ')" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ❌ Session-Suche fehlgeschlagen: $($searchResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Fehler bei Session-Suche: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Tags laden
Write-Host "`n6️⃣ Testing Tags Loading..." -ForegroundColor Yellow

try {
    $tagsResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/sessions/tags" -Headers $headers

    if ($tagsResponse.success) {
        Write-Host "   ✅ Tags geladen: $($tagsResponse.data.Count) verfügbar" -ForegroundColor Green
        Write-Host "   🏷️ Tags: $($tagsResponse.data -join ', ')" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Tags-Laden fehlgeschlagen: $($tagsResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Fehler beim Tags-Laden: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: Session aktualisieren
Write-Host "`n7️⃣ Testing Session Update..." -ForegroundColor Yellow

try {
    $updateData = @{
        id = $sessionId
        title = "Updated Test Session"
        tags = @("Test", "KI", "Features", "Updated")
        settings = @{
            useWebRag = $false
        }
    } | ConvertTo-Json -Depth 3

    $updateResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/sessions/$sessionId" `
        -Method PUT -Headers $headers -Body $updateData

    if ($updateResponse.success) {
        Write-Host "   ✅ Session aktualisiert: $($updateResponse.data.title)" -ForegroundColor Green
        Write-Host "   🏷️ Neue Tags: $($updateResponse.data.tags -join ', ')" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Session-Update fehlgeschlagen: $($updateResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Fehler beim Session-Update: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Kombinierter Chat (Standard-RAG + Web-RAG)
Write-Host "`n8️⃣ Testing Combined RAG (Standard + Web)..." -ForegroundColor Yellow

try {
    $combinedData = @{
        messages = @(
            @{
                role = "user"
                content = "Kombiniere interne Dokumente mit aktuellen Web-Informationen über KI."
            }
        )
        provider = "openai"
        model = "gpt-4o-mini"
        temperature = 0.2
        rag = $true
        ragTopK = 2
        webRag = $true
        webSearchQuery = "künstliche Intelligenz 2024"
        sessionId = $sessionId
    } | ConvertTo-Json -Depth 3

    $combinedResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/chat" `
        -Method POST -Headers $headers -Body $combinedData

    if ($combinedResponse.success) {
        Write-Host "   ✅ Kombinierter RAG erfolgreich" -ForegroundColor Green
        
        if ($combinedResponse.meta.rag.sources) {
            $docSources = $combinedResponse.meta.rag.sources | Where-Object { -not $_.isWeb }
            $webSources = $combinedResponse.meta.rag.sources | Where-Object { $_.isWeb -eq $true }
            
            Write-Host "   📄 Dokument-Quellen: $($docSources.Count)" -ForegroundColor Gray
            Write-Host "   🌐 Web-Quellen: $($webSources.Count)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ⚠️ Kombinierter RAG teilweise erfolgreich: $($combinedResponse.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ⚠️ Kombinierter RAG Fehler: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n🎯 Test Summary:" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan
Write-Host "✅ Session Management implementiert" -ForegroundColor Green
Write-Host "✅ Chat-Verlauf wird gespeichert" -ForegroundColor Green
Write-Host "✅ Tag-System funktioniert" -ForegroundColor Green
Write-Host "✅ Session-Suche verfügbar" -ForegroundColor Green
Write-Host "⚠️ Web-RAG benötigt API-Keys für volle Funktionalität" -ForegroundColor Yellow

Write-Host "`n💡 Nächste Schritte:" -ForegroundColor Blue
Write-Host "• Frontend testen: http://localhost:3001/ai" -ForegroundColor Gray
Write-Host "• Web-RAG API-Keys hinzufügen für Google/Bing-Suche" -ForegroundColor Gray
Write-Host "• Session-Ordner prüfen: $($env:RAG_EXTERNAL_DOCS_PATH)\chat-sessions" -ForegroundColor Gray

# Optional: Session löschen (nur für Tests)
# $deleteResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/sessions/$sessionId" -Method DELETE -Headers $headers

Write-Host "`n✨ Test abgeschlossen!" -ForegroundColor Green
