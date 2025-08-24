# CompanyAI - Änderungshistorie

Alle wichtigen Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

Das Format basiert auf [Keep a Changelog](https://keepachangelog.com/de/1.0.0/),
und dieses Projekt folgt [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unveröffentlicht]

### Hinzugefügt
- **🏗️ Hierarchical Permissions System (v2.1.0 - NEU)**:
  - **Automatische Abteilungs-Hierarchie-Erkennung**: Analysiert vorhandene User-Daten und erkennt Strukturen automatisch
    - Parsing von Abteilungsfeldern mit " | " Separator (z.B. "Verkauf | AS", "HR | Recruiting")
    - Obergruppen (Abteilungen) und Untergruppen automatisch erkannt
    - **3-Stufen-Dropdown-Selektor**: Abteilung → Untergruppe → Benutzer Navigation
  - **Granulare Module-/Seiten-basierte Rechtevergabe**:
    - Modul-Level-Permissions (`hr`, `support`, `ai`, `admin-portal`) mit `none`, `read`, `write`, `admin` Levels
    - Seiten-Level-Permissions für alle Pages innerhalb Module (z.B. `hr.employees`, `support.tickets`)
    - Action-Level-Permissions (view, create, edit, delete, export, import, etc.)
    - Optional: Feature-Limits (dailyQuota, maxTokens, etc.)
  - **Rechtevererbung-System**: Untergruppen erben Basis-Rechte von Obergruppe + können erweitert werden
  - **Individual-User-Overrides**: Spezifische Abweichungen für einzelne Benutzer möglich
  - **🎛️ Permission-Matrix-Editor**: Visuelle Bearbeitung von Modul- und Seiten-Berechtigungen
  - **Live-Vorschau**: Effektive Berechtigungen werden in Echtzeit berechnet und angezeigt
  - **Backend-APIs (6 neue Endpunkte)**:
    - `GET /api/admin-portal/hierarchy/analyze` - User-Hierarchie analysieren
    - `GET /api/admin-portal/hierarchy/structure` - Gespeicherte Hierarchie laden  
    - `GET/PUT /api/admin-portal/hierarchy/departments/:id/permissions` - Department-Permissions verwalten
    - `GET /api/admin-portal/hierarchy/users/:id/effective-permissions` - Effektive User-Permissions berechnen
    - `GET /api/admin-portal/hierarchy/modules` - Module-Definitionen für Permission-Matrix
  - **Frontend-Integration**:
    - **HierarchyPage.tsx**: Haupt-Interface mit 3 Tabs (Struktur-Analyse, Permission-Matrix, User-Übersicht)
    - **Permission-Matrix-UI**: Modul/Page-Grid mit Action-Checkboxes und Limits-Konfiguration
    - **Hierarchie-Navigation**: Admin-Portal → Rechte → "Hierarchische Rechte" (neue Primary-Route)
    - **CSS-Styles**: 500+ Zeilen neue Styles für komplexe Permission-UI
- **Admin-Portal Major Update (v2.0.0)**: Untermodul-Architektur + Permission-System
  - **🏗️ Vollständige Umstrukturierung** in 3 logische Untermodule
  - **📁 Neue Frontend-Architektur** mit `submodules/` für bessere Skalierbarkeit
  - **🔐 Permission-System (KOMPLETT NEU)**:
    - Rollen-Management mit granularen Berechtigungen
    - Gruppen-Verwaltung mit Rollen-Zuweisung  
    - API-Token-Management für externe Integrationen
    - Audit-Logs mit erweiterten Filteroptionen
  - **📱 Hierarchische Navigation** mit mehrstufigen Submenus
  - **20 neue API-Endpunkte** für Permission-Management (68+ gesamt)
  - **4 neue Frontend-Pages** für Rechte-Verwaltung
  - **🎯 URL-Umstrukturierung** für logische Gruppierung:
    - System: `/admin-portal/system/dashboard`, `/admin-portal/system/stats`
    - Benutzer: `/admin-portal/users/overview`, `/admin-portal/users/sync`, etc.
    - Rechte: `/admin-portal/permissions/roles`, `/admin-portal/permissions/groups`, etc.
- **⭐ Entra Admin Center Integration (v2.3.1)**: Direkte Integration zwischen Admin Portal und HR DataSources
  - **DataSources Graph API Client**: Admin Portal nutzt jetzt die gleiche Graph API Logic wie HR Modul
  - **Fetch und Store**: Neue Funktion lädt User direkt aus Entra Admin Center und speichert in Admin Portal DB
  - **API-Endpunkte**: `POST /api/admin-portal/entra/fetch-from-admin-center`, `GET /api/admin-portal/entra/check-availability`
  - **Shared Dependencies**: Wiederverwendung von `getAppToken()`, `graphGet()`, `graphGetAllPages()`, `testConnection()`
  - **PowerShell Test-Script**: `tools/test-entra-admin-center.ps1` für vollständige Integration-Tests
- **Externe RAG Speicherung**: RAG System unterstützt jetzt externe Ordner für Dokumentenspeicherung
  - Neue ENV-Variable: `RAG_EXTERNAL_DOCS_PATH` für externen Dokumentenordner
  - Erweiterte ENV-Variable: `RAG_INDEX_PATH` für externe Index-Datei
  - Automatische Erstellung externer Ordner falls nicht vorhanden
  - Frontend zeigt externe/interne Speicherung in DocsPage an
  - Bessere Trennung zwischen Projekt-Code und RAG-Daten

### Geändert  
- **🔐 .cursorrules-Erwiterung (Hierarchical Permissions)**: Kritische neue Regeln für Module-Integration
  - **Modul-Permission-Definition-Pflicht**: Jedes neue Modul MUSS Hierarchical Permission-System integrieren
  - **Backend-Integration-Checkliste**: Permission-Checks in orchestrator.ts, Module-Definitionen in hierarchyAnalyzer.ts
  - **Frontend-Integration-Checkliste**: useUserPermissions Hook, Permission-Guards, Feature-Guards, Error-States
  - **Dokumentations-Updates**: Permission-Sektionen in README.md/API.md, INTERDEPENDENCY.md Permission-Dependencies
  - **Nicht-Erlaubt-Liste**: Hard-Fails für Module ohne Permission-Integration, umgehen des Systems
  - **Migration-Regeln**: Bestehende Module müssen schrittweise migriert werden
- **Backend-Integration**: Haupt-App (`app.ts`) um Admin-Portal-Routen erweitert
- **Frontend-Navigation**: Sidebar um Admin-Portal mit 7 Untermenü-Punkten erweitert + "Hierarchische Rechte" Primary-Route
- **Dashboard**: Modul-Übersicht um Admin-Portal-Kachel mit 48 API-Endpunkten erweitert
- **Auth-System**: Admin-Permissions um neue Ressourcen erweitert (`admin_users`, `system_settings`, etc.)
- **Package-Dependencies**: Backend um SQLite, LDAP, CSV-Parser-Bibliotheken erweitert
- **AI Module**: Dokumentation komplett überarbeitet für Multi-Provider + externe Speicherung
- **INTERDEPENDENCY.md**: Erweitert um Admin-Portal Dependencies und externe Speicher-Dependencies
- **DOCUMENTATION_OVERVIEW.md**: Erweitert um Admin-Portal-Modul-Dokumentation
- **Backend .env**: Neue Datei mit vollständiger Konfiguration hinzugefügt

### Geplant
- Datenbank-Integration (PostgreSQL/MongoDB)
- Automatisierte Tests (Jest/Supertest)
- Produktion-Modul Implementation
- Erweiterte Sicherheitsfeatures (Rate Limiting, Input Sanitization)

### 🧩 Docs/Integrations
- HR ↔ DataSources Abhängigkeit dokumentiert (lesen: combined, schreiben: manual)
- Admin-Portal ↔ Externe Datenbanken vollständig dokumentiert
  - 4 separate SQLite-Datenbanken mit Source-of-Truth-per-Database
  - Microsoft Entra ID Graph API Integration
  - LDAP-Server Integration (Active Directory, OpenLDAP)
  - CSV/Excel-Upload-Processing mit Auto-Schema-Migration
  - Manual-Web-User-CRUD mit Custom-Fields-Support
  - E-Mail-Conflict-Detection zwischen allen Quellen
- HR‑README und HR‑API um DataSources‑Details ergänzt
- INTERDEPENDENCY.md erweitert (Global Rules + HR‑Bindings)
- DOCUMENTATION_OVERVIEW.md entsprechend aktualisiert
 - Architektur: `docs/architecture/entra-id-user-schema.md` hinzugefügt (Entra ID Benutzer-Schema Diagramm) und verlinkt

### 🤖 AI / RAG
- AI‑Modul (Direkt‑Provider Chat + RAG) dokumentiert:
  - `docs/modules/ai/API.md` um Endpunkte `/api/ai/chat`, `/api/ai/hr-assist`, `/api/ai/rag/*` erweitert
  - `docs/INTERDEPENDENCY.md` um AI/RAG Dependencies (ENV, Storage, Frontend-Bindings) ergänzt
  - `docs/DOCUMENTATION_OVERVIEW.md` um AI‑Modul‑Sektion + ENV‑Beispiele erweitert

## [2.1.0] - 2024-12-08

### 🔧 Verbesserungen - Grundkonstrukt-Optimierung
- **Auth-Guard hinzugefügt**: RequireAuth-Komponente schützt alle geschützten Routen
- **Support-Module Security**: requirePermission Middleware für alle Support-Endpunkte
- **Dynamic Header**: User-Info wird dynamisch aus localStorage geladen
- **Ticket-Validierung**: Vollständige Input-Validierung für Support-Tickets
- **Error-Standardisierung**: Einheitliche englische Error-Typen + deutsche Messages
- **Monorepo-Setup**: npm workspaces für besseres Dependency-Management
- **Zentrales Error-Handling**: 404 und 500 Handler im Backend
- **Port-Standardisierung**: Vite auf Standard-Port 5173
- **Router-Cleanup**: Veraltete @types/react-router-dom entfernt

### 🧩 DataSources & Integrations
- EntraAC DataSource (Microsoft Entra ID) implementiert: Client Credentials (MSAL), Sync (Users/Devices), Combined-Logic
- Manual DataSource implementiert: CRUD für Benutzer/Geräte (separat von Entra)
- Zentrale DataSources API unter `/api/data/*` (users, devices, sources, stats, sync, sync/status)
- `.env` erweitert: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `GRAPH_BASE_URL`, `ENTRA_SYNC_ENABLED`, `ENTRA_SYNC_INTERVAL_MS`
- Dokumentation aktualisiert: `INTERDEPENDENCY.md` (DataSources-Dependencies), `DOCUMENTATION_OVERVIEW.md` (Integration-Architektur)

### 📏 Regeln/Prozess
- `.cursorrules`: PR/Review-Gates für DataSources/Integrations (KRITISCH) ergänzt
 - `.cursorrules`: PR/Review-Gates für Frontend Theme & Layout-Konfiguration ergänzt (ENV/Docs Pflicht-Updates)

### 🎨 Frontend Theme/Branding
- Neues Theme-System: `ThemeProvider` (React Context), CSS Custom Properties
- Frontend `.env` Variablen (`VITE_*`) für Branding/Colors/Layout
- `Header.tsx`, `Header.css`, `Sidebar.css`, `index.css` um Variablen erweitert
- Optionale `ThemeSettings` UI zur Laufzeit-Anpassung

### 🛡️ Sicherheit
- Alle Support-Endpunkte nun mit Berechtigungsprüfung
- Auth-Guard verhindert unbefugten Zugriff auf geschützte Bereiche
- Strukturierte Error-Responses ohne sensitive Details
- Vollständige Request-Validierung für Support-Tickets

### 🚀 Developer Experience
- npm workspaces Setup für einfachere Entwicklung
- Einheitliche Error-Typen für bessere API-Konsistenz
- Zentrales Error-Handling für robustere Anwendung
- Port-Konsistenz zwischen Konfiguration und Tests

## [2.0.0] - 2024-12-08

### 🎉 Hinzugefügt - Modulare Architektur Komplett-Rewrite
- **Modulbasierte Architektur** vollständig implementiert
- **HR-Modul** mit 6 Hauptfunktionen:
  - Mitarbeiterdatenverwaltung (CRUD Operations)
  - Onboarding-Plan-Generierung mit abteilungsspezifischen Templates
  - HR-Reporting mit detaillierten Statistiken und Analysen
  - Mitarbeiterstatistiken und Metriken
  - Rollenbasierte Zugriffskontrolle
- **Support-Modul** für Ticket-Management:
  - Ticket-Erstellung mit Kategorisierung
  - Ticket-Suche und Filterung
  - Status-Management und Priorisierung
- **Zentrale Authentifizierung**:
  - Rollenbasiertes Berechtigungssystem
  - Mock-Token-System für Entwicklung
  - Logging für alle Authentifizierungs-Events
- **API-Infrastruktur**:
  - 11 REST-API-Endpunkte implementiert
  - Konsistente APIResponse<T> Struktur
  - Paginierung für Listen-Endpunkte
  - Umfassende Error-Handling
- **Entwickler-Tools**:
  - PowerShell-Test-Script für alle Module
  - Modulare Route-Registrierung
  - Automatische API-Dokumentation
  - .cursorrules für konsistente Entwicklung

### 🏗️ Verändert
- **Backend-Architektur** komplett überarbeitet von monolithisch zu modular
- **API-Struktur** von einfachen Routes zu modulbasierten Endpunkten
- **Authentifizierung** von keiner zu vollständiger rollenbasierter Auth
- **TypeScript-Struktur** mit strikten Types und Interfaces pro Modul

### 📁 Dateistruktur - NEU
```
backend/src/modules/
├── hr/
│   ├── orchestrator.ts         # Route-Handler & Koordination
│   ├── types.ts               # TypeScript-Interfaces
│   ├── core/auth.ts           # Authentifizierung & Autorisierung  
│   └── functions/             # Geschäftslogik-Funktionen
│       ├── fetchEmployeeData.ts
│       ├── generateOnboardingPlan.ts
│       └── createHRReport.ts
├── support/
│   ├── orchestrator.ts
│   ├── types.ts
│   └── functions/
│       └── manageTickets.ts
└── README.md                  # Modul-Dokumentation
```

### 🔧 Technische Details
- **Express.js** Router-basierte Modul-Registrierung
- **TypeScript** strict mode mit umfassenden Interface-Definitionen
- **Mock-Daten** für alle Module während Entwicklung
- **PowerShell-Kompatibilität** für alle Scripts und Commands
- **CORS** aktiviert für Frontend-Integration

### 📊 Metriken (Stand 2.0.0)
- **Code-Zeilen:** ~1.500 (Backend)
- **TypeScript-Dateien:** 12
- **API-Endpunkte:** 11
- **Module:** 2 (HR vollständig, Support Basis)
- **Test-Coverage:** Manuelle PowerShell-Tests

## [1.0.0] - 2024-12-07

### 🎉 Hinzugefügt - Projekt-Initialisierung
- **Basis-Projekt-Setup** mit monolithischer Struktur
- **Backend** (Node.js + Express + TypeScript):
  - Einfacher Express-Server auf Port 5000
  - Grundlegende Health-Check und Hello-Endpunkte
  - TypeScript-Konfiguration
  - CORS-Middleware
- **Frontend** (React + Vite + TypeScript):
  - Basis React-App mit Vite-Build-System
  - TypeScript-Integration
  - Basis-Styling mit CSS
- **Development-Tools**:
  - tools/install-all.ps1 Script für PowerShell-Setup
  - Package.json Scripts für Development
  - Git-Repository Initialisierung

### 📁 Initiale Dateistruktur
```
CompanyAI/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/index.ts           # Einfacher Express-Server
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       └── App.css
├── package.json               # Root-Package für Scripts
├── tools/install-all.ps1     # PowerShell Setup-Script
└── README.md                 # Basis-Dokumentation
```

### 🔧 Technische Basis
- **Node.js** >= 18.0.0
- **TypeScript** für Type-Safety
- **Vite** für schnelle Frontend-Entwicklung
- **PowerShell** Scripts für Windows-Kompatibilität

### 📊 Initiale Metriken
- **Code-Zeilen:** ~200 (gesamt)
- **Dependencies:** Express, React, TypeScript, Vite
- **API-Endpunkte:** 3 (health, hello, root)

---

## Legende der Änderungstypen

### 🎉 Hinzugefügt
Neue Features und Funktionalitäten

### 🏗️ Verändert  
Änderungen an bestehender Funktionalität

### 🐛 Behoben
Bug-Fixes und Fehlerbehebungen

### ❌ Entfernt
Entfernte Features oder Dateien

### 🔒 Sicherheit
Sicherheitsrelevante Änderungen

### 📁 Dateistruktur
Strukturelle Änderungen am Projekt

### 🔧 Technisch
Technische/interne Änderungen ohne User-Impact

### 📊 Metriken
Quantitative Projekt-Metriken

---

## Versions-Schema

CompanyAI folgt [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH** (z.B. 2.1.3)
- **MAJOR:** Breaking Changes, Architektur-Änderungen
- **MINOR:** Neue Features, Module, API-Erweiterungen  
- **PATCH:** Bug-Fixes, kleine Verbesserungen

### Release-Branches
- **main:** Stabile, produktionsbereite Releases
- **develop:** Integration Branch für neue Features
- **feature/*** Feature-spezifische Branches
- **hotfix/*** Kritische Bug-Fixes

---

**Letzte Aktualisierung:** 8. Dezember 2024  
**Dokumentations-Version:** 1.0.0
