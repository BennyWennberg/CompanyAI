# CompanyAI - Modulbasierte Unternehmens-KI

## 📋 Projektübersicht

**Version:** 2.0.0  
**Status:** Aktive Entwicklung  
**Architektur:** Modulbasiert  
**Letzte Aktualisierung:** 8. Dezember 2024

CompanyAI ist eine modulbasierte Unternehmensanwendung, die verschiedene Geschäftsbereiche durch spezialisierte KI-Module unterstützt. Das System folgt einer skalierbaren Mikroservice-ähnlichen Architektur mit zentraler Authentifizierung und konsistenten APIs.

## 🏗️ Aktuelle Systemarchitektur

### Backend (Node.js + Express + TypeScript)
```
backend/src/
├── index.ts                    # Hauptserver mit Modulregistrierung
└── modules/                    # Modulbasierte Geschäftslogik
    ├── hr/                     # Human Resources Modul
    ├── support/               # Customer Support Modul
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

### 3. Geplante Module
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
.\install-all.ps1

# Backend starten (Port 5000)
cd backend
npm run dev

# Frontend starten (Port 5173) - separate Terminal
cd frontend  
npm run dev

# Oder beide gleichzeitig starten
npm run dev:all
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

### Code-Basis (Stand: 8. Dezember 2024)
- **Backend-Dateien:** 12 TypeScript-Dateien
- **Code-Zeilen:** ~1.500 Zeilen
- **Module:** 2 vollständig, 1 in Planung
- **API-Endpunkte:** 11 implementiert
- **Test-Coverage:** Manuelle Tests verfügbar

### Funktionalitäten
- ✅ Modulare Architektur implementiert
- ✅ Zentrale Authentifizierung
- ✅ HR-Vollmodul mit 6 Hauptfunktionen
- ✅ Support-Basismodul mit Ticket-Management
- ✅ PowerShell-Entwicklungstools
- ✅ Umfassende Dokumentation
- 🔄 Frontend-Integration (in Arbeit)
- 📋 Datenbank-Integration (geplant)

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
| [architecture/](./architecture/) | Technische Architektur | Entwickler, System-Architekten |

## 🔍 Quick Links

- **API-Dokumentation:** http://localhost:5000/api/hello
- **Modul-Tests:** `.\test-modules.ps1`
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
