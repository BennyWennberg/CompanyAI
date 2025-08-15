# HR-Modul - API-Dokumentation

## 🔌 API-Übersicht

**Base URL:** `http://localhost:5000/api/hr`  
**Authentifizierung:** Bearer Token erforderlich  
**Content-Type:** `application/json`  
**Letzte Aktualisierung:** 8. Dezember 2024

## 🔐 Authentifizierung

Alle HR-API-Endpunkte erfordern Authentifizierung via Bearer Token:

```http
Authorization: Bearer <token>
```

### Test-Tokens (Development)
```bash
# HR Manager (Vollzugriff)
$hrToken = "aHIubWFuYWdlckBjb21wYW55LmNvbQ=="

# HR Specialist (Eingeschränkt)
$specialistToken = "aHIuc3BlY2lhbGlzdEBjb21wYW55LmNvbQ=="

# Admin (Vollzugriff)
$adminToken = "YWRtaW5AY29tcGFueS5jb20="
```

## 👥 Mitarbeiter-Management

## 🧩 Datenquellen-Integration (NEU)

- Lesen: Lese-Endpunkte beziehen Daten aus der kombinierten Quelle (entra + manual).
- Schreiben: Create/Update wirken ausschließlich auf die manuelle Quelle (`manual`). Einträge aus `entra` sind read‑only.
- IDs: `employeeId` entspricht der CombinedUser‑ID. Bei Create erzeugt `manual` neue UUIDs.

### 1. Mitarbeiter auflisten

```http
GET /api/hr/employees
```

**Berechtigungen:** `read:employee_data`

#### Query-Parameter
| Parameter | Typ | Optional | Beschreibung |
|-----------|-----|----------|--------------|
| `employeeId` | string | ✅ | Spezifische Mitarbeiter-ID |
| `department` | string | ✅ | Filter nach Abteilung |
| `status` | string | ✅ | Filter nach Status (`active`, `inactive`, `pending`) |
| `limit` | number | ✅ | Anzahl Ergebnisse (default: 10, max: 100) |
| `offset` | number | ✅ | Offset für Pagination (default: 0) |

#### Beispiel-Request
```bash
curl -X GET "http://localhost:5000/api/hr/employees?department=IT&limit=5" \
  -H "Authorization: Bearer $hrToken"
```

#### Beispiel-Response
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "emp_001",
        "firstName": "Max",
        "lastName": "Mustermann",
        "email": "max.mustermann@company.com",
        "department": "IT",
        "position": "Senior Developer",
        "startDate": "2022-03-15T00:00:00.000Z",
        "status": "active"
      }
    ],
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 5,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "message": "1 Mitarbeiter gefunden"
}
```

### 2. Einzelnen Mitarbeiter abrufen

```http
GET /api/hr/employees/:employeeId
```

**Berechtigungen:** `read:employee_data`

#### Beispiel-Request
```bash
curl -X GET "http://localhost:5000/api/hr/employees/emp_001" \
  -H "Authorization: Bearer $hrToken"
```

#### Beispiel-Response
```json
{
  "success": true,
  "data": {
    "id": "emp_001",
    "firstName": "Max",
    "lastName": "Mustermann",
    "email": "max.mustermann@company.com",
    "department": "IT",
    "position": "Senior Developer",
    "startDate": "2022-03-15T00:00:00.000Z",
    "status": "active"
  },
  "message": "Mitarbeiter erfolgreich geladen"
}
```

### 3. Neuen Mitarbeiter erstellen

Hinweis: Schreibt in `manual` (entra ist read‑only).

```http
POST /api/hr/employees
```

**Berechtigungen:** `write:employee_data`

#### Request-Body
```json
{
  "firstName": "Anna",
  "lastName": "Schmidt",
  "email": "anna.schmidt@company.com",
  "department": "Sales",
  "position": "Sales Manager",
  "startDate": "2024-01-15",
  "status": "active"
}
```

#### Beispiel-Request
```bash
curl -X POST "http://localhost:5000/api/hr/employees" \
  -H "Authorization: Bearer $hrToken" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Anna",
    "lastName": "Schmidt",
    "email": "anna.schmidt@company.com",
    "department": "Sales",
    "position": "Sales Manager",
    "startDate": "2024-01-15",
    "status": "active"
  }'
