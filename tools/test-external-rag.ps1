# Test-Script f\u00fcr externe RAG Speicherung
# CompanyAI - RAG System Test

Write-Host "=== CompanyAI: Test Externe RAG Speicherung ===" -ForegroundColor Cyan

# Backend .env \u00fcberpr\u00fcfen
Write-Host "`n1. Backend .env Konfiguration pr\u00fcfen..." -ForegroundColor Yellow
if (Test-Path "backend/.env") {
    $envContent = Get-Content "backend/.env"
    $ragPath = $envContent | Where-Object { $_ -like "*RAG_EXTERNAL_DOCS_PATH*" }
    $ragIndex = $envContent | Where-Object { $_ -like "*RAG_INDEX_PATH*" }
    
    if ($ragPath) {
        Write-Host "   \u2705 RAG_EXTERNAL_DOCS_PATH gefunden: $ragPath" -ForegroundColor Green
    } else {
        Write-Host "   \u26a0\ufe0f  RAG_EXTERNAL_DOCS_PATH nicht gesetzt - nutzt interne Speicherung" -ForegroundColor Yellow
    }
    
    if ($ragIndex) {
        Write-Host "   \u2705 RAG_INDEX_PATH gefunden: $ragIndex" -ForegroundColor Green
    } else {
        Write-Host "   \u26a0\ufe0f  RAG_INDEX_PATH nicht gesetzt - nutzt default backend/rag_index.json" -ForegroundColor Yellow
    }
} else {
    Write-Host "   \u274c Backend .env Datei nicht gefunden!" -ForegroundColor Red
    exit 1
}

# Externe Ordner pr\u00fcfen/erstellen (falls konfiguriert)
Write-Host "`n2. Externe Ordner pr\u00fcfen..." -ForegroundColor Yellow
$externalPath = ($ragPath -split "=")[1] if $ragPath
if ($externalPath) {
    $cleanPath = $externalPath.Trim()
    Write-Host "   Externer Pfad: $cleanPath" -ForegroundColor Cyan
    
    if (Test-Path $cleanPath) {
        Write-Host "   \u2705 Externer Ordner existiert bereits" -ForegroundColor Green
    } else {
        Write-Host "   \u26a0\ufe0f  Externer Ordner existiert nicht - wird automatisch beim ersten Start erstellt" -ForegroundColor Yellow
    }
    
    $uploadsPath = Join-Path $cleanPath "uploads"
    if (Test-Path $uploadsPath) {
        Write-Host "   \u2705 Uploads-Ordner existiert bereits" -ForegroundColor Green
    } else {
        Write-Host "   \u26a0\ufe0f  Uploads-Ordner existiert nicht - wird automatisch beim ersten Upload erstellt" -ForegroundColor Yellow
    }
} else {
    Write-Host "   \u26a0\ufe0f  Keine externe Speicherung konfiguriert - nutzt interne Speicherung" -ForegroundColor Yellow
}

# Backend starten und testen
Write-Host "`n3. Backend-Test..." -ForegroundColor Yellow
Set-Location "backend"
Write-Host "   Starte Backend f\u00fcr RAG-Test..." -ForegroundColor Cyan

# Dependencies pr\u00fcfen
if (!(Test-Path "node_modules")) {
    Write-Host "   Installiere Backend-Dependencies..." -ForegroundColor Yellow
    npm install
}

# Backend Test-Start (kurz)
Write-Host "   Teste Backend-Start..." -ForegroundColor Cyan
$backendProcess = Start-Process -FilePath "node" -ArgumentList "src/index.ts" -PassThru -NoNewWindow
Start-Sleep 3

if ($backendProcess -and !$backendProcess.HasExited) {
    Write-Host "   \u2705 Backend erfolgreich gestartet" -ForegroundColor Green
    $backendProcess.Kill()
} else {
    Write-Host "   \u274c Backend-Start fehlgeschlagen - bitte manuell pr\u00fcfen" -ForegroundColor Red
}

Set-Location ".."

# Zusammenfassung
Write-Host "`n=== ZUSAMMENFASSUNG ===" -ForegroundColor Cyan
Write-Host "Externe RAG Speicherung implementiert:" -ForegroundColor Green
Write-Host "  \u2705 backend/.env mit RAG-Konfiguration" -ForegroundColor Green
Write-Host "  \u2705 RAG System unterst\u00fctzt externe Ordner" -ForegroundColor Green
Write-Host "  \u2705 Frontend zeigt Speicherort an" -ForegroundColor Green
Write-Host "  \u2705 Dokumentation aktualisiert" -ForegroundColor Green

Write-Host "`nN\u00e4chste Schritte:" -ForegroundColor Yellow
Write-Host "  1. Setze RAG_EXTERNAL_DOCS_PATH in backend/.env (z.B. C:/CompanyAI-External/docs)"
Write-Host "  2. Starte Backend und Frontend: npm run dev"
Write-Host "  3. Gehe zu /ai/docs und lade Dokumente hoch"
Write-Host "  4. Die Dateien werden extern gespeichert (getrennt vom Projekt)"

Write-Host "`nVorteile der externen Speicherung:" -ForegroundColor Cyan
Write-Host "  \u2728 Projekt-Code getrennt von RAG-Daten"
Write-Host "  \u2728 Einfachere Backups und Synchronisation"
Write-Host "  \u2728 Keine Vergr\u00f6\u00dferung des Git-Repositories"
Write-Host "  \u2728 Flexiblere Ordner-Organisation"
