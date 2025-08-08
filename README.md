# CompanyAI

Eine modulare Unternehmensanwendung mit React Frontend und Express Backend - vollständig typisiert mit TypeScript und optimiertem Grundkonstrukt.

> 💡 **PowerShell ready**: npm scripts verwenden `&&` (kompatibel) + zusätzliches `.ps1` Script verfügbar

## 🚀 Schnellstart

### Alle Abhängigkeiten installieren

**npm script (empfohlen)**
```powershell
npm run install:all
```

### Entwicklungsserver starten (Frontend + Backend gleichzeitig)
```powershell
npm run dev
```

Dies startet:
- **Frontend**: http://localhost:5173 (React mit Vite) - 🚀 **Öffnet automatisch im Browser**
- **Backend**: http://localhost:5000 (Express API)


## 🛠️ Verfügbare Scripts

### Entwicklung
- `npm run dev` - Startet Frontend und Backend gleichzeitig (Browser öffnet automatisch)
- `npm run dev:frontend` - Nur Frontend starten (Browser öffnet automatisch)
- `npm run dev:backend` - Nur Backend starten

### Installation  
- `npm run install:all` - Alle Abhängigkeiten installieren
- `npm run install:root` - Nur Root Abhängigkeiten  
- `npm run install:frontend` - Nur Frontend Abhängigkeiten
- `npm run install:backend` - Nur Backend Abhängigkeiten

### Build
- `npm run build` - Beide Anwendungen bauen
- `npm run build:frontend` - Nur Frontend bauen
- `npm run build:backend` - Nur Backend bauen

### Preview (nach Build)
- `cd frontend && npm run preview` - Frontend Preview anzeigen (Browser öffnet automatisch)

### PowerShell Scripts
- `.\install-all.ps1` - PowerShell Script für Installation

## 🎯 Features (v2.1.0)

### 🛡️ Sicherheit & Authentifizierung
- **Auth-Guard**: Automatischer Redirect zu Login bei fehlendem Token
- **Rollenbasierte Berechtigung**: Admin, HR Manager, HR Specialist
- **Permission-basierte API-Endpunkte**: Alle Support-APIs geschützt
- **Strukturiertes Error-Handling**: Einheitliche Error-Typen

### 🏗️ Modulare Architektur
- **HR-Modul**: Mitarbeiterverwaltung, Onboarding, Reports
- **Support-Modul**: Ticket-Management mit Validierung
- **Shared Auth**: Zentrale Authentifizierung für alle Module
- **npm workspaces**: Optimiertes Monorepo-Setup

### 📍 API Endpoints (11 gesicherte Endpunkte)
- `GET /` - Backend Info
- `GET /api/health` - Health Check 
- `GET /api/hello` - API Dokumentation
- **HR-APIs**: `/api/hr/*` (Employees, Stats, Reports, Onboarding)
- **Support-APIs**: `/api/support/*` (Tickets mit CRUD)

Das Frontend kann über `/api/*` auf das Backend zugreifen (Proxy konfiguriert).