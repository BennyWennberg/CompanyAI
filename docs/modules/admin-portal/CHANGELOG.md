# Admin-Portal Changelog

Alle wichtigen Änderungen am Admin-Portal Modul werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unveröffentlicht]

### Hinzugefügt (v2.3.1)
- **⭐ Entra Admin Center Integration**: Direkte Integration mit HR DataSources
  - **DataSources Graph API Client**: Wiederverwendung der Graph API Logic aus `backend/src/datasources/entraac/client.ts`
  - **fetchAndStoreFromAdminCenter()**: Neue Funktion in `EntraSourceService` für direktes Laden und Speichern
  - **fetchFromAdminCenter.ts**: Neue Function-Datei gemäß Modulstandards
  - **2 neue API-Endpunkte**:
    - `POST /api/admin-portal/entra/fetch-from-admin-center` - Lädt User aus Admin Center und speichert in DB
    - `GET /api/admin-portal/entra/check-availability` - Prüft Admin Center Verfügbarkeit
  - **PowerShell Test-Script**: `tools/test-entra-admin-center.ps1`
  - **Shared Dependencies**: Nutzt `getAppToken()`, `graphGet()`, `graphGetAllPages()`, `testConnection()` vom HR Modul
  - **Dokumentation**: API.md und INTERDEPENDENCY.md aktualisiert

### Geplant (v2.1.0)
- Email-Notifications bei Sync-Fehlern und -Erfolg
- Erweiterte Field-Mapping-Rules mit Transformationen
- Multi-Tenant-Unterstützung für mehrere Mandanten
- Advanced Data-Validation mit benutzerdefinierten Regeln
- REST-API-Webhooks für externe System-Integration
- Bulk-Edit-Funktionen für manuelle User
- User-Import/Export in verschiedenen Formaten (XML, JSON)

## [2.0.0] - 2024-12-22

### 🎯 **MAJOR UPDATE: Untermodul-Architektur** 

#### Hinzugefügt

##### Frontend-Untermodule (Strukturelle Umorganisation)
- **🏗️ Vollständige Umstrukturierung** in 3 logische Untermodule
- **📁 Neue Ordnerstruktur** mit `submodules/` für bessere Skalierbarkeit
- **🔗 Verschachtelte Router** für hierarchische URL-Struktur
- **📱 Mehrstufige Sidebar-Navigation** mit erweiterbaren Submenus

##### 👥 Benutzer-Untermodul (`/admin-portal/users/*`)
- **📦 Eigenständiges UsersModule** mit dediziertem Router
- **5 Fokussierte Pages** für alle User-Management-Funktionen:
  - `UsersOverviewPage` - Vereinheitlichte User-Tabelle
  - `SyncManagementPage` - Sync-Jobs & Status  
  - `UploadPage` - CSV/Excel-Upload mit Preview
  - `ManualUsersPage` - Web-basierte User-Erstellung
  - `ConflictsPage` - E-Mail-Konflikt-Auflösung

##### 📊 System-Untermodul (`/admin-portal/system/*`) 
- **📦 Eigenständiges SystemModule** mit dediziertem Router  
- **2 System-Pages** für Übersicht und Analytics:
  - `DashboardPage` - Haupt-Dashboard mit Stats
  - `StatsPage` - Erweiterte Analysen & Metriken

##### 🔐 Rechte-Untermodul (`/admin-portal/permissions/*`) - **KOMPLETT NEU**
- **📦 Neues PermissionsModule** für vollständige Rechte-Verwaltung
- **4 Permission-Pages** für granulare Kontrolle:
  - `RolesPage` - Rollen-Management mit Permission-Assignment
  - `GroupsPage` - Gruppen-Verwaltung mit Rollen-Zuweisung
  - `TokensPage` - API-Token-Management für externe Integrationen  
  - `AuditPage` - Audit-Logs & Security-Monitoring

#### Backend-Extensions (Permission-System)

##### Permission-Types & Interfaces
- **🔐 18 System-Permissions** definiert (`read_users`, `write_users`, `admin_all`, etc.)
- **👑 3 Default-Rollen** implementiert (Administrator, User Manager, Viewer)
- **🏷️ Neue TypeScript-Interfaces** für Roles, Groups, Tokens, Audit-Logs
- **📝 Request/Response-Types** für alle Permission-APIs

