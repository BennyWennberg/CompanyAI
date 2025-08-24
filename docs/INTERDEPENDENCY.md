# CompanyAI - Interdependency Map
**Abhängigkeiten und Logik-Beziehungen für konsistente Integration neuer Features**

## 🎯 Zweck dieser Dokumentation
Diese Datei dokumentiert ALLE Abhängigkeiten zwischen Frontend- und Backend-Komponenten, damit neue Features:
- ✅ **Bestehende Logiken wiederverwenden** statt neu zu erstellen
- ✅ **Konsistente Architektur beibehalten** durch Befolgen etablierter Patterns
- ✅ **Modulare Integration** durch Nutzung vorhandener Schnittstellen
- ✅ **Keine Breaking Changes** durch Respektierung von Dependencies

---

## 📊 Architektur-Übersicht

### Backend-Architektur (modulbasiert)
```
backend/src/
├── index.ts                 # ZENTRAL: Router-Registration, Auth-Middleware
├── modules/
│   ├── hr/                  # HR-Modul (vollständig implementiert)
│   │   ├── orchestrator.ts  # Route-Handler + API-Endpunkte
│   │   ├── types.ts         # TypeScript-Interfaces
│   │   ├── core/
│   │   │   └── auth.ts      # SHARED: Authentifizierung-Middleware
│   │   └── functions/       # Geschäftslogik-Funktionen
│   ├── support/             # Support-Modul (vollständig implementiert)
│   │   ├── orchestrator.ts  # Route-Handler + API-Endpunkte
│   │   ├── types.ts         # TypeScript-Interfaces
│   │   └── functions/       # Geschäftslogik-Funktionen
│   ├── ai/                  # AI-Modul (vollständig implementiert)
│   │   ├── orchestrator.ts  # Route-Handler + API-Endpunkte
│   │   ├── types.ts         # TypeScript-Interfaces
│   │   └── functions/       # RAG, Chat, Upload-Funktionen
│   ├── admin/               # Admin-Modul (vollständig implementiert)
│   │   ├── orchestrator.ts  # Route-Handler + API-Endpunkte
│   │   ├── types.ts         # TypeScript-Interfaces
│   │   └── functions/       # User-Management, Settings, Audit
│   └── admin-portal/        # Admin-Portal-Modul (NEU v1.0.0, ERWEITERT v2.3.1)
│       ├── orchestrator.ts  # 50 API-Endpunkte für Multi-Source-Integration
│       ├── types.ts         # Multi-Source User-Interfaces
│       ├── core/            # Datenbank-Manager + Schema-Registry
│       │   ├── database-manager.ts    # 4 externe SQLite-DBs
│       │   └── schema-registry.ts     # Auto-Schema-Migration
│       ├── sources/         # 4 User-Quellen-Integration + DataSources Integration
│       │   ├── entra-source.ts       # Microsoft Graph API + DataSources Client (⭐ ERWEITERT)
│       │   ├── ldap-source.ts        # LDAP-Server Integration
│       │   ├── upload-source.ts      # CSV/Excel-Processing
│       │   └── manual-source.ts      # Web-Form CRUD
│       └── functions/       # Sync-Orchestration + User-Aggregation + Admin Center Integration
│           ├── sync-orchestrator.ts  # Multi-Source Sync-Jobs
│           ├── user-aggregator.ts    # Unified User-View
│           └── fetchFromAdminCenter.ts # ⭐ NEU: DataSources Entra Integration
```

### Neue Infrastruktur-Abhängigkeiten (v2.1.0)
```
backend/src/index.ts
  ├─ helmet                 # Security Headers
  ├─ morgan                 # HTTP Request Logging (mit reqId)
  ├─ express-rate-limit     # Basic Rate Limiting
  └─ cors                   # CORS-Whitelist (http://localhost:5173)

frontend/src/App.tsx
  └─ components/ErrorBoundary.tsx  # UI-Fehlerfang, schützt Router/Module

frontend/src/lib/apiClient.ts      # Zentraler Axios-Client mit Token-Interceptor
```

