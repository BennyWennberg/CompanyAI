# 🔑 Enhanced Permission System

Ein JSON-basiertes, granulares Permission-System für CompanyAI das Module-Zugriffe auf User-Ebene steuert.

## 🎯 **Überblick**

Das Enhanced Permission System ersetzt das alte hardcoded Permission-System durch eine flexible, JSON-basierte Lösung:

- **JSON-Konfiguration** → Permissions aus `department-permissions.json`
- **Granulare Kontrolle** → Pro User + Pro Modul
- **Dynamische UI** → Sidebar und Dashboard passen sich automatisch an
- **Caching** → Optimierte Performance mit intelligent cache
- **Real-time** → Änderungen ohne App-Restart

## 📁 **System-Architektur**

### **Backend Components:**
```
backend/src/
├── services/
│   ├── permission.service.ts         # Core Permission Logic + Caching
│   └── auth-with-permissions.service.ts  # Auth-Middleware Integration
├── routes/
│   └── permission.routes.ts          # API Endpoints
└── admin-data/
    └── department-permissions.json   # Permission Configuration
```

### **Frontend Components:**
```
frontend/src/
├── context/
│   └── EnhancedPermissionContext.tsx # React Context + Hooks
├── components/
│   ├── EnhancedDashboard.tsx         # Dynamic Dashboard
│   └── EnhancedDashboard.css         # Dashboard Styles
└── layouts/
    ├── EnhancedMainLayout.tsx        # Layout Wrapper
    └── components/
        └── EnhancedSidebar.tsx       # Dynamic Sidebar
```

## 🔧 **Permission Levels**

| Level | Beschreibung | UI Anzeige | Zugriff |
|-------|-------------|-----------|---------|
| `admin` | Vollzugriff + Management | 👑 | Alle Funktionen |
| `access` | Basis-Zugriff/Lesen | 👤 | Standard-Features |
| `none` | Kein Zugriff | ❌ | Modul versteckt |

## 📋 **Module**

| Modul | Schlüssel | Beschreibung |
|-------|----------|-------------|
| KI-Assistent | `ai` | Chat, Dokument-Analyse, RAG |
| Support | `support` | Ticket-System, Kundensupport |
| Personal | `hr` | Mitarbeiterverwaltung, HR |
| Admin-Portal | `admin_portal` | System-Administration |

## ⚙️ **Backend Implementation**

### **1. Permission Service**
```typescript
import { PermissionService } from '../services/permission.service';

// User Permissions laden
const permissions = await PermissionService.getUserPermissions(userId);
const visibleModules = PermissionService.getVisibleModules(permissions);

// Permission Checks
const hasAccess = PermissionService.hasModuleAccess(permissions, 'ai');
const hasAdmin = PermissionService.hasAdminAccess(permissions, 'support');
```

### **2. Auth Middleware**
```typescript
import { authenticateWithPermissions } from '../services/auth-with-permissions.service';

// Route mit Permissions
app.get('/api/some-endpoint', authenticateWithPermissions, (req, res) => {
  const { user } = req; // Enthält modulePermissions + visibleModules
  
  if (!user.hasModuleAccess('ai')) {
    return res.status(403).json({ error: 'No access to AI module' });
  }
  
  // Rest der Route-Logic...
});
```

### **3. API Endpoints**
```bash
# User Permissions abrufen
GET /api/auth/permissions

# Cache invalidieren
POST /api/auth/permissions/invalidate

# System Status (Debug)
GET /api/auth/permissions/status
```

## 🎨 **Frontend Implementation**

### **1. Enhanced Permission Hook**
```tsx
import { useEnhancedPermissions } from '../context/EnhancedPermissionContext';

function MyComponent() {
  const { 
    visibleModules,
    hasModuleAccess, 
    hasAdminAccess,
    getModuleLevel 
  } = useEnhancedPermissions();
  
  return (
    <div>
      {visibleModules.map(module => (
        <div key={module}>
          <h3>{module}</h3>
          <p>Level: {getModuleLevel(module)}</p>
          {hasAdminAccess(module) && <AdminPanel />}
        </div>
      ))}
    </div>
  );
}
```

### **2. Module Access Gate**
```tsx
import { ModuleAccessGate } from '../context/EnhancedPermissionContext';

<ModuleAccessGate 
  module="ai" 
  requiredLevel="admin"
  fallback={<div>Kein Admin-Zugriff</div>}
>
  <AdminOnlyComponent />
</ModuleAccessGate>
```

### **3. Enhanced Layout verwenden**
```tsx
import EnhancedMainLayout from '../layouts/EnhancedMainLayout';
import EnhancedDashboard from '../components/EnhancedDashboard';

function App() {
  return (
    <EnhancedMainLayout>
      <EnhancedDashboard />
    </EnhancedMainLayout>
  );
}
```

