# CompanyAI - Modul-Entwicklungsrichtlinien

## 📋 Überblick

Diese Richtlinien definieren Standards für die Entwicklung neuer Module in CompanyAI und gewährleisten Konsistenz, Wartbarkeit und Skalierbarkeit der modularen Architektur.

**Version:** 2.0.0  
**Letzte Aktualisierung:** 8. Dezember 2024  
**Basiert auf:** Implementierung HR-Modul und Support-Modul

## 🏗️ Modul-Architektur-Standard

### Pflicht-Ordnerstruktur
```
backend/src/modules/[module-name]/
├── orchestrator.ts              # REQUIRED: API-Route-Handler
├── types.ts                    # REQUIRED: TypeScript-Interfaces
├── core/                       # OPTIONAL: Wiederverwendbare Logik
│   ├── auth.ts                # Falls modul-spezifische Auth nötig
│   ├── validation.ts          # Eingabe-Validierung
│   ├── utils.ts               # Hilfsfunktionen
│   └── constants.ts           # Modul-Konstanten
└── functions/                  # REQUIRED: Geschäftslogik
    ├── create[Entity].ts      # Eine Funktion pro Datei
    ├── fetch[Entity].ts       # Klare, beschreibende Namen
    ├── update[Entity].ts      # Async/await Pattern
    └── delete[Entity].ts      # Vollständige CRUD-Abdeckung
```

### Namenskonventionen

#### Modul-Namen
- **Kleinschreibung mit Bindestrichen:** `hr`, `support`, `user-management`
- **Beschreibend, nicht generisch:** ❌ `data`, `utils`, `common` → ✅ `hr`, `support`, `inventory`
- **Singular-Form bevorzugt:** ✅ `hr` ❌ `hrs`, ✅ `support` ❌ `supports`

#### Datei-Namen
- **camelCase für Funktionen:** `createEmployee.ts`, `generateReport.ts`
- **PascalCase für Klassen:** `HROrchestrator.ts` (wenn verwendet)
- **kebab-case für URLs:** `/api/hr/employees`, `/api/support/tickets`

#### API-Routen-Schema
```typescript
// Standard RESTful Pattern
GET    /api/[module]/[entities]           # Auflisten
POST   /api/[module]/[entities]           # Erstellen  
GET    /api/[module]/[entities]/:id       # Details
PUT    /api/[module]/[entities]/:id       # Aktualisieren
DELETE /api/[module]/[entities]/:id       # Löschen

// Beispiele
GET    /api/hr/employees
POST   /api/hr/onboarding/plans
GET    /api/support/tickets
PUT    /api/support/tickets/:id
```

## 📝 Code-Standards

### 1. types.ts - Interface-Definitionen

```typescript
// REQUIRED: Haupt-Entity-Interface
export interface [EntityName] {
  id: string;                    // Immer string-basierte IDs
  [properties]: [types];         // Geschäftsspezifische Felder
  createdAt: Date;              // Audit-Timestamps
  updatedAt: Date;
  [resolvedAt]?: Date;          // Optional für Workflow-Entities
}

// REQUIRED: Request-Interfaces für API
export interface Create[Entity]Request {
  [required_fields]: [types];    // Nur erforderliche Felder
}

export interface Update[Entity]Request {
  [optional_fields]?: [types];   // Alle Felder optional für Partial Updates
}

export interface Search[Entity]Request {
  [filter_fields]?: [types];     // Filter-Parameter
  limit?: number;               // Pagination
  offset?: number;
}

// REQUIRED: Standard-Response-Interfaces
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;               // Englische Error-Types für Logging
  message?: string;             // Deutsche Nachrichten für User
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

// RECOMMENDED: Enums für Status/Kategorien
export const ENTITY_STATUSES = ['active', 'inactive', 'pending'] as const;
export type EntityStatus = typeof ENTITY_STATUSES[number];
```

### 2. functions/[function].ts - Geschäftslogik

