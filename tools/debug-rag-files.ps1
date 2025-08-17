# Debug Script: RAG Dateien und Mapping prüfen
# Zeigt aktuell vorhandene Original- und Markdown-Dateien

$envFile = "backend/.env"
$ragPath = $null

Write-Host "=== RAG Dateien Debug ===" -ForegroundColor Yellow
Write-Host ""

# 1. RAG_EXTERNAL_DOCS_PATH aus .env lesen
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    $ragPathLine = $envContent | Where-Object { $_ -like "RAG_EXTERNAL_DOCS_PATH=*" }
    if ($ragPathLine) {
        $ragPath = ($ragPathLine -split "=", 2)[1].Trim()
        Write-Host "✅ RAG_EXTERNAL_DOCS_PATH: $ragPath" -ForegroundColor Green
    }
}

if (-not $ragPath) {
    Write-Host "⚠️  RAG_EXTERNAL_DOCS_PATH nicht in .env gefunden, verwende Standard: docs/" -ForegroundColor Yellow
    $ragPath = "docs"
}

# 2. Original-Dateien prüfen
$originalsPath = Join-Path $ragPath "originals"
Write-Host ""
Write-Host "📁 Original-Dateien ($originalsPath):" -ForegroundColor Cyan

if (Test-Path $originalsPath) {
    $originalFiles = Get-ChildItem -Path $originalsPath -File | Sort-Object Name
    if ($originalFiles.Count -gt 0) {
        Write-Host "   Gefunden: $($originalFiles.Count) Dateien" -ForegroundColor Green
        foreach ($file in $originalFiles | Select-Object -First 5) {
            $basename = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
            $size = [Math]::Round($file.Length / 1024, 1)
            Write-Host "   📄 $($file.Name) ($size KB)" -ForegroundColor Gray
            Write-Host "      Basename: $basename" -ForegroundColor DarkGray
        }
        if ($originalFiles.Count -gt 5) {
            Write-Host "   ... und $($originalFiles.Count - 5) weitere" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ❌ Keine Original-Dateien gefunden" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ Ordner existiert nicht" -ForegroundColor Red
}

# 3. Markdown-Dateien prüfen
$markdownsPath = Join-Path $ragPath "markdowns"
Write-Host ""
Write-Host "📝 Markdown-Dateien ($markdownsPath):" -ForegroundColor Cyan

if (Test-Path $markdownsPath) {
    $markdownFiles = Get-ChildItem -Path $markdownsPath -Filter "*.md" | Sort-Object Name
    if ($markdownFiles.Count -gt 0) {
        Write-Host "   Gefunden: $($markdownFiles.Count) Dateien" -ForegroundColor Green
        foreach ($file in $markdownFiles | Select-Object -First 5) {
            $basename = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
            $size = [Math]::Round($file.Length / 1024, 1)
            
            # Prüfe ob entsprechende Original-Datei existiert
            $hasOriginal = $false
            if (Test-Path $originalsPath) {
                $originalCandidates = Get-ChildItem -Path $originalsPath -File | Where-Object { 
                    [System.IO.Path]::GetFileNameWithoutExtension($_.Name) -eq $basename 
                }
                $hasOriginal = $originalCandidates.Count -gt 0
            }
            
            $status = if ($hasOriginal) { "✅ HAS ORIGINAL" } else { "❌ NO ORIGINAL" }
            Write-Host "   📄 $($file.Name) ($size KB) $status" -ForegroundColor Gray
            Write-Host "      Basename: $basename" -ForegroundColor DarkGray
        }
        if ($markdownFiles.Count -gt 5) {
            Write-Host "   ... und $($markdownFiles.Count - 5) weitere" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ❌ Keine Markdown-Dateien gefunden" -ForegroundColor Red
    }
} else {
    Write-Host "   ❌ Ordner existiert nicht" -ForegroundColor Red
}

# 4. Mapping-Test
Write-Host ""
Write-Host "🔗 Mapping-Test:" -ForegroundColor Cyan

if ((Test-Path $originalsPath) -and (Test-Path $markdownsPath)) {
    $originalFiles = Get-ChildItem -Path $originalsPath -File
    $markdownFiles = Get-ChildItem -Path $markdownsPath -Filter "*.md"
    
    Write-Host "   Original-Dateien: $($originalFiles.Count)" -ForegroundColor Gray
    Write-Host "   Markdown-Dateien: $($markdownFiles.Count)" -ForegroundColor Gray
    
    $mappedCount = 0
    $unmappedCount = 0
    
    foreach ($md in $markdownFiles | Select-Object -First 3) {
        $mdBasename = [System.IO.Path]::GetFileNameWithoutExtension($md.Name)
        $matchingOriginal = $originalFiles | Where-Object { 
            [System.IO.Path]::GetFileNameWithoutExtension($_.Name) -eq $mdBasename 
        }
        
        if ($matchingOriginal) {
            Write-Host "   ✅ $($md.Name) ↔ $($matchingOriginal.Name)" -ForegroundColor Green
            $mappedCount++
        } else {
            Write-Host "   ❌ $($md.Name) ↔ KEINE ORIGINAL-DATEI" -ForegroundColor Red
            $unmappedCount++
        }
    }
    
    Write-Host ""
    Write-Host "📊 Zusammenfassung:" -ForegroundColor Yellow
    Write-Host "   ✅ Mit Original-Datei verknüpft: $mappedCount" -ForegroundColor Green
    Write-Host "   ❌ Ohne Original-Datei: $unmappedCount" -ForegroundColor Red
    Write-Host ""
    
    if ($unmappedCount -gt 0) {
        Write-Host "💡 Lösungsvorschläge:" -ForegroundColor Cyan
        Write-Host "   1. Neue Dateien über DocsPage hochladen → werden automatisch verknüpft" -ForegroundColor Gray
        Write-Host "   2. RAG Index neu erstellen → zeigt dann Original-Dateien als Quelle" -ForegroundColor Gray
        Write-Host "   3. Für alte Markdown-Dateien: Originalversion manuell hochladen" -ForegroundColor Gray
    } else {
        Write-Host "🎉 Alle Markdown-Dateien haben entsprechende Original-Dateien!" -ForegroundColor Green
        Write-Host "   → RAG Index neu erstellen für korrekte Quellenverweise" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "🔄 Nächste Schritte:" -ForegroundColor Yellow
Write-Host "   1. Backend neu starten (falls noch nicht geschehen)" -ForegroundColor Gray
Write-Host "   2. DocsPage öffnen → 'Index neu erstellen' klicken" -ForegroundColor Gray
Write-Host "   3. Chat mit RAG testen → sollte Original-Dateien als Quelle zeigen" -ForegroundColor Gray
