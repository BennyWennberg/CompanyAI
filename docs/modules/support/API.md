# Support-Modul - API-Dokumentation

## 🔌 API-Übersicht

**Base URL:** `http://localhost:5000/api/support`  
**Authentifizierung:** Bearer Token erforderlich  
**Content-Type:** `application/json`  
**Version:** 1.0.0  
**Letzte Aktualisierung:** 8. Dezember 2024

## 🔐 Authentifizierung

Alle Support-API-Endpunkte erfordern Authentifizierung via Bearer Token:

```http
Authorization: Bearer <token>
```

### Test-Tokens (Development)
```bash
# Admin (Vollzugriff - empfohlen für Support)
$adminToken = "YWRtaW5AY29tcGFueS5jb20="

# HR Manager (Funktioniert auch für Support)
$hrToken = "aHIubWFuYWdlckBjb21wYW55LmNvbQ=="
```

**Hinweis:** Das Support-Modul nutzt aktuell die HR-Authentifizierung. Support-spezifische Rollen sind für v1.1 geplant.

## 🎫 Ticket-Management

### 1. Neues Ticket erstellen

```http
POST /api/support/tickets
```

**Berechtigungen:** Authentifizierter Benutzer

#### Request-Body
```json
{
  "title": "Titel des Support-Tickets",
  "description": "Detaillierte Beschreibung des Problems",
  "category": "technical",
  "priority": "high",
  "customerId": "cust_001",
  "customerEmail": "kunde@example.com"
}
```

#### Parameter-Validierung
| Parameter | Typ | Erforderlich | Optionen |
|-----------|-----|--------------|----------|
| `title` | string | ✅ | Max. 200 Zeichen |
| `description` | string | ✅ | Max. 2000 Zeichen |
| `category` | string | ✅ | `technical`, `account`, `billing`, `general` |
| `priority` | string | ✅ | `low`, `medium`, `high`, `urgent` |
| `customerId` | string | ✅ | Eindeutige Kunden-ID |
| `customerEmail` | string | ✅ | Gültige E-Mail-Adresse |

#### Beispiel-Request
```bash
curl -X POST "http://localhost:5000/api/support/tickets" \
  -H "Authorization: Bearer $adminToken" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Login-Probleme mit Mobile App",
    "description": "Benutzer kann sich nicht in die iOS-App einloggen. Fehlermeldung: Auth Error 401",
    "category": "technical",
    "priority": "high",
    "customerId": "cust_12345",
    "customerEmail": "max.kunde@example.com"
  }'
```

#### Beispiel-Response
```json
{
  "success": true,
  "data": {
    "id": "ticket_003",
    "title": "Login-Probleme mit Mobile App",
    "description": "Benutzer kann sich nicht in die iOS-App einloggen. Fehlermeldung: Auth Error 401",
    "category": "technical",
    "priority": "high",
    "status": "open",
    "customerId": "cust_12345",
    "customerEmail": "max.kunde@example.com",
    "assignedTo": null,
    "createdAt": "2024-12-08T07:30:15.123Z",
    "updatedAt": "2024-12-08T07:30:15.123Z",
    "resolvedAt": null
  },
  "message": "Ticket erfolgreich erstellt"
}
```

### 2. Tickets suchen und auflisten

```http
GET /api/support/tickets
```

**Berechtigungen:** Authentifizierter Benutzer

#### Query-Parameter
| Parameter | Typ | Optional | Beschreibung |
|-----------|-----|----------|--------------|
| `status` | string | ✅ | Filter nach Status (`open`, `in_progress`, `waiting_customer`, `resolved`, `closed`) |
| `category` | string | ✅ | Filter nach Kategorie (`technical`, `account`, `billing`, `general`) |
| `priority` | string | ✅ | Filter nach Priorität (`low`, `medium`, `high`, `urgent`) |
| `assignedTo` | string | ✅ | Filter nach zugewiesenem Agent |
| `customerId` | string | ✅ | Filter nach Kunden-ID |
| `limit` | number | ✅ | Anzahl Ergebnisse (default: 10, max: 100) |
| `offset` | number | ✅ | Offset für Pagination (default: 0) |

#### Beispiel-Requests

##### Alle Tickets abrufen
```bash
curl -X GET "http://localhost:5000/api/support/tickets" \
  -H "Authorization: Bearer $adminToken"
```

##### Nach Status filtern
```bash
curl -X GET "http://localhost:5000/api/support/tickets?status=open&priority=high" \
  -H "Authorization: Bearer $adminToken"
```

##### Mit Pagination
```bash
curl -X GET "http://localhost:5000/api/support/tickets?limit=5&offset=0" \
  -H "Authorization: Bearer $adminToken"
```