##### Permission-API-Endpunkte (20 neue APIs)
- **📋 Verfügbare Berechtigungen** - `GET /permissions/available`
- **👑 Rollen-Management** - `GET/POST/DELETE /permissions/roles`
- **👥 Gruppen-Management** - `GET/POST/DELETE /permissions/groups`  
- **🎫 Token-Management** - `GET/POST /permissions/tokens` + `/revoke`
- **📋 Audit-Logs** - `GET /permissions/audit` mit erweiterten Filtern

##### Permission-Handler Implementation
- **🛡️ Granulare Permissions** pro API-Endpunkt (`requirePermission`)
- **🔐 Secure Token-Generation** mit `ap_` Präfix und starker Entropie
- **📊 Mock-Daten** für sofortige Frontend-Integration  
- **📝 Vollständiges Audit-Logging** aller Permission-Aktivitäten
- **⚠️ Error-Handling** mit deutschen User-Messages

#### Frontend-Navigation-Enhancement

##### Hierarchische Sidebar (Breaking Change)
- **🎯 Rekursive Submenu-Renderer** für beliebig tiefe Navigation
- **📱 Level-basierte CSS-Styling** (`level-0`, `level-1`) 
- **🔗 Nested Route Support** mit automatischem Active-State
- **🎨 Visual Hierarchy** durch Einrückung und Farbabstufung

##### URL-Struktur (Breaking Change)
- **Alte URLs:**
  - `/admin-portal/dashboard` → `/admin-portal/system/dashboard`
  - `/admin-portal/users` → `/admin-portal/users/overview`
  - `/admin-portal/sync` → `/admin-portal/users/sync`
  - `/admin-portal/stats` → `/admin-portal/system/stats`
- **Neue URLs:**
  - `/admin-portal/permissions/roles` 🆕
  - `/admin-portal/permissions/groups` 🆕
  - `/admin-portal/permissions/tokens` 🆕
  - `/admin-portal/permissions/audit` 🆕

### Geändert

##### Frontend-Architektur (Breaking Changes)
- **📁 AdminPortalModule.tsx** - Komplett umgeschrieben für Untermodule-Routing
- **🎯 Page-Verschiebudnung** - Alle 7 bestehenden Pages in entsprechende Untermodule verschoben
- **🎨 CSS-Architektur** - Neue Permission-Styles (`PermissionsPages.css`)
- **🧭 Sidebar-Logic** - Erweitert um verschachtelte Navigation

##### Backend-Integration
- **📊 types.ts** - Erweitert um 560+ Zeilen Permission-Types
- **🎛️ orchestrator.ts** - Erweitert um 68+ API-Endpunkte (von 48 auf 68+)
- **🔒 Import-Structure** - Neue Permission-Imports und Konstanten

### Migration von v1.x zu v2.0.0

#### Erforderliche Schritte (Breaking Changes)

1. **Frontend-URLs aktualisieren:**
   ```typescript
   // Alte Links müssen angepasst werden:
   '/admin-portal/dashboard' → '/admin-portal/system/dashboard'
   '/admin-portal/users' → '/admin-portal/users/overview'  
   '/admin-portal/sync' → '/admin-portal/users/sync'
   '/admin-portal/stats' → '/admin-portal/system/stats'
   ```

2. **Neue Permission-Endpunkte verfügbar:**
   ```bash
   # Neue APIs für Permission-Management:
   GET /api/admin-portal/permissions/roles
   POST /api/admin-portal/permissions/roles
   GET /api/admin-portal/permissions/groups
   GET /api/admin-portal/permissions/tokens
   GET /api/admin-portal/permissions/audit
   ```

3. **Sidebar-Navigation automatisch aktualisiert:**
   - Hierarchische Struktur wird automatisch angezeigt
   - Keine manuellen Anpassungen erforderlich

#### Rückwärtskompatibilität
- **❌ Frontend-URLs:** Alte URLs werden automatisch auf neue umgeleitet
- **✅ Backend-APIs:** Alle bestehenden APIs bleiben unverändert
- **✅ Datenbanken:** Keine Schema-Änderungen an bestehenden Daten