### Frontend-Architektur (modulbasiert)
```
frontend/src/
├── App.tsx                  # ZENTRAL: Router + Layout-Wrapper
├── layouts/                 # SHARED: Wiederverwendbare Layouts
│   ├── MainLayout.tsx       # Haupt-Layout (Header + Sidebar)
│   ├── AuthLayout.tsx       # Login-Layout
│   └── components/
│       ├── Header.tsx       # SHARED: Dynamischer Header
│       └── Sidebar.tsx      # SHARED: Navigation
├── modules/                 # Modulbasierte Komponenten
│   ├── hr/                  # HR-Frontend-Modul
│   │   ├── HRModule.tsx     # Interne Router-Logik
│   │   ├── pages/           # Seiten-Komponenten
│   │   └── styles/          # Modul-spezifische CSS
│   ├── support/             # Support-Frontend-Modul
│   │   ├── SupportModule.tsx # Interne Router-Logik
│   │   ├── pages/           # Seiten-Komponenten
│   │   └── styles/          # Modul-spezifische CSS
│   ├── ai/                  # AI-Frontend-Modul
│   │   ├── AIModule.tsx     # Interne Router-Logik
│   │   ├── pages/           # Chat + Docs-Seiten
│   │   └── styles/          # Modul-spezifische CSS
│   ├── admin-portal/        # Admin-Portal-Frontend-Modul (ERWEITERT v2.0.0)
│   │   ├── AdminPortalModule.tsx # Haupt-Router für Untermodule
│   │   ├── submodules/      # ⭐ NEU: Untermodul-Organisation
│   │   │   ├── users/       # 👥 Benutzer-Verwaltung Untermodul
│   │   │   │   ├── UsersModule.tsx     # Router für /users/*
│   │   │   │   ├── pages/   # 5 User-Management Pages
│   │   │   │   │   ├── UsersOverviewPage.tsx   # Vereinheitlichte User-Tabelle
│   │   │   │   │   ├── SyncManagementPage.tsx  # Sync-Jobs & Status
│   │   │   │   │   ├── UploadPage.tsx          # CSV/Excel-Upload
│   │   │   │   │   ├── ManualUsersPage.tsx     # Web-basierte User-CRUD
│   │   │   │   │   └── ConflictsPage.tsx       # E-Mail-Konflikt-Resolution
│   │   │   │   └── styles/
│   │   │   │       └── UsersPages.css
│   │   │   ├── system/      # 📊 System & Analytics Untermodul
│   │   │   │   ├── SystemModule.tsx    # Router für /system/*
│   │   │   │   ├── pages/   # 2 System Pages
│   │   │   │   │   ├── DashboardPage.tsx       # Multi-Source Dashboard
│   │   │   │   │   └── StatsPage.tsx           # Advanced Analytics
│   │   │   │   └── styles/
│   │   │   │       └── SystemPages.css
│   │   │   └── permissions/ # 🔐 Rechte-Verwaltung Untermodul (NEU)
│   │   │       ├── PermissionsModule.tsx # Router für /permissions/*
│   │   │       ├── pages/   # 4 Permission Pages (NEU)
│   │   │       │   ├── RolesPage.tsx           # Rollen-Management
│   │   │       │   ├── GroupsPage.tsx          # Gruppen-Verwaltung
│   │   │       │   ├── TokensPage.tsx          # API-Token-Management
│   │   │       │   └── AuditPage.tsx           # Audit-Logs & Security
│   │   │       └── styles/
│   │   │           └── PermissionsPages.css
│   │   └── shared/          # ⭐ NEU: Gemeinsame Utils/Components
│   │       ├── components/
│   │       └── utils/
│   └── auth/
│       └── LoginPage.tsx    # SHARED: Authentifizierung
└── components/
    └── Dashboard.tsx        # SHARED: System-Übersicht

### AI-Integrationsschicht (v2.3.0) - ERWEITERT
```
backend/src/modules/ai/orchestrator.ts           # AI-Routen (chat, hr-assist) – direkte Provider + Session Management + Web-RAG
backend/src/modules/ai/functions/rag.ts          # RAG Index/Embeddings über Provider
backend/src/modules/ai/functions/sessions.ts     # NEU: Chat-Session Management (Persistierung, Suche, Tags)
backend/src/modules/ai/functions/web-rag.ts      # NEU: Web-RAG Integration (Google/Bing/DuckDuckGo + Website-Scraping)
backend/src/modules/ai/types.ts                  # ERWEITERT: Session & Web-RAG TypeScript Interfaces
backend/src/openapi.ts                           # OpenAPI/Swagger Spezifikation
```

---

## 🔗 Kritische Abhängigkeiten

### AI / RAG (Direkte Provider + Externe Speicherung + Session Management + Web-RAG)
- **Provider**: OpenAI, Gemini, Ollama
- **ENV (Backend)**:
  - `OPENAI_API_KEY` (für provider=openai)
  - `GEMINI_API_KEY` (für provider=gemini)  
  - `OLLAMA_URL` (für provider=ollama, default http://localhost:11434)
  - `RAG_EXTERNAL_DOCS_PATH` (⭐ NEU: Externer Ordner für RAG Dokumente + Sessions, z.B. C:/CompanyAI-External/docs)
  - `RAG_INDEX_PATH` (⭐ ERWEITERT: Externe Index-Datei, z.B. C:/CompanyAI-External/rag_index.json)
  - `RAG_EMBEDDING_PROVIDER` (openai|gemini|ollama)
  - `RAG_EMBEDDING_MODEL` (z.B. text-embedding-3-small | text-embedding-004 | nomic-embed-text)
  - `WEB_SEARCH_ENABLED` (⭐ NEU: true/false für Web-RAG)
  - `SERPER_API_KEY` (⭐ NEU: Google Search über Serper.dev, optional)
  - `BING_API_KEY` (⭐ NEU: Microsoft Bing Search, optional)
- **Storage/Docs (Externe Speicherung + Sessions)**:
  - ⭐ **EXTERN**: RAG liest rekursiv alle Markdown-Dateien aus `RAG_EXTERNAL_DOCS_PATH` (falls gesetzt)
  - ⭐ **EXTERN**: Manuelle Dateien werden nach `RAG_EXTERNAL_DOCS_PATH/uploads/` geschrieben
  - ⭐ **SESSIONS** (NEU): Chat-Sessions werden nach `RAG_EXTERNAL_DOCS_PATH/chat-sessions/` als JSON gespeichert
  - 🔄 **FALLBACK**: Falls `RAG_EXTERNAL_DOCS_PATH` nicht gesetzt → interne Speicherung unter `docs/` und `backend/chat-sessions/`
  - 🔧 **AUTO-CREATE**: Externe Ordner werden automatisch erstellt falls nicht vorhanden
- **Web-RAG Integration** (NEU):
  - 🌐 **Web-Suche**: Google (Serper), Bing, DuckDuckGo Integration  
  - 🔧 **Website-Scraping**: Direkte URL-Inhalte mit jsdom
  - 🛡️ **Sicherheit**: URL-Validierung, Content-Length-Limits, Timeouts
  - 📚 **Kombiniert**: Interne Dokumente + Web-Quellen in einer RAG-Response
- **Frontend-API-Bindings**:
  - `POST /api/ai/chat` mit `provider`, `model`, `temperature`, `rag`, `ragTopK` + ⭐ **NEU**: `sessionId`, `saveSession`, `sessionTitle`, `tags`, `webRag`, `webSearchQuery`, `websiteUrl`
  - `POST /api/ai/hr-assist` optional `provider`, `model`
  - `POST /api/ai/rag/reindex` (Admin)
  - `GET /api/ai/rag/docs` (Liste aller Markdown-Quellen)
  - `GET /api/ai/rag/doc?path=...` (einzelne Datei als JSON)
  - `GET /api/ai/rag/doc-raw?path=...` (einzelne Datei als text/markdown)
  - `POST /api/ai/rag/manual-doc` (manuelle Markdown-Datei hinzufügen, optional reindex)
  - ⭐ **Session Management** (NEU):
    - `POST /api/ai/sessions` (Session erstellen)
    - `GET /api/ai/sessions/:id` (Session laden)

### Admin-Portal / Multi-Source User-Integration (NEU v1.0.0)
- **4 User-Quellen**: Microsoft Entra ID, LDAP, CSV/Excel-Upload, Manual-Web
- **ENV (Backend)**:
  - `ADMIN_PORTAL_DB_PATH` (⭐ ERFORDERLICH: Pfad zu externen SQLite-DBs, z.B. C:/Company_Allg_Data/Admin_Portal/databases/Users)
  - **Microsoft Entra ID**:
    - `ENTRA_TENANT_ID` (Azure AD Tenant-ID)
    - `ENTRA_CLIENT_ID` (Azure AD App Client-ID)  
    - `ENTRA_CLIENT_SECRET` (Azure AD App Secret)
    - `GRAPH_SCOPE` (default: https://graph.microsoft.com/.default)
  - **LDAP Configuration**:
    - `LDAP_URL` (z.B. ldaps://ldap.company.com:636)
    - `LDAP_BIND_DN` (Bind-User DN für LDAP-Authentifizierung)
    - `LDAP_BIND_PW` (Bind-User Password)
    - `LDAP_BASE_DN` (Base DN für User-Suche, z.B. ou=users,dc=company,dc=com)
  - **Sync-Verhalten**:
    - `AUTO_SYNC_ON_STARTUP` (optional: true/false, default false)
    - `SYNC_BATCH_SIZE` (optional: default 1000)
- **Externe Datenbanken (Source-of-Truth-per-Database)**:
  - ⭐ **EXTERN**: 4 separate SQLite-Datenbanken unter `ADMIN_PORTAL_DB_PATH`
  - `db_entra.sqlite` - Microsoft Entra ID User (read-only via Graph API)
  - `db_ldap.sqlite` - LDAP-Server User (read-only via LDAPS)
  - `db_upload.sqlite` - CSV/Excel Upload User (add/replace via File-Upload)
  - `db_manual.sqlite` - Web-Form User (full CRUD via Interface)
- **Auto-Schema-Migration**:
  - 🔧 **Dynamic Fields**: Neue Felder werden automatisch zur Datenbank hinzugefügt
  - 🔧 **Type-Detection**: Intelligente Datentyp-Erkennung (TEXT, INTEGER, BOOLEAN, DATETIME)
  - 🔧 **Non-Destructive**: Nur additive Schema-Änderungen (keine Feld-Löschung)
  - 🔧 **Migration-History**: Tracking via schema_registry-Tabelle
- **Frontend-API-Bindings** (68+ Endpunkte, ERWEITERT v2.0.0):
  - **⭐ Entra Admin Center**: `POST /api/admin-portal/entra/fetch-from-admin-center`, `GET /api/admin-portal/entra/check-availability`
  - **Sync Management**: `POST /api/admin-portal/sync/:source`, `POST /api/admin-portal/sync-all`, `GET /api/admin-portal/sync/status`
  - **User Overview**: `GET /api/admin-portal/users`, `GET /api/admin-portal/users/email/:email`
  - **Upload Processing**: `POST /api/admin-portal/upload/analyze`, `POST /api/admin-portal/upload/process`, `GET /api/admin-portal/upload/stats`
  - **Manual Users**: `POST /api/admin-portal/manual/users`, `GET /api/admin-portal/manual/users`, `PUT /api/admin-portal/manual/users/:id`, `DELETE /api/admin-portal/manual/users/:id`
  - **Conflict Resolution**: `GET /api/admin-portal/conflicts`, `POST /api/admin-portal/conflicts/resolve`
  - **Stats & Analytics**: `GET /api/admin-portal/dashboard/stats`, `GET /api/admin-portal/stats/advanced`
  - **⭐ Permissions System** (NEU v2.0.0): 
    - `GET /api/admin-portal/permissions/available` (verfügbare Berechtigungen)
    - `GET/POST/DELETE /api/admin-portal/permissions/roles` (Rollen-Management)
    - `GET/POST/DELETE /api/admin-portal/permissions/groups` (Gruppen-Management)
    - `GET/POST /api/admin-portal/permissions/tokens` + `/revoke` (Token-Management)
    - `GET /api/admin-portal/permissions/audit` (Audit-Logs mit Filtern)
  - **Scheduler Management**: `GET/POST/PUT/DELETE /api/admin-portal/schedules`, `GET /api/admin-portal/schedules/history`, `POST /api/admin-portal/schedules/test-cron`
  - **Testing**: `GET /api/admin-portal/test/connections`
  - **Export**: `GET /api/admin-portal/export/users`
- **Source-Isolation (KRITISCH)**:
  - Kein Cross-Source-Writing (Entra/LDAP sind read-only)
  - Upload/Manual sind vollständig vom Admin-Portal verwaltet
  - Conflict-Detection funktioniert nur zwischen Sources (keine Auflösung in bestehende DataSources)
  - Strikte Trennung zu `backend/src/datasources/` (diese bleiben für HR-Modul reserviert)
    - `PUT /api/ai/sessions/:id` (Session aktualisieren)
    - `DELETE /api/ai/sessions/:id` (Session löschen)
    - `GET /api/ai/sessions/search` (Sessions durchsuchen mit Tags/Datum/Text)
    - `GET /api/ai/sessions/tags` (Verfügbare Tags laden)
- **Frontend-Komponenten**:
  - `frontend/src/modules/ai/pages/AIChatPage.tsx` (⭐ **MASSIV ERWEITERT**: Direkt-Provider-Chat + Session-Management + Web-RAG + Tag-System)
  - `frontend/src/modules/ai/pages/DocsPage.tsx` (⭐ ERWEITERT: Zeigt externe/interne Speicherung an, Upload in externen Ordner)
- **Session Management UI** (NEU):
  - 💬 **Chat-History**: Click-to-Load Sessions mit Metadaten-Anzeige
  - 🏷️ **Tag-System**: Interaktive Tag-Auswahl, Click-to-Add/Remove
  - 📊 **Session-Suche**: Text-, Tag- und Datums-basierte Filterung
  - 🌐 **Web-RAG UI**: Web-Suchbegriff + URL-Eingabe, visuelle Web-vs-Dokument-Quellen-Unterscheidung
- **Externe Speicher-Dependencies**:
  - 📁 **Externe Ordner-Struktur**: `RAG_EXTERNAL_DOCS_PATH/` (Haupt-Ordner), `/uploads/` (Manuelle Uploads), `/chat-sessions/` (⭐ NEU: JSON-Sessions)
  - 📋 **Index-Datei**: `RAG_INDEX_PATH` (JSON mit Embeddings + Chunks)  
  - 🔒 **Berechtigungen**: Backend benötigt Lese-/Schreibzugriff auf externe Pfade
  - 🔄 **Trennung**: Projekt-Code getrennt von RAG-Daten (bessere Portabilität, Backup)
- **NPM-Dependencies** (NEU):
  - `uuid` (Session-ID-Generierung)
  - `jsdom` (Website-Scraping für Web-RAG)
  - `@types/uuid`, `@types/jsdom` (TypeScript-Typen)

---

### 0. DataSources/Integrations (KRITISCH)

Diese Sektion dokumentiert alle Abhängigkeiten rund um Datenquellen (z. B. Entra ID via Microsoft Graph) und manuelle Datenquellen. Jede Änderung an Datenquellen erfordert Updates an dieser Datei, gemäß .cursorrules PR-Gates.

#### DataSources-Übersicht
- backend/src/datasources/
  - entraac/ (Microsoft Entra ID Connector + Combined-Logic)
  - manual/ (manuelle Benutzer/Geräte)
  - index.ts (zentrale Re-Exports für App)

#### Environment-Dependencies (.env)
```
# Entra ID / Microsoft Graph
AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
GRAPH_BASE_URL=https://graph.microsoft.com