```

#### Beispiel-Response
```json
{
  "success": true,
  "data": {
    "id": "emp_007",
    "firstName": "Anna",
    "lastName": "Schmidt",
    "email": "anna.schmidt@company.com",
    "department": "Sales",
    "position": "Sales Manager",
    "startDate": "2024-01-15T00:00:00.000Z",
    "status": "active"
  },
  "message": "Mitarbeiter erfolgreich erstellt"
}
```

### 4. Mitarbeiter aktualisieren

Hinweis: Aktualisiert Einträge in `manual`. Für `entra`‑Datensätze ist Update nicht möglich.

```http
PUT /api/hr/employees/:employeeId
```

**Berechtigungen:** `write:employee_data`

#### Request-Body (Partial Update)
```json
{
  "position": "Lead Developer",
  "department": "IT"
}
```

#### Beispiel-Request
```bash
curl -X PUT "http://localhost:5000/api/hr/employees/emp_001" \
  -H "Authorization: Bearer $hrToken" \
  -H "Content-Type: application/json" \
  -d '{"position": "Lead Developer"}'
```

## 📊 Statistiken & Analytics

### 5. Mitarbeiterstatistiken abrufen

```http
GET /api/hr/stats
```

**Berechtigungen:** `read:reports`

#### Beispiel-Request
```bash
curl -X GET "http://localhost:5000/api/hr/stats" \
  -H "Authorization: Bearer $hrToken"
```

#### Beispiel-Response
```json
{
  "success": true,
  "data": {
    "totalEmployees": 6,
    "byDepartment": {
      "IT": 2,
      "Sales": 2,
      "Marketing": 1,
      "HR": 1
    },
    "byStatus": {
      "active": 4,
      "pending": 1,
      "inactive": 1
    },
    "averageTenure": 18.5
  },
  "message": "Mitarbeiterstatistiken erfolgreich geladen"
}
```

## 📋 Onboarding-Management

### 6. Onboarding-Plan erstellen

```http
POST /api/hr/onboarding/plans
```

**Berechtigungen:** `write:onboarding`

#### Request-Body
```json
{
  "employeeId": "emp_001",
  "department": "IT",
  "position": "Software Developer",
  "customTasks": [
    {
      "title": "Git-Repository Zugang",
      "description": "Zugang zu allen relevanten Git-Repositories einrichten",
      "category": "equipment",
      "dueDate": "2024-12-10T00:00:00.000Z"
    }
  ]
}
```

#### Beispiel-Request
```bash
curl -X POST "http://localhost:5000/api/hr/onboarding/plans" \
  -H "Authorization: Bearer $hrToken" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "emp_001",
    "department": "IT",
    "position": "Software Developer"
  }'
```

#### Beispiel-Response
```json
{
  "success": true,
  "data": {
    "employeeId": "emp_001",
    "tasks": [
      {
        "id": "task_1733641234567_abc123def",
        "title": "Laptop und Zugangsdaten einrichten",
        "description": "Hardware bereitstellen und IT-Accounts erstellen",
        "category": "equipment",
        "dueDate": "2024-12-09T06:47:14.567Z",
        "completed": false
      }
    ],
    "estimatedDuration": 7,
    "assignedTo": "hr@company.com",
    "status": "draft",
    "createdAt": "2024-12-08T06:47:14.567Z"
  },
  "message": "Onboarding-Plan für IT erfolgreich erstellt"
}
```

### 7. Onboarding-Aufgabe aktualisieren

```http
PUT /api/hr/onboarding/plans/:planId/tasks/:taskId
```

**Berechtigungen:** `write:onboarding`

#### Request-Body
```json
{
  "completed": true,
  "assignedTo": "it-admin@company.com"
}
```

## 📈 Reporting

### 8. HR-Report erstellen

```http
POST /api/hr/reports
```

**Berechtigungen:** `write:reports`

#### Request-Body
```json
{
  "type": "monthly",
  "title": "Dezember 2024 HR-Report",
  "dateRange": {
    "start": "2024-12-01",
    "end": "2024-12-31"
  },
  "includeMetrics": ["departmentBreakdown", "growthTrends"]
}
```

#### Beispiel-Request
```bash
curl -X POST "http://localhost:5000/api/hr/reports" \
  -H "Authorization: Bearer $hrToken" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "monthly",
    "dateRange": {
      "start": "2024-12-01",
      "end": "2024-12-31"
    }
  }'
