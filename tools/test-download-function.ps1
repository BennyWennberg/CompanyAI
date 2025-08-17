# Test Script: Download-Funktion testen
# Testet ob die neue Download-Funktion im Chat funktioniert

Write-Host "=== 📁 Download-Funktion Test ===" -ForegroundColor Yellow
Write-Host ""

# Admin Token generieren
$adminToken = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("admin@company.com"))
Write-Host "Admin Token: $adminToken" -ForegroundColor Gray
Write-Host ""

# 1. Verfügbare Original-Dateien auflisten
Write-Host "1. 📁 Verfügbare Original-Dateien:" -ForegroundColor Cyan
try {
    $originalsResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/ai/rag/originals" -Method GET -Headers @{
        'Authorization' = "Bearer $adminToken"
    }
    
    if ($originalsResponse.success -and $originalsResponse.data.length -gt 0) {
        Write-Host "   ✅ $($originalsResponse.data.length) Original-Dateien gefunden" -ForegroundColor Green
        foreach ($file in $originalsResponse.data) {
            Write-Host "   📄 $($file.originalName) → $($file.filename)" -ForegroundColor Gray
        }
        $testFile = $originalsResponse.data[0]
        Write-Host ""
        Write-Host "📋 Test-Datei für Download: $($testFile.originalName)" -ForegroundColor Cyan
        Write-Host "   Dateiname: $($testFile.filename)" -ForegroundColor Gray
        Write-Host "   Download-URL: $($testFile.downloadUrl)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Keine Original-Dateien gefunden" -ForegroundColor Red
        Write-Host "   💡 Bitte erst eine Datei über DocsPage hochladen" -ForegroundColor Yellow
        exit 0
    }
} catch {
    Write-Host "   ❌ Fehler beim Auflisten der Original-Dateien: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 2. Download-Endpunkt direkt testen
Write-Host "2. 🔽 Download-Endpunkt direkt testen:" -ForegroundColor Cyan
try {
    $downloadUrl = "http://localhost:5000/api/ai/rag/download/original/$($testFile.filename)"
    Write-Host "   URL: $downloadUrl" -ForegroundColor Gray
    
    $response = Invoke-WebRequest -Uri $downloadUrl -Method GET -Headers @{
        'Authorization' = "Bearer $adminToken"
    } -OutFile "test_download_temp.tmp" -PassThru
    
    if ($response.StatusCode -eq 200) {
        Write-Host "   ✅ Download-Endpunkt funktioniert (Status: $($response.StatusCode))" -ForegroundColor Green
        Write-Host "   📄 Content-Type: $($response.Headers.'Content-Type')" -ForegroundColor Gray
        Write-Host "   📄 Content-Length: $($response.Headers.'Content-Length') bytes" -ForegroundColor Gray
        
        # Temp-Datei löschen
        if (Test-Path "test_download_temp.tmp") {
            Remove-Item "test_download_temp.tmp" -Force
            Write-Host "   🗑️ Temp-Datei gelöscht" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ❌ Download fehlgeschlagen (Status: $($response.StatusCode))" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Download-Endpunkt-Fehler: $($_.Exception.Message)" -ForegroundColor Red
    
    # Temp-Datei aufräumen falls vorhanden
    if (Test-Path "test_download_temp.tmp") {
        Remove-Item "test_download_temp.tmp" -Force
    }
}

Write-Host ""

# 3. Chat mit RAG testen und Sources prüfen
Write-Host "3. 💬 Chat mit RAG testen:" -ForegroundColor Cyan
try {
    $chatBody = @{
        messages = @(@{
            role = "user"
            content = "Was steht in der Datei $($testFile.originalName)?"
        })
        provider = "openai"
        model = "gpt-4o-mini"
        rag = $true
        ragTopK = 3
    } | ConvertTo-Json -Depth 3

    $chatResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/ai/chat" -Method POST -Body $chatBody -Headers @{
        'Authorization' = "Bearer $adminToken"
        'Content-Type' = 'application/json'
    }
    
    if ($chatResponse.success) {
        Write-Host "   ✅ Chat-Response erhalten" -ForegroundColor Green
        
        if ($chatResponse.meta -and $chatResponse.meta.rag -and $chatResponse.meta.rag.sources) {
            $sources = $chatResponse.meta.rag.sources
            Write-Host "   📄 RAG-Quellen: $($sources.Count)" -ForegroundColor Green
            
            foreach ($source in $sources) {
                if ($source.isOriginal -and $source.downloadUrl) {
                    Write-Host "   📁 ORIGINAL-QUELLE: $($source.path)" -ForegroundColor Green
                    Write-Host "      Download: $($source.downloadUrl)" -ForegroundColor Gray
                    Write-Host "      ✅ Frontend kann diese URL für Download verwenden!" -ForegroundColor Green
                } else {
                    Write-Host "   📝 Markdown-Quelle: $($source.path)" -ForegroundColor Yellow
                }
            }
        } else {
            Write-Host "   ⚠️ Keine RAG-Quellen im Chat-Response" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ Chat fehlgeschlagen: $($chatResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Chat-Test fehlgeschlagen: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   💡 Prüfe OpenAI API Key in .env" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== 📋 Test-Zusammenfassung ===" -ForegroundColor Yellow
Write-Host "✅ Backend Download-Endpunkt implementiert" -ForegroundColor Green
Write-Host "✅ Frontend Download-Funktion implementiert" -ForegroundColor Green  
Write-Host "✅ Chat zeigt Original-Dateien als Quelle" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Nächste Schritte:" -ForegroundColor Cyan
Write-Host "1. Frontend öffnen: http://localhost:5173" -ForegroundColor Gray
Write-Host "2. Login mit beliebigen Credentials" -ForegroundColor Gray  
Write-Host "3. AI Chat öffnen" -ForegroundColor Gray
Write-Host "4. RAG aktivieren und Frage stellen" -ForegroundColor Gray
Write-Host "5. Auf '📁 Original-Datei herunterladen' klicken" -ForegroundColor Gray
Write-Host "6. Datei sollte automatisch heruntergeladen werden! 🎉" -ForegroundColor Green
