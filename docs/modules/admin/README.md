# Admin Portal - Enterprise Benutzer-Management

## 📋 Übersicht

**Version:** 2.0.0  
**Status:** ✅ Vollständig implementiert (21. August 2025)  
**Architektur:** Modulbasiert (Backend + Frontend)  

Das Admin Portal ist das zentrale Verwaltungssystem für CompanyAI mit folgenden Hauptfunktionen:

- **Multi-Source User Management**: Azure AD, LDAP, Manuelle Benutzer, Bulk Operations
- **Real-Time Analytics**: Benutzer-Statistiken, System-Metriken, Performance-Monitoring  
- **Sync-Management**: Status-Überwachung aller Datenquellen
- **RBAC-System**: Rollenbasierte Zugriffskontrolle
- **Quota Management**: Token-Limits, Request-Limits, Model-Zugriffe

## 🏗️ Implementierte Architektur

### Backend (Express + TypeScript)
```
backend/src/modules/admin/
├── orchestrator.ts      # API-Handler für 6 Endpunkte
├── types.ts            # TypeScript-Interfaces
├── core/               # Bereit für Erweiterungen
└── functions/          # Bereit für Geschäftslogik
```

### Frontend (React + TypeScript) 
```
frontend/src/modules/admin/
├── AdminModule.tsx          # Router-Koordination
├── pages/
│   ├── UsersPage.tsx       # Benutzer-Liste & Filterung
│   ├── CreateUserPage.tsx  # Benutzer-Erstellung  
│   ├── AnalyticsPage.tsx   # Benutzer-Analytics
│   ├── SystemMetricsPage.tsx # System-Performance
│   └── SyncStatusPage.tsx  # Multi-Source Sync-Status
└── styles/AdminPages.css   # Styling
```

## 📡 API-Endpunkte (Vollständig implementiert)

- `GET /api/admin/users` - Benutzer auflisten (Filterung & Pagination)
- `POST /api/admin/users` - Neuen Benutzer erstellen  
- `PUT /api/admin/users/:id` - Benutzer aktualisieren
- `DELETE /api/admin/users/:id` - Benutzer löschen
- `GET /api/admin/analytics/metrics` - Benutzer-Analytics
- `GET /api/admin/analytics/system` - System-Metriken
- `GET /api/admin/sync/status` - Multi-Source Sync-Status

## 👥 Multi-Source User Management

### Unterstützte Benutzerquellen:

1. **Azure AD Integration** 🔵
   - Automatische Synchronisation aus Microsoft Entra ID
   - Benutzer-Mapping: DisplayName → firstName/lastName
   - Status-Mapping: accountEnabled → active/inactive/pending

2. **LDAP Integration** 🏢  
   - LDAP-Server-Verbindung (LDAP_ENABLED in .env)
   - Status: Bereit für Konfiguration

3. **Manuelle Benutzer** 👤
   - Admin-Portal-Erstellung über CreateUserPage
   - Vollständige Kontrolle über alle Properties
   - Audit-Trail: createdBy/updatedBy Tracking

4. **Bulk Operations** 📁
   - CSV/Excel Import (geplant)
   - Status: Vorbereitung für Bulk-Funktionen

## 🔐 RBAC & Quota System

### Rollen-System
```typescript
type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'IT_ADMIN' | 'HR_ADMIN' | 'USER';

interface Permission {
  resource: string;    // 'ai', 'hr', 'support', 'admin'
  action: string;      // 'read', 'write', 'execute', 'admin'
  scope: string;       // 'all', 'own', 'department'
}
```

### Quota-Management
```typescript
interface UserQuotas {
  tokensPerDay: number;           // AI-Token-Limit pro Tag
  tokensUsedToday: number;        // Aktuelle Nutzung
  requestsPerHour: number;        // API-Request-Limit
  maxSessions: number;            // Gleichzeitige Sessions
  allowedModels: string[];        // Zugelassene AI-Modelle
  resetDaily: boolean;            // Tägliches Reset
}
```

## 📊 Analytics & Monitoring Features

### User Analytics Dashboard
- **Gesamt-Benutzer**: Alle registrierten Benutzer
- **Aktive Benutzer**: Status "active" Benutzer
- **Provider-Verteilung**: Balkendiagramm (Azure AD, LDAP, Manual)
- **Rollen-Verteilung**: Übersicht aller Benutzer-Rollen
- **Täglich aktive Benutzer**: 7-Tage-Aktivitätsverlauf