## [1.1.0] - 2024-12-14

### Hinzugefügt  

#### Scheduler-System
- ⏰ **Cron-basierte Scheduled-Synchronisation** - Täglich um 06:00 (Entra) / 06:15 (LDAP)
- 🔄 **Intelligent Retry-Logic** - 3x Wiederholung bei Fehlern mit konfigurierbaren Delays
- 📜 **Sync-Historie & Monitoring** - Vollständiges Logging mit Performance-Metriken
- 📅 **Schedule-Management UI** - Zeit-Picker, Toggle-Switches, Create/Update/Delete
- 🧪 **Cron-Expression-Validator** - Live-Validierung und Ausführungszeit-Preview

## [1.0.0] - 2024-12-14

### Hinzugefügt

#### Backend-Architektur
- **Vollständige Backend-Implementation** des Admin-Portal Moduls
- **48 REST-API-Endpunkte** für alle User-Management-Operationen
- **Modulbasierte Struktur** nach CompanyAI-Standards (`orchestrator.ts`, `types.ts`, `functions/`, `core/`)
- **4 separate SQLite-Datenbanken** für externe Persistierung (`db_entra`, `db_ldap`, `db_upload`, `db_manual`)
- **Auto-Schema-Discovery** mit dynamischer Datenbank-Schema-Erweiterung
- **Source-of-Truth-per-Database** Architektur für strikte Datenquellen-Trennung

#### Microsoft Entra ID Integration
- **Microsoft Graph API v1.0** Client mit OAuth 2.0 Client Credentials Flow
- **Automatisches Token-Management** mit Refresh-Logic
- **Vollständiger User-Sync** aller verfügbaren Attribute
- **Paginierte API-Calls** für große Entra ID-Instanzen (>5000 User)
- **Incremental & Full Sync** Modi
- **Error-Handling** mit Retry-Logic bei temporären Microsoft Graph-Fehlern

#### LDAP-Server Integration
- **LDAPS (SSL/TLS)** verschlüsselte Verbindungen
- **Flexible LDAP-Queries** mit konfigurierbaren Base-DNs
- **Directory-Schema-Discovery** für automatische Attribut-Erkennung
- **Multi-LDAP-Server-Unterstützung** (Active Directory, OpenLDAP, Apache DS)
- **Group-Membership-Extraktion** aus LDAP-Gruppen
- **Distinguished Names (DN)** als eindeutige User-IDs

#### CSV/Excel Upload-System
- **Datei-Upload-Analysis** mit Vorschau vor Import
- **Intelligente Field-Mapping** mit automatischer Spalten-Erkennung
- **Custom-Field-Mapping** für flexible Feld-Zuordnung
- **Add/Replace-Modi** für verschiedene Import-Strategien
- **Batch-Processing** für große Dateien (>10.000 Zeilen)
- **Detailliertes Error-Reporting** mit Zeilen-genauen Fehlermeldungen
- **Unterstützung für CSV (UTF-8)** und Excel (.xlsx, .xls)

#### Manuelle User-Verwaltung
- **Web-basierte User-Erstellung** über intuitive Formulare
- **Custom-Fields-System** für beliebige zusätzliche Attribute
- **CRUD-Operationen** (Create, Read, Update, Delete) für alle manuellen User
- **User-Tracking** mit Created-By/Updated-By-Feldern
- **Notes & Metadaten** pro User
- **Real-Time-Validation** der Eingabedaten

#### Conflict-Detection & Resolution
- **Automatische E-Mail-Konflikt-Erkennung** zwischen allen Quellen
- **Priority-basierte Resolution-Empfehlungen** (Entra > LDAP > Manual > Upload)
- **Web-Interface für manuelle Konflikt-Auflösung**
- **Resolution-History-Tracking** aller aufgelösten Konflikte
- **Cross-Source-Duplicate-Detection** mit detaillierter Analyse

#### Auto-Schema-Migration System
- **Dynamic Field-Detection** aus eingehenden Datenquellen
- **Automatic Database-Schema-Evolution** ohne manuelle Migration-Scripts
- **Type-Detection** für TEXT, INTEGER, BOOLEAN, DATETIME-Felder
- **Non-Destructive-Migrations** (nur additive Schema-Änderungen)
- **Migration-History-Logging** aller Schema-Änderungen mit Timestamps

