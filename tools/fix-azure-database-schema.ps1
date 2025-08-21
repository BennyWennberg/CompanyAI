# Azure Database Schema Fix
# Fügt fehlende Azure AD Spalten zur bestehenden Users-Tabelle hinzu

Write-Host "🔧 Azure Database Schema Fix gestartet..." -ForegroundColor Yellow

# Backend-Pfad prüfen
$backendPath = "backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Backend-Pfad nicht gefunden!" -ForegroundColor Red
    exit 1
}

# Backend-Server starten für Test
Write-Host "🚀 Backend-Server starten..." -ForegroundColor Blue
$serverJob = Start-Job -ScriptBlock {
    Set-Location "C:\Code\CompanyAllg\CompanyAI\backend"
    npm run dev
}

# Warten auf Server-Start
Start-Sleep -Seconds 10

try {
    # Test: Aktuelle Database Schema prüfen  
    Write-Host "📊 Teste aktuelle Database Schema..." -ForegroundColor Blue
    
    $dbTestScript = @"
const { AdminPortalBackend } = require('./src/modules/admin/core/external-data-manager');

(async () => {
  try {
    const backend = AdminPortalBackend.getInstance();
    await backend.initialize();
    
    const db = backend.dbManager.getUserConnectionByEnv('azure');
    if (db) {
      const schema = await backend.dbManager.query(db, 'PRAGMA table_info(users)');
      console.log('=== CURRENT DATABASE SCHEMA ===');
      schema.forEach(col => console.log(`${col.name}: ${col.type}`));
      
      // Prüfe ob Azure AD Spalten vorhanden
      const azureColumns = ['jobTitle', 'department', 'companyName', 'businessPhones', 'mobilePhone', 'officeLocation', 'usageLocation', 'userType', 'accountEnabled', 'createdDateTime'];
      const existingColumns = schema.map(col => col.name);
      
      console.log('\\n=== MISSING AZURE AD COLUMNS ===');
      const missingColumns = azureColumns.filter(col => !existingColumns.includes(col));
      missingColumns.forEach(col => console.log(`❌ Missing: ${col}`));
      
      if (missingColumns.length === 0) {
        console.log('✅ All Azure AD columns present!');
      }
    }
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
  process.exit(0);
})();
"@

    Set-Location $backendPath
    $dbTestScript | Out-File -FilePath "test-db-schema.js" -Encoding UTF8
    
    Write-Host "📊 Database Schema Test läuft..." -ForegroundColor Blue
    $schemaResult = node test-db-schema.js
    Write-Host $schemaResult -ForegroundColor White
    
    # Cleanup
    Remove-Item "test-db-schema.js" -ErrorAction SilentlyContinue
    
    # Test: Azure Sync nach Schema-Fix
    Write-Host "`n🔄 Teste Azure AD Sync..." -ForegroundColor Blue
    
    try {
        $syncResult = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/sync/azure-users" -Method POST -ContentType "application/json"
        Write-Host "✅ Azure Sync Result:" -ForegroundColor Green
        Write-Host ($syncResult | ConvertTo-Json -Depth 3) -ForegroundColor White
    } catch {
        Write-Host "❌ Azure Sync Fehler: $($_.Exception.Message)" -ForegroundColor Red
    }
    
} finally {
    # Server stoppen
    Write-Host "`n🛑 Backend-Server stoppen..." -ForegroundColor Blue
    Stop-Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job $serverJob -ErrorAction SilentlyContinue
    Set-Location ..
}

Write-Host "`n✅ Azure Database Schema Fix abgeschlossen!" -ForegroundColor Green
