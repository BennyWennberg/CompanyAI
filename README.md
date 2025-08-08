# CompanyAI

Eine einfache Anwendung mit React Frontend und Express Backend, beide mit TypeScript.

> 💡 **PowerShell ready**: npm scripts verwenden `&&` (kompatibel) + zusätzliches `.ps1` Script verfügbar

## 🚀 Schnellstart

### Alle Abhängigkeiten installieren

**Option 1: npm script (empfohlen)**
```powershell
npm run install:all
```

### Entwicklungsserver starten (Frontend + Backend gleichzeitig)
```powershell
npm run dev
```

Dies startet:
- **Frontend**: http://localhost:3000 (React mit Vite) - 🚀 **Öffnet automatisch im Browser**
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

## 📍 API Endpoints

- `GET /` - Backend Info
- `GET /api/health` - Health Check
- `GET /api/hello` - Test Endpoint

Das Frontend kann über `/api/*` auf das Backend zugreifen (Proxy konfiguriert).