#### Synchronisation & Background-Jobs
- **Asynchrone Sync-Operations** für alle externen Quellen
- **Parallel-Sync-Support** für gleichzeitige Multi-Source-Synchronisation
- **Real-Time-Progress-Tracking** mit WebSocket-ähnlichen Updates
- **Auto-Sync-on-Startup** (konfigurierbar)
- **Sync-Job-Management** mit Start/Stop/Status-Funktionen

#### Frontend-Implementation
- **7 vollständige React-Pages** mit TypeScript
- **Responsive Design** mit CSS-Grid und Flexbox
- **Dashboard-Page** mit Live-Statistiken und Source-Status
- **User-Overview-Page** mit vereinheitlichter Tabelle aller Quellen
- **Sync-Management-Page** für manuelle und automatische Synchronisation
- **Upload-Page** mit Drag&Drop und Field-Mapping-Interface
- **Manual-Users-Page** für Web-basierte User-CRUD-Operationen
- **Conflicts-Page** mit interaktivem Resolution-Wizard
- **Stats-Page** mit erweiterten Analytics und Data-Quality-Scores

#### UI/UX-Features
- **Unified User-Interface** für alle 4 Datenquellen
- **Source-Color-Coding** zur visuellen Unterscheidung der Quellen
- **Real-Time-Status-Updates** alle 30 Sekunden
- **Progress-Bars & Loading-States** für alle asynchronen Operationen
- **Error-Boundary-Handling** mit User-freundlichen Fehlermeldungen
- **Responsive Mobile-Support** für Tablet und Smartphone-Nutzung

#### Analytics & Reporting
- **Dashboard-Statistiken** mit Gesamt-User-Count und Source-Breakdown
- **Advanced-Analytics-Page** mit Source-Comparison und Quality-Scores
- **Data-Quality-Metrics** pro Quelle (Eindeutigkeit, Aktive User, etc.)
- **Activity-Trends** mit zeitbasierten Analysen
- **Export-Funktionen** für JSON/CSV-Datenexporte

#### Integration & Navigation
- **Vollständige Frontend-Integration** in CompanyAI-Hauptanwendung
- **Router-Integration** in `App.tsx` mit Protected-Routes
- **Sidebar-Navigation** mit 7 Untermenü-Einträgen
- **Dashboard-Kachel** im Haupt-Dashboard mit Statistiken
- **Breadcrumb-Navigation** und Schnellzugriff-Buttons

#### Security & Permissions
- **Admin-Permission-Requirements** für alle API-Endpunkte
- **Role-Based-Access-Control** mit `requirePermission('admin', 'admin_users')`
- **Secure-External-Connections** (HTTPS zu Microsoft Graph, LDAPS zu LDAP)
- **Audit-Logging** aller Admin-Portal-Aktionen
- **PII-Protection** und DSGVO-konforme Datenverarbeitung

#### Testing & Debugging
- **Connection-Test-API** für alle externen Quellen
- **Health-Check-Endpoints** für System-Monitoring
- **Detailed-Error-Messages** in deutscher Sprache für User
- **PowerShell-Test-Scripts** für API-Entwicklung und Debugging
- **Comprehensive-Logging** mit strukturierten Log-Messages

#### Documentation
- **Vollständige API-Dokumentation** mit 48 Endpunkt-Beschreibungen
- **PowerShell-Integration-Examples** für Scripting und Automation
- **Troubleshooting-Guide** für häufige Probleme und Lösungen
- **Configuration-Guide** für Microsoft Entra ID und LDAP-Setup
- **Architecture-Documentation** mit detaillierter System-Übersicht

### Technische Details

#### Dependencies
```json
{
  "production": {
    "@azure/msal-node": "^2.6.6",
    "ldapts": "^4.2.4", 
    "csv-parser": "^3.0.0",
    "xlsx": "^0.18.5",
    "papaparse": "^5.4.1",
    "multer": "^1.4.5-lts.1",
    "sqlite3": "^5.1.6",
    "sqlite": "^5.1.1"
  },
  "devDependencies": {
    "@types/sqlite3": "^3.1.11",
    "@types/ldapjs": "^3.0.2",
    "@types/papaparse": "^5.3.14",
    "@types/multer": "^1.4.11"
  }
}
```

