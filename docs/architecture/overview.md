# CompanyAI - Architektur-Übersicht

## 🏗️ System-Architektur

**Version:** 2.0.0  
**Architektur-Typ:** Modulbasierte Mikroservice-ähnliche Struktur  
**Letzte Aktualisierung:** 8. Dezember 2024

## 📐 Architektur-Prinzipien

### 1. Modularität
- **Isolated Modules:** Jedes Modul ist eigenständig und unabhängig
- **Single Responsibility:** Ein Modul = Ein Geschäftsbereich
- **Plug-and-Play:** Module können ohne Seiteneffekte hinzugefügt/entfernt werden

### 2. Skalierbarkeit  
- **Horizontal Erweiterung:** Neue Module durch Ordner-Erstellung
- **Vertikale Erweiterung:** Module können intern ausgebaut werden
- **Performance-Isolation:** Module beeinflussen sich nicht gegenseitig

### 3. Konsistenz
- **Standardisierte APIs:** Einheitliche Request/Response-Strukturen
- **Zentrale Services:** Authentifizierung, Logging wiederverwendbar
- **Typisierung:** Vollständige TypeScript-Integration

## 🏛️ Schichtenarchitektur

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│  React + TypeScript + Vite (Port 5173)                    │
└─────────────────────────────────────────────────────────────┘
                              │ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway Layer                         │
│  Express.js Router + Middleware (Port 5000)               │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                 Authentication Layer                       │
│  Centralized Auth + Role-based Permissions                │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │
│  │ HR Module   │  │Support Mod. │  │Future Mod.  │      │
│  │ • Employee  │  │ • Tickets   │  │ • TBD       │      │
│  │ • Onboard.  │  │ • Status    │  │ • TBD       │      │
│  │ • Reports   │  │ • Search    │  │ • TBD       │      │
│  └─────────────┘  └─────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                             │
│  Mock Data (Development) → Database (Production)          │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Technologie-Stack

### Backend-Stack
```typescript
// Core Framework
Express.js 4.x          // Web-Framework
TypeScript 5.x          // Type-Safe JavaScript
Node.js 18+             // Runtime Environment

// Development Tools  
ts-node                 // TypeScript Execution
nodemon                 // Development Server
npm                     // Package Management

// Security & Middleware
cors                    // Cross-Origin Resource Sharing
express.json()          // JSON Body Parsing
```

### Frontend-Stack
```typescript
// Core Framework
React 18+               // UI Framework
TypeScript 5.x          // Type-Safe Components
Vite 5.x               // Build Tool & Dev Server

// Development Tools
@vitejs/plugin-react    // React Integration
ESLint                 // Code Linting
```

### Development-Stack
```powershell
# Development Environment
PowerShell 7+          # Scripting & Automation
Cursor IDE            # AI-Enhanced Development
Git                   # Version Control
npm scripts           # Task Automation
```

## 📁 Projektstruktur

### Übersicht
```
CompanyAI/
├── backend/                    # Backend-Anwendung
│   ├── src/
│   │   ├── index.ts           # Hauptserver & Router-Config
│   │   └── modules/           # Modulbasierte Geschäftslogik
│   │       ├── hr/            # Human Resources Modul
│   │       ├── support/       # Customer Support Modul
│   │       └── [future]/      # Zukünftige Module
│   ├── package.json
│   └── tsconfig.json
├── frontend/                   # Frontend-Anwendung
│   ├── src/
│   │   ├── main.tsx           # Entry Point
│   │   ├── App.tsx            # Haupt-Komponente
│   │   └── [components]/      # UI-Komponenten
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── docs/                       # Umfassende Dokumentation
│   ├── README.md              # Projekt-Übersicht
│   ├── CHANGELOG.md           # Versionshistorie
│   ├── modules/               # Modul-spezifische Docs
│   └── architecture/          # Technische Dokumentation
├── package.json                # Root-Package für Scripts
├── install-all.ps1            # Setup-Automation
├── test-modules.ps1           # Test-Automation
└── .cursorrules               # Development-Guidelines
```

