# Admin-Portal API-Dokumentation

Vollständige API-Referenz für das Admin-Portal Multi-Source User-Integration Modul.

## Inhaltsverzeichnis

- [Überblick](#überblick)
- [Authentifizierung](#authentifizierung) 
- [Sync Management APIs](#sync-management-apis)
- [User Management APIs](#user-management-apis)
- [Upload APIs](#upload-apis)
- [Manual User APIs](#manual-user-apis)
- [Dashboard & Stats APIs](#dashboard--stats-apis)
- [Conflict Management APIs](#conflict-management-apis)
- [Permissions System APIs](#permissions-system-apis) - **NEU v2.0.0**
- [Hierarchical Permissions APIs](#hierarchical-permissions-apis) - **NEU v2.1.0**
- [Testing & Connectivity APIs](#testing--connectivity-apis)
- [Export APIs](#export-apis)
- [PowerShell Examples](#powershell-examples)
- [Error Handling](#error-handling)

## Überblick

**Base URL:** `http://localhost:5000/api/admin-portal`  
**Gesamt Endpunkte:** 68+ API-Endpoints (v2.0.0)  
**Authentifizierung:** Bearer Token (Admin-Berechtigung erforderlich)

### API-Kategorien

| Kategorie | Endpunkte | Beschreibung |
|-----------|-----------|--------------|
| **Entra Admin Center** | **2** | **Direkte Integration mit Entra Admin Center** |
| Sync Management | 4 | Synchronisation aller User-Quellen |
| User Overview | 2 | Vereinheitlichte User-Ansicht |
| Upload Processing | 3 | CSV/Excel Bulk-Import |
| Manual Users | 5 | Web-basierte User-Verwaltung |
| Dashboard & Stats | 2 | Statistiken und Metriken |
| Conflict Resolution | 2 | E-Mail-Konflikt-Management |
| **Permissions System** | **20** | **Rollen-, Gruppen- und Token-Management (NEU v2.0.0)** |
| Scheduler Management | 7 | Automatische Sync-Planung |
| Testing | 1 | Verbindungstests |
| Export | 1 | Daten-Export |
| Development | 1 | Test-Daten-Generierung |

## Authentifizierung

Alle API-Endpunkte erfordern Admin-Berechtigung:

**Header:**
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Erforderliche Permission:**
```typescript
requirePermission('admin', 'admin_users')
```

## Entra Admin Center APIs

### 1. Fetch aus Entra Admin Center

**POST** `/admin-portal/entra/fetch-from-admin-center`

Lädt User direkt aus Entra Admin Center und speichert sie in Admin Portal Datenbank. Nutzt die gleiche DataSources Graph API Logic wie das HR Modul.

**Request Body:** (leer)

**Response:**
```typescript
{
  success: true,
  data: {
    usersProcessed: 1250,
    usersAdded: 50,
    usersUpdated: 1180,
    errors: 20,
    duration: 135000  // milliseconds
  },
  message: "Entra Admin Center Sync erfolgreich: 1250 User aus Admin Center geholt und in Datenbank gespeichert"
}
```

**PowerShell Beispiel:**
```powershell
$headers = @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"}
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/entra/fetch-from-admin-center" -Headers $headers -Method Post
Write-Host "User verarbeitet: $($response.data.usersProcessed)"
```

---

### 2. Admin Center Verfügbarkeit prüfen

**GET** `/admin-portal/entra/check-availability`

Prüft ob Entra Admin Center konfiguriert und erreichbar ist.

**Response:**
```typescript
{
  success: true,
  data: {
    isConfigured: true,
    connectionStatus: "connected",
    tenantInfo: {
      displayName: "Company Tenant",
      tenantType: "AAD",
      countryLetterCode: "DE"
    },
    estimatedUserCount: 1250
  },
  message: "Entra Admin Center ist verfügbar"
}
```

**PowerShell Beispiel:**
```powershell
$headers = @{"Authorization" = "Bearer $token"}
$response = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/entra/check-availability" -Headers $headers -Method Get
Write-Host "Status: $($response.data.connectionStatus), User: $($response.data.estimatedUserCount)"
```

---

## Sync Management APIs

### 1. Quelle synchronisieren

**POST** `/admin-portal/sync/:source`

Startet Synchronisation für eine spezifische User-Quelle.

**Parameter:**
- `source` (path): `entra` | `ldap` | `upload` | `manual`

**Request Body:**
```typescript
{
  mode?: 'full' | 'incremental',  // Default: 'full'
  dryRun?: boolean                 // Default: false (nur Test)
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: "sync_job_uuid",
    source: "entra",
    status: "completed",
    startedAt: "2024-12-14T10:30:00.000Z",
    completedAt: "2024-12-14T10:32:15.000Z", 
    startedBy: "admin@company.com",
    results: {
      totalProcessed: 1250,
      added: 50,
      updated: 1180,
      errors: 20,
      conflicts: [
        {
          email: "john.doe@company.com",
          sources: ["entra", "ldap"],
          users: [...]
        }
      ],
      newFields: [
        {
          fieldName: "mobilePhone",
          dataType: "TEXT", 
          maxLength: 50,
          isRequired: false,
          addedAt: "2024-12-14T10:31:00.000Z",
          source: "entra"
        }
      ],
      duration: 135000  // milliseconds
    }
  },
  message: "Entra Sync erfolgreich: 1250 User verarbeitet"
}
```

**Beispiel:**
```bash
curl -X POST http://localhost:5000/api/admin-portal/sync/entra \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode": "full"}'
```

---

### 2. Alle Quellen synchronisieren

**POST** `/admin-portal/sync-all`

Startet parallele Synchronisation aller konfigurierten Quellen.

**Request Body:** (leer)

**Response:**
```typescript
{
  success: true,
  data: {
    syncJobs: [
      {
        id: "sync_entra_uuid",
        source: "entra", 
        status: "completed",
        results: { ... }
      },
      {
        id: "sync_ldap_uuid", 
        source: "ldap",
        status: "completed", 
        results: { ... }
      }
    ],
    summary: {
      completed: 2,
      failed: 0,
      conflicts: 1
    }
  },
  message: "Sync für alle Quellen abgeschlossen: 2 von 2 erfolgreich"
}
```

---

### 3. Sync-Status abrufen

**GET** `/admin-portal/sync/status`

Lädt aktuellen Status aller User-Quellen.

**Response:**
```typescript
{
  success: true,
  data: {
    entra: {
      status: "idle",
      lastSync: "2024-12-14T10:32:15.000Z",
      userCount: 1250,
      isConfigured: true,
      connectionStatus: "connected"
    },
    ldap: {
      status: "syncing",
      lastSync: "2024-12-14T08:15:00.000Z", 
      userCount: 890,
      isConfigured: true,
      connectionStatus: "connected"
    },
    upload: {
      status: "idle",
      lastSync: null,
      userCount: 125,
      isConfigured: true,
      connectionStatus: "connected"
    },
    manual: {
      status: "idle",
      lastSync: null,
      userCount: 45,
      isConfigured: true,
      connectionStatus: "connected"
    }
  },
  message: "Status aller Quellen geladen"
}
```

---

### 4. Sync abbrechen

**DELETE** `/admin-portal/sync/:source`

Bricht laufenden Sync-Job für eine Quelle ab.

**Parameter:**
- `source` (path): `entra` | `ldap`

**Response:**
```typescript
{
  success: true,
  data: true,
  message: "Sync für entra abgebrochen"
}
```

---

## User Management APIs

### 1. Vereinheitlichte User-Liste

**GET** `/admin-portal/users`

Lädt alle User aus allen oder spezifischen Quellen.

**Query Parameters:**
- `sources` (optional): Komma-getrennt `entra,ldap,upload,manual`
- `search` (optional): Suchbegriff für Name/E-Mail
- `isActive` (optional): `true` | `false`
- `page` (optional): Seitenzahl (default: 1)
- `limit` (optional): User pro Seite (default: 50)
- `sortBy` (optional): Sortierfeld (default: `updatedAt`)
- `sortOrder` (optional): `asc` | `desc` (default: `desc`)

**Response:**
```typescript
{
  success: true,
  data: {
    data: [
      {
        id: "entra_user123",
        email: "john.doe@company.com",
        firstName: "John",
        lastName: "Doe", 
        displayName: "John Doe",
        isActive: true,
        lastSync: "2024-12-14T10:32:00.000Z",
        source: "entra",
        externalId: "azure_ad_object_id",
        createdAt: "2024-01-15T08:00:00.000Z",
        updatedAt: "2024-12-14T10:32:00.000Z",
        sourceData: {
          userPrincipalName: "john.doe@company.com",
          jobTitle: "Software Developer",
          department: "IT",
          mobilePhone: "+49 123 456789"
        },
        conflicts: ["Konflikt mit LDAP-Quelle"]
      }
    ],
    pagination: {
      total: 2310,
      page: 1, 
      limit: 50,
      hasNext: true,
      hasPrev: false
    }
  },
  message: "50 von 2310 Usern geladen"
}
```

**Beispiel:**
```bash
curl "http://localhost:5000/api/admin-portal/users?sources=entra,ldap&search=john&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 2. User by E-Mail suchen

**GET** `/admin-portal/users/email/:email`

Sucht User mit spezifischer E-Mail-Adresse über alle Quellen.

**Parameter:**
- `email` (path): E-Mail-Adresse

**Response:**
```typescript
{
  success: true,
  data: [
    {
      id: "entra_user123",
      email: "john.doe@company.com",
      source: "entra",
      displayName: "John Doe",
      conflicts: []
    },
    {
      id: "ldap_user456", 
      email: "john.doe@company.com",
      source: "ldap",
      displayName: "John Doe",
      conflicts: ["E-Mail-Konflikt mit Entra ID"]
    }
  ],
  message: "2 User mit E-Mail john.doe@company.com gefunden"
}
```

---

## Upload APIs

### 1. Upload analysieren

**POST** `/admin-portal/upload/analyze`

Analysiert eine CSV/Excel-Datei ohne zu importieren (Preview).

**Request:** `multipart/form-data`
- `file`: CSV/Excel-Datei (max. 10MB)

**Response:**
```typescript
{
  success: true,
  data: {
    rowCount: 1500,
    columns: ["E-Mail", "Vorname", "Nachname", "Abteilung", "Position"],
    sampleData: [
      {
        "E-Mail": "max.mustermann@company.com",
        "Vorname": "Max", 
        "Nachname": "Mustermann",
        "Abteilung": "IT",
        "Position": "Developer"
      }
    ],
    suggestedMapping: {
      "E-Mail": "email",
      "Vorname": "firstName", 
      "Nachname": "lastName",
      "Abteilung": "department",
      "Position": "jobTitle"
    },
    issues: [
      "15 Zeilen mit ungültigen E-Mail-Adressen",
      "Große Datei (1500 Zeilen) - Upload kann länger dauern"
    ]
  },
  message: "Upload-Analyse abgeschlossen: 1500 Zeilen, 5 Spalten"
}
```

**Beispiel:**
```bash
curl -X POST http://localhost:5000/api/admin-portal/upload/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@users.csv"
```

---

### 2. Upload verarbeiten

**POST** `/admin-portal/upload/process`

Importiert CSV/Excel-Datei in Upload-Datenbank.

**Request:** `multipart/form-data`
- `file`: CSV/Excel-Datei
- `mode`: `add` | `replace`
- `mapping` (optional): JSON-String für Custom-Field-Mapping

**Response:**
```typescript
{
  success: true,
  data: {
    totalProcessed: 1500,
    added: 1480,
    updated: 0,
    errors: 20,
    conflicts: [],
    newFields: [
      {
        fieldName: "employeeId", 
        dataType: "TEXT",
        addedAt: "2024-12-14T11:15:00.000Z"
      }
    ],
    duration: 8500
  },
  message: "Upload erfolgreich: 1500 User verarbeitet"
}
```

**Beispiel:**
```bash
curl -X POST http://localhost:5000/api/admin-portal/upload/process \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@users.csv" \
  -F "mode=add" \
  -F 'mapping={"E-Mail":"email","Vorname":"firstName"}'
```

---

### 3. Upload-Statistiken

**GET** `/admin-portal/upload/stats`

Lädt Statistiken über alle bisherigen Uploads.

**Response:**
```typescript
{
  success: true,
  data: {
    totalUploads: 15,
    totalUsers: 3250,
    recentUploads: [
      {
        batchId: "batch_uuid_123",
        userCount: 1500,
        uploadedAt: "2024-12-14T11:15:00.000Z",
        uploadedBy: "admin@company.com"
      }
    ],
    lastUpload: "2024-12-14T11:15:00.000Z"
  },
  message: "Upload-Statistiken geladen"
}
```

---

## Manual User APIs

### 1. Manuellen User erstellen

**POST** `/admin-portal/manual/users`

Erstellt neuen User über Web-Interface.

**Request Body:**
```typescript
{
  firstName: string,
  lastName: string,
  email: string,
  notes?: string,
  customFields?: { [key: string]: any }
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: "manual_1734180000_abc123",
    firstName: "Anna",
    lastName: "Schmidt", 
    email: "anna.schmidt@company.com",
    displayName: "Anna Schmidt",
    isActive: true,
    createdAt: "2024-12-14T12:00:00.000Z",
    updatedAt: "2024-12-14T12:00:00.000Z",
    source: "manual",
    createdBy: "admin@company.com",
    notes: "Neue Mitarbeiterin IT-Abteilung",
    customFields: {
      "Kostenstelle": "IT-001",
      "Startdatum": "2024-12-16"
    }
  },
  message: "User erfolgreich erstellt"
}
```

**Beispiel:**
```bash
curl -X POST http://localhost:5000/api/admin-portal/manual/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Anna",
    "lastName": "Schmidt",
    "email": "anna.schmidt@company.com",
    "notes": "Neue Mitarbeiterin",
    "customFields": {
      "Kostenstelle": "IT-001"
    }
  }'
```

---

### 2. Manuelle User auflisten

**GET** `/admin-portal/manual/users`

Lädt alle manuell erstellten User.

**Query Parameters:**
- `page` (optional): Seitenzahl (default: 1)
- `limit` (optional): User pro Seite (default: 20)
- `search` (optional): Suchbegriff
- `isActive` (optional): `true` | `false`

**Response:**
```typescript
{
  success: true,
  data: {
    users: [
      {
        id: "manual_user123",
        firstName: "Anna",
        lastName: "Schmidt",
        email: "anna.schmidt@company.com", 
        displayName: "Anna Schmidt",
        isActive: true,
        createdAt: "2024-12-14T12:00:00.000Z",
        updatedAt: "2024-12-14T12:00:00.000Z",
        createdBy: "admin@company.com",
        notes: "Neue Mitarbeiterin",
        customFields: { ... }
      }
    ],
    total: 45
  },
  message: "20 von 45 manuellen Usern geladen"
}
```

---

### 3. Manuellen User abrufen

**GET** `/admin-portal/manual/users/:userId`

Lädt Details eines spezifischen manuellen Users.

**Parameter:**
- `userId` (path): User-ID

**Response:**
```typescript
{
  success: true,
  data: {
    id: "manual_user123",
    firstName: "Anna",
    lastName: "Schmidt",
    // ... vollständige User-Daten
  },
  message: "User erfolgreich geladen"
}
```

---

### 4. Manuellen User aktualisieren

**PUT** `/admin-portal/manual/users/:userId`

Aktualisiert einen bestehenden manuellen User.

**Parameter:**
- `userId` (path): User-ID

**Request Body:**
```typescript
{
  firstName?: string,
  lastName?: string,
  email?: string,
  isActive?: boolean,
  notes?: string,
  customFields?: { [key: string]: any }
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: "manual_user123",
    // ... aktualisierte User-Daten
    updatedAt: "2024-12-14T12:30:00.000Z"
  },
  message: "User erfolgreich aktualisiert"
}
```

---

### 5. Manuellen User löschen

**DELETE** `/admin-portal/manual/users/:userId`

Löscht (deaktiviert) einen manuellen User.

**Parameter:**
- `userId` (path): User-ID

**Response:**
```typescript
{
  success: true,
  data: true,
  message: "User erfolgreich gelöscht"
}
```

---

## Dashboard & Stats APIs

### 1. Dashboard-Statistiken

**GET** `/admin-portal/dashboard/stats`

Lädt Übersichts-Statistiken für Dashboard.

**Response:**
```typescript
{
  success: true,
  data: {
    totalUsers: 2310,
    sourceBreakdown: [
      {
        source: "entra",
        count: 1250,
        status: "idle", 
        lastSync: "2024-12-14T10:32:15.000Z"
      },
      {
        source: "ldap",
        count: 890,
        status: "idle",
        lastSync: "2024-12-14T08:15:00.000Z"
      },
      {
        source: "upload", 
        count: 125,
        status: "idle",
        lastSync: null
      },
      {
        source: "manual",
        count: 45,
        status: "idle", 
        lastSync: null
      }
    ],
    conflicts: 12,
    lastActivity: "2024-12-14T12:00:00.000Z"
  },
  message: "Dashboard-Statistiken geladen"
}
```

---

### 2. Erweiterte Statistiken

**GET** `/admin-portal/stats/advanced`

Lädt detaillierte Analysen aller User-Quellen.

**Response:**
```typescript
{
  success: true,
  data: {
    sourceComparison: [
      {
        source: "entra",
        count: 1250,
        activeCount: 1180,
        uniqueEmails: 1250,
        duplicateEmails: [],
        avgCreatedPerDay: 2.5,
        lastActivity: "2024-12-14T10:32:15.000Z"
      }
    ],
    overallMetrics: {
      uniqueEmailsAcrossSources: 2298,
      duplicateEmailsCount: 12,
      mostActiveSource: "entra", 
      oldestUser: "2020-01-15T08:00:00.000Z",
      newestUser: "2024-12-14T12:00:00.000Z"
    }
  },
  message: "Erweiterte Statistiken geladen"
}
```

---

## Conflict Management APIs

### 1. Konflikte erkennen

**GET** `/admin-portal/conflicts`

Erkennt E-Mail-Konflikte zwischen User-Quellen.

**Response:**
```typescript
{
  success: true,
  data: [
    {
      email: "john.doe@company.com",
      sources: ["entra", "ldap"],
      users: [
        {
          id: "entra_user123",
          source: "entra",
          displayName: "John Doe",
          lastSync: "2024-12-14T10:32:00.000Z",
          isActive: true
        },
        {
          id: "ldap_user456",
          source: "ldap", 
          displayName: "John Doe",
          lastSync: "2024-12-14T08:15:00.000Z",
          isActive: true
        }
      ]
    }
  ],
  message: "12 E-Mail-Konflikte gefunden"
}
```

---

### 2. Konflikt lösen

**POST** `/admin-portal/conflicts/resolve`

Löst E-Mail-Konflikt durch Auswahl einer zu behaltenden Quelle.

**Request Body:**
```typescript
{
  email: string,
  keepSource: 'entra' | 'ldap' | 'upload' | 'manual',
  deleteFromSources: ['entra' | 'ldap' | 'upload' | 'manual'][]
}
```

**Response:**
```typescript
{
  success: true,
  message: "Konflikt für john.doe@company.com aufgelöst - entra beibehalten"
}
```

**Beispiel:**
```bash
curl -X POST http://localhost:5000/api/admin-portal/conflicts/resolve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@company.com",
    "keepSource": "entra", 
    "deleteFromSources": ["ldap"]
  }'
```

---

## Testing & Connectivity APIs

### 1. Verbindungen testen

**GET** `/admin-portal/test/connections`

Testet Verbindungen zu allen externen User-Quellen.

**Response:**
```typescript
{
  success: true,
  data: {
    entra: {
      success: true,
      message: "Microsoft Graph Verbindung erfolgreich",
      details: {
        tenantInfo: {
          displayName: "Company Ltd",
          tenantType: "AAD",
          countryLetterCode: "DE"
        },
        userCount: 1250
      }
    },
    ldap: {
      success: true,
      message: "LDAP-Verbindung erfolgreich",
      details: {
        serverInfo: {
          namingContexts: ["DC=company,DC=com"],
          supportedLDAPVersion: ["3"],
          vendorName: ["Microsoft Corporation"],
          vendorVersion: ["10.0.17763"] 
        },
        userCount: 890
      }
    },
    upload: {
      success: true,
      message: "Upload-Service verfügbar"
    },
    manual: {
      success: true,
      message: "Manual-Service verfügbar"
    }
  },
  message: "Verbindungstests abgeschlossen"
}
```

**Beispiel:**
```bash
curl http://localhost:5000/api/admin-portal/test/connections \
  -H "Authorization: Bearer $TOKEN"
```

---

## Export APIs

### 1. Alle User exportieren

**GET** `/admin-portal/export/users`

Exportiert alle User aus allen Quellen als JSON-Download.

**Response:** JSON-Datei Download
```typescript
{
  entra: [
    { id: "entra_user123", email: "...", ... }
  ],
  ldap: [
    { id: "ldap_user456", email: "...", ... }
  ], 
  upload: [
    { id: "upload_user789", email: "...", ... }
  ],
  manual: [
    { id: "manual_user101", email: "...", ... }
  ]
}
```

**Beispiel:**
```bash
curl http://localhost:5000/api/admin-portal/export/users \
  -H "Authorization: Bearer $TOKEN" \
  -o "admin-portal-export.json"
```

---

## Permissions System APIs (NEU v2.0.0)

### 🔐 **Permission-System Übersicht**

Das neue Permission-System ermöglicht granulare Kontrolle über Benutzerrechte durch:
- **Rollen**: Definieren Sammlungen von Berechtigungen
- **Gruppen**: Organisieren Benutzer und weisen ihnen Rollen zu  
- **API-Tokens**: Sichere externe Integration mit spezifischen Berechtigungen
- **Audit-Logs**: Vollständige Nachverfolgung aller Aktivitäten

---

### 1. Verfügbare Berechtigungen

**GET** `/admin-portal/permissions/available`

Lädt alle verfügbaren System-Berechtigungen.

**Permission:** `requirePermission('read', 'roles')`

**Response:**
```typescript
{
  success: true,
  data: [
    {
      id: "read_users",
      action: "read", 
      resource: "users",
      description: "Benutzer anzeigen"
    },
    {
      id: "write_users",
      action: "write",
      resource: "users", 
      description: "Benutzer bearbeiten"
    },
    {
      id: "admin_all",
      action: "admin",
      resource: "all",
      description: "Vollzugriff auf alle Ressourcen"
    }
  ],
  message: "18 Berechtigungen verfügbar"
}
```

---

### 2. Rollen-Management APIs

#### **GET** `/admin-portal/permissions/roles`
Lädt alle Benutzerrollen.

**Permission:** `requirePermission('read', 'roles')`

**Response:**
```typescript
{
  success: true,
  data: [
    {
      id: "role_1",
      name: "Administrator",
      description: "Vollzugriff auf alle Funktionen des Admin-Portals",
      permissions: [
        {
          id: "admin_all",
          action: "admin", 
          resource: "all",
          description: "Vollzugriff auf alle Ressourcen"
        }
      ],
      isSystemRole: true,
      userCount: 3,
      createdAt: "2024-12-14T08:00:00.000Z",
      updatedAt: "2024-12-14T08:00:00.000Z",
      createdBy: "system"
    }
  ],
  message: "3 Rollen gefunden"
}
```

#### **POST** `/admin-portal/permissions/roles`
Erstellt neue Rolle.

**Permission:** `requirePermission('write', 'roles')`

**Request Body:**
```typescript
{
  name: "Custom Role",
  description: "Benutzerdefinierte Rolle für spezielle Anforderungen",
  permissions: ["read_users", "write_users"]
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: "role_1234567890",
    name: "Custom Role",
    description: "Benutzerdefinierte Rolle für spezielle Anforderungen",
    permissions: [
      {
        id: "read_users",
        action: "read",
        resource: "users", 
        description: "Benutzer anzeigen"
      },
      {
        id: "write_users",
        action: "write",
        resource: "users",
        description: "Benutzer bearbeiten"
      }
    ],
    isSystemRole: false,
    userCount: 0,
    createdAt: "2024-12-22T08:12:34.567Z",
    updatedAt: "2024-12-22T08:12:34.567Z",
    createdBy: "admin@company.com"
  },
  message: "Rolle erfolgreich erstellt"
}
```

#### **DELETE** `/admin-portal/permissions/roles/:roleId`
Löscht Rolle.

**Permission:** `requirePermission('delete', 'roles')`

---

### 3. Gruppen-Management APIs

#### **GET** `/admin-portal/permissions/groups`
Lädt alle Benutzergruppen.

**Permission:** `requirePermission('read', 'groups')`

**Response:**
```typescript
{
  success: true,
  data: [
    {
      id: "group_1", 
      name: "Administratoren",
      description: "Vollzugriff auf alle Funktionen",
      roles: ["Administrator"],
      users: ["admin@company.com"],
      permissions: ["admin_all"],
      isDefault: false,
      createdAt: "2024-12-14T08:00:00.000Z",
      updatedAt: "2024-12-14T08:00:00.000Z",
      createdBy: "system"
    }
  ],
  message: "2 Gruppen gefunden"
}
```

#### **POST** `/admin-portal/permissions/groups`
Erstellt neue Gruppe.

**Permission:** `requirePermission('write', 'groups')`

**Request Body:**
```typescript
{
  name: "IT Team",
  description: "IT-Abteilung mit User-Management-Rechten",
  roles: ["User Manager"],
  isDefault: false
}
```

#### **DELETE** `/admin-portal/permissions/groups/:groupId`
Löscht Gruppe.

**Permission:** `requirePermission('delete', 'groups')`

---

### 4. API-Token-Management APIs

#### **GET** `/admin-portal/permissions/tokens`
Lädt alle API-Tokens.

**Permission:** `requirePermission('read', 'tokens')`

**Response:**
```typescript
{
  success: true,
  data: [
    {
      id: "token_1",
      name: "HR Integration Token",
      token: "ap_abc123def456ghi789",
      permissions: ["read_users", "write_users"],
      expiresAt: "2025-01-22T08:12:34.567Z",
      lastUsed: "2024-12-21T14:30:15.123Z", 
      isActive: true,
      createdAt: "2024-12-14T08:00:00.000Z",
      createdBy: "admin@company.com"
    }
  ],
  message: "2 API-Tokens gefunden"
}
```

#### **POST** `/admin-portal/permissions/tokens`
Erstellt neuen API-Token.

**Permission:** `requirePermission('write', 'tokens')`

**Request Body:**
```typescript
{
  name: "Analytics Integration", 
  permissions: ["read_users", "read_audit"],
  expiresAt: "2025-06-22T00:00:00.000Z",
  ipWhitelist: ["192.168.1.100", "10.0.0.50"]
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    id: "token_1234567890",
    name: "Analytics Integration",
    token: "ap_xyz789abc123def456",  // Nur einmal angezeigt!
    permissions: ["read_users", "read_audit"], 
    expiresAt: "2025-06-22T00:00:00.000Z",
    lastUsed: null,
    isActive: true,
    createdAt: "2024-12-22T08:12:34.567Z",
    createdBy: "admin@company.com",
    ipWhitelist: ["192.168.1.100", "10.0.0.50"]
  },
  message: "API-Token erfolgreich erstellt"
}
```

#### **POST** `/admin-portal/permissions/tokens/:tokenId/revoke`
Widerruft (deaktiviert) API-Token.

**Permission:** `requirePermission('delete', 'tokens')`

**Response:**
```typescript
{
  success: true,
  data: true,
  message: "API-Token erfolgreich widerrufen"
}
```

---

### 5. Audit-Logs APIs

#### **GET** `/admin-portal/permissions/audit`
Lädt Audit-Logs mit erweiterten Filteroptionen.

**Permission:** `requirePermission('read', 'audit')`

**Query Parameters:**
- `userId` (optional): Filtere nach spezifischer User-ID
- `action` (optional): Filtere nach Aktion (`login`, `logout`, `create`, `update`, `delete`, `read`)
- `resource` (optional): Filtere nach Resource (`users`, `roles`, `groups`, `tokens`, `settings`)
- `dateFrom` (optional): Startdatum (ISO 8601)
- `dateTo` (optional): Enddatum (ISO 8601)
- `success` (optional): `true` | `false` - nur erfolgreiche/fehlgeschlagene Aktionen
- `page` (optional): Seitenzahl (default: 1) 
- `limit` (optional): Einträge pro Seite (default: 50)

**Response:**
```typescript
{
  success: true,
  data: [
    {
      id: "audit_1234567890",
      timestamp: "2024-12-22T08:12:34.567Z",
      userId: "user_admin_123",
      userName: "Admin User",
      action: "create",
      resource: "users",
      details: {
        email: "new.user@company.com",
        source: "manual"
      },
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      success: true
    },
    {
      id: "audit_1234567891", 
      timestamp: "2024-12-22T08:10:15.123Z",
      userId: "user_support_456",
      userName: "Support Agent",
      action: "delete",
      resource: "users",
      details: {
        email: "old.user@company.com" 
      },
      ipAddress: "192.168.1.101",
      userAgent: "Mozilla/5.0",
      success: false,
      errorMessage: "Berechtigung verweigert - nur Admin kann User löschen"
    }
  ],
  message: "2 Audit-Log-Einträge gefunden"
}
```

**Beispiel:**
```bash
# Alle fehlgeschlagenen Login-Versuche der letzten 7 Tage
curl "http://localhost:5000/api/admin-portal/permissions/audit?action=login&success=false&dateFrom=2024-12-15T00:00:00.000Z" \
  -H "Authorization: Bearer $TOKEN"

# Alle Aktivitäten eines spezifischen Benutzers
curl "http://localhost:5000/api/admin-portal/permissions/audit?userId=user_123&page=1&limit=100" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Hierarchical Permissions APIs (NEU v2.1.0)

### 🏗️ **Hierarchical Permission-System Übersicht**

Das neue hierarchische Permission-System ermöglicht **abteilungsbasierte Rechtevergabe** durch:
- **Automatische Hierarchie-Erkennung**: Analysiert vorhandene User und erkennt Abteilungsstrukturen  
- **Abteilungs-basierte Rechte**: Verwalte Berechtigungen auf Abteilungsebene ("Verkauf", "HR", "IT")
- **Untergruppen-Unterstützung**: Erkennt und verwaltet Untergruppen wie "Verkauf | AS"
- **Modul-/Seiten-Rechte**: Granulare Kontrolle über Module (HR, Support, AI) und deren Seiten
- **Rechte-Vererbung**: Untergruppen erben Basis-Rechte der Obergruppe + zusätzliche Rechte
- **Individual-Overrides**: Spezifische Abweichungen für einzelne Benutzer möglich

---

### 1. Hierarchie-Analyse

#### **GET** `/admin-portal/hierarchy/analyze`
Analysiert vorhandene User-Daten und erkennt Abteilungs-Hierarchie automatisch.

**Permission:** `requirePermission('admin', 'admin_users')`

**Response:**
```typescript
{
  success: true,
  data: {
    departments: [
      {
        id: "dept_verkauf",
        name: "VERKAUF", 
        userCount: 12,
        subGroups: [
          {
            id: "subgrp_verkauf_as",
            name: "Verkauf | AS",
            displayName: "AS",
            parentDepartment: "VERKAUF",
            userCount: 5,
            users: [
              {
                id: "user_123",
                name: "Hans Mueller",
                email: "hans.mueller@company.com",
                jobTitle: "Vertriebsleiter",
                source: "entra",
                hasIndividualOverrides: false
              }
            ],
            hasPermissions: false
          }
        ],
        directUsers: [
          {
            id: "user_456",
            name: "Max Verkaufsleiter", 
            email: "max.vl@company.com",
            jobTitle: "Verkaufsleiter",
            source: "entra",
            hasIndividualOverrides: false
          }
        ],
        detectedFrom: "department_parsing",
        hasPermissions: false
      }
    ],
    subGroups: [...],
    analysisInfo: {
      totalUsers: 45,
      rawDepartmentValues: ["Verkauf | AS", "Verkauf | Berlin", "HR", "IT"],
      detectedAt: "2024-12-22T08:12:34.567Z",
      parsingStats: {
        withPipe: 8,      // Anzahl mit " | " Format  
        withoutPipe: 12,  // Anzahl ohne " | " Format
        empty: 2          // Anzahl ohne Abteilung
      }
    }
  },
  message: "4 Abteilungen und 8 Untergruppen erkannt"
}
```

**PowerShell Beispiel:**
```powershell
$hierarchy = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/hierarchy/analyze" -Headers $headers

Write-Host "=== Erkannte Hierarchie ==="
Write-Host "Gesamt-User: $($hierarchy.data.analysisInfo.totalUsers)"
Write-Host "Abteilungen: $($hierarchy.data.departments.Count)"
Write-Host "Untergruppen: $($hierarchy.data.subGroups.Count)"

foreach ($dept in $hierarchy.data.departments) {
  Write-Host "🏢 $($dept.name): $($dept.userCount) Mitarbeiter"
  foreach ($subGroup in $dept.subGroups) {
    Write-Host "  📂 $($subGroup.displayName): $($subGroup.userCount) Mitarbeiter"
  }
}
```

---

### 2. Hierarchie-Struktur

#### **GET** `/admin-portal/hierarchy/structure`
Lädt gespeicherte Hierarchie-Struktur (für weitere API-Calls).

**Permission:** `requirePermission('read', 'groups')`

**Response:**
```typescript
{
  success: false,
  error: "NotImplemented", 
  message: "Hierarchy-Structure-Loading noch nicht implementiert"
}
```

*Hinweis: Noch nicht vollständig implementiert - nutze `/analyze` für Live-Analyse.*

---

### 3. Department-Permissions verwalten

#### **GET** `/admin-portal/hierarchy/departments/:departmentId/permissions`
Lädt Berechtigungen für eine spezifische Abteilung.

**Parameter:**
- `departmentId` (path): Abteilungs-ID (z.B. `dept_verkauf`)

**Permission:** `requirePermission('read', 'roles')`

**Response:**
```typescript
{
  success: true,
  data: {
    departmentId: "dept_verkauf",
    departmentName: "VERKAUF",
    moduleAccess: {
      hr: "read",           // 👁️ Lesen
      support: "write",     // ✏️ Schreiben  
      ai: "read",          // 👁️ Lesen
      admin_portal: "none" // 🚫 Kein Zugriff
    },
    pagePermissions: {
      "hr.employees": {
        access: "read",
        actions: {
          view: true,
          create: false,
          edit: false,
          delete: false
        }
      },
      "support.tickets": {
        access: "write", 
        actions: {
          view: true,
          create: true,
          edit: true,
          close: false
        }
      }
    },
    createdAt: "2024-12-22T08:00:00.000Z",
    updatedAt: "2024-12-22T08:12:34.567Z",
    createdBy: "admin@company.com"
  },
  message: "Department-Permissions geladen"
}
```

#### **PUT** `/admin-portal/hierarchy/departments/:departmentId/permissions`
Aktualisiert Berechtigungen für eine Abteilung.

**Parameter:**
- `departmentId` (path): Abteilungs-ID

**Permission:** `requirePermission('write', 'roles')`

**Request Body:**
```typescript
{
  moduleAccess: {
    hr: "read",
    support: "write", 
    ai: "read",
    admin_portal: "none"
  },
  pagePermissions: {
    "hr.employees": {
      access: "read",
      actions: {
        view: true,
        create: false,
        edit: false,
        delete: false,
        export: true,
        import: false
      }
    },
    "support.tickets": {
      access: "write",
      actions: {
        view: true,
        create: true,
        edit: true, 
        close: false,
        delete: false,
        assign: false
      }
    },
    "ai.chat": {
      access: "read",
      actions: {
        access: true,
        upload_docs: false,
        delete_history: false
      },
      limits: {
        dailyQuota: 30,      // Reduziert von Standard 50
        maxTokens: 2000      // Reduziert von Standard 4000
      }
    }
  }
}
```

**Response:**
```typescript
{
  success: true,
  data: {
    departmentId: "dept_verkauf",
    // ... aktualisierte Permission-Daten
    updatedAt: "2024-12-22T08:15:00.000Z",
    updatedBy: "admin@company.com"
  },
  message: "Department-Permissions erfolgreich aktualisiert"
}
```

**PowerShell Beispiel:**
```powershell
# Department-Permissions laden
$deptPermissions = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/hierarchy/departments/dept_verkauf/permissions" -Headers $headers

Write-Host "Abteilung: $($deptPermissions.data.departmentName)"
Write-Host "Module-Zugriff:"
$deptPermissions.data.moduleAccess.PSObject.Properties | ForEach-Object {
  Write-Host "  $($_.Name): $($_.Value)"
}

# Permissions aktualisieren
$updatePermissions = @{
  moduleAccess = @{
    hr = "read"
    support = "write"
    ai = "read" 
    admin_portal = "none"
  }
  pagePermissions = @{
    "hr.employees" = @{
      access = "read"
      actions = @{
        view = $true
        create = $false
        edit = $false
        delete = $false
      }
    }
  }
} | ConvertTo-Json -Depth 5

$updated = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/hierarchy/departments/dept_verkauf/permissions" `
  -Method PUT -Headers $headers -Body $updatePermissions

Write-Host "Permissions aktualisiert: $($updated.message)"
```

---

### 4. User-Permissions berechnen

#### **GET** `/admin-portal/hierarchy/users/:userId/effective-permissions`
Berechnet effektive Berechtigungen für einen User (Department + SubGroup + Individual).

**Parameter:**
- `userId` (path): User-ID

**Permission:** `requirePermission('read', 'roles')`

**Response:**
```typescript
{
  success: true,
  data: {
    userId: "user_123",
    userName: "Hans Mueller",
    department: "VERKAUF",
    subGroup: "Verkauf | AS",
    moduleAccess: {
      hr: "read",          // Von Department geerbt
      support: "write",    // Von Department geerbt  
      ai: "write",         // Von SubGroup erweitert (war "read")
      admin_portal: "none" // Von Department geerbt
    },
    pagePermissions: {
      "hr.employees": {
        access: "read",
        actions: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          export: true      // Von SubGroup hinzugefügt
        }
      },
      "support.tickets": {
        access: "write",
        actions: {
          view: true,
          create: true, 
          edit: true,
          close: true,      // Von SubGroup erweitert
          delete: false,
          assign: false
        }
      }
    },
    permissionSources: {
      department: true,     // Basis-Rechte von VERKAUF
      subGroup: true,       // Zusätz-Rechte von "Verkauf | AS" 
      individual: false     // Keine individuellen Overrides
    },
    calculatedAt: "2024-12-22T08:20:00.000Z"
  },
  message: "Effektive User-Permissions berechnet"
}
```

**PowerShell Beispiel:**
```powershell
# Effektive Permissions für User berechnen
$userPerms = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/hierarchy/users/user_123/effective-permissions" -Headers $headers

Write-Host "=== Effektive Permissions ==="
Write-Host "User: $($userPerms.data.userName)"
Write-Host "Abteilung: $($userPerms.data.department)"
if ($userPerms.data.subGroup) {
  Write-Host "Untergruppe: $($userPerms.data.subGroup)"
}

Write-Host "Permissions-Quellen:"
Write-Host "  Department: $($userPerms.data.permissionSources.department)"
Write-Host "  SubGroup: $($userPerms.data.permissionSources.subGroup)"
Write-Host "  Individual: $($userPerms.data.permissionSources.individual)"

Write-Host "Module-Zugriff:"
$userPerms.data.moduleAccess.PSObject.Properties | ForEach-Object {
  $access = switch ($_.Value) {
    "none" { "🚫 Kein Zugriff" }
    "read" { "👁️ Lesen" }
    "write" { "✏️ Schreiben" }
    "admin" { "👑 Admin" }
  }
  Write-Host "  $($_.Name): $access"
}
```

---

### 5. Module-Definitionen

#### **GET** `/admin-portal/hierarchy/modules`
Lädt verfügbare Module-Definitionen für Permission-Matrix.

**Permission:** `requirePermission('read', 'roles')`

**Response:**
```typescript
{
  success: true,
  data: [
    {
      key: "hr",
      name: "HR", 
      icon: "👥",
      pages: [
        {
          key: "employees",
          name: "Mitarbeiter",
          icon: "📊",
          actions: [
            { key: "view", name: "Anzeigen", description: "Mitarbeiter-Liste anzeigen" },
            { key: "create", name: "Erstellen", description: "Neue Mitarbeiter anlegen" },
            { key: "edit", name: "Bearbeiten", description: "Mitarbeiter-Daten ändern" },
            { key: "delete", name: "Löschen", description: "Mitarbeiter entfernen" },
            { key: "export", name: "Exportieren", description: "Daten exportieren" },
            { key: "import", name: "Importieren", description: "Daten importieren" }
          ]
        },
        {
          key: "reports", 
          name: "Berichte",
          icon: "📝",
          actions: [
            { key: "view", name: "Anzeigen", description: "Berichte anzeigen" },
            { key: "create", name: "Erstellen", description: "Neue Berichte erstellen" },
            { key: "export", name: "Exportieren", description: "Berichte exportieren" },
            { key: "delete", name: "Löschen", description: "Berichte löschen" }
          ]
        }
      ]
    },
    {
      key: "ai",
      name: "AI",
      icon: "🤖", 
      pages: [
        {
          key: "chat",
          name: "Chat",
          icon: "💬",
          actions: [
            { key: "access", name: "Zugriff", description: "KI-Chat nutzen" },
            { key: "upload_docs", name: "Dokumente hochladen", description: "Dokumente für KI hochladen" }
          ],
          limits: [
            { key: "dailyQuota", name: "Tägliche Anfragen", type: "number", defaultValue: 50 },
            { key: "maxTokens", name: "Max. Tokens pro Anfrage", type: "number", defaultValue: 4000 }
          ]
        }
      ]
    }
  ],
  message: "4 Module-Definitionen verfügbar"
}
```

**PowerShell Beispiel:**
```powershell
# Module-Definitionen laden
$modules = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/hierarchy/modules" -Headers $headers

Write-Host "=== Verfügbare Module ==="
foreach ($module in $modules.data) {
  Write-Host "$($module.icon) $($module.name) ($($module.key))"
  foreach ($page in $module.pages) {
    Write-Host "  $($page.icon) $($page.name) ($($page.key))"
    Write-Host "    Actions: $($page.actions.name -join ', ')"
    if ($page.limits) {
      Write-Host "    Limits: $($page.limits.name -join ', ')"
    }
  }
}
```

---

### 6. Hierarchical Permissions Workflow

**Typischer Workflow für Hierarchical Permissions:**

```powershell
# 1. Hierarchie analysieren
$hierarchy = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/hierarchy/analyze" -Headers $headers

# 2. Module-Definitionen laden (für Permission-Matrix)
$modules = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/hierarchy/modules" -Headers $headers

# 3. Department-Permissions setzen (Basis-Rechte)
$deptPermissions = @{
  moduleAccess = @{
    hr = "read"
    support = "write" 
    ai = "read"
    admin_portal = "none"
  }
  pagePermissions = @{
    "hr.employees" = @{
      access = "read"
      actions = @{
        view = $true
        create = $false
        edit = $false
        delete = $false
        export = $true
      }
    }
  }
} | ConvertTo-Json -Depth 5

$setDept = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/hierarchy/departments/dept_verkauf/permissions" `
  -Method PUT -Headers $headers -Body $deptPermissions

# 4. Effektive Permissions für User überprüfen
$userPerms = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/hierarchy/users/user_123/effective-permissions" -Headers $headers

Write-Host "User $($userPerms.data.userName) hat folgende effektive Rechte:"
$userPerms.data.moduleAccess.PSObject.Properties | ForEach-Object {
  Write-Host "  $($_.Name): $($_.Value)"
}
```

---

## PowerShell Examples

### Sync-Operationen

```powershell
# Entra ID synchronisieren
$token = "your_jwt_token"
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }

$syncResult = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/sync/entra" `
  -Method POST -Headers $headers -Body '{"mode":"full"}'
  
Write-Host "Sync abgeschlossen: $($syncResult.data.results.totalProcessed) User verarbeitet"

# Alle Quellen synchronisieren
$bulkSync = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/sync-all" `
  -Method POST -Headers $headers
  
Write-Host "Bulk-Sync: $($bulkSync.data.summary.completed) von 4 Quellen erfolgreich"
```

### User-Management

```powershell
# User-Übersicht laden
$users = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/users?page=1&limit=100" `
  -Headers $headers
  
Write-Host "Geladen: $($users.data.data.Count) User von $($users.data.pagination.total) Gesamt"

# Manuellen User erstellen
$newUser = @{
  firstName = "Test"
  lastName = "User"  
  email = "test.user@company.com"
  notes = "PowerShell Test-User"
  customFields = @{
    "Abteilung" = "IT"
    "Kostenstelle" = "IT-001"
  }
} | ConvertTo-Json

$createdUser = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/manual/users" `
  -Method POST -Headers $headers -Body $newUser
  
Write-Host "User erstellt: $($createdUser.data.displayName)"
```

### Upload-Processing

```powershell
# CSV-Datei analysieren
$analysisForm = @{
  file = Get-Item "C:\temp\users.csv"
}

$analysis = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/upload/analyze" `
  -Method POST -Headers @{ "Authorization" = "Bearer $token" } -Form $analysisForm
  
Write-Host "Analyse: $($analysis.data.rowCount) Zeilen, $($analysis.data.columns.Count) Spalten"

# CSV-Datei verarbeiten
$uploadForm = @{
  file = Get-Item "C:\temp\users.csv"
  mode = "add"
  mapping = @{
    "E-Mail" = "email"
    "Vorname" = "firstName" 
    "Nachname" = "lastName"
  } | ConvertTo-Json
}

$uploadResult = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/upload/process" `
  -Method POST -Headers @{ "Authorization" = "Bearer $token" } -Form $uploadForm
  
Write-Host "Upload: $($uploadResult.data.added) User hinzugefügt"
```

### Monitoring & Stats

```powershell
# Dashboard-Statistiken
$dashboard = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/dashboard/stats" `
  -Headers $headers

Write-Host "=== Dashboard-Übersicht ==="
Write-Host "Gesamt-User: $($dashboard.data.totalUsers)"
Write-Host "Konflikte: $($dashboard.data.conflicts)"

foreach ($source in $dashboard.data.sourceBreakdown) {
  Write-Host "$($source.source): $($source.count) User (Status: $($source.status))"
}

# Verbindungstests
$connections = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/test/connections" `
  -Headers $headers
  
Write-Host "=== Verbindungstests ==="
foreach ($test in $connections.data.PSObject.Properties) {
  $status = if ($test.Value.success) { "✅ OK" } else { "❌ FEHLER" }
  Write-Host "$($test.Name): $status - $($test.Value.message)"
}
```

### Konflikt-Management

```powershell
# Konflikte erkennen  
$conflicts = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/conflicts" `
  -Headers $headers

Write-Host "=== E-Mail-Konflikte ==="
foreach ($conflict in $conflicts.data) {
  Write-Host "E-Mail: $($conflict.email)"
  Write-Host "  Quellen: $($conflict.sources -join ', ')"
  Write-Host "  User: $($conflict.users.Count)"
  
  # Konflikt lösen (Entra ID bevorzugen)
  if ($conflict.sources -contains "entra") {
    $resolution = @{
      email = $conflict.email
      keepSource = "entra"
      deleteFromSources = $conflict.sources | Where-Object { $_ -ne "entra" }
    } | ConvertTo-Json
    
    $resolved = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/conflicts/resolve" `
      -Method POST -Headers $headers -Body $resolution
      
    Write-Host "  → Gelöst: Entra ID beibehalten"
  }
}
```

---

## Error Handling

### Standard Error Response

```typescript
{
  success: false,
  error: "ErrorType",           // Englischer Error-Typ für Logging
  message: "Deutsche Nachricht" // Deutsche User-Message
}
```

### Häufige Error-Codes

| HTTP Code | Error Type | Beschreibung | Lösung |
|-----------|------------|--------------|---------|
| 400 | `ValidationError` | Ungültige Request-Daten | Request-Parameter prüfen |
| 400 | `InvalidSource` | Unbekannte User-Quelle | Nur `entra`, `ldap`, `upload`, `manual` verwenden |
| 400 | `SyncInProgress` | Sync läuft bereits | Warten bis Sync abgeschlossen |
| 401 | `AuthenticationError` | Ungültiger/fehlender Token | Token prüfen/erneuern |
| 403 | `PermissionDenied` | Fehlende Admin-Berechtigung | Admin-Permission erforderlich |
| 404 | `UserNotFound` | User nicht gefunden | User-ID prüfen |
| 404 | `ConflictNotFound` | Konflikt nicht gefunden | Konflikt bereits aufgelöst? |
| 409 | `EmailAlreadyExists` | E-Mail bereits vorhanden | Andere E-Mail verwenden |
| 413 | `FileTooLarge` | Upload-Datei zu groß | Max. 10MB beachten |
| 415 | `UnsupportedFileType` | Ungültiges Dateiformat | Nur CSV/Excel unterstützt |
| 500 | `DatabaseError` | Datenbankfehler | Admin kontaktieren |
| 500 | `SyncError` | Synchronisationsfehler | Konfiguration/Netzwerk prüfen |
| 500 | `ExternalAPIError` | Externe API nicht erreichbar | Entra/LDAP-Verbindung prüfen |

### Error-Handling Best Practices

**PowerShell:**
```powershell
try {
  $result = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/sync/entra" `
    -Method POST -Headers $headers -Body '{"mode":"full"}'
    
  Write-Host "✅ Erfolg: $($result.message)"
}
catch {
  $errorResponse = $_.Exception.Response | ConvertFrom-Json
  Write-Error "❌ Fehler: $($errorResponse.message) (Typ: $($errorResponse.error))"
  
  # Spezifische Error-Behandlung
  switch ($errorResponse.error) {
    "SyncInProgress" { 
      Write-Host "⏳ Sync läuft bereits - warte 30 Sekunden..."
      Start-Sleep 30
    }
    "NotConfigured" {
      Write-Host "⚙️ Quelle nicht konfiguriert - prüfe .env-Variablen"
    }
    "ConnectionError" {
      Write-Host "🔌 Verbindungsfehler - prüfe Netzwerk/Firewall"  
    }
  }
}
```

**JavaScript/Frontend:**
```javascript
try {
  const response = await fetch('/api/admin-portal/sync/entra', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ mode: 'full' })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('✅ Erfolg:', result.message);
  } else {
    console.error('❌ Fehler:', result.message);
    
    // User-freundliche Fehlerbehandlung
    switch (result.error) {
      case 'SyncInProgress':
        showNotification('Sync läuft bereits', 'info');
        break;
      case 'NotConfigured':
        showNotification('Quelle nicht konfiguriert', 'warning');
        break; 
      default:
        showNotification(result.message, 'error');
    }
  }
} catch (error) {
  console.error('Verbindungsfehler:', error);
  showNotification('Verbindungsfehler zum Backend', 'error');
}
```

## ⏰ Scheduler Management

Automatische Synchronisation für Entra ID und LDAP Quellen.

### 📅 `/api/admin-portal/schedules` - GET
**Beschreibung:** Alle Schedule-Konfigurationen abrufen  
**Berechtigung:** `admin` für `admin_users`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "schedule_123",
      "source": "entra",
      "enabled": true,
      "cronExpression": "0 6 * * *",
      "description": "Tägliche Entra ID Synchronisation",
      "timezone": "Europe/Berlin",
      "retryOnError": true,
      "retryAttempts": 3,
      "retryDelay": 15,
      "lastRun": "2024-12-14T06:00:00.000Z",
      "nextRun": "2024-12-15T06:00:00.000Z", 
      "status": "active"
    }
  ],
  "message": "2 Schedules gefunden"
}
```

### 📅 `/api/admin-portal/schedules` - POST
**Beschreibung:** Neuen Schedule erstellen  
**Berechtigung:** `admin` für `admin_users`

**Request:**
```json
{
  "source": "entra",
  "enabled": true,
  "cronExpression": "0 6 * * *",
  "description": "Tägliche Sync um 06:00",
  "timezone": "Europe/Berlin",
  "retryOnError": true,
  "retryAttempts": 3,
  "retryDelay": 15
}
```

### 📅 `/api/admin-portal/schedules/:scheduleId` - PUT
**Beschreibung:** Schedule aktualisieren  
**Request:**
```json
{
  "enabled": false,
  "cronExpression": "0 7 * * *",
  "retryAttempts": 5
}
```

### 📅 `/api/admin-portal/schedules/:scheduleId` - DELETE
**Beschreibung:** Schedule löschen

### 📜 `/api/admin-portal/schedules/history`
**Beschreibung:** Sync-Historie abrufen  
**Query:** `?limit=50`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "history_123",
      "scheduleId": "schedule_123",
      "source": "entra",
      "triggerType": "scheduled",
      "startTime": "2024-12-14T06:00:00.000Z",
      "endTime": "2024-12-14T06:00:45.000Z",
      "status": "completed",
      "usersProcessed": 1250,
      "usersAdded": 15,
      "usersUpdated": 8,
      "duration": 45000
    }
  ]
}
```

### 📊 `/api/admin-portal/schedules/stats`
**Beschreibung:** Scheduler-Statistiken

### 🧪 `/api/admin-portal/schedules/test-cron` - POST
**Beschreibung:** Cron-Expression validieren  
**Request:**
```json
{
  "cronExpression": "0 6 * * *"
}
```

**PowerShell-Beispiele:**
```powershell
# Schedules abrufen
$schedules = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/schedules" -Headers $headers

# Neuen Schedule erstellen (täglich 06:00)
$newSchedule = @{
  source = "entra"
  enabled = $true
  cronExpression = "0 6 * * *"
  description = "Tägliche Entra Sync"
  retryOnError = $true
  retryAttempts = 3
  retryDelay = 15
}
Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/schedules" -Method Post -Body ($newSchedule | ConvertTo-Json) -Headers $headers

# Schedule aktivieren/deaktivieren
$update = @{ enabled = $false }
Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/schedules/schedule_123" -Method Put -Body ($update | ConvertTo-Json) -Headers $headers

# Sync-Historie anzeigen
$history = Invoke-RestMethod -Uri "http://localhost:5000/api/admin-portal/schedules/history?limit=10" -Headers $headers
$history.data | Format-Table source, triggerType, status, usersProcessed, duration
```

---

**API-Version:** 1.1.0  
**Letztes Update:** 14. Dezember 2024  
**Entwickelt für:** CompanyAI Admin-Portal v1.1.0 (mit Scheduler)
