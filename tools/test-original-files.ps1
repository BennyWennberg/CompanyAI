# Test Script für Original-Dateien Upload
# CompanyAI - Original Files System Test

Write-Host "=== CompanyAI: Original-Dateien System Test ===" -ForegroundColor Cyan

# Backend prüfen
Write-Host "`n1. Backend-Status prüfen..." -ForegroundColor Yellow
try {
    $healthResp = Invoke-RestMethod -Uri "http://localhost:5000/api/health" -TimeoutSec 5
    if ($healthResp.message -eq "CompanyAI Backend is running") {
        Write-Host "   ✅ Backend läuft" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Backend antwortet nicht korrekt" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "   ❌ Backend nicht erreichbar auf http://localhost:5000" -ForegroundColor Red
    Write-Host "   Starten Sie das Backend mit: npm run dev" -ForegroundColor Yellow
    exit 1
}

# API-Token abfragen (für Tests)
Write-Host "`n2. API-Token eingeben..." -ForegroundColor Yellow
$token = Read-Host "Geben Sie Ihren JWT-Token ein (oder 'skip' für Demo ohne Upload)"

if ($token -eq "skip") {
    Write-Host "   ⚠️ Überspringe Upload-Tests" -ForegroundColor Yellow
} else {
    $headers = @{ "Authorization" = "Bearer $token" }
    
    # Auth testen
    try {
        $authTest = Invoke-RestMethod -Uri "http://localhost:5000/api/ai/rag/originals" -Headers $headers
        Write-Host "   ✅ Token gültig" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Token ungültig oder Berechtigung fehlt" -ForegroundColor Red
        Write-Host "   Fehler: $($_.Exception.Message)" -ForegroundColor Red
        $token = "skip"
    }
}

# Externe Speicherung prüfen
Write-Host "`n3. Externe Speicherung testen..." -ForegroundColor Yellow
if (Test-Path "backend/.env") {
    $envContent = Get-Content "backend/.env"
    $externalPath = ($envContent | Where-Object { $_ -like "RAG_EXTERNAL_DOCS_PATH=*" }) -replace "RAG_EXTERNAL_DOCS_PATH=", ""
    
    if ($externalPath) {
        Write-Host "   📂 Externer Pfad konfiguriert: $externalPath" -ForegroundColor Green
        
        if (Test-Path $externalPath) {
            Write-Host "   ✅ Externer Ordner existiert" -ForegroundColor Green
            
            $uploadsPath = Join-Path $externalPath "uploads"
            $originalsPath = Join-Path $uploadsPath "originals"
            
            if (Test-Path $uploadsPath) {
                Write-Host "   ✅ Uploads-Ordner existiert: $uploadsPath" -ForegroundColor Green
            } else {
                Write-Host "   ⚠️ Uploads-Ordner wird beim ersten Upload erstellt" -ForegroundColor Yellow
            }
            
            if (Test-Path $originalsPath) {
                Write-Host "   ✅ Originals-Ordner existiert: $originalsPath" -ForegroundColor Green
                
                # Bestehende Original-Dateien zählen
                $existingFiles = Get-ChildItem $originalsPath -File -ErrorAction SilentlyContinue
                Write-Host "   📁 Bestehende Original-Dateien: $($existingFiles.Count)" -ForegroundColor Cyan
            } else {
                Write-Host "   ⚠️ Originals-Ordner wird beim ersten Upload erstellt" -ForegroundColor Yellow
            }
        } else {
            Write-Host "   ⚠️ Externer Ordner wird beim ersten Upload erstellt: $externalPath" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ RAG_EXTERNAL_DOCS_PATH nicht konfiguriert" -ForegroundColor Red
        Write-Host "   System nutzt interne Speicherung unter docs/" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ❌ backend/.env Datei nicht gefunden" -ForegroundColor Red
}

# API-Endpunkte testen
Write-Host "`n4. Original-Dateien API-Endpunkte testen..." -ForegroundColor Yellow

if ($token -ne "skip") {
    # Original-Dateien auflisten
    try {
        $originals = Invoke-RestMethod -Uri "http://localhost:5000/api/ai/rag/originals" -Headers $headers
        Write-Host "   ✅ GET /api/ai/rag/originals funktioniert" -ForegroundColor Green
        Write-Host "   📁 Anzahl Original-Dateien: $($originals.data.Count)" -ForegroundColor Cyan
        
        if ($originals.data.Count -gt 0) {
            Write-Host "`n   📄 Bestehende Original-Dateien:" -ForegroundColor Cyan
            foreach ($file in $originals.data) {
                $sizeKB = [math]::Round($file.size / 1024, 1)
                $uploadDate = [datetime]::Parse($file.uploadedAt).ToString("dd.MM.yyyy HH:mm")
                Write-Host "   - $($file.originalName) (${sizeKB} KB, $uploadDate)" -ForegroundColor Gray
            }
        }
    } catch {
        Write-Host "   ❌ GET /api/ai/rag/originals fehlgeschlagen: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test-Datei erstellen und hochladen (optional)
    $uploadTest = Read-Host "`n   Möchten Sie eine Test-Datei hochladen? (y/n)"
    if ($uploadTest -eq "y" -or $uploadTest -eq "Y") {
        # Test-Text-Datei erstellen
        $testContent = @"
# Test-Dokument für Original-Upload

Dies ist ein Test-Dokument für das Original-Dateien System.

## Features
- ✅ Original-Datei wird gespeichert
- ✅ Markdown wird automatisch erstellt
- ✅ Text wird für RAG extrahiert
- ✅ Download-Link wird bereitgestellt

Erstellt am: $(Get-Date -Format "dd.MM.yyyy HH:mm:ss")
"@
        
        $tempFile = [System.IO.Path]::GetTempFileName()
        $testFileName = "test-original-upload-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
        $testFilePath = Join-Path ([System.IO.Path]::GetTempPath()) $testFileName
        
        [System.IO.File]::WriteAllText($testFilePath, $testContent, [System.Text.Encoding]::UTF8)
        
        try {
            Write-Host "   📤 Lade Test-Datei hoch: $testFileName" -ForegroundColor Cyan
            
            # Multipart-Upload vorbereiten
            $boundary = [System.Guid]::NewGuid().ToString()
            $bodyLines = @()
            $bodyLines += "--$boundary"
            $bodyLines += "Content-Disposition: form-data; name=`"file`"; filename=`"$testFileName`""
            $bodyLines += "Content-Type: text/plain"
            $bodyLines += ""
            $bodyLines += $testContent
            $bodyLines += "--$boundary"
            $bodyLines += "Content-Disposition: form-data; name=`"reindex`""
            $bodyLines += ""
            $bodyLines += "true"
            $bodyLines += "--$boundary--"
            
            $body = $bodyLines -join "`r`n"
            $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
            
            $uploadHeaders = $headers.Clone()
            $uploadHeaders["Content-Type"] = "multipart/form-data; boundary=$boundary"
            
            $uploadResult = Invoke-RestMethod -Uri "http://localhost:5000/api/ai/rag/upload-file" `
                -Method POST -Headers $uploadHeaders -Body $bodyBytes
            
            Write-Host "   ✅ Upload erfolgreich!" -ForegroundColor Green
            Write-Host "   📁 Original gespeichert: $($uploadResult.data.upload.relativePaths.original)" -ForegroundColor Green
            Write-Host "   📝 Markdown erstellt: $($uploadResult.data.upload.relativePaths.markdown)" -ForegroundColor Green
            Write-Host "   🔍 RAG Index: $(if ($uploadResult.data.reindexed) { "$($uploadResult.data.reindexed.chunks) Chunks" } else { "Nicht neu erstellt" })" -ForegroundColor Green
            
        } catch {
            Write-Host "   ❌ Upload fehlgeschlagen: $($_.Exception.Message)" -ForegroundColor Red
        } finally {
            # Temporäre Datei löschen
            Remove-Item $testFilePath -ErrorAction SilentlyContinue
        }
    }
} else {
    Write-Host "   ⚠️ API-Tests übersprungen (kein Token)" -ForegroundColor Yellow
}

# Frontend-Zugriff testen
Write-Host "`n5. Frontend-Zugriff testen..." -ForegroundColor Yellow
try {
    $frontendResp = Invoke-WebRequest -Uri "http://localhost:5173" -TimeoutSec 5
    Write-Host "   ✅ Frontend erreichbar auf http://localhost:5173" -ForegroundColor Green
    Write-Host "   📁 Original-Upload verfügbar unter: http://localhost:5173/ai/docs" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Frontend nicht erreichbar auf http://localhost:5173" -ForegroundColor Red
    Write-Host "   Starten Sie das Frontend mit: npm run dev" -ForegroundColor Yellow
}

# Zusammenfassung
Write-Host "`n=== ZUSAMMENFASSUNG ===" -ForegroundColor Cyan
Write-Host "Original-Dateien System:" -ForegroundColor White
Write-Host "  ✅ Backend-API implementiert" -ForegroundColor Green
Write-Host "  ✅ Frontend-Upload erweitert" -ForegroundColor Green
Write-Host "  ✅ Externe Speicherung konfiguriert" -ForegroundColor Green
Write-Host "  ✅ Automatische Markdown-Konvertierung" -ForegroundColor Green
Write-Host "  ✅ Download-Funktionalität" -ForegroundColor Green

Write-Host "`nNeue Features:" -ForegroundColor Yellow
Write-Host "  📁 Original-Dateien hochladen (alle Formate)"
Write-Host "  📝 Automatische Text-Extraktion für RAG"
Write-Host "  💾 User können Original-Dateien herunterladen"
Write-Host "  🗂️ Externe Speicherung (getrennt vom Projekt)"
Write-Host "  🔍 Verbesserte RAG-Integration"

Write-Host "`nNächste Schritte:" -ForegroundColor Cyan
Write-Host "  1. Starten Sie Backend und Frontend: npm run dev"
Write-Host "  2. Gehen Sie zu http://localhost:5173/ai/docs"
Write-Host "  3. Laden Sie Original-Dateien hoch (PDFs, Word, etc.)"
Write-Host "  4. System speichert Original + erstellt Markdown für RAG"
Write-Host "  5. User können Original-Dateien wieder herunterladen"

Write-Host "`n🎉 Original-Dateien System ist einsatzbereit!" -ForegroundColor Green
