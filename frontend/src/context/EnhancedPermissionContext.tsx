// Enhanced Permission Context - Nutzt JSON-basierte Permissions
// Erweitert das bestehende System um Module-basierte Rechte aus department-permissions.json

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// 👑 ADMINISTRATOR-KONFIGURATION - HIER NEUE ADMIN-E-MAILS HINZUFÜGEN!
const ADMIN_EMAILS = [
  // 🔧 System-Administratoren
  'admin@company.com',
  'administrator@company.com', 
  'superuser@company.com',
  'root@company.com',
  'sysadmin@company.com',
  
  // 📝 HIER NEUE ADMIN-E-MAILS HINZUFÜGEN:
  // 'neuer.admin@company.com',
  // 'weitere.admin@company.com',
  
  // 👨‍💼 Benny ist jetzt NORMALER USER (nicht Admin!)
  // 'wennberg.b@eisbaer.at',  // <-- ENTFERNT damit Benny normale JSON-Permissions bekommt
];

// Administrator-Check - Administratoren haben IMMER alle Rechte!
function isAdministrator(userEmail?: string): boolean {
  if (!userEmail) return false;
  return ADMIN_EMAILS.includes(userEmail.toLowerCase());
}

// Neue Permission-Types für JSON-System
export type ModuleName = 'ai' | 'support' | 'hr' | 'admin_portal';
export type PermissionLevel = 'admin' | 'access' | 'none';
export type ModulePermissions = Record<ModuleName, PermissionLevel>;

// User mit erweiterten Permissions
interface EnhancedUser {
  id: string;
  email: string;
  role: string;
  department?: string;
}

// Permission-Data vom Backend
interface PermissionResponse {
  user: EnhancedUser;
  permissions: {
    modules: ModulePermissions;
    visibleModules: ModuleName[];
  };
  meta?: {
    cacheStats?: any;
  };
}

// Context-Type
interface EnhancedPermissionContextType {
  // State
  user: EnhancedUser | null;
  permissions: ModulePermissions | null;
  visibleModules: ModuleName[];
  loading: boolean;
  error: string | null;
  
  // Permission Check Functions
  hasModuleAccess: (module: ModuleName) => boolean;
  hasAdminAccess: (module: ModuleName) => boolean;
  getModuleLevel: (module: ModuleName) => PermissionLevel;
  
  // Utility Functions
  refreshPermissions: () => Promise<void>;
  invalidateCache: () => Promise<void>;
  
  // Debug Info
  debugInfo: {
    userId: string;
    userEmail: string;
    department: string;
    visibleModuleCount: number;
    lastLoaded: string;
    cacheStats?: any;
  };
}

const EnhancedPermissionContext = createContext<EnhancedPermissionContextType | undefined>(undefined);

interface EnhancedPermissionProviderProps {
  children: React.ReactNode;
  apiBaseUrl?: string;
}