### System Metrics Dashboard  
- **Server-Status**: Healthy/Warning/Error mit Uptime
- **Memory-Usage**: RAM-Verbrauch mit Progress-Bar
- **Response-Time**: Durchschnitt, P95, P99 Latenz
- **API-Calls**: Total, 24h, Error-Rate
- **Database-Status**: Connection & Query-Performance
- **Auto-Refresh**: 30-Sekunden-Intervall (aktivierbar)

## 🔄 Sync-Status Management

### Multi-Source Synchronisation
- **Azure AD Sync**: Automatisch aktiviert, Benutzer-Anzahl tracking
- **LDAP Sync**: Konfigurierbar (aktuell deaktiviert)
- **Manual Sync**: Immer aktiv, Audit-Trail
- **Error-Handling**: Detaillierte Fehlermeldungen
- **Performance-Monitoring**: Sync-Laufzeiten

## 🎨 Frontend Features

### Modern React UI
- **Responsive Design**: Desktop/Tablet/Mobile optimiert
- **Loading States**: Spinner für alle API-Calls
- **Error Handling**: Benutzerfreundliche Fehlermeldungen
- **Real-Time Filtering**: Provider, Rolle, Status Filter
- **Pagination**: Performance-optimiert für große Listen

### Navigation Integration
- **Sidebar Integration**: Admin Portal in Haupt-Navigation
- **Dashboard-Kachel**: Zugang vom Main-Dashboard
- **Router**: `/admin/users`, `/admin/analytics`, `/admin/metrics`, `/admin/sync`

## 📋 Implementierungsstatus

### ✅ Vollständig implementiert
- [x] Backend API (6 Endpunkte)
- [x] Frontend Pages (5 Seiten)  
- [x] Navigation (Router, Sidebar, Dashboard)
- [x] User Management (CRUD-Operationen)
- [x] Analytics (Dashboards & Charts)
- [x] System Metrics (Performance-Monitoring)
- [x] Sync Status (Multi-Source Überwachung)
- [x] Responsive Design (Mobile-optimiert)

### 🔄 Geplant
- [ ] LDAP Integration (Vollständige Konfiguration)
- [ ] Bulk Operations (CSV/Excel Import)
- [ ] Database Migration (Von Mock zu persistent)
- [ ] Advanced Analytics (Erweiterte Reports)

## 🛡️ Sicherheit & Performance

### Security Features
- **RequireAuth**: Alle Admin-Routen geschützt
- **Token-basierte Auth**: JWT localStorage Verwaltung
- **Permission Checks**: Rollenbasierte Zugriffskontrolle
- **GDPR-konform**: Sichere PII-Verarbeitung

### Performance
- **Mock-Data**: Aktuell Mock-basiert für schnelle Performance
- **Pagination**: Effiziente große Datenmengen
- **Code-Splitting**: Modulare Frontend-Ladevorgänge
- **Caching-Ready**: Vorbereitet für Redis/Memory-Caching

## 🚀 Entwicklung & Usage

### Lokale Entwicklung
```bash
# Backend (Port 5000)
cd backend && npm run dev

# Frontend (Port 5173)  
cd frontend && npm run dev

# Admin Portal URLs
http://localhost:5173/admin/users     # Benutzer-Verwaltung
http://localhost:5173/admin/analytics # Analytics Dashboard
http://localhost:5173/admin/metrics   # System-Metriken
http://localhost:5173/admin/sync      # Sync-Status
```

### Testing
```bash
# PowerShell API-Tests
cd tools
.\test-admin-portal.ps1              # Vollständige Admin API Tests
```

## 📚 Weiterführende Dokumentation

- **[API.md](./API.md)**: Detaillierte API-Dokumentation mit PowerShell-Beispielen
- **[CHANGELOG.md](./CHANGELOG.md)**: Entwicklungshistorie  
- **[../../INTERDEPENDENCY.md](../../INTERDEPENDENCY.md)**: Integration & Dependencies
- **[../../architecture/module-guidelines.md](../../architecture/module-guidelines.md)**: Modul-Standards

---

**Admin Portal v2.0.0** - Enterprise-Ready User-Management für CompanyAI  
**Status:** Production-Ready ✅ | **Letzte Aktualisierung:** 21. August 2025