```typescript
import { [Entity], [Request]Type, APIResponse } from '../types';

/**
 * [Funktion beschreibung]
 * @param request - [Parameter-Beschreibung]
 * @returns Promise mit APIResponse<[Entity]>
 */
export async function [functionName](
  request: [Request]Type
): Promise<APIResponse<[Entity]>> {
  try {
    // 1. Input-Validierung
    const validationErrors = validate[Request](request);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: 'Validierungsfehler',
        message: validationErrors.join(', ')
      };
    }

    // 2. Geschäftslogik
    const result = await process[Entity](request);

    // 3. Erfolgreiche Response
    return {
      success: true,
      data: result,
      message: 'Deutsche Erfolgsnachricht'
    };

  } catch (error) {
    // 4. Error-Handling
    console.error('Beschreibender Fehler-Kontext:', error);
    return {
      success: false,
      error: 'Interner Server-Fehler',
      message: 'Deutsche Fehlermeldung für User'
    };
  }
}

/**
 * Validierungs-Hilfsfunktion
 */
function validate[Request](request: [Request]Type): string[] {
  const errors: string[] = [];
  
  // Validierung-Logic mit deutschen Fehlermeldungen
  if (!request.field || request.field.trim().length === 0) {
    errors.push('Feld ist erforderlich');
  }
  
  return errors;
}
```

### 3. orchestrator.ts - API-Route-Handler

```typescript
import { Request, Response } from 'express';
import { AuthenticatedRequest, requirePermission } from '../hr/core/auth';
import { [functionImports] } from './functions/[functions]';
import { [typeImports] } from './types';

/**
 * [Module]Orchestrator - Koordiniert alle [Module]-API-Endpunkte
 */
export class [Module]Orchestrator {
  
  /**
   * [Aktion] Handler - [Beschreibung]
   */
  static async handle[Action](req: AuthenticatedRequest, res: Response) {
    try {
      // 1. Request-Parameter extrahieren
      const request: [Request]Type = {
        // Query-Parameter für GET
        field: req.query.field as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        
        // Body-Parameter für POST/PUT
        ...req.body
      };

      // 2. User-Tracking für Audit
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, '[action]', '[resource]');

      // 3. Geschäftslogik aufrufen
      const result = await [functionName](request);

      // 4. Response senden
      if (result.success) {
        res.status([successCode]).json(result);
      } else {
        res.status([errorCode]).json(result);
      }

    } catch (error) {
      console.error('Fehler im [Action] Handler:', error);
      res.status(500).json({
        success: false,
        error: 'Interner Server-Fehler',
        message: '[Module] [Aktion] konnte nicht ausgeführt werden'
      });
    }
  }
}

/**
 * Registriert [Module]-Routes im Express-Router
 */
export function register[Module]Routes(router: any) {
  // Standard CRUD-Routen mit Berechtigungen
  router.get('/[module]/[entities]', 
    requirePermission('read', '[resource]'),
    [Module]Orchestrator.handle[List]
  );
  
  router.post('/[module]/[entities]',
    requirePermission('write', '[resource]'),
    [Module]Orchestrator.handle[Create]
  );
  
  router.get('/[module]/[entities]/:id',
    requirePermission('read', '[resource]'),
    [Module]Orchestrator.handle[GetById]
  );
  
  router.put('/[module]/[entities]/:id',
    requirePermission('write', '[resource]'),
    [Module]Orchestrator.handle[Update]
  );
  
  router.delete('/[module]/[entities]/:id',
    requirePermission('delete', '[resource]'),
    [Module]Orchestrator.handle[Delete]
  );
}
```

## 🔐 Authentifizierung & Autorisierung

### Wiederverwendung der zentralen Auth
```typescript
// REQUIRED: Import der zentralen Authentifizierung
import { 
  AuthenticatedRequest, 
  requireAuth, 
  requirePermission,
  logAuthEvent 
} from '../hr/core/auth';

// Verwendung in Route-Handlern
export function register[Module]Routes(router: any) {
  // Basis-Authentifizierung für alle Routen
  router.use(requireAuth);
  
  // Spezifische Berechtigungen pro Endpoint
  router.post('/[endpoint]', 
    requirePermission('[action]', '[resource]'),
    HandlerFunction
  );
}
```

### Berechtigungs-Schema
| Aktion | Resource | Beispiel |
|--------|----------|----------|
| `read` | `[module]_data` | Daten lesen |
| `write` | `[module]_data` | Daten erstellen/ändern |
| `delete` | `[module]_data` | Daten löschen |
| `admin` | `[module]_system` | Admin-Funktionen |

