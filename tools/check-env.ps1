# Überprüfung der Backend .env Konfiguration
# CompanyAI - ENV Checker

Write-Host "=== CompanyAI: Backend .env Überprüfung ===" -ForegroundColor Cyan

# .env Datei prüfen
$envFile = "backend/.env"
if (!(Test-Path $envFile)) {
    Write-Host "Backend .env Datei nicht gefunden!" -ForegroundColor Red
    exit 1
}

Write-Host "Backend .env Datei gefunden" -ForegroundColor Green

# .env Datei einlesen
$envContent = Get-Content $envFile

# Erforderliche Variablen definieren
$requiredVars = @(
    @{ Name = "OPENAI_API_KEY"; Description = "OpenAI API Key für Chat/Embeddings"; Critical = $true },
    @{ Name = "RAG_EXTERNAL_DOCS_PATH"; Description = "Externer Ordner für RAG Dokumente"; Critical = $false },
    @{ Name = "RAG_INDEX_PATH"; Description = "Pfad für RAG Index Datei"; Critical = $false },
    @{ Name = "RAG_EMBEDDING_PROVIDER"; Description = "Embedding Provider (openai/gemini/ollama)"; Critical = $true },
    @{ Name = "RAG_EMBEDDING_MODEL"; Description = "Embedding Model Name"; Critical = $true },
    @{ Name = "AZURE_CLIENT_ID"; Description = "Azure App Client ID für Entra Integration"; Critical = $false },
    @{ Name = "AZURE_CLIENT_SECRET"; Description = "Azure App Client Secret"; Critical = $false },
    @{ Name = "AZURE_TENANT_ID"; Description = "Azure Tenant ID"; Critical = $false },
    @{ Name = "GRAPH_BASE_URL"; Description = "Microsoft Graph API Base URL"; Critical = $false },
    @{ Name = "ENTRA_SYNC_ENABLED"; Description = "Entra ID Sync aktiviert (true/false)"; Critical = $false },
    @{ Name = "ENTRA_SYNC_INTERVAL_MS"; Description = "Sync Intervall in Millisekunden"; Critical = $false },
    @{ Name = "JWT_SECRET"; Description = "JWT Token Secret Key"; Critical = $true },
    @{ Name = "BCRYPT_ROUNDS"; Description = "Passwort Hashing Rounds"; Critical = $true },
    @{ Name = "PORT"; Description = "Backend Server Port"; Critical = $true },
    @{ Name = "NODE_ENV"; Description = "Node Environment (development/production)"; Critical = $true },
    @{ Name = "LOG_LEVEL"; Description = "Log Level (info/debug/error)"; Critical = $false }
)

Write-Host "`n=== Überprüfung der ENV Variablen ===" -ForegroundColor Yellow

$criticalMissing = @()
$optionalMissing = @()
$warnings = @()

foreach ($var in $requiredVars) {
    $line = $envContent | Where-Object { $_ -like "$($var.Name)=*" -and $_ -notlike "#*" }
    
    if ($line) {
        $value = ($line -split "=", 2)[1]
        
        if ([string]::IsNullOrWhiteSpace($value)) {
            if ($var.Critical) {
                $criticalMissing += "$($var.Name) ist leer - $($var.Description)"
            } else {
                $optionalMissing += "$($var.Name) ist leer - $($var.Description)"
            }
        } else {
            # Spezielle Prüfungen
            if ($var.Name -eq "JWT_SECRET" -and $value -like "*your-jwt-secret*") {
                $warnings += "JWT_SECRET nutzt Default-Wert - sollte in Production geändert werden"
            } elseif ($var.Name -eq "RAG_EXTERNAL_DOCS_PATH" -and $value) {
                Write-Host "$($var.Name) = $value" -ForegroundColor Green
            } elseif ($var.Name -eq "OPENAI_API_KEY" -and $value.StartsWith("sk-")) {
                Write-Host "$($var.Name) = sk-****** (gesetzt)" -ForegroundColor Green
            } else {
                Write-Host "$($var.Name) = $value" -ForegroundColor Green
            }
        }
    } else {
        if ($var.Critical) {
            $criticalMissing += "$($var.Name) fehlt - $($var.Description)"
        } else {
            $optionalMissing += "$($var.Name) fehlt - $($var.Description)"
        }
    }
}

# Ergebnisse anzeigen
Write-Host "`n=== ERGEBNIS ===" -ForegroundColor Cyan

if ($criticalMissing.Count -eq 0) {
    Write-Host "Alle kritischen ENV Variablen sind gesetzt!" -ForegroundColor Green
} else {
    Write-Host "Kritische ENV Variablen fehlen:" -ForegroundColor Red
    $criticalMissing | ForEach-Object { Write-Host "   $_" -ForegroundColor Red }
}

if ($optionalMissing.Count -gt 0) {
    Write-Host "`nOptionale ENV Variablen fehlen:" -ForegroundColor Yellow
    $optionalMissing | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
}

if ($warnings.Count -gt 0) {
    Write-Host "`nWarnungen:" -ForegroundColor Yellow
    $warnings | ForEach-Object { Write-Host "   $_" -ForegroundColor Yellow }
}

# Features Status
Write-Host "`n=== FEATURES STATUS ===" -ForegroundColor Cyan

$openaiKey = $envContent | Where-Object { $_ -like "OPENAI_API_KEY=*" -and $_ -notlike "#*" }
$azureConfig = ($envContent | Where-Object { $_ -like "AZURE_CLIENT_ID=*" -and $_ -notlike "#*" }) -and 
               ($envContent | Where-Object { $_ -like "AZURE_CLIENT_SECRET=*" -and $_ -notlike "#*" }) -and
               ($envContent | Where-Object { $_ -like "AZURE_TENANT_ID=*" -and $_ -notlike "#*" })
$ragExternal = $envContent | Where-Object { $_ -like "RAG_EXTERNAL_DOCS_PATH=*" -and $_ -notlike "#*" }
$entraSync = $envContent | Where-Object { $_ -like "ENTRA_SYNC_ENABLED=true*" -and $_ -notlike "#*" }

Write-Host "AI Chat (OpenAI): $(if ($openaiKey) { 'Aktiv' } else { 'Inaktiv' })" -ForegroundColor $(if ($openaiKey) { 'Green' } else { 'Red' })
Write-Host "Externe RAG Speicherung: $(if ($ragExternal) { 'Aktiv' } else { 'Inaktiv (nutzt interne Speicherung)' })" -ForegroundColor $(if ($ragExternal) { 'Green' } else { 'Yellow' })
Write-Host "Azure/Entra Integration: $(if ($azureConfig) { 'Konfiguriert' } else { 'Nicht konfiguriert' })" -ForegroundColor $(if ($azureConfig) { 'Green' } else { 'Red' })
Write-Host "Entra Sync: $(if ($entraSync) { 'Aktiv' } else { 'Inaktiv' })" -ForegroundColor $(if ($entraSync) { 'Green' } else { 'Yellow' })

Write-Host "`n=== NÄCHSTE SCHRITTE ===" -ForegroundColor Cyan
if ($criticalMissing.Count -eq 0) {
    Write-Host "Backend ist ready! Sie können starten mit: npm run dev" -ForegroundColor Green
} else {
    Write-Host "Bitte fehlende kritische ENV Variablen in backend/.env ergänzen" -ForegroundColor Red
}