#### File Structure
```
backend/src/modules/admin-portal/
├── types.ts (329 lines)
├── orchestrator.ts (890+ lines, 48 endpoints)
├── core/
│   ├── database-manager.ts (505 lines)
│   └── schema-registry.ts (425 lines)
├── sources/
│   ├── entra-source.ts (462 lines)
│   ├── ldap-source.ts (532 lines)
│   ├── upload-source.ts (623 lines)
│   └── manual-source.ts (599 lines)
└── functions/
    ├── sync-orchestrator.ts (450+ lines)
    └── user-aggregator.ts (380+ lines)

frontend/src/modules/admin-portal/
├── AdminPortalModule.tsx (30 lines)
├── pages/ (7 pages, 2800+ lines total)
└── styles/AdminPortalPages.css (1200+ lines)

docs/modules/admin-portal/
├── README.md (comprehensive guide)
├── API.md (complete API reference)
└── CHANGELOG.md (this file)
```

#### Environment Variables
```bash
# Required for external database storage
ADMIN_PORTAL_DB_PATH=C:\Code\Company_Allg_Data\Admin_Portal\databases\Users

# Microsoft Entra ID Configuration
ENTRA_TENANT_ID=your_tenant_id
ENTRA_CLIENT_ID=your_client_id
ENTRA_CLIENT_SECRET=your_client_secret

# LDAP Configuration  
LDAP_URL=ldaps://ldap.example.com:636
LDAP_BIND_DN=cn=readonly,dc=example,dc=com
LDAP_BIND_PW=your_password
LDAP_BASE_DN=ou=users,dc=example,dc=com

# Optional Settings
AUTO_SYNC_ON_STARTUP=true
```

#### Database Schema
```sql
-- Auto-created tables in each source database
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  firstName TEXT,
  lastName TEXT,
  displayName TEXT,
  isActive INTEGER DEFAULT 1,
  externalId TEXT,
  lastSync DATETIME DEFAULT CURRENT_TIMESTAMP,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  sourceData JSON,
  -- Dynamic fields added via auto-migration
  jobTitle TEXT,
  department TEXT,
  mobilePhone TEXT,
  -- ... weitere Felder werden automatisch hinzugefügt
);

CREATE TABLE schema_registry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fieldName TEXT NOT NULL,
  dataType TEXT NOT NULL,
  maxLength INTEGER,
  isRequired INTEGER DEFAULT 0,
  addedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  source TEXT
);
```

### Geändert

#### Backend-Integration
- **Admin-Modul** erweitert um neue Permissions: `admin_users`, `system_settings`, `audit_logs`
- **Auth-System** (`hr/core/auth.ts`) um Admin-Portal-Ressourcen erweitert
- **Haupt-App** (`app.ts`) um Admin-Portal-Routen und Initialisierung erweitert
- **Package.json** um neue Dependencies erweitert (SQLite, LDAP, CSV-Parser)

#### Frontend-Integration  
- **App.tsx** um Admin-Portal-Route (`/admin-portal/*`) erweitert
- **Sidebar.tsx** um Admin-Portal-Navigation mit 7 Untermenü-Punkten erweitert
- **Dashboard.tsx** um Admin-Portal-Modul-Kachel und API-Endpunkt-Count erweitert

#### Documentation-Updates
- **README.md** um Admin-Portal-Beschreibung und Features erweitert
- **Module-Count** von 4 auf 5 aktive Module erhöht (HR, Support, AI, Admin, Admin-Portal)
- **API-Endpunkt-Count** von 11 auf 59 Endpunkte erhöht

### Sicherheitsverbesserungen

- **External-Database-Storage** für bessere Datenpersistierung außerhalb des Projekt-Verzeichnisses
- **OAuth-2.0-Implementation** für sichere Microsoft Graph-API-Zugriffe
- **LDAPS-Only-Connections** für verschlüsselte LDAP-Kommunikation
- **Input-Validation** für alle Upload-Dateien und User-Eingaben
- **SQL-Injection-Prevention** durch Prepared-Statements
- **PII-Data-Protection** in Log-Outputs

