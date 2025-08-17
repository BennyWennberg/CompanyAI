# Test Script: Original-Dateien als Quelle im Chat
# Testet ob das RAG System Original-Dateien als Quelle referenziert

$baseUrl = "http://localhost:5000/api"

Write-Host "=== Test: Original-Dateien als Chat-Quelle ===" -ForegroundColor Yellow
Write-Host ""

# 1. Backend Health Check
Write-Host "1. Backend Health Check..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/hello" -Method GET
    if ($health.success) {
        Write-Host "✅ Backend erreichbar" -ForegroundColor Green
    } else {
        Write-Host "❌ Backend nicht verfügbar" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Backend-Verbindung fehlgeschlagen: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. RAG Index Check
Write-Host ""
Write-Host "2. RAG Index prüfen..." -ForegroundColor Cyan
try {
    $ragResponse = Invoke-RestMethod -Uri "$baseUrl/ai/rag/reindex" -Method POST -Headers @{
        'Authorization' = 'Bearer test-token'
        'Content-Type' = 'application/json'
    }
    if ($ragResponse.success) {
        Write-Host "✅ RAG Index: $($ragResponse.data.chunks) Chunks erstellt" -ForegroundColor Green
        Write-Host "   Model: $($ragResponse.data.model)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  RAG Index Problem: $($ragResponse.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  RAG nicht verfügbar (OK wenn keine Dokumente vorhanden)" -ForegroundColor Yellow
    Write-Host "   Fehler: $($_.Exception.Message)" -ForegroundColor Gray
}

# 3. Original Files Check
Write-Host ""
Write-Host "3. Original-Dateien auflisten..." -ForegroundColor Cyan
try {
    $originalsResponse = Invoke-RestMethod -Uri "$baseUrl/ai/rag/originals" -Method GET -Headers @{
        'Authorization' = 'Bearer test-token'
    }
    if ($originalsResponse.success -and $originalsResponse.data.length -gt 0) {
        Write-Host "✅ Original-Dateien gefunden: $($originalsResponse.data.length)" -ForegroundColor Green
        foreach ($file in $originalsResponse.data[0..2]) {  # Erste 3 anzeigen
            Write-Host "   📁 $($file.originalName) ($([Math]::Round($file.size / 1024)) KB)" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️  Keine Original-Dateien gefunden - Upload eine Testdatei für vollständigen Test" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Original-Dateien-Check fehlgeschlagen: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Chat mit RAG Test
Write-Host ""
Write-Host "4. Chat mit RAG testen..." -ForegroundColor Cyan
$testChatBody = @{
    messages = @(
        @{ role = "user"; content = "Was steht in den Dokumenten?" }
    )
    provider = "openai"
    model = "gpt-4o-mini"
    rag = $true
    ragTopK = 3
} | ConvertTo-Json -Depth 3

try {
    $chatResponse = Invoke-RestMethod -Uri "$baseUrl/ai/chat" -Method POST -Body $testChatBody -Headers @{
        'Authorization' = 'Bearer test-token'
        'Content-Type' = 'application/json'
    }
    
    if ($chatResponse.success) {
        Write-Host "✅ Chat-Response erhalten" -ForegroundColor Green
        
        # RAG Sources prüfen
        if ($chatResponse.meta -and $chatResponse.meta.rag -and $chatResponse.meta.rag.sources) {
            $sources = $chatResponse.meta.rag.sources
            Write-Host "✅ RAG Quellen: $($sources.Count)" -ForegroundColor Green
            
            foreach ($source in $sources[0..1]) {  # Erste 2 Quellen
                if ($source.isOriginal -and $source.downloadUrl) {
                    Write-Host "   📁 ORIGINAL-QUELLE: $($source.path)" -ForegroundColor Green
                    Write-Host "      Download: $($source.downloadUrl)" -ForegroundColor Gray
                    Write-Host "      Preview: $($source.preview.Substring(0, [Math]::Min(50, $source.preview.Length)))..." -ForegroundColor Gray
                } else {
                    Write-Host "   📝 Markdown-Quelle: $($source.path)" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "⚠️  Keine RAG-Quellen im Chat-Response gefunden" -ForegroundColor Yellow
        }
        
        # AI Response
        if ($chatResponse.data.choices -and $chatResponse.data.choices[0].message) {
            $aiMessage = $chatResponse.data.choices[0].message.content
            Write-Host ""
            Write-Host "💬 AI-Antwort (erste 100 Zeichen):" -ForegroundColor Cyan
            Write-Host "   $($aiMessage.Substring(0, [Math]::Min(100, $aiMessage.Length)))..." -ForegroundColor Gray
        }
        
    } else {
        Write-Host "❌ Chat fehlgeschlagen: $($chatResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Chat-Test fehlgeschlagen: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Möglicherweise kein OpenAI API Key konfiguriert" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Test-Zusammenfassung ===" -ForegroundColor Yellow
Write-Host "✅ Wenn Original-Dateien als Quelle angezeigt werden (📁 ORIGINAL-QUELLE), dann funktioniert die Integration!" -ForegroundColor Green
Write-Host "⚠️  Falls nur Markdown-Quellen (📝) angezeigt werden, prüfe die RAG-Index-Erstellung" -ForegroundColor Yellow
Write-Host ""
Write-Host "Nächste Schritte für vollständigen Test:" -ForegroundColor Cyan
Write-Host "1. Original-Datei über DocsPage hochladen" -ForegroundColor Gray
Write-Host "2. RAG Index neu erstellen" -ForegroundColor Gray
Write-Host "3. Chat mit spezifischer Frage zum Dokument testen" -ForegroundColor Gray
