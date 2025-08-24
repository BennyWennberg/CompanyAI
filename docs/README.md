# CompanyAI - Modulbasierte Unternehmens-KI

## 📋 Projektübersicht

**Version:** 2.1.0  
**Status:** Aktive Entwicklung  
**Architektur:** Modulbasiert  
**Letzte Aktualisierung:** 14. Dezember 2024

CompanyAI ist eine modulbasierte Unternehmensanwendung, die verschiedene Geschäftsbereiche durch spezialisierte KI-Module unterstützt. Das System folgt einer skalierbaren Mikroservice-ähnlichen Architektur mit zentraler Authentifizierung und konsistenten APIs.

## 🏗️ Aktuelle Systemarchitektur

### Backend (Node.js + Express + TypeScript)
```
backend/src/
├── index.ts                    # Hauptserver mit Modulregistrierung
└── modules/                    # Modulbasierte Geschäftslogik
    ├── hr/                     # Human Resources Modul
    ├── support/               # Customer Support Modul
    ├── ai/                    # Artificial Intelligence Modul
    ├── admin/                 # Admin-Management Modul
    ├── admin-portal/          # Multi-Source User-Integration (NEU v1.0.0)
    └── [zukünftige Module]/   # Erweiterbar für neue Bereiche
```

### Frontend (React + Vite + TypeScript)
```
frontend/src/
├── App.tsx                    # Hauptanwendung
├── main.tsx                   # Entry Point
└── [Komponenten]/             # UI-Komponenten (in Entwicklung)
```

### Dokumentation
```
docs/
├── README.md                  # Diese Übersicht
├── CHANGELOG.md               # Versionshistorie
├── modules/                   # Modul-spezifische Dokumentation
└── architecture/              # Technische Architektur-Docs
```

## 🚀 Verfügbare Module

### 1. HR-Modul (Human Resources) - ✅ Vollständig implementiert
- **Zweck:** Mitarbeiterverwaltung und HR-Prozesse
- **Status:** Produktionsbereit
- **Funktionen:**
  - Mitarbeiterdatenverwaltung (CRUD)
  - Automatische Onboarding-Plan-Generierung
  - HR-Reporting mit Statistiken
  - Rollenbasierte Zugriffskontrolle
- **API-Endpunkte:** 8 Endpunkte
- **Dokumentation:** [HR-Modul Docs](./modules/hr/README.md)

### 2. Support-Modul (Customer Support) - ✅ Basis implementiert
- **Zweck:** Ticket-Management und Kundensupport
- **Status:** Grundfunktionen verfügbar
- **Funktionen:**
  - Ticket-Erstellung und -Verwaltung
  - Kategorisierung und Priorisierung
  - Status-Tracking
- **API-Endpunkte:** 3 Endpunkte
- **Dokumentation:** [Support-Modul Docs](./modules/support/README.md)

### 3. AI-Modul (Artificial Intelligence) - ✅ Vollständig implementiert
- **Zweck:** Multi-Provider AI-Chat und RAG-System
- **Status:** Produktionsbereit
- **Funktionen:**
  - Multi-Provider Chat (OpenAI, Gemini, Ollama)
  - RAG-gestützte Dokumentensuche
  - HR-Assistent für fachspezifische Anfragen
- **API-Endpunkte:** 12+ Endpunkte
- **Dokumentation:** [AI-Modul Docs](./modules/ai/README.md)

### 4. Admin-Modul (Administration) - ✅ Vollständig implementiert
- **Zweck:** System-Administration und User-Management
- **Status:** Produktionsbereit
- **Funktionen:**
  - User-Management und Berechtigungen
  - System-Einstellungen
  - Audit-Logs und Systemstatistiken
- **API-Endpunkte:** 15+ Endpunkte
- **Dokumentation:** [Admin-Modul Docs](./modules/admin/README.md)

### 5. Admin-Portal (Multi-Source User-Integration) - ✅ NEU v1.0.0
- **Zweck:** Integration von Usern aus 4 verschiedenen Quellen
- **Status:** Vollständig implementiert
- **Funktionen:**
  - Microsoft Entra ID Synchronisation (Graph API)
  - LDAP-Server Integration (Active Directory, OpenLDAP)
  - CSV/Excel Bulk-Upload mit Auto-Field-Mapping
  - Manuelle Web-basierte User-Erstellung
  - Auto-Schema-Discovery mit dynamischer DB-Migration
  - E-Mail-Conflict-Detection und Resolution
  - Unified User-View und Advanced Analytics
- **API-Endpunkte:** 48 Endpunkte
- **Frontend-Pages:** 7 vollständige React-Seiten
- **Dokumentation:** [Admin-Portal Docs](./modules/admin-portal/README.md)

### 6. Geplante Module
- **Produktion-Modul:** Fertigungsprozesse und Qualitätskontrolle
- **Finanzen-Modul:** Budgetierung und Finanzberichte
- **Marketing-Modul:** Kampagnen und Lead-Management

## 🔧 Technisches Setup

### Voraussetzungen
- Node.js >= 18.0.0
- npm >= 8.0.0
- PowerShell (für Entwicklungsskripte)