# Sync-Steuerung
ENTRA_SYNC_ENABLED=true
ENTRA_SYNC_INTERVAL_MS=3600000

# Referenz (Dokuzwecke)
ENTRA_ADMIN_CENTER_URL=https://entra.microsoft.com
```

#### External-API-Dependencies
- Microsoft Graph API
  - /v1.0/users (select: id, displayName, userPrincipalName, mail, department, jobTitle, accountEnabled, createdDateTime, lastSignInDateTime, givenName, surname, officeLocation, streetAddress, city, state, country, postalCode, mobilePhone, businessPhones, faxNumber, companyName, employeeId, employeeType, costCenter, division, signInSessionsValidFromDateTime, passwordPolicies, usageLocation, preferredLanguage, aboutMe, assignedLicenses, assignedPlans, userType, onPremisesSecurityIdentifier, onPremisesSyncEnabled, onPremisesDistinguishedName, onPremisesDomainName, onPremisesSamAccountName) + $expand=manager($select=id,displayName)
  - /v1.0/devices (select: id, displayName, deviceId, operatingSystem, operatingSystemVersion, trustType, accountEnabled)
  - Auth: Client Credentials (MSAL) → scope: https://graph.microsoft.com/.default

#### Sync-Dependencies
- Initial- und periodischer Sync beim Backend-Start, gesteuert über ENTRA_SYNC_ENABLED und ENTRA_SYNC_INTERVAL_MS
- Parallel-Sync von Users und Devices
- Fehlerlog via Server-Log (reqId vorhanden), kein PII in Logs

#### Cross-DataSource Dependencies (Combined-Logic)
- Vereinheitlichter Zugriff über entraac/combined.ts:
  - getCombinedUsers(source: all|entra|manual)
  - getCombinedDevices(source: all|entra|manual)
- Konfliktprüfung (E-Mail/UPN/deviceId) über kombinierte Quelle

#### Frontend-API-Bindings
- Endpunkte unter /api/data/* (geschützt via requireAuth):
  - GET /api/data/users?source=all|entra|manual
  - GET /api/data/devices?source=all|entra|manual
  - POST /api/data/users (nur manual)
  - POST /api/data/devices (nur manual)
  - PUT /api/data/users/:id (nur manual)
  - PUT /api/data/devices/:id (nur manual)
  - DELETE /api/data/users/:id (nur manual)
  - DELETE /api/data/devices/:id (nur manual)
  - GET /api/data/stats
  - GET /api/data/sources
  - POST /api/data/sync
  - GET /api/data/sync/status

#### Source-Typen (manual/external)
- manual: CRUD erlaubt, In-Memory-Store, UUID-IDs, CreatedBy/UpdatedBy
- external (entra): read-only, Quelle ist Microsoft Graph Sync

#### Module↔DataSources Consumption (Global Rules)
- Lesen aus DataSources: Standard ist die kombinierte Quelle (entra + manual) über `entraac/combined.ts`
  - `getCombinedUsers(source: all|entra|manual)`
  - `findCombinedUsers({ source, department?, accountEnabled? })`
- Schreiben in DataSources: Erlaubt ist ausschließlich die manuelle Quelle (`manual`). Externe Quelle (`entra`) ist strikt read-only.
- Mapping-Konventionen (Combined → Modul-Entity):
  - `displayName` → `firstName`/`lastName`
  - `mail`/`userPrincipalName` → `email`
  - `jobTitle` → `position`
  - `department` → `department`
  - `accountEnabled` → `status` (active/inactive/pending)
- Stats: Aggregationen über `getCombinedStats()`
- Imports: Nur zentrale Re-Exports aus `backend/src/datasources/index.ts` verwenden (keine direkten Graph-Calls in Modulen)
- Dokumentations-Pflicht (bei JEDEM Modul, das DataSources nutzt):
  - `docs/INTERDEPENDENCY.md`: Modul-spezifische Bindings ergänzen (siehe HR-Beispiel)
  - `docs/modules/[module]/README.md`: DataSources-Integration dokumentieren (Lesen/Schreiben/Mapping)
  - `docs/modules/[module]/API.md`: Semantik pro Endpoint (read=combined, write=manual)
  - `docs/CHANGELOG.md`: Unveröffentlicht-Eintrag „Docs/Integrations“
  - `docs/architecture/entra-id-user-schema.md`: Diagramm-Referenz für Entra-Benutzerdaten

#### HR ↔ DataSources Bindings
- Lesen (combined): `getCombinedUsers('all')`, `findCombinedUsers({ source: 'all' | 'entra' | 'manual', ... })`
- Schreiben (nur manual): `createManualUser`, `updateManualUser`, `deleteManualUser`
- Stats: `getCombinedStats()`
- API-Bindings (HR):
  - `GET /api/hr/employees` → liest aus combined
  - `GET /api/hr/employees/:id` → liest aus combined
  - `POST /api/hr/employees` → schreibt in `manual`
  - `PUT /api/hr/employees/:employeeId` → aktualisiert in `manual`

### 1. AUTHENTIFIZIERUNG (SHARED DEPENDENCY)

#### Backend: `hr/core/auth.ts`
```typescript
// ZENTRALE AUTH-LOGIK - VON ALLEN MODULEN VERWENDET
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction)
export const requirePermission = (action: string, resource: string)
export const logAuthEvent = (userId: string, action: string, resource: string)