### Modul-Standardstruktur
```typescript
modules/[module-name]/
├── orchestrator.ts            // API-Route-Handler & Koordination
├── types.ts                  // TypeScript-Interfaces & Typen
├── core/                     // Wiederverwendbare Hilfslogik
│   ├── auth.ts              // Authentifizierung (falls nötig)
│   ├── validation.ts        // Eingabe-Validierung
│   └── utils.ts             // Hilfsfunktionen
└── functions/               // Geschäftslogik-Funktionen
    ├── create[Entity].ts    // Erstellungs-Logik
    ├── fetch[Entity].ts     // Abruf-Logik
    └── update[Entity].ts    // Update-Logik
```

## 🔄 Request-Lifecycle

### 1. API-Request-Flow
```
Client Request
    │
    ▼
Express Router (/api/*)
    │
    ▼
Authentication Middleware
    │
    ▼
Module Router (/api/hr/*, /api/support/*)
    │
    ▼
Orchestrator Route Handler
    │
    ▼
Business Logic Function
    │
    ▼
Data Layer (Mock/Database)
    │
    ▼
Response Formation
    │
    ▼
Client Response
```

### 2. Module-Integration-Flow
```
New Module Development
    │
    ▼
Create Module Directory Structure
    │
    ▼
Implement types.ts (Interfaces)
    │
    ▼
Implement functions/ (Business Logic)
    │
    ▼
Implement orchestrator.ts (API Handlers)
    │
    ▼
Register in index.ts (Route Registration)
    │
    ▼
Update Documentation
    │
    ▼
Module Available via API
```

## 🔐 Sicherheitsarchitektur

### Authentifizierung-Schicht
```typescript
// Centralized Authentication (hr/core/auth.ts)
┌─────────────────────────────────────────────┐
│              Token Validation              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │  Admin  │  │HR Mgr.  │  │Support  │    │
│  │ (Full)  │  │(HR-All) │  │ Agent   │    │
│  └─────────┘  └─────────┘  └─────────┘    │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│             Permission Check               │
│  requirePermission(action, resource)      │
│  - read:employee_data                     │
│  - write:reports                          │
│  - admin:all                              │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│              Audit Logging                 │
│  logAuthEvent(user, action, resource)     │
└─────────────────────────────────────────────┘
```

### Berechtigungs-Matrix
| Rolle | HR-Module | Support-Module | Admin-Functions |
|-------|----------|----------------|-----------------|
| **Admin** | ✅ Full | ✅ Full | ✅ Full |
| **HR Manager** | ✅ Full | ❌ None | ❌ None |
| **HR Specialist** | 🔸 Limited | ❌ None | ❌ None |
| **Support Agent** | ❌ None | ✅ Full | ❌ None |
| **Employee** | 🔸 Own Data | ❌ None | ❌ None |

## 📊 Datenarchitektur

### Current State (Development)
```typescript
// In-Memory Mock Data Structure
┌─────────────────────────────────────────────┐
│                Mock Data                    │
│  ┌─────────────────┐  ┌─────────────────┐   │
│  │   HR Module     │  │ Support Module  │   │
│  │ • employees[]   │  │ • tickets[]     │   │
│  │ • onboarding[]  │  │ • categories[]  │   │
│  │ • reports[]     │  │ • priorities[]  │   │
│  └─────────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────┘
```

### Planned State (Production)
```typescript
// Database-Driven Architecture
┌─────────────────────────────────────────────┐
│              Database Layer                 │
│  ┌─────────────────┐  ┌─────────────────┐   │
│  │   PostgreSQL    │  │   File Storage  │   │
│  │ • Relational    │  │ • Documents     │   │
│  │ • ACID          │  │ • Images        │   │
│  │ • Migrations    │  │ • Attachments   │   │
│  └─────────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│                ORM Layer                    │
│  Prisma / TypeORM for Type-Safe Queries   │
└─────────────────────────────────────────────┘
```

### Datenmodell-Beziehungen
```typescript
// Entity Relationships (Planned)
Employee 1:N OnboardingPlan
Employee 1:N HRReport (generatedBy)
Ticket N:1 Customer  
Ticket N:1 SupportAgent (assignedTo)
User 1:N AuditLog
Module 1:N Permission
```