### Installation & Start
```powershell
# Alle Dependencies installieren
.\tools\install-all.ps1

# Backend starten (Port 5000)
cd backend
npm run dev

# Frontend starten (Port 5173) - separate Terminal
cd frontend  
npm run dev

# Oder beide gleichzeitig starten
npm run dev
```

### API-Zugriff
- **Backend:** http://localhost:5000
- **Frontend:** http://localhost:5173
- **API-Dokumentation:** http://localhost:5000/api/hello
- **Health Check:** http://localhost:5000/api/health

## 🔐 Authentifizierung

Das System nutzt eine zentrale, rollenbasierte Authentifizierung:

### Verfügbare Rollen
- **Admin:** Vollzugriff auf alle Module
- **HR Manager:** Vollzugriff auf HR-Funktionen
- **HR Specialist:** Eingeschränkter HR-Zugriff
- **Support Agent:** Zugriff auf Support-Funktionen

### Test-Tokens (Development)
```bash
# Admin-Token
Authorization: Bearer YWRtaW5AY29tcGFueS5jb20=

# HR-Manager-Token
Authorization: Bearer aHIubWFuYWdlckBjb21wYW55LmNvbQ==
```

## 📊 Aktuelle Metriken

### Code-Basis (Stand: 14. Dezember 2024)
- **Backend-Dateien:** 45+ TypeScript-Dateien
- **Code-Zeilen:** ~8.000+ Zeilen
- **Module:** 5 vollständig implementiert (HR, Support, AI, Admin, Admin-Portal)
- **API-Endpunkte:** 59 implementiert (HR: 8, Support: 3, Admin-Portal: 48)
- **Frontend-Pages:** 20+ React-Komponenten
- **Test-Coverage:** PowerShell-Scripts + manuelle Tests verfügbar

### Funktionalitäten
- ✅ Modulare Architektur vollständig implementiert
- ✅ Zentrale Authentifizierung mit rollenbasierter Zugriffskontrolle
- ✅ HR-Vollmodul mit 6 Hauptfunktionen + DataSource-Integration
- ✅ Support-Basismodul mit Ticket-Management
- ✅ AI-Modul mit Multi-Provider Chat + RAG-System
- ✅ Admin-Modul mit System-Management
- ✅ Admin-Portal mit Multi-Source User-Integration (4 Quellen)
- ✅ Frontend-Integration mit React + Tailwind CSS
- ✅ PowerShell-Entwicklungstools
- ✅ Umfassende Dokumentation (800+ Seiten)
- 🔄 Externe Datenbank-Integration (SQLite für Admin-Portal)
- 📋 PostgreSQL/MongoDB-Integration (geplant)

## 🎯 Roadmap & Nächste Schritte

### Kurzfristig (1-2 Wochen)
1. **Frontend-Integration:** Vollständige UI für HR-Modul
2. **Datenbank-Anbindung:** Ersetzen von Mock-Daten
3. **Testing-Framework:** Automatisierte Tests implementieren

### Mittelfristig (1-2 Monate)
1. **Produktion-Modul:** Implementierung beginnen
2. **Erweiterte Authentifizierung:** JWT-Token + Session-Management
3. **File-Upload:** Für Dokumente und Berichte

### Langfristig (3-6 Monate)
1. **KI-Integration:** Machine Learning für Predictive Analytics
2. **Mobile App:** React Native Companion App
3. **Enterprise-Features:** Multi-Tenant, Advanced Reporting

## 📚 Dokumentationsstruktur

| Dokument | Zweck | Zielgruppe |
|----------|-------|------------|
| [CHANGELOG.md](./CHANGELOG.md) | Versionshistorie und Änderungen | Entwickler, Stakeholder |
| [modules/hr/](./modules/hr/) | HR-Modul Dokumentation | HR-Team, Entwickler |
| [modules/support/](./modules/support/) | Support-Modul Dokumentation | Support-Team, Entwickler |
| [modules/ai/](./modules/ai/) | AI-Modul und RAG-System Dokumentation | AI-Team, Entwickler |
| [modules/admin/](./modules/admin/) | Admin-Modul Dokumentation | System-Admins, Entwickler |
| [modules/admin-portal/](./modules/admin-portal/) | Admin-Portal Multi-Source Integration | IT-Admins, Entwickler |
| [architecture/](./architecture/) | Technische Architektur | Entwickler, System-Architekten |
| [INTERDEPENDENCY.md](./INTERDEPENDENCY.md) | System-Abhängigkeiten und Integration-Guidelines | Entwickler, KI-Assistenten |

## 🔍 Quick Links

- **API-Dokumentation:** http://localhost:5000/api/hello
- **Modul-Tests:** `.\tools\test-modules.ps1`
- **Integrationstest:** `.\tools\test-frontend-integration.ps1`
- **Backend-Logs:** Console-Output beim `npm run dev`
- **Code-Regeln:** `.cursorrules` (Cursor IDE)

## 👥 Team & Kontakt

- **Entwicklung:** CompanyAI Development Team
- **Architektur:** Modulbasierte Microservice-Architektur
- **Support:** Siehe Support-Modul Dokumentation

---

**Letzte Dokumentations-Aktualisierung:** 8. Dezember 2024  
**Dokumentations-Version:** 1.0.0  
**System-Version:** 2.0.0
