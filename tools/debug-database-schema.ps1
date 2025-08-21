# Debug Database Schema für Manual Users

Write-Host "Debugging Manual User Database Schema..." -ForegroundColor Cyan

$dbPath = "C:\Code\Company_Allg_Data\Admin_Portal\databases\Users\manuel_user.db"

Write-Host "Database: $dbPath" -ForegroundColor Gray
Write-Host "Exists: $(Test-Path $dbPath)" -ForegroundColor Gray

if (Test-Path $dbPath) {
    $dbInfo = Get-Item $dbPath
    Write-Host "Size: $($dbInfo.Length) bytes" -ForegroundColor Gray
    Write-Host "Last Modified: $($dbInfo.LastWriteTime)" -ForegroundColor Gray
    
    # Check if database has been modified recently (should be if user was created)
    $timeDiff = [Math]::Round(((Get-Date) - $dbInfo.LastWriteTime).TotalMinutes, 2)
    Write-Host "Modified $timeDiff minutes ago" -ForegroundColor $(if ($timeDiff -lt 10) { "Green" } else { "Yellow" })
    
    if ($timeDiff -lt 10) {
        Write-Host "SUCCESS: Database was recently modified (user creation likely worked)" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Database not recently modified (user creation may have failed)" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "ERROR: Manual User Database not found!" -ForegroundColor Red
}

Write-Host "`nChecking other User databases..." -ForegroundColor Cyan

$userDbPath = "C:\Code\Company_Allg_Data\Admin_Portal\databases\Users\"
if (Test-Path $userDbPath) {
    Write-Host "`nUser Databases:" -ForegroundColor Yellow
    Get-ChildItem $userDbPath -Filter "*.db" | ForEach-Object {
        $timeDiff = [Math]::Round(((Get-Date) - $_.LastWriteTime).TotalMinutes, 2)
        $recentMark = if ($timeDiff -lt 10) { " ⭐ RECENT" } else { "" }
        Write-Host "  $($_.Name) - $($_.Length) bytes - Modified $timeDiff min ago$recentMark" -ForegroundColor Gray
    }
} else {
    Write-Host "ERROR: User databases folder not found!" -ForegroundColor Red
}

Write-Host "`nDebug complete!" -ForegroundColor Green
