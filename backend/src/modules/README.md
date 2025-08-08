# CompanyAI - Modulbasierte Architektur

## Übersicht

CompanyAI nutzt eine modulbasierte Ordnerstruktur, die es ermöglicht, neue Funktionalitäten isoliert zu entwickeln und einfach hinzuzufügen oder zu entfernen.

## Modulstruktur

Jedes Modul folgt dieser standardisierten Struktur:

```
src/modules/[module-name]/
├── orchestrator.ts     # Steuert Abläufe, koordiniert Funktionen
├── types.ts           # Input/Output-Typen und Schnittstellen
├── core/              # Wiederverwendbare Hilfslogik
│   └── auth.ts        # Authentifizierung, Logging
└── functions/         # Einzelne, abgegrenzte Funktionen
    ├── function1.ts
    ├── function2.ts
    └── function3.ts
```

## Verfügbare Module

### 1. HR-Modul (`/hr/`)
**Beschreibung:** Human Resources Management

**Funktionen:**
- Mitarbeiterdatenverwaltung
- Onboarding-Plan-Generierung
- HR-Reporting und Statistiken

**API-Endpunkte:**
```
GET    /api/hr/employees           # Mitarbeiter auflisten
POST   /api/hr/employees           # Neuen Mitarbeiter erstellen
GET    /api/hr/employees/:id       # Mitarbeiter-Details
PUT    /api/hr/employees/:id       # Mitarbeiter aktualisieren
GET    /api/hr/stats               # HR-Statistiken
POST   /api/hr/onboarding/plans    # Onboarding-Plan erstellen
POST   /api/hr/reports             # HR-Report generieren
```

### 2. Support-Modul (`/support/`)
**Beschreibung:** Customer Support & Ticket Management

**Funktionen:**
- Ticket-Erstellung und -Verwaltung
- Ticket-Suche und -Filterung
- Status-Updates

**API-Endpunkte:**
```
GET    /api/support/tickets        # Tickets auflisten/suchen
POST   /api/support/tickets        # Neues Ticket erstellen
PUT    /api/support/tickets/:id    # Ticket aktualisieren
```

## Neues Modul hinzufügen

### 1. Ordnerstruktur erstellen
```bash
mkdir src/modules/[module-name]
mkdir src/modules/[module-name]/core
mkdir src/modules/[module-name]/functions
```

### 2. Grunddateien erstellen

**types.ts** - Definiere alle Typen für das Modul:
```typescript
export interface ModuleEntity {
  id: string;
  // weitere Eigenschaften
}

export interface CreateModuleRequest {
  // Request-Parameter
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

**functions/moduleFunctions.ts** - Implementiere Geschäftslogik:
```typescript
import { ModuleEntity, CreateModuleRequest, APIResponse } from '../types';

export async function createEntity(request: CreateModuleRequest): Promise<APIResponse<ModuleEntity>> {
  // Implementierung
}
```

**orchestrator.ts** - Koordiniere API-Endpoints:
```typescript
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../hr/core/auth';

export class ModuleOrchestrator {
  static async handleCreateEntity(req: AuthenticatedRequest, res: Response) {
    // Handler-Implementation
  }
}

export function registerModuleRoutes(router: any) {
  router.post('/module/entities', ModuleOrchestrator.handleCreateEntity);
}
```

### 3. Modul in Hauptanwendung registrieren

In `src/index.ts`:
```typescript
// Import hinzufügen
import { registerModuleRoutes } from './modules/module-name/orchestrator';

// Route registrieren
registerModuleRoutes(apiRouter);

// In availableModules hinzufügen
```

## Authentifizierung

Alle Module nutzen die zentrale Authentifizierung aus dem HR-Modul (`hr/core/auth.ts`).

### Test-Tokens
```javascript
// Admin-Token
const adminToken = Buffer.from('admin@company.com').toString('base64');

// HR-Manager-Token  
const hrToken = Buffer.from('hr.manager@company.com').toString('base64');

// Verwendung
Authorization: Bearer <token>
```

### Berechtigungen
```typescript
// In Route-Handlern
router.post('/protected-route', 
  requirePermission('write', 'resource_name'),
  HandlerFunction
);
```

## Vorteile dieser Architektur

| Vorteil | Beschreibung |
|---------|--------------|
| **Modularität** | Module sind unabhängig erweiterbar und testbar |
| **Isolation** | Änderungen in einem Modul beeinflussen andere nicht |
| **Wiederverwendbarkeit** | Core-Funktionen werden modulübergreifend genutzt |
| **Klare Schnittstellen** | Konsistente Datentypen durch `types.ts` |
| **Einfache Wartbarkeit** | Module können ohne Seiteneffekte entfernt werden |

## Beispiel-Requests

### HR-Modul: Mitarbeiter erstellen
```bash
curl -X POST http://localhost:5000/api/hr/employees \
  -H "Authorization: Bearer $(echo -n 'hr.manager@company.com' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Max",
    "lastName": "Mustermann", 
    "email": "max@company.com",
    "department": "IT",
    "position": "Developer",
    "startDate": "2024-01-15",
    "status": "active"
  }'
```

### Support-Modul: Ticket erstellen
```bash
curl -X POST http://localhost:5000/api/support/tickets \
  -H "Authorization: Bearer $(echo -n 'admin@company.com' | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Login Problem",
    "description": "Benutzer kann sich nicht anmelden",
    "category": "technical",
    "priority": "high",
    "customerId": "cust_001",
    "customerEmail": "kunde@example.com"
  }'
```

## Entwicklung & Testing

### Backend starten
```bash
cd backend
npm install
npm run dev
```

### API-Dokumentation
- Health Check: `GET http://localhost:5000/api/health`
- API-Übersicht: `GET http://localhost:5000/api/hello`
- Auth-Info: `GET http://localhost:5000/api/auth/info`

### Linting
```bash
npm run lint
```

Diese Architektur gewährleistet Skalierbarkeit, Wartbarkeit und eine klare Trennung der Geschäftslogik in CompanyAI.
