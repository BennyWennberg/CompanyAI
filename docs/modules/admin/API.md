# Admin Portal - API Dokumentation

## 📡 API-Übersicht

**Base URL:** `http://localhost:5000/api`  
**Auth:** Bearer Token (Required)  
**Content-Type:** `application/json`  
**Version:** 2.0.0

## 🔐 Authentifizierung

```powershell
$token = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin@company.com"))
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
```

## 👥 User Management Endpoints

### 1. Benutzer auflisten
**`GET /api/admin/users`**

Query Parameter: `page`, `limit`, `provider`, `role`, `status`

```powershell
# Alle Benutzer
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/users" -Headers $headers

# Gefiltert
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/users?provider=azure-ad&limit=5" -Headers $headers
Write-Host "✅ Gefunden: $($response.data.pagination.total) Benutzer"
```

Response:
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "user_001",
        "firstName": "Max", 
        "lastName": "Mustermann",
        "email": "max@company.com",
        "role": "USER",
        "status": "active",
        "provider": "azure-ad",
        "quotas": {
          "tokensPerDay": 5000,
          "tokensUsedToday": 1250,
          "requestsPerHour": 50,
          "allowedModels": ["gpt-4o-mini"]
        },
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1, 
      "limit": 10,
      "hasNext": false
    }
  }
}
```

### 2. Benutzer erstellen
**`POST /api/admin/users`**

```powershell
$newUser = @{
    firstName = "Anna"
    lastName = "Schmidt"
    email = "anna@company.com"
    role = "HR_ADMIN"
    quotas = @{
        tokensPerDay = 10000
        requestsPerHour = 100
    }
}

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/users" -Method POST -Headers $headers -Body ($newUser | ConvertTo-Json -Depth 3)
```

### 3. Benutzer aktualisieren  
**`PUT /api/admin/users/:id`**

```powershell
$updateData = @{ role = "ADMIN"; status = "active" }
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/users/user_001" -Method PUT -Headers $headers -Body ($updateData | ConvertTo-Json)
```

### 4. Benutzer löschen
**`DELETE /api/admin/users/:id`**

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/users/user_001" -Method DELETE -Headers $headers
```

## 📊 Analytics Endpoints

### 5. Benutzer-Analytics
**`GET /api/admin/analytics/metrics`**

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/analytics/metrics" -Headers $headers

Write-Host "📊 Analytics:"
Write-Host "Gesamt: $($response.data.totalUsers)"
Write-Host "Aktiv: $($response.data.activeUsers)"
Write-Host "Neu (Monat): $($response.data.newUsersThisMonth)"
```

Response:
```json
{
  "success": true,
  "data": {
    "totalUsers": 5,
    "activeUsers": 4,
    "newUsersThisMonth": 2,
    "topProviders": [
      { "provider": "azure-ad", "count": 3 },
      { "provider": "manual", "count": 2 }
    ],
    "usersByRole": [
      { "role": "USER", "count": 3 },
      { "role": "ADMIN", "count": 1 }
    ],
    "dailyActiveUsers": [12, 15, 18, 14, 16, 13, 17]
  }
}
```

### 6. System-Metriken
**`GET /api/admin/analytics/system`**

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/analytics/system" -Headers $headers

Write-Host "⚙️ System:"
Write-Host "Status: $($response.data.serverStatus.toUpper())"
Write-Host "Memory: $([math]::Round($response.data.memoryUsage.percentage, 1))%"
Write-Host "Response: $($response.data.responseTime.average)ms"
```

Response:
```json
{
  "success": true,
  "data": {
    "serverStatus": "healthy",
    "uptime": 86400,
    "memoryUsage": {
      "used": 524288000,
      "total": 2147483648,
      "percentage": 24.4
    },
    "responseTime": {
      "average": 45,
      "p95": 120,
      "p99": 250
    },
    "apiCalls": {
      "total": 15420,
      "last24h": 1240,
      "errors": 23,
      "errorRate": 1.85
    },
    "databaseStatus": {
      "connected": true,
      "queries": 8532,
      "avgQueryTime": 12
    }
  }
}
```

## 🔄 Sync Management