#### Beispiel-Response
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "ticket_001",
        "title": "Login-Probleme mit neuer App",
        "description": "Kunde kann sich nicht in die neue Mobile App einloggen",
        "category": "technical",
        "priority": "high",
        "status": "open",
        "customerId": "cust_001",
        "customerEmail": "kunde@example.com",
        "assignedTo": "support@company.com",
        "createdAt": "2023-12-01T00:00:00.000Z",
        "updatedAt": "2023-12-01T00:00:00.000Z",
        "resolvedAt": null
      },
      {
        "id": "ticket_002",
        "title": "Rechnungsanfrage für Dezember",
        "description": "Kunde benötigt detaillierte Rechnung für Dezember 2023",
        "category": "billing",
        "priority": "medium",
        "status": "resolved",
        "customerId": "cust_002",
        "customerEmail": "billing@kunde.de",
        "assignedTo": "finance@company.com",
        "createdAt": "2023-12-05T00:00:00.000Z",
        "updatedAt": "2023-12-06T00:00:00.000Z",
        "resolvedAt": "2023-12-06T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 2,
      "page": 1,
      "limit": 10,
      "hasNext": false,
      "hasPrev": false
    }
  },
  "message": "2 Tickets gefunden"
}
```

### 3. Ticket aktualisieren

```http
PUT /api/support/tickets/:ticketId
```

**Berechtigungen:** Authentifizierter Benutzer

#### URL-Parameter
| Parameter | Typ | Beschreibung |
|-----------|-----|--------------|
| `ticketId` | string | Eindeutige Ticket-ID |

#### Request-Body (Partial Update)
```json
{
  "title": "Neuer Titel (optional)",
  "description": "Aktualisierte Beschreibung (optional)",
  "priority": "urgent",
  "status": "in_progress",
  "assignedTo": "agent@company.com"
}
```

#### Updatebare Felder
| Feld | Typ | Optionen |
|------|-----|----------|
| `title` | string | Max. 200 Zeichen |
| `description` | string | Max. 2000 Zeichen |
| `priority` | string | `low`, `medium`, `high`, `urgent` |
| `status` | string | `open`, `in_progress`, `waiting_customer`, `resolved`, `closed` |
| `assignedTo` | string | E-Mail oder Agent-ID |

#### Beispiel-Requests

##### Status und Zuweisung ändern
```bash
curl -X PUT "http://localhost:5000/api/support/tickets/ticket_001" \
  -H "Authorization: Bearer $adminToken" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "assignedTo": "senior.agent@company.com",
    "priority": "urgent"
  }'
```

##### Ticket schließen
```bash
curl -X PUT "http://localhost:5000/api/support/tickets/ticket_001" \
  -H "Authorization: Bearer $adminToken" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "resolved",
    "description": "Problem wurde durch App-Update behoben. Kunde bestätigt Lösung."
  }'
```

#### Beispiel-Response
```json
{
  "success": true,
  "data": {
    "id": "ticket_001",
    "title": "Login-Probleme mit neuer App",
    "description": "Problem wurde durch App-Update behoben. Kunde bestätigt Lösung.",
    "category": "technical",
    "priority": "urgent",
    "status": "resolved",
    "customerId": "cust_001",
    "customerEmail": "kunde@example.com",
    "assignedTo": "senior.agent@company.com",
    "createdAt": "2023-12-01T00:00:00.000Z",
    "updatedAt": "2024-12-08T07:45:30.456Z",
    "resolvedAt": "2024-12-08T07:45:30.456Z"
  },
  "message": "Ticket erfolgreich aktualisiert"
}
```

## 📊 Ticket-Kategorien & Prioritäten

### Verfügbare Kategorien
| Kategorie | Beschreibung | Typische Tickets |
|-----------|--------------|------------------|
| `technical` | Technische Probleme | Login-Fehler, App-Crashes, API-Probleme |
| `account` | Account-Management | Passwort-Reset, Profil-Updates, Zugriffsprobleme |
| `billing` | Rechnungs-/Zahlungsthemen | Rechnungsanfragen, Zahlungsprobleme, Stornierungen |
| `general` | Allgemeine Anfragen | Produktfragen, Feature-Requests, Feedback |

### Prioritätsstufen
| Priorität | SLA-Zeit | Verwendung |
|-----------|----------|------------|
| `urgent` | < 1h | Kritische System-Ausfälle, Sicherheitsprobleme |
| `high` | < 4h | Wichtige Funktionen betroffen, viele Nutzer betroffen |
| `medium` | < 24h | Standard-Support-Anfragen, individuelle Probleme |
| `low` | < 72h | Unkritische Anfragen, Verbesserungsvorschläge |

### Status-Workflow
```
open → in_progress → waiting_customer → resolved → closed
 ↓         ↓              ↓               ↓