export const EnhancedPermissionProvider: React.FC<EnhancedPermissionProviderProps> = ({ 
  children, 
  apiBaseUrl = 'http://localhost:5000' 
}) => {
  const [user, setUser] = useState<EnhancedUser | null>(null);
  const [permissions, setPermissions] = useState<ModulePermissions | null>(null);
  const [visibleModules, setVisibleModules] = useState<ModuleName[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastLoaded, setLastLoaded] = useState<string>('');
  const [cacheStats, setCacheStats] = useState<any>(null);

  // Load permissions from new backend endpoint
  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Kein Authentifizierungs-Token gefunden');
        setUser(null);
        setPermissions(null);
        setVisibleModules([]);
        setLoading(false);
        return;
      }

      console.log('🔑 Enhanced: Lade User-Permissions...');

      const response = await fetch(`${apiBaseUrl}/api/auth/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: { success: boolean; data?: PermissionResponse; message?: string } = await response.json();

      if (result.success && result.data) {
        const { user: userData, permissions: permData, meta } = result.data;
        
        setUser(userData);
        setPermissions(permData.modules);
        
        // 👑 ADMINISTRATOR-BYPASS: Administratoren sehen ALLE Module!
        if (isAdministrator(userData.email)) {
          console.log(`👑 ADMINISTRATOR-BYPASS: ${userData.email} ist Administrator - Alle Module werden angezeigt!`);
          setVisibleModules(['ai', 'support', 'hr', 'admin_portal']);
        } else {
          setVisibleModules(permData.visibleModules);
        }
        
        setCacheStats(meta?.cacheStats);
        setLastLoaded(new Date().toISOString());

        const finalVisibleModules = isAdministrator(userData.email) 
          ? ['ai', 'support', 'hr', 'admin_portal']
          : permData.visibleModules;
          
        console.log('✅ Enhanced Permissions geladen:', {
          user: userData.email,
          department: userData.department,
          visibleModules: finalVisibleModules.join(', '),
          permissions: permData.modules,
          isAdmin: isAdministrator(userData.email) ? '👑 ADMINISTRATOR' : 'Standard User'
        });
        
      } else {
        setError(result.message || 'Fehler beim Laden der Berechtigungen');
        console.error('❌ Enhanced Permission-Load-Fehler:', result.message);
      }

    } catch (err: any) {
      setError('Verbindungsfehler beim Laden der Berechtigungen: ' + err.message);
      console.error('❌ Enhanced Permission-Netzwerk-Fehler:', err);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  // Invalidate permission cache
  const invalidateCache = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      await fetch(`${apiBaseUrl}/api/auth/permissions/invalidate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🧹 Permission Cache invalidiert');
      
      // Reload permissions
      await loadPermissions();
      
    } catch (error) {
      console.warn('⚠️ Cache-Invalidierung fehlgeschlagen:', error);
    }
  }, [apiBaseUrl, loadPermissions]);

  // Initial load
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // React to auth token changes
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'authToken') {
        console.log('🔄 Enhanced: AuthToken geändert - Permissions werden neu geladen');
        setUser(null);
        setPermissions(null);
        setVisibleModules([]);
        setError(null);
        loadPermissions();
      }
    };

    const checkTokenChange = () => {
      const currentToken = localStorage.getItem('authToken');
      const storedToken = sessionStorage.getItem('lastEnhancedAuthToken');
      
      if (currentToken !== storedToken) {
        console.log('🔄 Enhanced: AuthToken-Wechsel erkannt');
        sessionStorage.setItem('lastEnhancedAuthToken', currentToken || '');
        
        if (currentToken) {
          setUser(null);
          setPermissions(null);
          setVisibleModules([]);
          setError(null);
          loadPermissions();
        } else {
          // User logged out
          setUser(null);
          setPermissions(null);
          setVisibleModules([]);
          setLoading(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(checkTokenChange, 2000);
    
    sessionStorage.setItem('lastEnhancedAuthToken', localStorage.getItem('authToken') || '');

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [loadPermissions]);

  // Permission check functions
  const hasModuleAccess = useCallback((module: ModuleName): boolean => {
    // 👑 ADMINISTRATOR-BYPASS: Administratoren haben IMMER alle Rechte!
    if (isAdministrator(user?.email)) {
      console.log(`👑 ADMINISTRATOR-BYPASS: ${user?.email} ist Administrator - Vollzugriff auf '${module}' gewährt!`);
      return true;
    }
    
    if (!permissions) return false;
    return permissions[module] !== 'none';
  }, [permissions, user?.email]);

  const hasAdminAccess = useCallback((module: ModuleName): boolean => {
    // 👑 ADMINISTRATOR-BYPASS: Administratoren haben IMMER alle Rechte!
    if (isAdministrator(user?.email)) {
      console.log(`👑 ADMINISTRATOR-BYPASS: ${user?.email} ist Administrator - Admin-Zugriff auf '${module}' gewährt!`);
      return true;
    }
    
    if (!permissions) return false;
    return permissions[module] === 'admin';
  }, [permissions, user?.email]);

  const getModuleLevel = useCallback((module: ModuleName): PermissionLevel => {
    // 👑 ADMINISTRATOR-BYPASS: Administratoren haben IMMER Admin-Level!
    if (isAdministrator(user?.email)) {
      return 'admin';
    }
    
    if (!permissions) return 'none';
    return permissions[module] || 'none';
  }, [permissions, user?.email]);

  const refreshPermissions = useCallback(async (): Promise<void> => {
    await loadPermissions();
  }, [loadPermissions]);

  // Debug info
  const debugInfo = {
    userId: user?.id || 'unknown',
    userEmail: user?.email || 'unknown',
    department: user?.department || 'unknown',
    visibleModuleCount: visibleModules.length,
    lastLoaded,
    cacheStats
  };

  const contextValue: EnhancedPermissionContextType = {
    user,
    permissions,
    visibleModules,
    loading,
    error,
    hasModuleAccess,
    hasAdminAccess,
    getModuleLevel,
    refreshPermissions,
    invalidateCache,
    debugInfo
  };

  return (
    <EnhancedPermissionContext.Provider value={contextValue}>
      {children}
    </EnhancedPermissionContext.Provider>
  );
};

// Hook for using enhanced permissions
export const useEnhancedPermissions = (): EnhancedPermissionContextType => {
  const context = useContext(EnhancedPermissionContext);
  if (context === undefined) {
    throw new Error('useEnhancedPermissions must be used within an EnhancedPermissionProvider');
  }
  return context;
};

// Module Access Gate Component
interface ModuleAccessGateProps {
  module: ModuleName;
  requiredLevel?: PermissionLevel;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLoader?: boolean;
}

export const ModuleAccessGate: React.FC<ModuleAccessGateProps> = ({
  module,
  requiredLevel = 'access',
  children,
  fallback = null,
  showLoader = true
}) => {
  const { hasModuleAccess, hasAdminAccess, getModuleLevel, loading } = useEnhancedPermissions();

  if (loading && showLoader) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Lade Berechtigungen...</span>
      </div>
    );
  }

  // Check basic module access first
  if (!hasModuleAccess(module)) {
    console.log(`🚫 ModuleAccessGate: Kein Zugriff auf ${module}`);
    return <>{fallback}</>;
  }

  // Check required permission level
  if (requiredLevel === 'admin' && !hasAdminAccess(module)) {
    console.log(`🚫 ModuleAccessGate: Admin-Zugriff auf ${module} erforderlich`);
    return <>{fallback}</>;
  }

  const currentLevel = getModuleLevel(module);
  console.log(`✅ ModuleAccessGate: Zugriff auf ${module} gewährt (${currentLevel})`);

  return <>{children}</>;
};