// ABHÄNGIGKEITEN:
// ✅ Alle Backend-Module nutzen diese Auth-Middleware
// ✅ index.ts registriert apiRouter mit requireAuth
// ✅ Alle orchestrator.ts importieren AuthenticatedRequest
```

#### Frontend: localStorage-basierte Auth
```typescript
// ZENTRALE AUTH-LOGIK - VON ALLEN MODULEN VERWENDET
localStorage.getItem('authToken')     // Für API-Calls
localStorage.getItem('userRole')      // Für Berechtigungen  
localStorage.getItem('userName')      // Für UI-Anzeige

// ABHÄNGIGKEITEN:
// ✅ LoginPage.tsx setzt Auth-Daten
// ✅ Header.tsx zeigt User-Info an
// ✅ Alle Page-Komponenten nutzen authToken für API-Calls
// ✅ Logout entfernt Auth-Daten und redirectet zu /login
```

### 2. LAYOUT-SYSTEM (SHARED DEPENDENCY)
### 2.5 LOGGING & SECURITY (SHARED DEPENDENCY)
```
Backend:
  - Request-ID Middleware → req.reqId
  - helmet, rateLimit, CORS(Whitelist), morgan
Frontend:
  - ErrorBoundary → fängt Rendering-Fehler ab
  - apiClient → einheitliche Header/Fehlerbehandlung