### 7. Sync-Status
**`GET /api/admin/sync/status`**

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/admin/sync/status" -Headers $headers

$response.data | ForEach-Object {
    $icon = switch ($_.provider) {
        "azure-ad" { "🔵" }; "ldap" { "🏢" }; "manual" { "👤" }
    }
    Write-Host "$icon $($_.provider): $($_.status) - $($_.usersCount) Benutzer"
}
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "provider": "azure-ad",
      "enabled": true,
      "lastSync": "2025-08-21T12:00:00.000Z", 
      "status": "success",
      "usersCount": 3
    },
    {
      "provider": "manual",
      "enabled": true,
      "lastSync": "2025-08-21T12:00:00.000Z",
      "status": "success", 
      "usersCount": 2
    },
    {
      "provider": "ldap",
      "enabled": false,
      "lastSync": null,
      "status": "idle",
      "usersCount": 0
    }
  ]
}
```

## 🚨 Error Handling

### Standard-Fehlercodes:
- **400**: ValidationError - Ungültige Eingabe
- **401**: Unauthorized - Fehlende Auth
- **403**: Forbidden - Keine Berechtigung
- **404**: NotFound - Resource nicht gefunden
- **409**: Conflict - Duplikat (E-Mail vergeben)
- **500**: InternalServerError - Server-Fehler

### Error-Response:
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "Vorname, Nachname und E-Mail sind erforderlich"
}
```

### PowerShell Error-Handling:
```powershell
try {
    $response = Invoke-RestMethod -Uri $url -Method $method -Headers $headers -Body $body
    if ($response.success) {
        Write-Host "✅ Erfolg: $($response.message)"
    } else {
        Write-Host "❌ Fehler: $($response.message)"
    }
} catch {
    $errorDetails = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "❌ HTTP-Fehler: $($errorDetails.message)"
}
```

## 📋 Test-Script

**Vollständiger API-Test** (`test-admin-api.ps1`):

```powershell
# Admin Portal API Tests
$baseUrl = "http://localhost:5000/api"
$token = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("admin@company.com"))
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "🔑 Admin Portal API Tests" -ForegroundColor Yellow

# 1. Users
try {
    $users = Invoke-RestMethod -Uri "$baseUrl/admin/users" -Headers $headers
    Write-Host "✅ Users: $($users.data.pagination.total) gefunden"
} catch { Write-Host "❌ Users Test fehlgeschlagen" -ForegroundColor Red }

# 2. Analytics
try {
    $analytics = Invoke-RestMethod -Uri "$baseUrl/admin/analytics/metrics" -Headers $headers
    Write-Host "✅ Analytics: $($analytics.data.totalUsers) total, $($analytics.data.activeUsers) aktiv"
} catch { Write-Host "❌ Analytics Test fehlgeschlagen" -ForegroundColor Red }

# 3. System Metrics
try {
    $metrics = Invoke-RestMethod -Uri "$baseUrl/admin/analytics/system" -Headers $headers
    Write-Host "✅ Metrics: $($metrics.data.serverStatus), $([math]::Round($metrics.data.memoryUsage.percentage,1))% Memory"
} catch { Write-Host "❌ Metrics Test fehlgeschlagen" -ForegroundColor Red }

# 4. Sync Status
try {
    $sync = Invoke-RestMethod -Uri "$baseUrl/admin/sync/status" -Headers $headers
    Write-Host "✅ Sync: $($sync.data.Count) Provider gefunden"
} catch { Write-Host "❌ Sync Test fehlgeschlagen" -ForegroundColor Red }

Write-Host "`n🎉 Admin API Tests abgeschlossen!" -ForegroundColor Green
```

## 🎯 Frontend Integration

```typescript
// React Component API Integration
const loadUsers = async () => {
  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch('http://localhost:5000/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const result = await response.json();
    if (result.success) {
      setUsers(result.data.data);
    }
  } catch (error) {
    setError('Backend-Verbindungsfehler');
  }
};
```

---

**Admin Portal API v2.0.0** - Enterprise User Management  
**Status:** Production-Ready ✅ | **Update:** 21. August 2025