[Kann jederzeit zurück zu "in_progress" wechseln]
```

#### Status-Beschreibungen
| Status | Beschreibung | Nächste Schritte |
|--------|--------------|------------------|
| `open` | Neues, noch nicht bearbeitetes Ticket | Zuweisung an Agent |
| `in_progress` | Agent arbeitet aktiv an dem Ticket | Lösung erarbeiten |
| `waiting_customer` | Warten auf Kundenrückmeldung | Kunden-Response abwarten |
| `resolved` | Problem gelöst, Bestätigung ausstehend | Kunden-Feedback einholen |
| `closed` | Ticket vollständig abgeschlossen | Archivierung |

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
| `200` | OK | Erfolgreiche GET/PUT-Requests |
| `201` | Created | Erfolgreich erstellte Tickets |
| `400` | Bad Request | Validierungsfehler, fehlende Parameter |
| `401` | Unauthorized | Fehlende oder ungültige Authentifizierung |
| `404` | Not Found | Ticket nicht gefunden |
| `500` | Internal Server Error | Server-Fehler |

### Häufige Fehlerszenarien

#### 404 - Ticket nicht gefunden
```json
{
  "success": false,
  "error": "Ticket nicht gefunden",
  "message": "Kein Ticket mit ID ticket_999 gefunden"
}
```

#### 400 - Validierungsfehler
```json
{
  "success": false,
  "error": "Validierungsfehler",
  "message": "Titel ist erforderlich, Ungültige E-Mail-Adresse"
}
```

#### 401 - Authentifizierung erforderlich
```json
{
  "success": false,
  "error": "Authentication required",
  "message": "Bitte geben Sie einen gültigen Authorization Header an"
}
```

## 🧪 Testing mit PowerShell

### Basis-Test-Script
```powershell
# Token setzen
$adminToken = "YWRtaW5AY29tcGFueS5jb20="
$headers = @{ 
    Authorization = "Bearer $adminToken"
    "Content-Type" = "application/json"
}

# Neues Ticket erstellen
$newTicket = @{
    title = "Test Support Ticket"
    description = "Dies ist ein Test-Ticket für die API"
    category = "technical"
    priority = "medium"
    customerId = "test_customer_001"
    customerEmail = "test@kunde.de"
} | ConvertTo-Json

$created = Invoke-RestMethod -Uri "http://localhost:5000/api/support/tickets" -Method POST -Headers $headers -Body $newTicket

# Tickets auflisten
$tickets = Invoke-RestMethod -Uri "http://localhost:5000/api/support/tickets" -Method GET -Headers (@{Authorization="Bearer $adminToken"})

# Ticket aktualisieren
$update = @{
    status = "in_progress"
    assignedTo = "agent@company.com"
    priority = "high"
} | ConvertTo-Json

$updated = Invoke-RestMethod -Uri "http://localhost:5000/api/support/tickets/$($created.data.id)" -Method PUT -Headers $headers -Body $update
```

### Vollständiger Test
Das Support-Modul ist im bereitgestellten PowerShell-Script `tools/test-modules.ps1` integriert.

## 🔄 Aktuelle Limitierungen

### Nicht implementierte Features
- ❌ **Ticket-Details abrufen:** GET `/api/support/tickets/:id`
- ❌ **Ticket-Historie:** Änderungsprotokoll
- ❌ **File-Attachments:** Upload von Dateien
- ❌ **Kommentar-System:** Interne Notizen
- ❌ **Automatische Zuweisungen:** Round-Robin, Skills-based
- ❌ **SLA-Monitoring:** Zeitüberschreitung-Alerts
- ❌ **Bulk-Operationen:** Mehrere Tickets gleichzeitig bearbeiten

### Geplante API-Erweiterungen (v1.1)
- [ ] `GET /api/support/tickets/:id` - Einzelnes Ticket abrufen
- [ ] `POST /api/support/tickets/:id/comments` - Kommentare hinzufügen
- [ ] `POST /api/support/tickets/:id/attachments` - File-Upload
- [ ] `GET /api/support/dashboard` - Support-Metriken Dashboard
- [ ] `GET /api/support/categories` - Verfügbare Kategorien
- [ ] `PUT /api/support/tickets/bulk` - Bulk-Updates

---

**API-Version:** 1.0.0  
**Letzte Aktualisierung:** 8. Dezember 2024  
**Dokumentations-Status:** Vollständig für v1.0  
**Nächste Version:** v1.1 mit erweiterten API-Endpunkten