Dokumente:
  - docs/LOGGING_STRATEGY.md
  - docs/AI_SECURITY_POLICY.md
```

#### MainLayout + Header + Sidebar
```typescript
// LAYOUT-HIERARCHIE:
App.tsx 
  └── MainLayout.tsx (umschließt alle Module)
      ├── Header.tsx (zeigt aktuelle Seite + User)
      ├── Sidebar.tsx (Navigation zwischen Modulen)
      └── {children} (aktuelles Modul)

// ABHÄNGIGKEITEN:
// ✅ Header.tsx liest location.pathname für Titel-Anzeige
// ✅ Sidebar.tsx markiert aktive Module basierend auf location
// ✅ Alle Module erhalten Layout automatisch durch Router-Wrapper
// ✅ Layout-Modi (fullwidth, compact) ändern alle Modul-Darstellungen
```

### 3. API-INTEGRATION-PATTERN (SHARED DEPENDENCY)

#### Standardisiertes API-Call-Pattern
```typescript
// ALLE PAGE-KOMPONENTEN VERWENDEN DIESES PATTERN:
const [data, setData] = useState<Entity[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

const loadData = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const token = localStorage.getItem('authToken');
    const response = await fetch('http://localhost:5000/api/[module]/[endpoint]', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    if (result.success && result.data) {
      setData(result.data.data || result.data);
    } else {
      setError(result.message || 'Fehler beim Laden');
    }
  } catch (err) {
    setError('Verbindungsfehler zum Backend');
  } finally {
    setLoading(false);
  }
};

// ABHÄNGIGKEITEN:
// ✅ Authentifizierung aus localStorage
// ✅ Standardisierte APIResponse<T> Typen vom Backend
// ✅ Error-Handling für UI-States
// ✅ Loading-States für UX
```

### 4. CSS-KLASSEN-SYSTEM (SHARED DEPENDENCY)

#### Globale CSS-Klassen (in allen Modulen verwendet)
```css
/* LAYOUT-KLASSEN - VON ALLEN SEITEN VERWENDET */
.page-header              /* Titel + Actions Bereich */
.page-title               /* Überschrift + Beschreibung */
.page-actions             /* Button-Container */
.content-section          /* Haupt-Inhalt */
.filters-section          /* Filter-Controls */
.page-summary             /* Zusammenfassung unten */

/* BUTTON-KLASSEN - KONSISTENT IN ALLEN MODULEN */
.btn                      /* Basis-Button-Styles */
.btn-primary              /* Haupt-Actions (blau) */
.btn-secondary            /* Sekundär-Actions (grau) */
.btn-success              /* Erfolg-Actions (grün) */
.btn-small                /* Kompakte Buttons */
.btn-outline              /* Umrandete Buttons */

/* STATE-KLASSEN - FÜR ALLE DATENLADE-KOMPONENTEN */
.loading-state            /* Loading-Spinner + Text */
.error-state              /* Fehler-Anzeige + Retry-Button */
.empty-state              /* Keine-Daten-Anzeige */

/* ABHÄNGIGKEITEN: */
/* ✅ HRPages.css definiert diese Klassen */
/* ✅ SupportPages.css erbt/erweitert diese Klassen */
/* ✅ MainLayout.css stellt Layout-Modi bereit */
/* ✅ Alle neuen Module MÜSSEN diese Klassen verwenden */
```

### 5. ROUTER-INTEGRATION (SHARED DEPENDENCY)

#### App.tsx Router-Struktur
```typescript
// ZENTRALE ROUTER-LOGIK:
<Router>
  <Routes>
    {/* Auth-Route ohne Layout */}
    <Route path="/login" element={
      <AuthLayout><LoginPage /></AuthLayout>
    } />
    
    {/* Dashboard mit Layout */}
    <Route path="/" element={
      <MainLayout><Dashboard /></MainLayout>
    } />
    
    {/* Module mit Layout */}
    <Route path="/hr/*" element={
      <MainLayout><HRModule /></MainLayout>
    } />
    <Route path="/support/*" element={
      <MainLayout><SupportModule /></SupportModule>
    } />
    
    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
</Router>

// ABHÄNGIGKEITEN:
// ✅ Jedes neue Modul braucht Route-Eintrag hier
// ✅ MainLayout umschließt alle authentifizierten Module
// ✅ Module nutzen interne Router für Unterseiten
// ✅ Navigation in Sidebar.tsx muss erweitert werden
```

#### Modul-interne Router-Struktur
```typescript
// PATTERN FÜR ALLE MODULE:
const [Module]Module: React.FC = () => {
  return (
    <div className="[module]-module">
      <Routes>
        <Route path="/" element={<Navigate to="/[module]/[default]" replace />} />
        <Route path="/[page]" element={<[Page]Page />} />
        <Route path="*" element={<Navigate to="/[module]/[default]" replace />} />
      </Routes>
    </div>
  );
};

// ABHÄNGIGKEITEN:
// ✅ Jede neue Seite braucht Route-Eintrag
// ✅ Default-Route leitet zur Haupt-Seite weiter
// ✅ Fallback-Route verhindert 404-Fehler
// ✅ CSS-Klasse folgt Naming-Convention
```

---

## 📦 Backend-Module-Dependencies

### index.ts (ZENTRALE REGISTRIERUNG)
```typescript
// ALLE MODULE MÜSSEN HIER REGISTRIERT WERDEN:
import { registerHRRoutes } from './modules/hr/orchestrator';
import { registerSupportRoutes } from './modules/support/orchestrator';
import { registerAIRoutes } from './modules/ai/orchestrator';
import { registerAdminRoutes } from './modules/admin/orchestrator';
import { registerAdminPortalRoutes } from './modules/admin-portal/orchestrator';
import { requireAuth } from './modules/hr/core/auth';  // SHARED AUTH

// API-Router mit Auth-Middleware
const apiRouter = express.Router();
apiRouter.use(requireAuth);  // ALLE API-Routen authentifiziert

// Module registrieren
registerHRRoutes(apiRouter);
registerSupportRoutes(apiRouter);
registerAIRoutes(apiRouter);
registerAdminRoutes(apiRouter);
registerAdminPortalRoutes(apiRouter);

// ABHÄNGIGKEITEN FÜR NEUE MODULE:
// ✅ Import der register[Module]Routes Funktion
// ✅ Aufruf von register[Module]Routes(apiRouter)
// ✅ Update der availableModules in /api/hello
// ✅ Update der modules-Liste in /api/health
```

### HR-Modul (REFERENZ-IMPLEMENTATION)
```typescript
// orchestrator.ts - STANDARD-PATTERN:
export class HROrchestrator {
  static async handle[Action](req: AuthenticatedRequest, res: Response) {
    // 1. Input-Validierung
    // 2. Authentifizierung prüfen (via requireAuth middleware)
    // 3. Geschäftslogik-Funktion aufrufen
    // 4. Standardisierte Response zurückgeben
  }
}

