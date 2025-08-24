# CompanyAI - Dokumentations-Übersicht

## 📚 Vollständige Dokumentationsstruktur erstellt!

**Erstellt am:** 8. Dezember 2024  
**Letzte Aktualisierung:** 14. August 2025  
**Version:** 2.2.0  
**Status:** ✅ Vollständig implementiert + Sicherheits- & DataSources-Updates

Diese Übersicht zeigt die komplette Dokumentationsstruktur, die für CompanyAI erstellt wurde.

## 📁 Dokumentationsstruktur

```
docs/
├── README.md                           # Haupt-Projektdokumentation
├── CHANGELOG.md                        # Projekt-Versionshistorie  
├── DOCUMENTATION_OVERVIEW.md           # Diese Übersicht
├── INTERDEPENDENCY.md                  # 🔗 Abhängigkeiten- & DataSources-Map
├── modules/                           # Modul-spezifische Dokumentation
│   ├── hr/                           # HR-Modul Dokumentation
│   │   ├── README.md                 # HR-Modul Übersicht
│   │   ├── API.md                    # HR-API Dokumentation
│   │   └── CHANGELOG.md              # HR-Änderungshistorie
│   ├── support/                      # Support-Modul Dokumentation
│   │   ├── README.md                 # Support-Modul Übersicht
│   │   ├── API.md                    # Support-API Dokumentation
│   │   └── CHANGELOG.md              # Support-Änderungshistorie
│   ├── ai/                           # AI-Modul Dokumentation
│   │   ├── README.md                 # AI-Modul Übersicht
│   │   ├── API.md                    # AI- und RAG-API Dokumentation
│   │   └── CHANGELOG.md              # AI-Änderungshistorie
│   ├── admin/                        # Admin-Modul Dokumentation
│   │   ├── README.md                 # Admin-Modul Übersicht
│   │   ├── API.md                    # Admin-API Dokumentation
│   │   └── CHANGELOG.md              # Admin-Änderungshistorie
│   └── admin-portal/                 # Admin-Portal-Modul Dokumentation (NEU v1.0.0)
│       ├── README.md                 # Admin-Portal Übersicht (500+ Zeilen)
│       ├── API.md                    # Admin-Portal API-Dokumentation (48 Endpunkte)
│       └── CHANGELOG.md              # Admin-Portal Änderungshistorie
└── architecture/                     # Technische Architektur-Docs
    ├── overview.md                   # System-Architektur Übersicht
    ├── module-guidelines.md          # Modul-Entwicklungsrichtlinien
    └── entra-id-user-schema.md       # Diagramm: Entra ID Benutzer-Schema
```

## 📋 Dokumentations-Inhalte

### 🏠 Haupt-Dokumentation

#### [README.md](./README.md) - Projekt-Übersicht
- **Inhalt:** Vollständige Projektbeschreibung
- **Umfang:** 150+ Zeilen
- **Abdeckt:**
  - Systemarchitektur und verfügbare Module
  - Technisches Setup und Installation
  - API-Zugriff und Authentifizierung
  - Aktuelle Metriken und Roadmap
  - Quick Links und Team-Kontakte

#### [CHANGELOG.md](./CHANGELOG.md) - Versionshistorie
- **Inhalt:** Detaillierte Änderungshistorie
- **Umfang:** 200+ Zeilen
- **Abdeckt:**
  - Vollständige Entwicklungsgeschichte von v1.0.0 bis v2.0.0
  - Technische Details zu jeder Änderung
  - Geplante Verbesserungen und Roadmap
  - Versions-Schema und Release-Prozess

#### [INTERDEPENDENCY.md](./INTERDEPENDENCY.md) - 🔗 Abhängigkeiten-Map für KI-Integration
- **Inhalt:** Umfassende Dokumentation aller System-Abhängigkeiten
- **Umfang:** 600+ Zeilen
- **Zweck:** Konsistente Integration neuer Features durch KI/Entwickler
- **Abdeckt:**
  - **Frontend-Backend-Dependencies:** Vollständige Abhängigkeits-Map
  - **Shared Components:** Auth, Layout, API-Patterns, CSS-Standards  
  - **Integration-Guidelines:** Schritt-für-Schritt Anleitungen für neue Module
  - **Template-Referenzen:** HR-Modul als Referenz-Implementation
  - **Breaking Change Prevention:** Kritische Dependencies die NICHT geändert werden dürfen
  - **Quick-Reference:** KI-Guidelines für konsistente Feature-Entwicklung
