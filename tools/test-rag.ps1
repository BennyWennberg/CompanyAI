$ErrorActionPreference = "Stop"

Write-Host "== CompanyAI RAG Test ==" -ForegroundColor Cyan

if (-not $env:AUTH_TOKEN) {
  Write-Host "Bitte setzen Sie AUTH_TOKEN in der Umgebung (Bearer Token)" -ForegroundColor Yellow
  exit 1
}

$base = "http://localhost:5000"
$headers = @{ Authorization = "Bearer $env:AUTH_TOKEN" }

Write-Host "1) Hybrid Stats" -ForegroundColor Green
$stats = Invoke-RestMethod -Method GET -Uri "$base/api/ai/rag/hybrid/stats" -Headers $headers
if (-not $stats.success) { throw "Hybrid Stats fehlgeschlagen" }
Write-Host ("Chunks: {0}, UniqueTokens: {1}" -f $stats.data.chunksTotal, $stats.data.uniqueTokens)

Write-Host "2) Compare Search" -ForegroundColor Green
$body = @{ query = "Wie funktioniert das HR Modul?"; topK = 3 } | ConvertTo-Json
$cmp = Invoke-RestMethod -Method POST -Uri "$base/api/ai/rag/hybrid/compare" -Headers $headers -Body $body -ContentType "application/json"
if (-not $cmp.success) { throw "Compare fehlgeschlagen" }
Write-Host ("Vector: {0}ms, BM25: {1}ms, Hybrid: {2}ms" -f $cmp.data.summary.performance.vectorDuration, $cmp.data.summary.performance.bm25Duration, $cmp.data.summary.performance.hybridDuration)

Write-Host "3) AI Logs (admin)" -ForegroundColor Green
try {
  $logs = Invoke-RestMethod -Method GET -Uri "$base/api/ai/logs?limit=10" -Headers $headers
  if ($logs.success) {
    Write-Host ("Logs geladen: {0}" -f $logs.data.Count)
  } else {
    Write-Host "Logs konnten nicht gelesen werden (kein Admin?)" -ForegroundColor Yellow
  }
} catch {
  Write-Host "Logs Request fehlgeschlagen (vermutlich fehlende Admin-Rechte)" -ForegroundColor Yellow
}

Write-Host "OK" -ForegroundColor Cyan


