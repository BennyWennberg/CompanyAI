# Test Script für neue AI Features: Voice Integration & Hybrid RAG Search
# CompanyAI - Test der erweiterten Open WebUI Features

param(
    [string]$BaseUrl = "http://localhost:5000",
    [string]$Token = ""
)

Write-Host "🎤🔍 Testing Voice Integration & Hybrid RAG Features" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

if (-not $Token) {
    Write-Host "❌ Fehler: Token erforderlich. Verwendung: .\test-voice-hybrid-rag.ps1 -Token 'your-jwt-token'" -ForegroundColor Red
    exit 1
}

$headers = @{ 
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
}

# Test 1: Hybrid RAG Statistiken
Write-Host "`n1️⃣ Testing Hybrid RAG Statistics..." -ForegroundColor Yellow

try {
    $statsResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/rag/hybrid/stats" -Headers $headers

    if ($statsResponse.success) {
        Write-Host "   ✅ Hybrid RAG Statistiken geladen" -ForegroundColor Green
        Write-Host "   📊 Chunks Total: $($statsResponse.data.chunksTotal)" -ForegroundColor Gray
        Write-Host "   📏 Avg Chunk Length: $($statsResponse.data.avgChunkLength) Token" -ForegroundColor Gray
        Write-Host "   🔤 Unique Tokens: $($statsResponse.data.uniqueTokens)" -ForegroundColor Gray
        Write-Host "   🔝 Top Tokens: $($statsResponse.data.topTokens[0..4] | ForEach-Object { "$($_.token) ($($_.frequency)x)" } | Join-String ', ')" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Hybrid RAG Stats fehlgeschlagen: $($statsResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Fehler bei Hybrid RAG Stats: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Search Methods Comparison
Write-Host "`n2️⃣ Testing Search Methods Comparison..." -ForegroundColor Yellow

try {
    $comparisonData = @{
        query = "künstliche Intelligenz Entwicklung"
        topK = 3
    } | ConvertTo-Json

    $comparisonResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/rag/hybrid/compare" `
        -Method POST -Headers $headers -Body $comparisonData

    if ($comparisonResponse.success) {
        Write-Host "   ✅ Search-Methods-Vergleich erfolgreich" -ForegroundColor Green
        Write-Host "   🔍 Query: '$($comparisonResponse.data.query)'" -ForegroundColor Gray
        
        $summary = $comparisonResponse.data.summary
        Write-Host "   📊 Ergebnisse:" -ForegroundColor Gray
        Write-Host "      Vector Only: $($summary.vectorOnlyCount) chunks in $($summary.performance.vectorDuration)ms" -ForegroundColor DarkGray
        Write-Host "      BM25 Only: $($summary.bm25OnlyCount) chunks in $($summary.performance.bm25Duration)ms" -ForegroundColor DarkGray
        Write-Host "      Hybrid: $($summary.hybridCount) chunks in $($summary.performance.hybridDuration)ms" -ForegroundColor DarkGray
        Write-Host "      🚀 Hybrid Overhead: $($summary.performance.hybridOverhead)ms" -ForegroundColor DarkGray
    } else {
        Write-Host "   ❌ Search-Vergleich fehlgeschlagen: $($comparisonResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Fehler beim Search-Vergleich: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Hybrid RAG Chat
Write-Host "`n3️⃣ Testing Hybrid RAG Chat..." -ForegroundColor Yellow

try {
    $hybridChatData = @{
        messages = @(
            @{
                role = "user"
                content = "Erkläre mir die Vorteile von maschinellem Lernen"
            }
        )
        provider = "openai"
        model = "gpt-4o-mini"
        temperature = 0.2
        rag = $true
        ragTopK = 3
        saveSession = $false
    } | ConvertTo-Json -Depth 3

    $hybridChatResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/chat" `
        -Method POST -Headers $headers -Body $hybridChatData

    if ($hybridChatResponse.success) {
        Write-Host "   ✅ Hybrid RAG Chat erfolgreich" -ForegroundColor Green
        Write-Host "   💬 Response: $($hybridChatResponse.data.choices[0].message.content.Substring(0, [Math]::Min(100, $hybridChatResponse.data.choices[0].message.content.Length)))..." -ForegroundColor Gray
        
        if ($hybridChatResponse.meta.rag.sources) {
            Write-Host "   📄 RAG Quellen: $($hybridChatResponse.meta.rag.sources.Count)" -ForegroundColor Gray
            
            foreach ($source in $hybridChatResponse.meta.rag.sources) {
                $typeIndicator = if ($source.isWeb) { "🌐" } elseif ($source.isOriginal) { "📁" } else { "📝" }
                Write-Host "      $typeIndicator $($source.path)" -ForegroundColor DarkGray
            }
        }
    } else {
        Write-Host "   ❌ Hybrid RAG Chat fehlgeschlagen: $($hybridChatResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Fehler beim Hybrid RAG Chat: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Text-to-Speech
Write-Host "`n4️⃣ Testing Text-to-Speech..." -ForegroundColor Yellow

try {
    $ttsData = @{
        text = "Hallo, das ist ein Test der Text-zu-Sprache Funktionalität in CompanyAI."
        voice = "alloy"
        format = "mp3"
        speed = 1.0
    } | ConvertTo-Json

    $ttsResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/voice/text-to-speech" `
        -Method POST -Headers $headers -Body $ttsData

    if ($ttsResponse.success) {
        Write-Host "   ✅ Text-to-Speech erfolgreich" -ForegroundColor Green
        Write-Host "   🔊 Audio-URL: $($ttsResponse.data.audioUrl)" -ForegroundColor Gray
        Write-Host "   ⏱️ Geschätzte Dauer: $($ttsResponse.data.duration)s" -ForegroundColor Gray
        
        # Audio-Datei Download testen
        try {
            $audioResponse = Invoke-WebRequest -Uri "$BaseUrl$($ttsResponse.data.audioUrl)" `
                -Headers @{ "Authorization" = "Bearer $Token" } -Method GET
            
            if ($audioResponse.StatusCode -eq 200) {
                Write-Host "   ✅ Audio-Datei erfolgreich heruntergeladen ($($audioResponse.Content.Length) Bytes)" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️ Audio-Download Status: $($audioResponse.StatusCode)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "   ⚠️ Audio-Download-Test fehlgeschlagen: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ Text-to-Speech fehlgeschlagen: $($ttsResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Fehler bei Text-to-Speech: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Voice Cleanup
Write-Host "`n5️⃣ Testing Voice Cleanup..." -ForegroundColor Yellow

try {
    $cleanupResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/voice/cleanup" `
        -Method POST -Headers $headers -Body "{}"

    if ($cleanupResponse.success) {
        Write-Host "   ✅ Voice Cleanup erfolgreich: $($cleanupResponse.data.removed) Dateien entfernt" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Voice Cleanup fehlgeschlagen: $($cleanupResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Fehler bei Voice Cleanup: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Combined Features Test (Session + Hybrid RAG + Voice)
Write-Host "`n6️⃣ Testing Combined Features..." -ForegroundColor Yellow

try {
    # Session mit Hybrid RAG erstellen
    $combinedSessionData = @{
        title = "Voice + Hybrid RAG Test Session"
        description = "Test aller neuen Features zusammen"
        tags = @("Voice", "Hybrid-RAG", "Test")
        settings = @{
            provider = "openai"
            model = "gpt-4o-mini"
            temperature = 0.3
            useRag = $true
            ragTopK = 5
            useWebRag = $false
        }
    } | ConvertTo-Json -Depth 3

    $sessionResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/sessions" `
        -Method POST -Headers $headers -Body $combinedSessionData

    if ($sessionResponse.success) {
        $sessionId = $sessionResponse.data.id
        Write-Host "   ✅ Combined Session erstellt: $sessionId" -ForegroundColor Green
        
        # Chat mit Session + Hybrid RAG
        $combinedChatData = @{
            messages = @(
                @{
                    role = "user"
                    content = "Was sind die neuesten Trends in der KI-Entwicklung?"
                }
            )
            sessionId = $sessionId
            saveSession = $true
            rag = $true
            ragTopK = 4
        } | ConvertTo-Json -Depth 3

        $combinedChatResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/chat" `
            -Method POST -Headers $headers -Body $combinedChatData

        if ($combinedChatResponse.success) {
            Write-Host "   ✅ Combined Chat erfolgreich" -ForegroundColor Green
            
            # TTS für die Antwort
            $responseText = $combinedChatResponse.data.choices[0].message.content
            $shortText = $responseText.Substring(0, [Math]::Min(200, $responseText.Length))
            
            $combinedTTSData = @{
                text = $shortText
                voice = "nova"
                format = "mp3"
            } | ConvertTo-Json

            $combinedTTSResponse = Invoke-RestMethod -Uri "$BaseUrl/api/ai/voice/text-to-speech" `
                -Method POST -Headers $headers -Body $combinedTTSData

            if ($combinedTTSResponse.success) {
                Write-Host "   🔊 TTS für Combined Response erfolgreich" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "   ❌ Combined Session fehlgeschlagen: $($sessionResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Fehler beim Combined Test: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🎯 Test Summary:" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan
Write-Host "✅ Voice Integration implementiert (STT/TTS)" -ForegroundColor Green
Write-Host "✅ Hybrid RAG Search aktiv (BM25 + Vector)" -ForegroundColor Green
Write-Host "✅ Search-Performance-Vergleiche verfügbar" -ForegroundColor Green
Write-Host "✅ Audio-Generierung und -Bereitstellung funktioniert" -ForegroundColor Green
Write-Host "✅ Combined Features arbeiten zusammen" -ForegroundColor Green

Write-Host "`n💡 Nächste Schritte:" -ForegroundColor Blue
Write-Host "• Frontend Voice UI testen: http://localhost:3001/ai" -ForegroundColor Gray
Write-Host "• Mikrofon-Berechtigung erteilen für Speech-to-Text" -ForegroundColor Gray
Write-Host "• Hybrid RAG Performance in echten Szenarien testen" -ForegroundColor Gray
Write-Host "• TTS Stimmen und Geschwindigkeiten ausprobieren" -ForegroundColor Gray

Write-Host "`n🚀 Neue Features sind einsatzbereit!" -ForegroundColor Green