### Performance-Optimierungen

- **Connection-Pooling** für SQLite-Datenbankverbindungen
- **Batch-Processing** für große CSV/Excel-Uploads
- **Pagination** für große User-Listen (50 User pro Seite)
- **Async-Operations** für alle Sync-Jobs
- **Memory-Efficient-Streaming** für Datei-Processing
- **Caching** von Sync-Status und Connection-Tests

### Bug Fixes

N/A - Erste Version

## Migrationshinweise

### Von keiner vorherigen Version

Dies ist die erste Implementation des Admin-Portal-Moduls. Für die Installation:

1. **Backend-Dependencies installieren:**
   ```bash
   cd backend
   npm install sqlite3 sqlite ldapts papaparse xlsx multer
   npm install --save-dev @types/sqlite3 @types/ldapjs @types/papaparse @types/multer
   ```

2. **Umgebungsvariablen konfigurieren:**
   ```bash
   # .env erweitern um Admin-Portal-Variablen
   ADMIN_PORTAL_DB_PATH=C:\Code\Company_Allg_Data\Admin_Portal\databases\Users
   ENTRA_TENANT_ID=your_tenant_id
   ENTRA_CLIENT_ID=your_client_id
   ENTRA_CLIENT_SECRET=your_client_secret
   ```

3. **Externe Datenbank-Verzeichnisse erstellen:**
   ```bash
   mkdir -p "C:\Code\Company_Allg_Data\Admin_Portal\databases\Users"
   ```

4. **Microsoft Entra ID App-Registrierung:**
   - Neue App in Azure Portal registrieren
   - API-Permissions: `User.Read.All`, `Directory.Read.All` (Application)
   - Admin-Consent erteilen
   - Client-Secret erstellen

5. **Backend neustarten:**
   ```bash
   npm run dev
   ```

   Das Admin-Portal initialisiert sich automatisch und erstellt die Datenbank-Struktur.

## Breaking Changes

### v1.0.0

N/A - Erste Version

## Bekannte Einschränkungen

### Version 1.0.0

- **E-Mail-Notifications** noch nicht implementiert (geplant für v1.1.0)
- **Scheduled-Synchronisation** erfolgt nur manuell oder beim Server-Start
- **Field-Mapping-Transformationen** sind auf einfache 1:1-Zuordnungen beschränkt
- **Bulk-Edit-Funktionen** für manuelle User nicht verfügbar
- **Multi-Tenant-Support** noch nicht implementiert
- **Webhook-Integration** für externe Systeme fehlt noch

## Roadmap

### v1.1.0 (Q1 2025)
- Email-Benachrichtigungen bei Sync-Erfolg/-Fehler
- Cron-basierte Scheduled-Synchronisation
- Erweiterte Bulk-Edit-Funktionen für manuelle User
- Performance-Optimierungen für >50.000 User

### v1.2.0 (Q2 2025)  
- Advanced-Field-Mapping mit Transformations-Rules
- Webhook-Support für externe System-Integration
- Multi-Format-Export (XML, LDIF, SQL)
- User-Lifecycle-Management (Onboarding/Offboarding-Workflows)

### v2.0.0 (Q3 2025)
- Multi-Tenant-Architektur
- Advanced-Data-Validation mit Custom-Business-Rules
- Machine-Learning-basierte Conflict-Resolution
- Real-Time-Synchronisation mit Event-Streaming

---

## Mitwirkende

- **Backend-Entwicklung:** Admin-Portal Team
- **Frontend-Entwicklung:** CompanyAI Frontend Team  
- **API-Design:** CompanyAI Architecture Team
- **Documentation:** CompanyAI Technical Writing Team
- **Testing:** CompanyAI QA Team

## Lizenz

Dieses Modul ist Teil der CompanyAI-Plattform und unterliegt den gleichen Lizenzbedingungen.

---

**Für Fragen oder Support:** Siehe [README.md#Troubleshooting](./README.md#troubleshooting) oder [API.md#Error-Handling](./API.md#error-handling)