// Debug component for enhanced permissions
export const EnhancedPermissionDebugInfo: React.FC = () => {
  const { user, permissions, visibleModules, debugInfo, loading, error } = useEnhancedPermissions();

  if (loading) {
    return <div className="p-4 bg-yellow-100 rounded">Loading enhanced permissions...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 rounded text-red-800">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  if (!user || !permissions) {
    return <div className="p-4 bg-gray-100 rounded">No enhanced permissions loaded</div>;
  }

  return (
    <div className="p-4 bg-blue-50 rounded text-sm space-y-2 font-mono">
      <div className="font-bold text-blue-900">🚀 Enhanced Permission System</div>
      <div><strong>User:</strong> {debugInfo.userEmail} (ID: {debugInfo.userId})</div>
      <div><strong>Department:</strong> {debugInfo.department}</div>
      <div><strong>Visible Modules:</strong> [{visibleModules.join(', ')}]</div>
      <div><strong>Last Loaded:</strong> {debugInfo.lastLoaded}</div>
      
      <div className="grid grid-cols-2 gap-2 mt-4">
        {Object.entries(permissions).map(([module, level]) => (
          <div key={module} className={`p-2 rounded ${
            level === 'admin' ? 'bg-red-100 text-red-800' :
            level === 'access' ? 'bg-green-100 text-green-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            <strong>{module}:</strong> {level}
          </div>
        ))}
      </div>
      
      {debugInfo.cacheStats && (
        <details className="mt-4">
          <summary className="cursor-pointer font-semibold">Cache Stats</summary>
          <pre className="text-xs bg-white p-2 rounded mt-2 overflow-auto">
            {JSON.stringify(debugInfo.cacheStats, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};