- **Wichtigkeit:** ⭐⭐⭐⭐⭐ KRITISCH für alle neuen Entwicklungen
- **Nutzung:** ERSTE Referenz vor jeder neuen Feature-Implementation

### 🤖 AI-Modul Dokumentation (NEU in v2.2.0)

#### [modules/ai/README.md](./modules/ai/README.md) - AI-Modul Übersicht (⭐ Aktualisiert)
- **Inhalt**: Multi-Provider Chat + RAG System mit externer Speicherung
- **Umfang**: 150+ Zeilen (komplett überarbeitet)
- **Abdeckt**: 
  - Provider-Unterstützung (OpenAI, Gemini, Ollama)
  - **NEU**: Externe RAG-Dokumentenspeicherung (`RAG_EXTERNAL_DOCS_PATH`)
  - Konfiguration und Ordnerstruktur für externe Speicherung
  - Vorteile der Trennung von Projekt-Code und RAG-Daten

#### [modules/ai/API.md](./modules/ai/API.md) - AI- und RAG-API
- **Endpunkte**: `/api/ai/chat`, `/api/ai/hr-assist`, `/api/ai/rag/*`
- **Abdeckt**: Request/Response-Beispiele (OpenAI-kompatibel), Auth (requirePermission)
- **NEU**: Dokumentenmanagement mit externem Speicher

#### [modules/ai/CHANGELOG.md](./modules/ai/CHANGELOG.md) - AI-Änderungshistorie
- Versionierung für AI-spezifische Änderungen

### 🏢 Admin-Portal-Modul Dokumentation (ERWEITERT v2.0.0)

#### [modules/admin-portal/README.md](./modules/admin-portal/README.md) - Admin-Portal Übersicht
- **Inhalt:** Vollständige Multi-Source User-Integration + Untermodul-Architektur Dokumentation
- **Umfang:** 600+ Zeilen (erweitert um Permission-System)
- **Abdeckt:**
  - 4 User-Quellen: Microsoft Entra ID, LDAP, CSV/Excel-Upload, Manual-Web
  - **NEU v2.0.0:** 3 Untermodule-Struktur (System, Benutzer, Rechte)
  - **NEU v2.0.0:** Vollständiges Permission-System (Rollen, Gruppen, Tokens, Audit)
  - Auto-Schema-Discovery und dynamische Datenbank-Migration
  - Source-of-Truth-per-Database Architektur
  - Conflict-Detection und Resolution-Strategien
  - Setup-Anleitungen für Microsoft Azure App-Registrierung
  - LDAP-Server-Konfiguration (Active Directory, OpenLDAP)
  - **NEU:** Hierarchische Frontend-Navigation und URL-Struktur
  - Troubleshooting-Guide für häufige Integrationsprobleme

#### [modules/admin-portal/API.md](./modules/admin-portal/API.md) - Admin-Portal API-Dokumentation  
- **Inhalt:** Vollständige API-Referenz für Multi-Source User-Management + Permission-System
- **Umfang:** 1300+ Zeilen (erweitert um Permission-APIs)
- **Abdeckt:**
  - 68+ REST-API-Endpunkte mit Request/Response-Schemas (erweitert von 48)
  - Sync-Management-APIs für Entra ID und LDAP
  - Upload-Processing-APIs für CSV/Excel-Bulk-Import
  - Manual-User-CRUD-APIs für Web-basierte User-Verwaltung
  - Conflict-Resolution-APIs für E-Mail-Duplikat-Management
  - **NEU v2.0.0:** Permission-System-APIs (20 neue Endpunkte)
    - Rollen-Management mit granularen Berechtigungen
    - Gruppen-Verwaltung mit Rollen-Zuweisung
    - API-Token-Management für externe Integrationen
    - Audit-Logs mit erweiterten Filteroptionen
  - Dashboard & Analytics-APIs für Statistiken und Metriken
  - PowerShell-Integration-Beispiele für Scripting und Automation
  - Error-Handling mit deutschen User-Messages und englischen Error-Types