### Audit-Logging
```typescript
// REQUIRED: Logging aller Aktionen
logAuthEvent(
  req.user?.id || 'unknown',    // User-ID
  '[action_name]',              // Aktion (z.B. 'create_ticket')
  '[resource_name]',            // Resource (z.B. 'ticket_data')
  success                       // Boolean für Erfolg/Fehler
);
```

## 🧪 Testing-Standards

### 1. PowerShell-Test-Integration
```powershell
# REQUIRED: Integration in test-modules.ps1
Write-Host "`n[X]. [Module]-Modul Tests..." -ForegroundColor Yellow

# Test 1: [Funktion] testen
try {
    $[variable] = @{
        [properties] = [values]
    }
    $headers = @{ 
        Authorization = "Bearer $token"
        "Content-Type" = "application/json"
    }
    $result = Invoke-RestMethod -Uri "$baseUrl/api/[module]/[endpoint]" -Method POST -Headers $headers -Body ($[variable] | ConvertTo-Json)
    Write-Host "✅ [Module]: [Funktion] erfolgreich" -ForegroundColor Green
} catch {
    Write-Host "❌ [Module]: Fehler bei [Funktion]" -ForegroundColor Red
}
```

### 2. Error-Handling-Tests
```typescript
// REQUIRED: Teste alle Error-Szenarien
- ✅ Validierungsfehler bei invaliden Eingaben
- ✅ Authentifizierung fehlt (401)
- ✅ Unzureichende Berechtigungen (403)
- ✅ Resource nicht gefunden (404)
- ✅ Server-Fehler (500)
```

### 3. Mock-Daten-Standards
```typescript
// REQUIRED: Realistische Test-Daten
const mock[Entities]: [Entity][] = [
  {
    id: '[module]_001',
    [properties]: '[realistic_values]',
    createdAt: new Date('[recent_date]'),
    updatedAt: new Date('[recent_date]')
  },
  // Mindestens 2-3 verschiedene Test-Entitäten
  // Verschiedene Status/Kategorien abdecken
  // Edge-Cases berücksichtigen
];
```

## 📊 Monitoring & Metriken

### Performance-Standards
```typescript
// REQUIRED: Performance-Ziele
- API-Response-Zeit: < 100ms (Mock-Data)
- Memory-Usage: < 10MB zusätzlich pro Modul
- Error-Rate: 0% bei korrekten Requests
- Concurrent-Requests: Express.js Standard unterstützen
```

### Logging-Requirements
```typescript
// REQUIRED: Logging für alle Aktionen
console.log(`[${new Date().toISOString()}] [Module] ${action}: ${status}`);

// RECOMMENDED: Strukturiertes Logging (für Production)
logger.info('[Module] Action', {
  userId: req.user?.id,
  action: '[action]',
  resource: '[resource]',
  timestamp: new Date().toISOString(),
  success: boolean,
  duration: responseTime
});
```

## 🔄 Integration-Checkliste

### Schritt 1: Entwicklung
- [ ] **Ordnerstruktur** nach Standard erstellt
- [ ] **types.ts** mit allen erforderlichen Interfaces
- [ ] **functions/** mit mindestens 3 CRUD-Funktionen
- [ ] **orchestrator.ts** mit Route-Handlern
- [ ] **Error-Handling** vollständig implementiert
- [ ] **TypeScript** ohne Fehler kompiliert

### Schritt 2: Integration
- [ ] **Route-Registrierung** in `backend/src/index.ts`:
  ```typescript
  import { register[Module]Routes } from './modules/[module]/orchestrator';
  register[Module]Routes(apiRouter);
  ```
- [ ] **API-Dokumentation** in `/api/hello` Route aktualisiert
- [ ] **Module-Liste** in Health-Check aktualisiert
- [ ] **PowerShell-Tests** in `test-modules.ps1` hinzugefügt

### Schritt 3: Dokumentation
- [ ] **Modul-README** erstellt: `docs/modules/[module]/README.md`
- [ ] **API-Dokumentation** erstellt: `docs/modules/[module]/API.md`
- [ ] **Changelog** erstellt: `docs/modules/[module]/CHANGELOG.md`
- [ ] **Haupt-README** aktualisiert mit neuem Modul

### Schritt 4: Testing
- [ ] **Manuelle Tests** aller API-Endpunkte
- [ ] **PowerShell-Script** funktioniert ohne Fehler
- [ ] **Error-Handling** für alle bekannten Szenarien
- [ ] **Authentifizierung** korrekt implementiert

## 🚫 Anti-Patterns vermeiden

### ❌ Nicht erlaubt
```typescript
// Geschäftslogik direkt in orchestrator.ts
static async handleCreate(req, res) {
  const newEntity = { /* logic */ };  // ❌ Logik gehört in functions/
}