```

#### Beispiel-Response
```json
{
  "success": true,
  "data": {
    "id": "hr_report_1733641234567_xyz789",
    "type": "monthly",
    "title": "Monatlicher HR-Report (01.12.2024 - 31.12.2024)",
    "dateRange": {
      "start": "2024-12-01T00:00:00.000Z",
      "end": "2024-12-31T00:00:00.000Z"
    },
    "metrics": {
      "totalEmployees": 6,
      "newHires": 2,
      "departures": 0,
      "averageOnboardingTime": 10.5
    },
    "generatedAt": "2024-12-08T06:47:14.567Z",
    "generatedBy": "hr.manager@company.com"
  },
  "message": "Monthly HR-Report erfolgreich erstellt"
}
```

### 9. Detaillierten HR-Report erstellen

```http
POST /api/hr/reports/detailed
```

**Berechtigungen:** `write:reports`

Identisch zu normalem Report, aber mit zusätzlichen Analytics:

#### Zusätzliche Response-Felder
```json
{
  "additionalAnalytics": {
    "departmentBreakdown": [
      {
        "department": "IT",
        "count": 2,
        "percentage": 33.33
      }
    ],
    "statusDistribution": [
      {
        "status": "active",
        "count": 4,
        "percentage": 66.67
      }
    ],
    "tenureAnalysis": {
      "averageTenure": 1.85,
      "medianTenure": 1.5,
      "minTenure": 0.25,
      "maxTenure": 4.5
    },
    "growthTrends": [
      {
        "month": "2024-12",
        "hires": 2
      }
    ]
  }
}
```

## 🛠️ Development & Testing

### 10. Test-Daten generieren

```http
POST /api/hr/test-data
```

**Berechtigungen:** `admin:all`

#### Beispiel-Request
```bash
curl -X POST "http://localhost:5000/api/hr/test-data" \
  -H "Authorization: Bearer $adminToken"
```

#### Beispiel-Response
```json
{
  "success": true,
  "data": {
    "onboardingPlan": { /* Beispiel Onboarding-Plan */ },
    "hrReport": { /* Beispiel HR-Report */ },
    "employeeStats": { /* Aktuelle Statistiken */ }
  },
  "message": "Test-Daten erfolgreich generiert"
}
```

## ❌ Error-Handling

### Standard-Error-Response
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Deutsche Fehlermeldung für den Benutzer"
}
```

### HTTP-Status-Codes
| Status | Beschreibung | Beispiel |
|--------|--------------|----------|
| `200` | OK | Erfolgreiche GET-Requests |
| `201` | Created | Erfolgreich erstellte Ressourcen |
| `400` | Bad Request | Validierungsfehler, fehlende Parameter |
| `401` | Unauthorized | Fehlende oder ungültige Authentifizierung |
| `403` | Forbidden | Keine Berechtigung für diese Aktion |
| `404` | Not Found | Ressource nicht gefunden |
| `500` | Internal Server Error | Server-Fehler |

### Häufige Fehler

#### 401 - Authentifizierung erforderlich
```json
{
  "success": false,
  "error": "Authentication required",
  "message": "Bitte geben Sie einen gültigen Authorization Header an"
}
```

#### 403 - Unzureichende Berechtigungen
```json
{
  "success": false,
  "error": "Insufficient permissions",
  "message": "Keine Berechtigung für write auf employee_data"
}
```

#### 400 - Validierungsfehler
```json
{
  "success": false,
  "error": "Validierungsfehler",
  "message": "Vorname ist erforderlich, Ungültige E-Mail-Adresse"
}
```

#### 404 - Ressource nicht gefunden
```json
{
  "success": false,
  "error": "Mitarbeiter nicht gefunden",
  "message": "Kein Mitarbeiter mit ID emp_999 gefunden"
}
```

## 🧪 Testing mit PowerShell

### Basis-Test-Script
```powershell
# Token setzen
$hrToken = "aHIubWFuYWdlckBjb21wYW55LmNvbQ=="
$headers = @{ Authorization = "Bearer $hrToken" }

# Mitarbeiter auflisten
$employees = Invoke-RestMethod -Uri "http://localhost:5000/api/hr/employees" -Headers $headers

# Statistiken abrufen
$stats = Invoke-RestMethod -Uri "http://localhost:5000/api/hr/stats" -Headers $headers

# Neuen Mitarbeiter erstellen
$newEmployee = @{
    firstName = "Test"
    lastName = "User"
    email = "test@company.com"
    department = "IT"
    position = "Developer"
    startDate = (Get-Date).ToString("yyyy-MM-dd")
    status = "active"
} | ConvertTo-Json

$created = Invoke-RestMethod -Uri "http://localhost:5000/api/hr/employees" -Method POST -Headers (@{Authorization="Bearer $hrToken"; "Content-Type"="application/json"}) -Body $newEmployee
```

### Vollständiger Test
Nutzen Sie das bereitgestellte PowerShell-Script: `tools/test-modules.ps1`

---

**API-Version:** 2.0.0  
**Letzte Aktualisierung:** 8. Dezember 2024  
**Dokumentations-Status:** Vollständig
