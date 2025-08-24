# Admin-Portal - Multi-Source User-Integration

Das **Admin-Portal** ist ein vollständiges Modul für die Integration und Verwaltung von Usern aus vier verschiedenen Quellen: Microsoft Entra ID, LDAP-Servern, CSV/Excel-Uploads und manueller Web-Erstellung.

## Inhaltsverzeichnis

- [Überblick](#überblick)
- [Architektur](#architektur)
- [Datenquellen](#datenquellen)
- [Features](#features)
- [Installation & Setup](#installation--setup)
- [Verwendung](#verwendung)
- [API-Referenz](#api-referenz)
- [Konfiguration](#konfiguration)
- [Troubleshooting](#troubleshooting)

## Überblick

Das Admin-Portal löst das Problem der **Multi-Source User-Integration** und **Unternehmens-Rechteverwaltung** durch:

- ✅ **4 Separate Datenbanken**: Externe SQLite-Datenbanken für jede Quelle
- ✅ **Auto-Schema-Discovery**: Automatische Felderkennung und Datenbankschema-Erweiterung  
- ✅ **Source-of-Truth-per-Database**: Strikte Trennung der Datenquellen im Backend
- ✅ **Unified Frontend View**: Vereinheitlichte Benutzeroberfläche für alle Quellen
- ✅ **Conflict Detection**: Automatische E-Mail-Duplikat-Erkennung zwischen Quellen
- ✅ **Asynchrone Sync-Jobs**: Hintergrund-Synchronisation für Entra und LDAP
- ✅ **Real-Time Updates**: Live-Status-Updates und Progress-Tracking
- ✅ **Untermodul-Architektur**: Strukturierte Organisation in 3 Hauptbereiche (NEU v2.0.0)
- ✅ **Rechte-Management**: Vollständige Rollen-, Gruppen- und Token-Verwaltung (NEU v2.0.0)
- ✅ **Audit-System**: Umfassendes Logging und Sicherheits-Monitoring (NEU v2.0.0)

## Architektur

### Backend-Struktur (Modulbasiert)

```
backend/src/modules/admin-portal/
├── types.ts                    # TypeScript-Typen & Interfaces (560+ Zeilen)
├── orchestrator.ts             # API-Routes & Handler (68+ Endpunkte)
├── core/
│   ├── database-manager.ts     # 4 SQLite-DB Manager (505 Zeilen)
│   ├── schema-registry.ts      # Auto-Migration Logic (425 Zeilen)
│   └── permissions-manager.ts  # Permission-System Core (NEU v2.0.0)
├── sources/
│   ├── entra-source.ts         # Microsoft Graph API Client (462 Zeilen)
│   ├── ldap-source.ts          # LDAP-Server Integration (532 Zeilen)
│   ├── upload-source.ts        # CSV/Excel Processing (623 Zeilen)
│   └── manual-source.ts        # Web-Form CRUD (599 Zeilen)
└── functions/
    ├── sync-orchestrator.ts    # Sync-Koordination aller Quellen
    ├── user-aggregator.ts      # Unified User-View Logic
    └── permissions/            # Permission-System Functions (NEU v2.0.0)
        ├── manageRoles.ts      # Rollen-CRUD-Operationen
        ├── manageGroups.ts     # Gruppen-Management
        ├── manageTokens.ts     # API-Token-Verwaltung
        └── auditLogs.ts        # Audit-Log-System
```

### Frontend-Struktur (Untermodule-basiert)

```
frontend/src/modules/admin-portal/
├── AdminPortalModule.tsx       # Haupt-Router für Untermodule
├── submodules/                 # Untermodul-Organisation (NEU v2.0.0)
│   ├── users/                  # 👥 Benutzer-Verwaltung
│   │   ├── UsersModule.tsx     # Router für /users/*
│   │   ├── pages/
│   │   │   ├── UsersOverviewPage.tsx   # Vereinheitlichte User-Tabelle
│   │   │   ├── SyncManagementPage.tsx  # Sync-Jobs & Status
│   │   │   ├── UploadPage.tsx          # CSV/Excel-Upload mit Preview
│   │   │   ├── ManualUsersPage.tsx     # Web-basierte User-Erstellung
│   │   │   └── ConflictsPage.tsx       # E-Mail-Konflikt-Auflösung
│   │   └── styles/
│   │       └── UsersPages.css
│   ├── system/                 # 📊 System & Analytics
│   │   ├── SystemModule.tsx    # Router für /system/*
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx       # Haupt-Dashboard mit Stats
│   │   │   └── StatsPage.tsx           # Erweiterte Analysen & Metriken
│   │   └── styles/
│   │       └── SystemPages.css
│   └── permissions/            # 🔐 Rechte-Verwaltung (NEU v2.0.0)
│       ├── PermissionsModule.tsx # Router für /permissions/*
│       ├── pages/
│       │   ├── RolesPage.tsx           # Rollen-Management
│       │   ├── GroupsPage.tsx          # Gruppen-Verwaltung
│       │   ├── TokensPage.tsx          # API-Token-Management
│       │   └── AuditPage.tsx           # Audit-Logs & Security
│       └── styles/
│           └── PermissionsPages.css
└── shared/                     # Gemeinsame Komponenten/Utils
    ├── components/
    └── utils/
```

### Externe Datenbanken

**Speicherort:** `C:\Code\Company_Allg_Data\Admin_Portal\databases\Users\`

- `db_entra.sqlite` - Microsoft Entra ID User
- `db_ldap.sqlite` - LDAP-Server User  
- `db_upload.sqlite` - CSV/Excel Upload User
- `db_manual.sqlite` - Manuell erstellte User

## Datenquellen

### 1. Microsoft Entra ID (Azure AD)

**Konfiguration:** `.env`
```bash
ENTRA_TENANT_ID=your_tenant_id
ENTRA_CLIENT_ID=your_client_id  
ENTRA_CLIENT_SECRET=your_client_secret
GRAPH_SCOPE=https://graph.microsoft.com/.default
```

**Features:**
- OAuth 2.0 Client Credentials Flow
- Microsoft Graph API v1.0 Integration
- Automatische Token-Verwaltung
- Vollständiger User-Sync (alle Attribute)
- Paginierte API-Calls für große Datenmengen

**Sync-Mechanismus:**
- ⏰ **Scheduled Sync** - Täglich um 06:00 Uhr (konfigurierbar)
- 🚀 **Auto-Sync beim Server-Start** (optional via ENV)
- 🎛️ **Manuell über Web-Interface** - Sofortige Synchronisation
- 🔄 **Intelligent Retry-Logic** - 3x Wiederholung bei Fehlern (15min Delay)
- 📜 **Sync-Historie** - Vollständiges Logging aller Sync-Operationen

### 2. LDAP-Server

**Konfiguration:** `.env`
```bash
LDAP_URL=ldaps://ldap.example.com:636
LDAP_BIND_DN=cn=readonly,dc=example,dc=com
LDAP_BIND_PW=your_password
LDAP_BASE_DN=ou=users,dc=example,dc=com
```

**Features:**
- LDAPS (SSL/TLS) Verbindungen
- Flexibler LDAP-Query Support
- Attribut-Discovery aus Directory-Schema
- Distinguished Names (DN) als unique ID
- Group-Membership Extraktion

**Unterstützte LDAP-Server:**
- Active Directory
- OpenLDAP  
- Apache Directory Server
- Generic LDAP v3-kompatible Server

### 3. CSV/Excel Upload

**Unterstützte Formate:**
- CSV (UTF-8, mit Headers)
- Excel (.xlsx, .xls)
- Maximale Dateigröße: 10MB

**Features:**
- **Upload-Analyse**: Preview & Validierung vor Import
- **Intelligentes Field-Mapping**: Automatische Feld-Erkennung
- **Custom-Mapping**: Manuelle Spalten-zu-DB-Feld-Zuordnung  
- **Add/Replace Modi**: Ergänzende oder komplette Ersetzung
- **Batch-Processing**: Effiziente Verarbeitung großer Dateien
- **Error-Reporting**: Detaillierte Fehlerberichterstattung

**Mapping-Beispiel:**
```
CSV-Spalte        →  Datenbank-Feld
"E-Mail"         →  email  
"Vorname"        →  firstName
"Nachname"       →  lastName
"Abteilung"      →  department
"Position"       →  jobTitle
"Status"         →  isActive
```

### 4. Manuelle Web-Erstellung

**Features:**
- **Web-basierte Formulare**: Intuitive User-Erstellung
- **Custom Fields**: Beliebige zusätzliche Felder
- **Real-Time Validation**: Sofortige Eingabe-Validierung
- **CRUD-Operationen**: Vollständige Create/Read/Update/Delete  
- **User-Tracking**: Wer hat wann welchen User erstellt/geändert
- **Notes & Tags**: Ergänzende Metadaten pro User

## Features

### Core Features

#### 🔄 **Multi-Source Synchronisation**
- **Parallel Sync**: Alle externen Quellen können parallel synchronisiert werden
- **Source-Isolation**: Strikte Trennung der Datenquellen im Backend
- **Atomic Operations**: Transactions für Datenkonsistenz
- **Progress-Tracking**: Real-Time Sync-Status und Fortschritt
- **Error-Recovery**: Automatische Wiederholung bei temporären Fehlern

#### 🗃️ **Auto-Schema-Discovery & Migration**
- **Dynamic Fields**: Neue Felder werden automatisch erkannt
- **Schema Evolution**: Datenbank-Schema passt sich automatisch an
- **Type Detection**: Intelligente Datentyp-Erkennung (TEXT, INTEGER, BOOLEAN, DATETIME)
- **Non-Destructive**: Nur additive Schema-Änderungen
- **Migration-History**: Tracking aller Schema-Änderungen

**Beispiel Auto-Migration:**
```typescript
// Entra liefert neues Feld "mobilePhone"
// System erkennt automatisch:
// - Feldname: "mobilePhone"  
// - Datentyp: TEXT (basierend auf Werten)
// - Maximale Länge: 50 Zeichen
// - Erforderlich: false (neue Felder sind optional)

// SQL wird automatisch ausgeführt:
// ALTER TABLE users ADD COLUMN mobilePhone TEXT(50);
```

#### 📊 **Unified User-View**
- **Single Interface**: Eine Oberfläche für alle User aus allen Quellen
- **Source Identification**: Klare Kennzeichnung der Herkunftsquelle
- **Cross-Source Search**: Suche über alle Quellen hinweg
- **Filtering & Sorting**: Erweiterte Filter- und Sortierfunktionen
- **Pagination**: Effiziente Darstellung großer Datenmengen

#### ⚠️ **Conflict Detection & Resolution**
- **Email Conflicts**: Automatische Erkennung doppelter E-Mail-Adressen
- **Priority-Based Resolution**: Empfohlene Auflösungs-Strategien nach Quellen-Priorität
- **Manual Resolution**: Web-Interface für manuelle Konflikt-Lösung
- **Resolution History**: Tracking aufgelöster Konflikte

**Quellen-Priorität (für Konflikt-Auflösung):**
1. **Entra ID** - Höchste Priorität (autorisierte Unternehmens-Quelle)
2. **LDAP** - Hohe Priorität (zentrale Verzeichnis-Quelle)  
3. **Manual** - Mittlere Priorität (kuratierte Daten)
4. **Upload** - Niedrigste Priorität (oft temporäre Daten)

### Advanced Features

#### 📈 **Analytics & Reporting**
- **Dashboard-Statistiken**: Übersicht aller Quellen und Metriken
- **Source-Comparison**: Vergleichende Analyse zwischen Quellen
- **Data Quality Scores**: Qualitätsbewertung pro Quelle
- **Activity Trends**: Zeitbasierte Aktivitätsauswertung
- **Export Capabilities**: CSV/PDF Export für externe Analyse

#### 🔐 **Security & Compliance**
- **Role-Based Access**: Admin-Berechtigungen erforderlich für alle Operationen
- **Audit Logging**: Vollständige Protokollierung aller Aktionen
- **Data Encryption**: Verschlüsselte Verbindungen zu externen Quellen
- **PII Protection**: Sichere Behandlung von personenbezogenen Daten
- **Compliance Ready**: DSGVO-konforme Datenverarbeitung

#### 🚀 **Performance & Scalability**
- **Background Jobs**: Asynchrone Sync-Operationen
- **Connection Pooling**: Effiziente Datenbankverbindungen
- **Batch Processing**: Optimierte Verarbeitung großer Datenmengen
- **Caching**: Intelligente Zwischenspeicherung von Sync-Status
- **Resource Management**: Speicher-effiziente Stream-Processing

## Installation & Setup

### 1. Abhängigkeiten installieren

```bash
cd backend
npm install sqlite3 sqlite ldapts papaparse xlsx multer
npm install --save-dev @types/sqlite3 @types/ldapjs @types/papaparse @types/multer
```

### 2. Umgebungsvariablen konfigurieren

**Backend `.env`:**
```bash
# Admin-Portal Database Path
ADMIN_PORTAL_DB_PATH=C:\Code\Company_Allg_Data\Admin_Portal\databases\Users

# Microsoft Entra ID
ENTRA_TENANT_ID=your_tenant_id
ENTRA_CLIENT_ID=your_client_id  
ENTRA_CLIENT_SECRET=your_client_secret

# LDAP Configuration  
LDAP_URL=ldaps://ldap.example.com:636
LDAP_BIND_DN=cn=readonly,dc=example,dc=com
LDAP_BIND_PW=your_password
LDAP_BASE_DN=ou=users,dc=example,dc=com

# Auto-Sync Settings
AUTO_SYNC_ON_STARTUP=true
```

### 3. Externe Datenbanken vorbereiten

```bash
# Verzeichnis erstellen (falls nicht vorhanden)
mkdir -p "C:\Code\Company_Allg_Data\Admin_Portal\databases\Users"

# System erstellt automatisch die 4 SQLite-Datenbanken beim ersten Start:
# - db_entra.sqlite
# - db_ldap.sqlite  
# - db_upload.sqlite
# - db_manual.sqlite
```

### 4. Backend starten

```bash
cd backend
npm run dev
```

Das Admin-Portal initialisiert sich automatisch und erstellt die Datenbank-Struktur.

### 5. Frontend-Integration

Das Frontend ist vollständig in Untermodule strukturiert:
- **Haupt-Route**: `/admin-portal/*`
- **Untermodule-Navigation**: Hierarchische Sidebar mit 3 Hauptbereichen
- **Dashboard-Integration**: Admin-Portal Modul-Kachel

#### Untermodul-URL-Struktur:
```
📊 System:
├── /admin-portal/system/dashboard    # Dashboard-Übersicht
└── /admin-portal/system/stats        # Erweiterte Statistiken

👥 Benutzer:  
├── /admin-portal/users/overview      # User-Übersicht
├── /admin-portal/users/sync          # Sync-Management
├── /admin-portal/users/upload        # Upload-Interface
├── /admin-portal/users/manual        # Manuelle User-Verwaltung
└── /admin-portal/users/conflicts     # Konflikt-Auflösung

🔐 Rechte (NEU):
├── /admin-portal/permissions/hierarchy # Hierarchische Rechte (NEU v2.1.0)
├── /admin-portal/permissions/roles     # Rollen-Management
├── /admin-portal/permissions/groups    # Gruppen-Verwaltung
├── /admin-portal/permissions/tokens    # API-Token-Management
└── /admin-portal/permissions/audit     # Audit-Logs & Security
```

## Verwendung

### Web-Interface (Untermodule-basiert)

## 📊 **System-Untermodul** (`/admin-portal/system/*`)

#### 1. Dashboard (`/admin-portal/system/dashboard`)
- **Übersicht**: Gesamt-User, Konflikte, aktive Quellen
- **Source-Kacheln**: Status und User-Anzahl pro Quelle
- **Schnellaktionen**: Direct-Links zu häufigen Aufgaben
- **Auto-Refresh**: Alle 30 Sekunden automatische Aktualisierung

#### 2. Statistiken (`/admin-portal/system/stats`)
- **Advanced Analytics**: Detaillierte Analysen aller Datenquellen
- **Source-Comparison**: Vergleichende Statistiken zwischen Quellen
- **Data Quality**: Quality-Scores und Datenqualitäts-Metriken
- **Activity Trends**: Zeitbasierte Trend-Analysen
- **Export Options**: Umfangreiche Export-Möglichkeiten

## 👥 **Benutzer-Untermodul** (`/admin-portal/users/*`)

#### 1. Übersicht (`/admin-portal/users/overview`)
- **Unified Table**: Alle User aus allen Quellen in einer Tabelle
- **Source-Filter**: Filterung nach einer oder mehreren Quellen  
- **Search & Sort**: Volltextsuche und Sortierung nach beliebigen Feldern
- **User-Details**: Detailansicht mit Quell-spezifischen Daten
- **Export**: JSON-Export aller gefilterten User

#### 2. Synchronisation (`/admin-portal/users/sync`)
- **Source-Status**: Live-Status aller sync-fähigen Quellen
- **Manual Sync**: Einzelne Quellen oder alle parallel synchronisieren
- **Connection Tests**: Verbindungstests zu externen Systemen
- **Sync-History**: Verlauf der letzten Synchronisationen
- **Configuration**: Übersicht der Konfiguration pro Quelle

#### 3. Upload (`/admin-portal/users/upload`)
- **File-Upload**: Drag & Drop für CSV/Excel-Dateien
- **Analysis**: Automatische Datei-Analyse mit Preview
- **Field-Mapping**: Interaktive Spalten-zu-Feld-Zuordnung
- **Validation**: Fehlerprüfung vor dem Import
- **Processing**: Add/Replace Modi mit Progress-Anzeige

#### 4. Manuell (`/admin-portal/users/manual`)
- **User-Management**: CRUD-Interface für Web-basierte User-Erstellung
- **Custom Fields**: Dynamische zusätzliche Felder pro User
- **Bulk-Operations**: Mehrere User gleichzeitig bearbeiten
- **Search & Filter**: Erweiterte Suchfunktionen
- **Statistics**: Aktivitäts- und Erstellungsstatistiken

#### 5. Konflikte (`/admin-portal/users/conflicts`)
- **Conflict-Detection**: Automatische E-Mail-Duplikat-Erkennung
- **Resolution-Wizard**: Schritt-für-Schritt Konflikt-Auflösung  
- **Priority-Suggestions**: KI-basierte Auflösungs-Empfehlungen
- **Manual-Override**: Manuelle Auflösungs-Entscheidungen
- **Resolution-History**: Verlauf aufgelöster Konflikte

## 🔐 **Rechte-Untermodul** (`/admin-portal/permissions/*`) - **NEU v2.0.0**

#### 1. Hierarchische Rechte (`/admin-portal/permissions/hierarchy`) - **NEU v2.1.0**
- **Automatische Hierarchie-Erkennung**: Analysiert vorhandene Benutzer und erkennt Abteilungsstrukturen automatisch
- **Abteilungs-basierte Rechtevergabe**: Verwalte Berechtigungen auf Abteilungsebene (z.B. "Verkauf", "HR", "IT")
- **Untergruppen-Unterstützung**: Erkennt und verwaltet Untergruppen wie "Verkauf | AS" oder "HR | Recruiting"
- **Modul-/Seiten-spezifische Rechte**: Granulare Kontrolle über Module (HR, Support, AI) und deren einzelne Seiten
- **3-Stufen-Dropdown-Selektor**: Intuitive Navigation durch Abteilung → Untergruppe → Benutzer
- **Permission-Matrix-Editor**: Visuelle Bearbeitung von Modul- und Seiten-Berechtigungen
- **Rechte-Vererbung**: Untergruppen erben Basis-Rechte der Obergruppe, können aber erweitert werden
- **Individual-User-Overrides**: Spezifische Abweichungen für einzelne Benutzer möglich
- **Live-Vorschau**: Effektive Berechtigungen werden in Echtzeit berechnet und angezeigt

**Hierarchie-Struktur-Beispiel:**
```
🏢 VERKAUF (Obergruppe - 12 Mitarbeiter)
├── 📂 Verkauf | AS (Untergruppe - 5 Mitarbeiter)
│   ├── 👤 Hans Mueller (Vertriebsleiter)
│   ├── 👤 Sarah Wagner (Account Manager)
│   └── 👤 Klaus Schmidt (Sales Rep)
├── 📂 Verkauf | Berlin (Untergruppe - 4 Mitarbeiter)
│   └── 👤 Maria Lopez (Regional Manager)
└── 👤 Max Verkaufsleiter (Direkt zugeordnet - 3 Mitarbeiter)

🏢 HR (Obergruppe - 8 Mitarbeiter)
├── 📂 HR | Recruiting (Untergruppe - 3 Mitarbeiter)
└── 📂 HR | Payroll (Untergruppe - 2 Mitarbeiter)
```

**Berechtigungs-Matrix-Beispiel:**
```
Abteilung: VERKAUF
├── HR Modul: Lesen (Mitarbeiter einsehen)
├── Support Modul: Schreiben (Tickets erstellen/bearbeiten)  
├── AI Modul: Lesen (Chat nutzen, begrenzt auf 50 Anfragen/Tag)
└── Admin Portal: Kein Zugriff

Untergruppe: Verkauf | AS (erbt VERKAUF + zusätzlich)
└── HR Modul: Schreiben (zusätzlich: Berichte erstellen)
```

#### 2. Rollen (`/admin-portal/permissions/roles`)
- **Rollen-Management**: Erstellen, bearbeiten und löschen von Benutzerrollen
- **Permission-Assignment**: Detaillierte Berechtigungen pro Rolle zuweisen
- **System-Rollen**: Vordefinierte Administrator-, User Manager- und Viewer-Rollen
- **User-Count**: Übersicht wie viele Benutzer jede Rolle haben
- **Role-Templates**: Vorgefertigte Rollen-Vorlagen für häufige Anwendungsfälle

#### 3. Gruppen (`/admin-portal/permissions/groups`)
- **Gruppen-Verwaltung**: Organisieren von Benutzern in funktionale Gruppen
- **Rollen-Zuweisung**: Mehrere Rollen pro Gruppe zuweisen
- **Default-Groups**: Standard-Gruppen für neue Benutzer
- **Effektive Berechtigungen**: Übersicht der kombinierten Berechtigungen aus allen Rollen
- **Bulk-User-Management**: Benutzer massenhaft zu Gruppen hinzufügen/entfernen

#### 4. API-Tokens (`/admin-portal/permissions/tokens`)
- **Token-Generierung**: Sichere API-Tokens für externe Integrationen erstellen
- **Granulare Berechtigungen**: Spezifische Berechtigungen pro Token
- **Expiration-Management**: Token-Ablaufzeiten und automatische Deaktivierung
- **Usage-Tracking**: Überwachung wann und wie Tokens verwendet werden
- **IP-Whitelisting**: Beschränkung von Token-Nutzung auf bestimmte IP-Adressen
- **Token-Revocation**: Sofortiges Widerrufen kompromittierter Tokens

#### 5. Audit-Logs (`/admin-portal/permissions/audit`)
- **Security-Monitoring**: Vollständige Protokollierung aller Benutzer-Aktivitäten
- **Filter-System**: Erweiterte Filterung nach Benutzer, Aktion, Resource, Zeitraum
- **Success/Failure-Tracking**: Unterscheidung erfolgreicher und fehlgeschlagener Aktionen
- **IP-Address-Logging**: Verfolgung von Login-Standorten und verdächtigen Aktivitäten
- **Export-Capabilities**: Audit-Logs für Compliance-Berichte exportieren
- **Real-Time-Monitoring**: Live-Updates bei sicherheitsrelevanten Ereignissen

### API-Integration

Alle Funktionen sind auch über REST-API verfügbar:

```bash
# Sync starten
curl -X POST http://localhost:5000/api/admin-portal/sync/entra \
  -H "Authorization: Bearer $TOKEN"

# User abrufen  
curl http://localhost:5000/api/admin-portal/users?sources=entra,ldap \
  -H "Authorization: Bearer $TOKEN"

# Upload verarbeiten
curl -X POST http://localhost:5000/api/admin-portal/upload/process \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@users.csv" \
  -F "mode=add"
```

## Konfiguration

### Environment-Variablen

| Variable | Beschreibung | Standard | Erforderlich |
|----------|--------------|----------|--------------|
| `ADMIN_PORTAL_DB_PATH` | Pfad zu externen Datenbanken | `../Company_Allg_Data/...` | Ja |
| `ENTRA_TENANT_ID` | Azure AD Tenant ID | - | Für Entra-Sync |
| `ENTRA_CLIENT_ID` | Azure AD App Client ID | - | Für Entra-Sync |
| `ENTRA_CLIENT_SECRET` | Azure AD App Secret | - | Für Entra-Sync |
| `LDAP_URL` | LDAP-Server URL | - | Für LDAP-Sync |
| `LDAP_BIND_DN` | LDAP Bind DN | - | Für LDAP-Sync |  
| `LDAP_BIND_PW` | LDAP Bind Password | - | Für LDAP-Sync |
| `LDAP_BASE_DN` | LDAP Base DN für User-Suche | - | Für LDAP-Sync |
| `AUTO_SYNC_ON_STARTUP` | Auto-Sync beim Server-Start | `false` | Nein |

### Microsoft Entra ID App-Registrierung

**Erforderliche Schritte in Azure Portal:**

1. **App Registration erstellen:**
   - Name: "CompanyAI Admin Portal"
   - Supported account types: "Single tenant"

2. **API-Berechtigungen hinzufügen:**
   - Microsoft Graph → Application permissions
   - `User.Read.All` - Alle User lesen
   - `Directory.Read.All` - Directory-Informationen lesen  
   - Admin-Consent erteilen

3. **Client Secret erstellen:**
   - Certificates & secrets → New client secret
   - Beschreibung: "Admin Portal Backend"
   - Expires: Nach Unternehmenspolicy

4. **Werte in .env eintragen:**
   ```bash
   ENTRA_TENANT_ID=<Directory (tenant) ID>
   ENTRA_CLIENT_ID=<Application (client) ID>  
   ENTRA_CLIENT_SECRET=<Client secret value>
   ```

### LDAP-Server Konfiguration

**Beispiel-Konfigurationen:**

**Active Directory:**
```bash
LDAP_URL=ldaps://dc.company.com:636
LDAP_BIND_DN=CN=ReadOnlyUser,OU=Service,DC=company,DC=com
LDAP_BASE_DN=CN=Users,DC=company,DC=com
```

**OpenLDAP:**
```bash
LDAP_URL=ldaps://ldap.company.com:636
LDAP_BIND_DN=cn=readonly,dc=company,dc=com
LDAP_BASE_DN=ou=people,dc=company,dc=com
```

### Performance-Tuning

**Große Datenmengen (>10.000 User):**

```bash
# Erhöhe Batch-Größen
SYNC_BATCH_SIZE=1000

# Connection-Pooling
DB_POOL_SIZE=10

# Memory-Limits für Upload  
MAX_UPLOAD_FILE_SIZE=50485760  # 50MB
```

## Troubleshooting

### Häufige Probleme

#### 1. Entra ID Sync-Fehler

**Problem:** `AuthenticationFailed - invalid_client`
```
Lösung:
- Client Secret prüfen (läuft ab?)
- App-Registrierung prüfen (korrekte Tenant?)
- Admin-Consent erteilt?
```

**Problem:** `GraphAPIError - insufficient_privileges`
```
Lösung:  
- API-Berechtigungen prüfen:
  ✅ User.Read.All (Application)
  ✅ Directory.Read.All (Application)
- Admin-Consent erteilen
```

#### 2. LDAP Connection-Fehler

**Problem:** `ConnectionError - unable to connect`
```
Lösung:
- LDAP_URL prüfen (ldaps:// für SSL)
- Firewall/Network-Connectivity
- LDAP_BIND_DN/PW prüfen
```

**Problem:** `SearchError - invalid base DN`
```
Lösung:
- LDAP_BASE_DN korrekt?
- User-OU existiert?
- Bind-User hat Leseberechtigung?
```

#### 3. Upload-Probleme

**Problem:** `UnsupportedFileType`
```
Lösung:
- Nur .csv, .xlsx, .xls unterstützt
- Datei-Endung korrekt?
- MIME-Type prüfen
```

**Problem:** `CSVParseError`
```
Lösung:
- UTF-8 Encoding verwenden
- Header-Zeile vorhanden?
- Kommas als Trennzeichen
```

#### 4. Schema-Migration-Fehler

**Problem:** `FieldAddError - column already exists`
```
Lösung:
- Normalerweise kein Problem (Feld existiert bereits)
- Bei Problemen: SQLite-Datei löschen (wird neu erstellt)
```

**Problem:** `DatabaseNotFound`
```
Lösung:
- ADMIN_PORTAL_DB_PATH prüfen
- Verzeichnis manuell erstellen:
  mkdir -p "C:\Code\Company_Allg_Data\Admin_Portal\databases\Users"
```

### Debug-Modus

**Erweiterte Logging aktivieren:**

```bash
# Backend
DEBUG=admin-portal:* npm run dev

# Logs in Browser-Konsole aktivieren
localStorage.setItem('debug', 'admin-portal:*')
```

**Database-Debugging:**

```bash  
# SQLite-Datenbank direkt inspizieren
sqlite3 "C:\Code\Company_Allg_Data\Admin_Portal\databases\Users\db_entra.sqlite"

.tables
.schema users
SELECT COUNT(*) FROM users;
SELECT * FROM schema_registry;
```

### Support & Logs

**Log-Dateien:**
- Backend: Console-Output mit strukturierten Logs
- Frontend: Browser DevTools Console
- Sync-Jobs: Detaillierte Progress-Logs

**Health-Check:**
```bash
# System-Status prüfen
curl http://localhost:5000/api/admin-portal/test/connections

# Sync-Status prüfen  
curl http://localhost:5000/api/admin-portal/sync/status
```

---

## Nächste Schritte

- [ ] **Email-Notifications**: Benachrichtigungen bei Sync-Fehlern
- [ ] **Schedule-Sync**: Cron-basierte automatische Synchronisation
- [ ] **Advanced-Mapping**: Komplexere Field-Transformationen
- [ ] **Data-Validation**: Erweiterte Datenvalidierung mit Custom-Rules
- [ ] **Multi-Tenant**: Mandanten-fähige Installation

---

**Version:** 1.0.0  
**Letztes Update:** 14. Dezember 2024  
**Entwickelt für:** CompanyAI v2.1.0