## 🚀 Deployment-Architektur

### Development Environment
```yaml
# Local Development Setup
Services:
  - Backend: http://localhost:5000 (npm run dev)
  - Frontend: http://localhost:5173 (npm run dev)
  - Database: Mock Data (In-Memory)
  - Authentication: Mock Tokens

Tools:
  - Hot Reload: nodemon + Vite HMR
  - Type Checking: TypeScript Watch Mode
  - Testing: PowerShell Scripts
  - Linting: ESLint + Prettier
```

### Production Environment (Planned)
```yaml
# Production Deployment Architecture
Infrastructure:
  - Backend: Node.js Container (Docker)
  - Frontend: Static Files (CDN)
  - Database: PostgreSQL Cluster
  - File Storage: S3-Compatible Storage
  - Load Balancer: Nginx/CloudFlare

Security:
  - HTTPS: SSL/TLS Certificates
  - API-Rate-Limiting: Redis-based
  - Authentication: JWT + Refresh Tokens
  - Monitoring: Application Performance Monitoring
```

## 📈 Performance-Architektur

### Aktuelle Metriken
```typescript
// Development Performance (Mock Data)
API Response Times:
  - HR Endpoints: < 50ms
  - Support Endpoints: < 30ms
  - Authentication: < 10ms

Memory Usage:
  - Backend: ~50MB (Node.js + Mock Data)
  - Frontend: ~20MB (React Bundle)
  
Concurrent Connections:
  - Supported: Express.js Default (No Limits)
  - Tested: PowerShell Scripts (Sequential)
```

### Skalierungs-Strategie
```typescript
// Horizontal Scaling Plan
┌─────────────────────────────────────────────┐
│                Load Balancer               │
└─────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Backend     │ │ Backend     │ │ Backend     │
│ Instance 1  │ │ Instance 2  │ │ Instance 3  │
└─────────────┘ └─────────────┘ └─────────────┘
         │              │              │
         └──────────────┼──────────────┘
                       ▼
┌─────────────────────────────────────────────┐
│              Shared Database               │
│  PostgreSQL Cluster + Redis Cache         │
└─────────────────────────────────────────────┘
```

## 🔧 Monitoring & Observability

### Logging-Architektur
```typescript
// Current Logging (Console-based)
┌─────────────────────────────────────────────┐
│              Console Logging               │
│  • Authentication Events                  │
│  • API Request/Response                   │  
│  • Error Tracking                         │
│  • Module Actions                         │
└─────────────────────────────────────────────┘

// Planned Logging (Structured)
┌─────────────────────────────────────────────┐
│             Structured Logging             │
│  Winston + JSON Format + Log Aggregation  │
│  • Request Tracing                        │
│  • Performance Metrics                    │
│  • Business Event Tracking                │
│  • Error Analysis                         │
└─────────────────────────────────────────────┘
```

### Health-Check-System
```typescript
// Available Health Checks
GET /api/health
{
  "status": "OK",
  "timestamp": "2024-12-08T...",
  "modules": ["hr", "support"],
  "uptime": "2h 15m",
  "memory": "45MB"
}
```

## 🔄 Migration-Strategie

### Von Mock zu Production
```typescript
// Phase 1: Database Integration
1. Implement Prisma ORM
2. Create Database Schemas
3. Migration Scripts
4. Seed Data Scripts
5. Update Module Functions

// Phase 2: Authentication Enhancement  
1. JWT Token Implementation
2. Refresh Token Logic
3. Session Management
4. Password Hashing (bcrypt)

// Phase 3: File Handling
1. Multer Integration
2. File Upload Endpoints
3. Storage Abstraction Layer
4. Image Processing Pipeline

// Phase 4: Real-time Features
1. WebSocket Integration (Socket.io)
2. Real-time Updates
3. Push Notifications
4. Live Status Changes
```

---

**Architektur-Version:** 2.0.0  
**Letzte Aktualisierung:** 8. Dezember 2024  
**Status:** Stable Development Architecture  
**Nächste Evolution:** Database Integration (v2.1)