export function registerHRRoutes(router: any) {
  router.get('/hr/employees', HROrchestrator.handleEmployeesList);
  router.post('/hr/employees', HROrchestrator.handleCreateEmployee);
  // etc.
}

// ABHÄNGIGKEITEN FÜR NEUE MODULE:
// ✅ Gleiche Orchestrator-Klassen-Struktur verwenden
// ✅ AuthenticatedRequest von hr/core/auth importieren
// ✅ Standardisierte APIResponse<T> Typen verwenden
// ✅ Error-Handling-Pattern kopieren
// ✅ register[Module]Routes Funktion exportieren
```

### Types.ts (SHARED INTERFACES)
```typescript
// STANDARDISIERTE RESPONSE-TYPEN:
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ABHÄNGIGKEITEN FÜR NEUE MODULE:
// ✅ Diese Interfaces in neuem types.ts verwenden
// ✅ Modul-spezifische Entities ergänzen
// ✅ Request-Interfaces für Input-Validierung definieren
// ✅ Konsistente Namens-Conventions befolgen
```

### DataSources Dependencies (KRITISCH - HR + Admin Portal Integration)

#### Zentrale DataSources (`backend/src/datasources/`)
```typescript
// SHARED ENTRA INTEGRATION (zwischen HR und Admin Portal):
backend/src/datasources/entraac/
├── client.ts           # Microsoft Graph API Client (⭐ SHARED)
│   ├─ getAppToken()    # Azure AD App Token via MSAL
│   ├─ graphGet<T>()    # Single Graph API Call
│   ├─ graphGetAllPages<T>() # Paginierte Graph API Calls
│   └─ testConnection() # Graph API Verbindungstest
├── store.ts            # In-Memory Store für HR/DataSources
├── combined.ts         # HR-Modul Combined Interface
├── sync.ts             # HR-Modul Auto-Sync
└── types.ts            # Entra User/Device Types

backend/src/datasources/manual/
├── store.ts            # In-Memory Store für HR/DataSources
└── index.ts            # Manual User Management für HR

// CROSS-MODULE USAGE:
// ✅ HR-Modul nutzt: getCombinedUsers(), findCombinedUsers(), createManualUser()
// ✅ Admin-Portal nutzt: getAppToken(), graphGet(), graphGetAllPages(), testConnection()
```

#### Admin Portal ↔ DataSources Integration (NEU v2.3.1)
```typescript
// Admin Portal EntraSourceService ERWEITERT:
backend/src/modules/admin-portal/sources/entra-source.ts
├─ IMPORT: getAppToken, graphGet, graphGetAllPages, testConnection from '../../../datasources/entraac/client'
├─ fetchAndStoreFromAdminCenter() # ⭐ NEU: Nutzt DataSources Client, speichert in Admin Portal DB
├─ authenticate() # Nutzt getAppToken() statt eigene Token-Logic
├─ fetchUsersFromGraph() # Nutzt graphGetAllPages() statt eigene Pagination
├─ testConnection() # Nutzt DataSources testConnection()
└─ getUserById() # Nutzt graphGet() statt eigene fetch()

backend/src/modules/admin-portal/functions/fetchFromAdminCenter.ts # ⭐ NEU
├─ fetchFromAdminCenter() # Wrapper für EntraSourceService.fetchAndStoreFromAdminCenter()
└─ checkAdminCenterAvailability() # Prüft Konfiguration und Verbindung

// NEW API ENDPOINTS:
// ✅ POST /api/admin-portal/entra/fetch-from-admin-center
// ✅ GET /api/admin-portal/entra/check-availability

// ENVIRONMENT DEPENDENCIES (gleiche wie HR DataSources):
// ✅ AZURE_TENANT_ID (Microsoft Graph Tenant)
// ✅ AZURE_CLIENT_ID (Microsoft Graph App Client)
// ✅ AZURE_CLIENT_SECRET (Microsoft Graph App Secret)
// ✅ GRAPH_BASE_URL (optional: default https://graph.microsoft.com)
```

#### DataSources ↔ Module Consumption Rules (KRITISCH)
```typescript
// HR-MODUL (bestehend, unverändert):
// ✅ Lesen: getCombinedUsers() aus backend/src/datasources (entra + manual)
// ✅ Schreiben: createManualUser(), updateManualUser() nur in manual
// ✅ Stats: getCombinedStats()

// ADMIN-PORTAL (ERWEITERT):
// ✅ Graph API Client: Teilt DataSources Graph API Logic
// ✅ Datenbank: Eigene SQLite DBs (getrennt von DataSources Store)
// ✅ Integration: Nutzt DataSources client.ts aber eigene Speicherung
// ❌ NICHT: Direkter Zugriff auf DataSources Store (store.ts)
// ❌ NICHT: Überschreiben der DataSources Daten