#### [modules/admin-portal/CHANGELOG.md](./modules/admin-portal/CHANGELOG.md) - Admin-Portal Änderungshistorie
- **Inhalt:** Admin-Portal-spezifische Versionshistorie mit Major-Update v2.0.0
- **Umfang:** 600+ Zeilen (erweitert um v2.0.0 Breaking Changes)
- **Abdeckt:**
  - **NEU v2.0.0:** Vollständige Untermodul-Umstrukturierung (Breaking Changes)
  - **NEU v2.0.0:** Permission-System Implementation (Rollen, Gruppen, Tokens, Audit)
  - **NEU v2.0.0:** Hierarchische Navigation und URL-Migration
  - Code-Metriken: 5600+ Backend-Zeilen, 3200+ Frontend-Zeilen
  - Integration-Details: 4 Datenbanken, 68+ API-Endpunkte, 11 Frontend-Pages
  - Migration-Guide von v1.x zu v2.0.0
  - Roadmap für v2.1.0-v3.0.0 (Email-Notifications, Multi-Tenant, ML-basierte Features)

### 👥 HR-Modul Dokumentation

#### [modules/hr/README.md](./modules/hr/README.md) - HR-Modul Übersicht
- **Inhalt:** Vollständige HR-Modul Dokumentation
- **Umfang:** 400+ Zeilen (erweitert um DataSources‑Integration)
- **Abdeckt:**
  - Modul-Zweck und implementierte Funktionen
  - Technische Implementation und Architektur
  - Sicherheit, Berechtigungen und Performance
  - Bekannte Limitierungen und Roadmap

#### [modules/hr/API.md](./modules/hr/API.md) - HR-API Dokumentation
- **Inhalt:** Detaillierte API-Dokumentation
- **Umfang:** 600+ Zeilen (erweitert: Lese/Schreib‑Semantik combined/manual)
- **Abdeckt:**
  - Alle 8 API-Endpunkte mit Beispielen
  - Request/Response-Schemas
  - Authentifizierung und Berechtigungen
  - Error-Handling und Status-Codes
  - PowerShell-Test-Beispiele

#### [modules/hr/CHANGELOG.md](./modules/hr/CHANGELOG.md) - HR-Änderungshistorie
- **Inhalt:** HR-spezifische Versionshistorie
- **Umfang:** 300+ Zeilen
- **Abdeckt:**
  - Detaillierte Implementation-Geschichte
  - Code-Metriken und Funktions-Abdeckung
  - Geplante Verbesserungen nach Versionen

### 🎫 Support-Modul Dokumentation

#### [modules/support/README.md](./modules/support/README.md) - Support-Modul Übersicht
- **Inhalt:** Vollständige Support-Modul Dokumentation
- **Umfang:** 300+ Zeilen
- **Abdeckt:**
  - Ticket-Management und Kategorisierung
  - Status-Workflow und Prioritätssystem
  - Technische Implementation und Limitierungen
  - Entwicklungsplan und Roadmap

#### [modules/support/API.md](./modules/support/API.md) - Support-API Dokumentation
- **Inhalt:** Support-API Dokumentation
- **Umfang:** 400+ Zeilen
- **Abdeckt:**
  - 3 API-Endpunkte mit vollständigen Beispielen
  - Ticket-Kategorien und Prioritätsstufen
  - Status-Workflow und Error-Handling
  - PowerShell-Test-Scripts

#### [modules/support/CHANGELOG.md](./modules/support/CHANGELOG.md) - Support-Änderungshistorie
- **Inhalt:** Support-spezifische Versionshistorie
- **Umfang:** 250+ Zeilen
- **Abdeckt:**
  - Implementation-Details und Code-Metriken
  - Geplante Funktionen nach Versionen
  - Entwicklungsrichtung und Enterprise-Features

### 🏗️ Architektur-Dokumentation