// Fehlende Error-Handling
export async function createEntity() {
  return await database.create();     // ❌ Kein try-catch
}

// Untypisierte APIs
app.get('/api/endpoint', (req, res) => {
  res.json(data);                    // ❌ Kein APIResponse<T>
});

// Hartcodierte Werte
const API_URL = 'http://localhost:5000';  // ❌ Sollte konfigurierbar sein
```

### ✅ Best Practices
```typescript
// Klare Trennung von Concerns
// orchestrator.ts -> functions/ -> data layer

// Vollständiges Error-Handling
try {
  const result = await businessLogic();
  return { success: true, data: result };
} catch (error) {
  console.error('Context:', error);
  return { success: false, error: 'Type', message: 'User-Message' };
}

// Typisierte APIs
export async function createEntity(
  request: CreateEntityRequest
): Promise<APIResponse<Entity>> {
  // Implementation
}

// Konfigurierbare Werte
const API_PORT = process.env.PORT || 5000;
```

## 📈 Qualitätsmetriken

### Code-Quality-Standards
```typescript
// REQUIRED: Alle Module müssen diese Standards erfüllen
- TypeScript Strict Mode: ✅ Aktiviert
- ESLint: ✅ Ohne Fehler 
- Naming Conventions: ✅ Befolgt
- Error Handling: ✅ Vollständig
- API Response Format: ✅ Konsistent
- Authentication: ✅ Implementiert
- Documentation: ✅ Vollständig
```

### Performance-Benchmarks
```typescript
// REQUIRED: Performance-Ziele pro Modul
Module Size:
  - Code-Zeilen: < 1.000 Zeilen (für Standard-Module)
  - Dateien: 3-8 TypeScript-Dateien
  - API-Endpunkte: 3-10 RESTful-Endpunkte

Response Times (Mock-Data):
  - Simple GET: < 50ms
  - Complex Operations: < 200ms
  - Bulk Operations: < 500ms

Memory Usage:
  - Mock-Data: < 5MB pro Modul
  - Production-Ready: < 20MB pro Modul
```

---

**Guidelines-Version:** 2.0.0  
**Letzte Aktualisierung:** 8. Dezember 2024  
**Basiert auf:** HR-Modul (Referenz-Implementation)  
**Status:** Production-Ready Standards
 
## 🧩 Module ↔ DataSources Consumption (Referenz)

### Lesezugriff (combined)
```typescript
import { getCombinedUsers, findCombinedUsers, getCombinedStats } from '../../datasources';

const users = getCombinedUsers('all');
const filtered = findCombinedUsers({ source: 'all', department, accountEnabled });
```

### Schreibzugriff (nur manual)
```typescript
import { createManualUser, updateManualUser, deleteManualUser } from '../../datasources';

const created = createManualUser(payload, createdBy);
const updated = updateManualUser(id, partial, updatedBy);
const removed = deleteManualUser(id, deletedBy);
```

### Mapping-Konvention (CombinedUser → Modul-Entity)
```typescript
// Beispiel: Employee aus HR
function mapCombinedToEmployee(u: CombinedUser): Employee {
  const [firstName, ...rest] = (u.displayName || '').split(' ');
  const lastName = rest.join(' ');
  return {
    id: u.id,
    firstName,
    lastName,
    email: u.mail || u.userPrincipalName || '',
    department: u.department || '',
    position: u.jobTitle || '',
    startDate: new Date(),
    status: u.accountEnabled === true ? 'active' : u.accountEnabled === false ? 'inactive' : 'pending'
  };
}
```

### Doku-Pflichten (bei Nutzung von DataSources)
- INTERDEPENDENCY.md: Modul-Bindings ergänzen (lesen=combined, schreiben=manual, Stats, Mapping)
- modules/[module]/README.md: DataSources-Integration dokumentieren
- modules/[module]/API.md: Endpoint-Semantik (combined/manual) ergänzen
- CHANGELOG.md: Unveröffentlicht → „Docs/Integrations“
- DOCUMENTATION_OVERVIEW.md: Abdeckung/Umfang aktualisieren