// NEUE ABHÄNGIGKEITEN:
// ✅ Admin Portal Import: import { ... } from '../../../datasources/entraac/client'
// ✅ Shared Graph API Logic zwischen HR DataSources und Admin Portal
// ✅ Separate Speicher-Systeme (DataSources vs Admin Portal DBs)
```

---

## 🎨 Frontend-Module-Dependencies

### Frontend Theme/Branding (KRITISCH)

#### Environment-Dependencies (frontend/.env)
```
VITE_COMPANY_NAME=CompanyAI
VITE_APP_VERSION=v2.1.0
VITE_COMPANY_LOGO_URL=/logo.png
VITE_HEADER_BG_PRIMARY=#667eea
VITE_HEADER_BG_SECONDARY=#764ba2
VITE_HEADER_USE_GRADIENT=true
VITE_HEADER_TEXT_COLOR=#ffffff
VITE_SIDEBAR_BG_COLOR=#2d3748
VITE_SIDEBAR_TEXT_COLOR=#e2e8f0
VITE_SIDEBAR_ACCENT_COLOR=#667eea
VITE_SIDEBAR_WIDTH=280px
```

#### Shared Dependencies
- CSS Custom Properties (global in `frontend/src/index.css`) steuern Header/Sidebar/Buttons
- `ThemeProvider` (`frontend/src/context/ThemeContext.tsx`) liest `VITE_*` Variablen und setzt CSS-Variablen
- `Header.tsx` und `Sidebar.css` nutzen CSS-Variablen statt Hardcodes

#### Änderungen/Erweiterungen: Pflicht-Updates
- `.env` anpassen → `ThemeProvider` konsumiert Werte automatisch
- `docs/DOCUMENTATION_OVERVIEW.md` ENV-Beispiele ergänzen/ändern
- `docs/CHANGELOG.md` UI/UX-Änderungen dokumentieren

### Sidebar.tsx (NAVIGATION-ZENTRALE)
```typescript
// NAVIGATION-STRUKTUR:
const navigationItems = [
  {
    title: 'Dashboard',
    path: '/',
    icon: '📊',
    active: location.pathname === '/'
  },
  {
    title: 'HR Module', 
    path: '/hr',
    icon: '👥',
    active: location.pathname.startsWith('/hr'),
    submenu: [
      { title: 'Mitarbeiter', path: '/hr/employees', icon: '👤' },
      { title: 'Onboarding', path: '/hr/onboarding', icon: '🎯' },
      { title: 'Berichte', path: '/hr/reports', icon: '📈' },
      { title: 'Statistiken', path: '/hr/stats', icon: '📊' }
    ]
  },
  {
    title: 'Support Module',
    path: '/support', 
    icon: '🎫',
    active: location.pathname.startsWith('/support'),
    submenu: [
      { title: 'Tickets', path: '/support/tickets', icon: '📋' },
      { title: 'Neues Ticket', path: '/support/create', icon: '➕' },
      { title: 'Dashboard', path: '/support/dashboard', icon: '📊' }
    ]
  },
  {
    title: 'AI',
    path: '/ai',
    icon: '🤖', 
    active: location.pathname.startsWith('/ai'),
    submenu: [
      { title: 'Chat', path: '/ai/chat', icon: '💬' },
      { title: 'Dokumente', path: '/ai/docs', icon: '📚' }
    ]
  },
  {
    title: 'Admin-Portal',
    path: '/admin-portal',
    icon: '🏢',
    active: location.pathname.startsWith('/admin-portal'),
    submenu: [
      {
        title: '📊 System',
        path: '/admin-portal/system',
        icon: '📊',
        submenu: [
          { title: 'Dashboard', path: '/admin-portal/system/dashboard', icon: '📊' },
          { title: 'Statistiken', path: '/admin-portal/system/stats', icon: '📈' }
        ]
      },
      {
        title: '👥 Benutzer', 
        path: '/admin-portal/users',
        icon: '👥',
        submenu: [
          { title: 'Übersicht', path: '/admin-portal/users/overview', icon: '👥' },
          { title: 'Synchronisation', path: '/admin-portal/users/sync', icon: '🔄' },
          { title: 'Upload', path: '/admin-portal/users/upload', icon: '📤' },
          { title: 'Manuell', path: '/admin-portal/users/manual', icon: '✋' },
          { title: 'Konflikte', path: '/admin-portal/users/conflicts', icon: '⚠️' }
        ]
      },
      {
        title: '🔐 Rechte',
        path: '/admin-portal/permissions', 
        icon: '🔐',
        submenu: [
          { title: 'Rollen', path: '/admin-portal/permissions/roles', icon: '👑' },
          { title: 'Gruppen', path: '/admin-portal/permissions/groups', icon: '👥' },
          { title: 'API-Tokens', path: '/admin-portal/permissions/tokens', icon: '🎫' },
          { title: 'Audit-Logs', path: '/admin-portal/permissions/audit', icon: '📋' }
        ]
      }
    ]
  }
  // etc.
];

// ABHÄNGIGKEITEN FÜR NEUE MODULE:
// ✅ Neues navigationItem für Modul hinzufügen
// ✅ Icon und Titel festlegen
// ✅ Submenu für alle Unterseiten definieren
// ✅ Active-State-Logic erweitern
// ✅ Module-Status in .module-status Bereich hinzufügen
```

### Dashboard.tsx (SYSTEM-ÜBERSICHT)
```typescript
// MODUL-STATUS-ÜBERWACHUNG:
const moduleData: ModuleStatus[] = [
  {
    name: 'HR Module',
    status: 'active',
    description: 'Human Resources Management - Vollständig implementiert',
    endpoints: 8,
    lastUpdate: '8. Dezember 2024'
  },
  {
    name: 'Support Module', 
    status: 'active',
    description: 'Customer Support & Ticket Management - Basis implementiert',
    endpoints: 3,
    lastUpdate: '8. Dezember 2024'
  }
  // etc.
];

// ABHÄNGIGKEITEN FÜR NEUE MODULE:
// ✅ ModuleStatus für neues Modul hinzufügen
// ✅ Endpoint-Count aktualisieren
// ✅ Status auf 'active' setzen nach Implementation
// ✅ Quick-Action-Button für Hauptfunktion hinzufügen
```

### Page-Komponenten (STANDARD-PATTERN)
```typescript
// ALLE SEITEN VERWENDEN DIESES PATTERN:
const [Page]Page: React.FC = () => {
  // Standard-State-Management
  const [data, setData] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({ /* filter object */ });

  // Standard-API-Integration
  const loadData = async () => { /* standardized load logic */ };

  // Standard-JSX-Struktur
  return (
    <div className="[module]-page">
      <div className="page-header">
        <div className="page-title">
          <h1>[Icon] [Title]</h1>
          <p>[Description]</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary">[Action]</button>
        </div>
      </div>

      <div className="filters-section">
        {/* Standardized filters */}
      </div>

      <div className="content-section">
        {/* Loading/Error/Empty/Content states */}
      </div>

      <div className="page-summary">
        {/* Results summary */}
      </div>
    </div>
  );
};

// ABHÄNGIGKEITEN FÜR NEUE SEITEN:
// ✅ Exakt diese Struktur verwenden
// ✅ State-Management-Pattern kopieren
// ✅ API-Integration-Pattern verwenden
// ✅ CSS-Klassen beibehalten
// ✅ Error-Handling implementieren
// ✅ Loading-States bereitstellen
```

---

## 🔧 Integration-Guidelines für neue Features

### 1. NEUES BACKEND-MODUL hinzufügen

#### Schritt-für-Schritt (Dependencies beachten):
```bash
# 1. Modul-Struktur erstellen
mkdir backend/src/modules/[new-module]
mkdir backend/src/modules/[new-module]/functions
mkdir backend/src/modules/[new-module]/core  # falls eigene Helper nötig

# 2. Standard-Dateien kopieren (von HR-Modul):
cp backend/src/modules/hr/types.ts backend/src/modules/[new-module]/
cp backend/src/modules/hr/orchestrator.ts backend/src/modules/[new-module]/

# 3. Dependencies anpassen:
# - types.ts: APIResponse<T> und PaginatedResponse<T> beibehalten
# - orchestrator.ts: AuthenticatedRequest von hr/core/auth importieren
# - functions/: Gleiche Struktur wie HR-Modul verwenden

