Param(
	[switch]$Fix
)

$ErrorActionPreference = 'Stop'

Write-Host 'Verifiziere CompanyAI Rules...' -ForegroundColor Cyan

# 1) Markdown Policy
$invalidMd = git ls-files | Where-Object { $_ -like '*.md' } | Where-Object {
	$allowed = @(
		'docs/',
		'README.md',
		'frontend/README.md',
		'backend/README.md'
	)
    $path = $_.Replace('\\','/')
	-Not ($allowed | ForEach-Object { $path.StartsWith($_) })
}
if ($invalidMd.Count -gt 0) {
    $nl = [Environment]::NewLine
    $mdLines = $invalidMd | ForEach-Object { ' - ' + $_ }
    $mdText = 'Markdown files außerhalb von docs:' + $nl + ($mdLines -join $nl)
    Write-Error ($mdText)
}

# 2) Backend @types only in devDependencies
$backendPkg = Get-Content -Raw -Path "backend/package.json" | ConvertFrom-Json
$badTypes = @()
foreach ($dep in $backendPkg.dependencies.PSObject.Properties.Name) {
	if ($dep -like '@types/*') { $badTypes += $dep }
}
if ($badTypes.Count -gt 0) {
    Write-Error ('@types Pakete müssen in devDependencies sein: {0}' -f ($badTypes -join ', '))
}

# 3) Frontend react-router-dom v6.x
$frontendPkg = Get-Content -Raw -Path "frontend/package.json" | ConvertFrom-Json
$rrd = $frontendPkg.dependencies.'react-router-dom'
if (-not $rrd -or -not ($rrd -match '^\^?6\.')) {
    Write-Error ('react-router-dom muss v6.x sein (gefunden: ''{0}'')' -f $rrd)
}

# 4) AI/RAG docs gates if ai module changed
$aiChanged = git diff --name-only --cached 2>$null | Where-Object { $_ -like 'backend/src/modules/ai/*' }
if (-not $aiChanged) {
	# Fallback: uncommitted working tree check
	$aiChanged = git status --porcelain | ForEach-Object { ($_ -split '\s+')[1] } | Where-Object { $_ -like 'backend/src/modules/ai/*' }
}
if ($aiChanged) {
	$requiredDocs = @(
		'docs/modules/ai/API.md',
		'docs/INTERDEPENDENCY.md',
		'docs/DOCUMENTATION_OVERVIEW.md'
	)
	foreach ($doc in $requiredDocs) {
        if (-not (Test-Path $doc)) { Write-Error ('Fehlende AI-Doku: {0}' -f $doc) }
	}
}

# 5) Module scaffolding check (orchestrator + types)
$moduleRoots = Get-ChildItem -Directory -Path 'backend/src/modules' | Select-Object -ExpandProperty FullName
foreach ($root in $moduleRoots) {
	$rel = $root.Substring((Get-Location).Path.Length+1).Replace('\\','/')
    if (-not (Test-Path (Join-Path $root 'orchestrator.ts'))) { Write-Error ('{0} fehlt orchestrator.ts' -f $rel) }
    if (-not (Test-Path (Join-Path $root 'types.ts'))) { Write-Error ('{0} fehlt types.ts' -f $rel) }
}

Write-Host 'Rules-Check bestanden' -ForegroundColor Green


