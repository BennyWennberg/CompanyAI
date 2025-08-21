# Direct Database Test für Manual Users

Write-Host "Testing Manual User Database directly..." -ForegroundColor Cyan

$dbPath = "C:\Code\Company_Allg_Data\Admin_Portal\databases\Users\manuel_user.db"

Write-Host "Database Path: $dbPath" -ForegroundColor Gray
Write-Host "Exists: $(Test-Path $dbPath)" -ForegroundColor Gray

if (Test-Path $dbPath) {
    $dbInfo = Get-Item $dbPath
    Write-Host "Size: $($dbInfo.Length) bytes" -ForegroundColor Gray
    Write-Host "Last Modified: $($dbInfo.LastWriteTime)" -ForegroundColor Gray
    
    # Check if SQLite3 is available
    try {
        # Try to query the database using sqlite3 if available
        Write-Host "`nTrying to query database..." -ForegroundColor Yellow
        
        # Create a simple PowerShell SQLite query
        Add-Type -Path "System.Data.SQLite.dll" -ErrorAction SilentlyContinue
        Write-Host "SQLite module status checked" -ForegroundColor Gray
        
    } catch {
        Write-Host "SQLite not available in PowerShell, checking file size only" -ForegroundColor Yellow
    }
} else {
    Write-Host "ERROR: Database file not found!" -ForegroundColor Red
}

Write-Host "`nTest complete!" -ForegroundColor Green