#### [architecture/overview.md](./architecture/overview.md) - System-Architektur
- **Inhalt:** Vollständige System-Architektur
- **Umfang:** 500+ Zeilen
- **Abdeckt:**
  - Schichtenarchitektur und Technologie-Stack
  - Request-Lifecycle und Modul-Integration
  - Sicherheitsarchitektur und Deployment
  - Performance-Architektur und Monitoring

#### [architecture/module-guidelines.md](./architecture/module-guidelines.md) - Entwicklungsrichtlinien
- **Inhalt:** Standards für Modul-Entwicklung
- **Umfang:** 600+ Zeilen
- **Abdeckt:**
  - Modul-Architektur-Standards und Namenskonventionen
  - Code-Standards und Integration-Checkliste
  - Authentifizierung, Testing und Monitoring
  - Quality-Metriken und Anti-Patterns

## 🎯 Dokumentations-Features

- ### ✅ Vollständige Abdeckung (v2.1.0 + Admin-Portal v2.0.0)
- **Alle Module dokumentiert:** HR, Support, AI, Admin, Admin-Portal (mit Untermodulen) + Security-Updates
- **Alle API-Endpunkte:** 79+ Endpunkte vollständig beschrieben + Auth-Validierung (HR: 8, Support: 3, Admin-Portal: 68+)
- **NEU v2.0.0:** Permission-System vollständig dokumentiert (Rollen, Gruppen, Tokens, Audit)
- **NEU v2.0.0:** Untermodul-Architektur und hierarchische Navigation
- **Vollständige Beispiele:** Request/Response für jeden Endpunkt
- **Error-Handling:** Standardisierte Error-Typen (ValidationError, NotFound, etc.)
- **Code-Beispiele:** PowerShell, TypeScript, curl + Auth-Guard Patterns

### 🛡️ Neue Richtlinien
- `docs/AI_SECURITY_POLICY.md` – KI-Sicherheitsrichtlinie (PII, Logging, Zugriff)
- `docs/LOGGING_STRATEGY.md` – Zentrale Logging-Strategie (reqId, Middleware)
- `docs/IMPROVEMENTS_ROADMAP.md` – Iterative Verbesserungen & Meilensteine
- `docs/RAG_DATA_SOURCES.md` – Datenquellen & Indexing-Strategie für RAG
- `docs/PROMPT_GUIDELINES.md` – Prompt-Standards & Review-Prozess
 - `docs/INTERDEPENDENCY.md` – DataSources/Integrations (Entra ID, Manual, Sync, Frontend-Bindings)

### 🔑 Umgebungsvariablen (Beispiele)
```
# backend/.env
NODE_ENV=development
PORT=5000
RAG_INDEX_PATH=./backend/rag_index.json
RAG_EMBEDDING_MODEL=text-embedding-3-small
# Entra ID / Microsoft Graph
AZURE_TENANT_ID=...
AZURE_CLIENT_ID=...
AZURE_CLIENT_SECRET=...
GRAPH_BASE_URL=https://graph.microsoft.com
ENTRA_SYNC_ENABLED=true
ENTRA_SYNC_INTERVAL_MS=3600000
# AI / RAG
OPENAI_API_KEY=sk-...
# GEMINI_API_KEY=...
OLLAMA_URL=http://localhost:11434
RAG_INDEX_PATH=./backend/rag_index.json
RAG_EMBEDDING_PROVIDER=openai  # openai | gemini | ollama
RAG_EMBEDDING_MODEL=text-embedding-3-small
# Admin-Portal Multi-Source Integration
ADMIN_PORTAL_DB_PATH=C:\Code\Company_Allg_Data\Admin_Portal\databases\Users
ENTRA_TENANT_ID=your_tenant_id
ENTRA_CLIENT_ID=your_client_id
ENTRA_CLIENT_SECRET=your_client_secret
LDAP_URL=ldaps://ldap.company.com:636
LDAP_BIND_DN=cn=readonly,dc=company,dc=com
LDAP_BIND_PW=your_password
LDAP_BASE_DN=ou=users,dc=company,dc=com
AUTO_SYNC_ON_STARTUP=true
```