# 4. Integration in index.ts:
# - import { register[Module]Routes } from './modules/[new-module]/orchestrator';
# - register[Module]Routes(apiRouter);
# - availableModules in /api/hello erweitern
# - modules-Liste in /api/health erweitern
```

#### Required Dependencies:
- ✅ `AuthenticatedRequest` von `hr/core/auth`
- ✅ `APIResponse<T>` und `PaginatedResponse<T>` Interfaces
- ✅ Standardisierte Error-Handling-Patterns
- ✅ Express Router-Integration über `apiRouter`

### 2. NEUES FRONTEND-MODUL hinzufügen

#### Schritt-für-Schritt (Dependencies beachten):
```bash
# 1. Modul-Struktur erstellen
mkdir frontend/src/modules/[new-module]
mkdir frontend/src/modules/[new-module]/pages
mkdir frontend/src/modules/[new-module]/styles

# 2. Standard-Dateien kopieren (von HR-Modul):
cp frontend/src/modules/hr/HRModule.tsx frontend/src/modules/[new-module]/[Module]Module.tsx
cp frontend/src/modules/hr/styles/HRPages.css frontend/src/modules/[new-module]/styles/[Module]Pages.css

# 3. Erste Seite erstellen (von EmployeesPage kopieren):
cp frontend/src/modules/hr/pages/EmployeesPage.tsx frontend/src/modules/[new-module]/pages/[MainPage].tsx

# 4. Dependencies integrieren:
# - App.tsx: Route für /[new-module]/* hinzufügen mit MainLayout-Wrapper
# - Sidebar.tsx: navigationItems erweitern um neues Modul
# - Dashboard.tsx: moduleData um neuen Eintrag erweitern
```

#### Required Dependencies:
- ✅ **Layout-System**: Module über `MainLayout` in `App.tsx` wrapper
- ✅ **CSS-Klassen**: `.page-header`, `.content-section`, etc. verwenden
- ✅ **API-Pattern**: Standardisierte API-Calls mit Auth-Token
- ✅ **State-Management**: `loading`, `error`, `data` Pattern verwenden
- ✅ **Navigation**: Sidebar-Integration für Modul-Zugriff

### 3. NEUE SEITE zu bestehendem Modul hinzufügen

#### Frontend-Integration:
```typescript
// 1. Neue Seite erstellen (Page-Pattern verwenden):
frontend/src/modules/[existing-module]/pages/[NewPage]Page.tsx

// 2. Modul-Router erweitern:
// [Module]Module.tsx:
<Route path="/[new-page]" element={<[NewPage]Page />} />

// 3. Navigation erweitern:
// Sidebar.tsx navigationItems submenu erweitern:
{ title: '[New Page]', path: '/[module]/[new-page]', icon: '📄' }

// 4. Entsprechenden Backend-Endpoint verwenden/erstellen
```

#### Backend-Integration:
```typescript
// 1. Neue Funktion erstellen:
backend/src/modules/[existing-module]/functions/[newFunction].ts

// 2. Orchestrator erweitern:
// orchestrator.ts:
static async handle[NewAction](req: AuthenticatedRequest, res: Response) {
  // Standard-Pattern verwenden
}

// 3. Route registrieren:
// registerRoutes Funktion erweitern:
router.get('/[module]/[new-endpoint]', [Module]Orchestrator.handle[NewAction]);
```

### 4. SHARED COMPONENT erstellen

#### Wenn mehrere Module gleiche Komponente brauchen:
```typescript
// 1. Komponente in shared Bereich erstellen:
frontend/src/components/[SharedComponent].tsx

// 2. CSS in globalen Bereich:
frontend/src/components/[SharedComponent].css

// 3. Von allen Modulen importierbar:
import [SharedComponent] from '../../components/[SharedComponent]';

// 4. Einheitliche Props-Interface definieren:
interface [SharedComponent]Props {
  // Standardisierte Props
}
```

---

## ⚠️ Breaking Change Prevention

### NIEMALS ändern ohne Dependency-Check:
- ❌ `AuthenticatedRequest` Interface in `hr/core/auth.ts`
- ❌ `APIResponse<T>` Interface in `types.ts` Dateien
- ❌ Layout-CSS-Klassen in `MainLayout.css`, `HRPages.css`
- ❌ Router-Struktur in `App.tsx` ohne alle Module zu testen
- ❌ `localStorage` Auth-Keys (`authToken`, `userRole`, `userName`)
- ❌ Button-CSS-Klassen (`.btn-primary`, etc.)

### Vor Änderungen an Shared Dependencies:
1. 🔍 **Dependency-Check**: Alle Verwendungsstellen finden
2. 📋 **Impact-Analysis**: Welche Modules sind betroffen?
3. 🧪 **Test-Plan**: Alle betroffenen Modules testen
4. 📝 **Update-Documentation**: Diese Datei aktualisieren

---

## 📚 Dokumentations-Dependencies

### Bei neuen Features IMMER aktualisieren:
- ✅ `docs/modules/[module]/README.md` - Vollständige Modul-Dokumentation
- ✅ `docs/modules/[module]/API.md` - API-Endpunkt-Dokumentation  
- ✅ `docs/modules/[module]/CHANGELOG.md` - Versions-Historie
- ✅ `docs/README.md` - Haupt-Übersicht erweitern
- ✅ `INTERDEPENDENCY.md` (diese Datei) - Neue Dependencies dokumentieren
- ✅ `.cursorrules` - Standards erweitern falls nötig

---

## 🎯 Quick-Reference für KI-Integration

### Beim Erstellen neuer Features:

1. **FIRST**: Diese `INTERDEPENDENCY.md` lesen und verstehen
2. **DANN**: Bestehende Implementierung als Template verwenden:
   - Backend: HR-Modul als Referenz
   - Frontend: HR-Pages als Pattern-Vorlage
   - CSS: HRPages.css als Basis-Styles
3. **IMMER**: Dependencies respektieren und erweitern, nicht ersetzen
4. **FINALLY**: Dokumentation und diese Datei aktualisieren

### Template-Priorität (von hoch zu niedrig):
1. 🥇 **HR-Modul**: Vollständig implementiert, alle Patterns
2. 🥈 **Support-Modul**: Basis-Implementation, Standard-Patterns  
3. 🥉 **Dashboard**: Shared-Component-Patterns
4. 🏅 **Layout-System**: Architektur-Patterns

**Diese Interdependency-Map stellt sicher, dass alle neuen Features konsistent integriert werden und die modulbasierte Architektur respektieren! 🏗️📋**
