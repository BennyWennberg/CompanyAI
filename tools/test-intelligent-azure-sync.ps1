# Intelligenter Azure AD Sync Test
# Testet die neue automatische Schema-Detection direkt im Backend

Write-Host "🧠 Intelligenter Azure AD Sync Test gestartet..." -ForegroundColor Yellow

# Backend-Pfad prüfen
$backendPath = "backend"
if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Backend-Pfad nicht gefunden!" -ForegroundColor Red
    exit 1
}

Set-Location $backendPath

# Direkte Ausführung der Sync-Funktion
$testScript = @"
const { syncAdminPortalUsers } = require('./src/modules/admin/functions/azure-user-sync');

console.log('🔄 Starting Intelligent Azure AD Sync Test...');
console.log('='.repeat(60));

syncAdminPortalUsers().then(result => {
  console.log('='.repeat(60));
  console.log('🎉 INTELLIGENTER AZURE AD SYNC RESULT:');
  console.log('='.repeat(60));
  
  if (result.success) {
    console.log('✅ Status: SUCCESS');
    console.log('📊 Synced Users:', result.data.synced);
    console.log('➕ Created Users:', result.data.created);
    console.log('🔄 Updated Users:', result.data.updated);
    console.log('❌ Errors:', result.data.errors?.length || 0);
    console.log('🧠 Analyzed Fields:', result.data.analyzedFields?.length || 0);
    console.log('🏗️ Schema Generated:', result.data.schemaGenerated);
    
    console.log('\\n🔍 ERKANNTE AZURE AD FELDER:');
    if (result.data.analyzedFields) {
      result.data.analyzedFields.forEach(field => {
        console.log(\`  ✅ \${field}\`);
      });
    }
    
    if (result.data.errors && result.data.errors.length > 0) {
      console.log('\\n❌ FEHLER:');
      result.data.errors.forEach(error => console.log(\`  ⚠️ \${error}\`));
    }
    
    console.log('\\n📋 MESSAGE:', result.message);
  } else {
    console.log('❌ Status: FAILED');
    console.log('❌ Error:', result.error);
    console.log('📋 Message:', result.message);
  }
  
  console.log('='.repeat(60));
  console.log('✅ Test abgeschlossen!');
  
}).catch(err => {
  console.error('='.repeat(60));
  console.error('💥 CRITICAL ERROR:');
  console.error('='.repeat(60));
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
});
"@

Write-Host "🔄 Intelligenter Azure AD Sync Test läuft..." -ForegroundColor Blue
$testScript | Out-File -FilePath "test-intelligent-sync.js" -Encoding UTF8

try {
    node test-intelligent-sync.js
} catch {
    Write-Host "❌ Test-Fehler: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Cleanup
    Remove-Item "test-intelligent-sync.js" -ErrorAction SilentlyContinue
    Set-Location ..
}

Write-Host "`n✅ Intelligenter Azure AD Sync Test abgeschlossen!" -ForegroundColor Green