```
# frontend/.env (Theme/Branding)
VITE_COMPANY_NAME=CompanyAI
VITE_COMPANY_SLOGAN=Intelligent Business Solutions
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

### ✅ Entwickler-freundlich
- **Copy-Paste-Ready:** Alle Code-Beispiele sofort verwendbar
- **Strukturiert:** Konsistente Gliederung in allen Dokumenten
- **Suchbar:** Klare Überschriften und Verlinkungen
- **Aktuell:** Basiert auf tatsächlicher Implementation v2.0.0

### ✅ Wartbarkeit
- **Versioniert:** Changelog für jedes Modul
- **Erweiterbar:** Template für neue Module
- **Konsistent:** Einheitliche Struktur und Format
- **Standards:** .cursorrules für automatische Einhaltung

## 📊 Dokumentations-Statistiken

### Umfang
- **Gesamt-Dateien:** 20+ Markdown-Dateien (mit Admin-Portal v2.0.0 Erweiterungen)
- **Gesamt-Zeilen:** ~4.500 Zeilen Dokumentation
- **Code-Beispiele:** 80+ praktische Beispiele
- **API-Endpunkte:** 79+ vollständig dokumentiert
- **Frontend-Pages:** 18+ vollständig dokumentiert (mit Untermodule-Struktur)

### Qualität
- **Vollständigkeit:** 100% aller implementierten Features inkl. Permission-System
- **Aktualität:** Stand 22. Dezember 2024 (v2.0.0)
- **Konsistenz:** Einheitliche Struktur und Terminologie
- **Praxistauglichkeit:** Sofort verwendbare Beispiele
- **Architektur-Compliance:** Vollständige Untermodul-Standards dokumentiert

## 🚀 Nutzung der Dokumentation

### Für Entwickler
1. **Neue Module entwickeln:** [module-guidelines.md](./architecture/module-guidelines.md)
2. **API verstehen:** Modul-spezifische API.md Dateien
3. **Setup verstehen:** [README.md](./README.md)
4. **Architektur verstehen:** [architecture/overview.md](./architecture/overview.md)

### Für Stakeholder
1. **Projekt-Übersicht:** [README.md](./README.md)
2. **Fortschritt verfolgen:** [CHANGELOG.md](./CHANGELOG.md)
3. **Roadmap verstehen:** Modul-spezifische README.md Dateien

### Für Tester
1. **API testen:** API.md Dateien mit PowerShell-Beispielen
2. **Test-Automation:** `tools/test-modules.ps1` Script
3. **Error-Szenarien:** Error-Handling-Abschnitte

## 🔄 Wartung & Updates

### Automatische Standards
- **.cursorrules:** Automatische Einhaltung der Dokumentations-Standards
- **Template-Struktur:** Neue Module folgen automatisch der Struktur
- **Integration-Checkliste:** Verhindert vergessene Dokumentations-Updates

### Update-Prozess
1. **Bei Code-Änderungen:** Entsprechende Dokumentation aktualisieren
2. **Bei API-Änderungen:** API.md sofort updaten
3. **Bei neuen Features:** README.md und CHANGELOG.md erweitern
4. **Bei Breaking Changes:** Ausführliche CHANGELOG.md Dokumentation

## 🎉 Vorteile der Dokumentationsstruktur

### Für das Team
- **Onboarding:** Neue Entwickler können sofort produktiv werden
- **Konsistenz:** Standards gewährleisten einheitliche Qualität
- **Wartbarkeit:** Strukturierte Updates vermeiden veraltete Dokumentation

### Für das Projekt
- **Skalierbarkeit:** Neue Module können problemlos dokumentiert werden
- **Professionalität:** Vollständige Dokumentation für alle Stakeholder
- **Qualitätssicherung:** Standards verhindern technische Schulden

### Für die Zukunft
- **Erweiterbarkeit:** Template für zukünftige Module
- **Migration:** Vollständige Dokumentation erleichtert Technologie-Wechsel
- **Compliance:** Enterprise-Ready Dokumentation für Audits

---

**Dokumentation erstellt von:** CompanyAI Development Team  
**Nächste Updates:** Bei neuen Modulen oder API-Änderungen  
**Status:** ✅ Production-Ready Documentation