## 🗃️ **JSON Konfiguration**

### **department-permissions.json Struktur:**
```json
[
  {
    "departmentId": "dept_it",
    "departmentName": "IT",
    "moduleAccess": {},
    "userOverrides": {
      "entra_7292392f-63ff-436c-be65-53555ffbd73d": {
        "ai": "admin",
        "support": "access", 
        "admin_portal": "admin",
        "hr": "none"
      }
    },
    "subGroups": {}
  }
]
```

### **User ID Formate:**
```
entra_{azure-ad-id}     # Entra ID User
manual_{hash}           # Manual User  
ldap_{username}         # LDAP User
```

## 🚀 **Migration von altem System**

### **1. Backend Migration:**
```typescript
// Alt (hardcoded)
if (user.role === 'admin') {
  // Show admin features
}

// Neu (JSON-based)
if (user.hasAdminAccess('support')) {
  // Show support admin features
}
```

### **2. Frontend Migration:**
```tsx
// Alt
import { usePermissions } from './PermissionContext';
const { hasModuleAccess } = usePermissions();

// Neu
import { useEnhancedPermissions } from './EnhancedPermissionContext';
const { hasModuleAccess } = useEnhancedPermissions();
```

## 📊 **Caching & Performance**

### **Backend Cache:**
- **5 Minuten TTL** pro User
- **File-Change-Detection** für Auto-Invalidierung
- **Debug-API** für Cache-Statistiken

### **Frontend Cache:**
- **Context-basiertes Caching**
- **Token-Change-Listener** für User-Wechsel
- **Auto-Reload** bei Authentifizierung

## 🔍 **Debug & Development**

### **Debug-Komponenten:**
```tsx
import { EnhancedPermissionDebugInfo } from '../context/EnhancedPermissionContext';

// Zeigt komplette Permission-Info
<EnhancedPermissionDebugInfo />
```

### **Debug-APIs:**
```bash
# Permission Status
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/auth/permissions/status

# User-spezifische Permissions
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/auth/permissions/debug/entra_123
```

### **Console Logs:**
```javascript
// Frontend
🔑 Enhanced: Lade User-Permissions...
✅ Enhanced Permissions geladen: {user: "test@company.com", visibleModules: "ai,support"}

// Backend  
🔑 PermissionService: Loading permissions for user entra_123
✅ PermissionService: Loaded permissions: {ai: "admin", support: "access"}
```

## 🛡️ **Security Features**

### **Default Deny:**
```typescript
// Kein User in JSON = keine Module
const defaultPermissions = {
  ai: 'none',
  support: 'none', 
  hr: 'none',
  admin_portal: 'none'
};
```

### **Frontend + Backend Validation:**
```typescript
// Frontend zeigt nur erlaubte Module
const visibleModules = permissions.filter(p => p !== 'none');

// Backend validiert zusätzlich bei jedem API-Call
if (!user.hasModuleAccess('ai')) {
  return res.status(403).json({error: 'Access denied'});
}
```

### **Cache Invalidierung:**
```typescript
// Bei JSON-Änderungen automatisch
PermissionService.invalidateCache();

// Manuell via API
POST /api/auth/permissions/invalidate
```

## 📈 **Vorteile des neuen Systems**

### **Für Entwickler:**
- ✅ **Type-Safe** → Vollständige TypeScript-Unterstützung
- ✅ **Modular** → Einfach neue Module hinzufügen
- ✅ **Testbar** → Isolierte Permission-Logic
- ✅ **Debug-Tools** → Umfangreiche Entwickler-Unterstützung

### **Für Admins:**
- ✅ **JSON-basiert** → Einfache Konfiguration
- ✅ **Granular** → Pro User, pro Modul
- ✅ **Real-time** → Keine App-Neustarts
- ✅ **Audit-Trail** → Wer hat wann was geändert

### **Für User:**
- ✅ **Dynamische UI** → Sidebar passt sich an Rechte an
- ✅ **Performance** → Caching für schnelle Ladezeiten  
- ✅ **Intuitive UX** → Klare Permission-Indikatoren

## 🔄 **Nächste Schritte**

1. **✅ Backend Permission Service** → Implementiert
2. **✅ Frontend Enhanced Context** → Implementiert  
3. **✅ Dynamic Sidebar & Dashboard** → Implementiert
4. **🔄 Integration testen** → User-IDs in JSON konfigurieren
5. **🔄 Migration bestehender Components** → Nach und nach umstellen
6. **🔄 Admin-UI für JSON-Editing** → Grafisches Interface für Permissions

---

**Das Enhanced Permission System ist einsatzbereit! 🎉**
