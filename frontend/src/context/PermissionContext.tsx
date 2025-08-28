import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type ModuleAccessLevel = 'none' | 'read' | 'write' | 'admin';

interface ModulePermission {
  moduleKey: string;
  hasAccess: boolean;
  accessLevel: ModuleAccessLevel;
  source: 'department' | 'user_override' | 'default';
  reason: string;
}

interface UserPermissionData {
  userEmail: string;
  userDepartment: string;
  permissions: ModulePermission[];
  calculatedAt: string;
  isAdmin?: boolean;
}

interface PermissionContextType {
  permissions: UserPermissionData | null;
  loading: boolean;
  error: string | null;
  
  // Permission Check Functions
  hasModuleAccess: (moduleKey: string) => boolean;
  getModuleAccessLevel: (moduleKey: string) => ModuleAccessLevel;
  hasMinimumAccess: (moduleKey: string, requiredLevel: ModuleAccessLevel) => boolean;
  isAdmin: () => boolean;
  
  // Utility Functions
  getAvailableModules: () => string[];
  refreshPermissions: () => Promise<void>;
  
  // Debug Info
  debugInfo: {
    userEmail: string;
    userDepartment: string;
    totalModulesWithAccess: number;
    lastChecked: string;
    isAdmin: boolean;
  };
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

interface PermissionProviderProps {
  children: React.ReactNode;
  apiBaseUrl?: string;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ 
  children, 
  apiBaseUrl = 'http://localhost:5000' 
}) => {
  const [permissions, setPermissions] = useState<UserPermissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load permissions from backend
  const loadPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Kein Authentifizierungs-Token gefunden');
        setLoading(false);
        return;
      }

      console.log('🔍 Lade User-Permissions...');

      const response = await fetch(`${apiBaseUrl}/api/admin-portal/my-permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        setPermissions(result.data);
        const modulesWithAccess = result.data.isAdmin 
          ? result.data.permissions.length 
          : result.data.permissions.filter(p => p.hasAccess).length;
          
        console.log('✅ User-Permissions geladen:', {
          user: result.data.userEmail,
          department: result.data.userDepartment,
          modulesWithAccess: modulesWithAccess,
          totalModules: result.data.permissions.length,
          isAdmin: result.data.isAdmin ? '👑 ADMINISTRATOR' : '👤 Normaler User'
        });
      } else {
        setError(result.message || 'Fehler beim Laden der Berechtigungen');
        console.error('❌ Permission-Load-Fehler:', result.message);
      }

    } catch (err) {
      setError('Verbindungsfehler beim Laden der Berechtigungen');
      console.error('❌ Permission-Netzwerk-Fehler:', err);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  // Initial load
  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // 🔄 REAGIERE AUF USER-WECHSEL (authToken-Änderungen)
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'authToken') {
        console.log('🔄 AuthToken geändert - Permissions werden neu geladen');
        // Reset state first
        setPermissions(null);
        setError(null);
        // Reload permissions for new user
        loadPermissions();
      }
    };

    // Listen to storage events from other tabs/windows
    window.addEventListener('storage', handleStorageChange);
    
    // Also check for token changes within the same tab
    const checkTokenChange = () => {
      const currentToken = localStorage.getItem('authToken');
      const storedToken = sessionStorage.getItem('lastAuthToken');
      
      if (currentToken !== storedToken) {
        console.log('🔄 AuthToken-Wechsel erkannt - Permissions neu laden');
        sessionStorage.setItem('lastAuthToken', currentToken || '');
        
        if (currentToken) {
          setPermissions(null);
          setError(null);
          loadPermissions();
        } else {
          // User logged out
          setPermissions(null);
          setLoading(false);
        }
      }
    };

    // Check every 1 second for token changes (for same-tab switches)
    const interval = setInterval(checkTokenChange, 1000);
    
    // Set initial token for comparison
    sessionStorage.setItem('lastAuthToken', localStorage.getItem('authToken') || '');

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [loadPermissions]);

  // Admin check function
  const isAdmin = useCallback((): boolean => {
    return permissions?.isAdmin ?? false;
  }, [permissions]);

  // Permission check functions  
  const hasModuleAccess = useCallback((moduleKey: string): boolean => {
    if (!permissions) return false;
    
    // 👑 ADMINISTRATOR-BYPASS: Admin sieht immer alle Module
    if (permissions.isAdmin) {
      console.log(`👑 ADMINISTRATOR-Bypass: hasModuleAccess(${moduleKey}): true (Admin sieht alles)`);
      return true;
    }
    
    // ✅ Normale User nutzen explizite Admin-Portal Permissions
    const permission = permissions.permissions.find(p => p.moduleKey === moduleKey);
    const hasAccess = permission?.hasAccess ?? false;
    
    console.log(`🔍 hasModuleAccess(${moduleKey}): ${hasAccess} (normaler User)`);
    return hasAccess;
  }, [permissions]);

  const getModuleAccessLevel = useCallback((moduleKey: string): ModuleAccessLevel => {
    if (!permissions) return 'none';
    
    // 👑 ADMINISTRATOR-BYPASS: Admin hat immer admin-Level
    if (permissions.isAdmin) {
      console.log(`👑 ADMINISTRATOR-Bypass: getModuleAccessLevel(${moduleKey}): admin (Admin hat alles)`);
      return 'admin';
    }
    
    // ✅ Normale User nutzen explizite Admin-Portal Access-Level
    const permission = permissions.permissions.find(p => p.moduleKey === moduleKey);
    const accessLevel = permission?.accessLevel ?? 'none';
    
    console.log(`🔍 getModuleAccessLevel(${moduleKey}): ${accessLevel} (normaler User)`);
    return accessLevel;
  }, [permissions]);

  const hasMinimumAccess = useCallback((moduleKey: string, requiredLevel: ModuleAccessLevel): boolean => {
    if (!permissions) return false;
    
    // 👑 ADMINISTRATOR-BYPASS: Admin hat immer ausreichende Rechte
    if (permissions.isAdmin) {
      console.log(`👑 ADMINISTRATOR-Bypass: hasMinimumAccess(${moduleKey}, ${requiredLevel}): true (Admin hat alles)`);
      return true;
    }
    
    // ✅ Normale User nutzen explizite Admin-Portal Access-Level
    const userLevel = getModuleAccessLevel(moduleKey);
    const levels = ['none', 'read', 'write', 'admin'];
    const userLevelIndex = levels.indexOf(userLevel);
    const requiredLevelIndex = levels.indexOf(requiredLevel);
    
    const hasAccess = userLevelIndex >= requiredLevelIndex;
    console.log(`🔍 hasMinimumAccess(${moduleKey}, ${requiredLevel}): ${hasAccess} (userLevel: ${userLevel})`);
    
    return hasAccess;
  }, [getModuleAccessLevel, permissions]);

  const getAvailableModules = useCallback((): string[] => {
    if (!permissions) return [];
    
    // 👑 ADMINISTRATOR-BYPASS: Admin sieht alle Module
    if (permissions.isAdmin) {
      const allModules = ['hr', 'support', 'ai', 'admin-portal'];
      console.log(`👑 ADMINISTRATOR-Bypass: getAvailableModules(): [${allModules.join(', ')}] (Admin sieht alles)`);
      return allModules;
    }
    
    // ✅ Normale User - nur Module mit explizitem Zugriff
    const availableModules = permissions.permissions
      .filter(p => p.hasAccess)
      .map(p => p.moduleKey);
      
    console.log(`🔍 getAvailableModules(): [${availableModules.join(', ')}] (normaler User)`);
    return availableModules;
  }, [permissions]);

  const refreshPermissions = useCallback(async (): Promise<void> => {
    await loadPermissions();
  }, [loadPermissions]);

  // Debug info
  const debugInfo = {
    userEmail: permissions?.userEmail ?? 'unknown',
    userDepartment: permissions?.userDepartment ?? 'unknown',
    totalModulesWithAccess: permissions?.isAdmin 
      ? 4  // Admin sieht alle 4 Module (hr, support, ai, admin-portal)
      : permissions?.permissions.filter(p => p.hasAccess).length ?? 0,
    lastChecked: permissions?.calculatedAt ?? 'never',
    isAdmin: permissions?.isAdmin ?? false
  };

  const contextValue: PermissionContextType = {
    permissions,
    loading,
    error,
    hasModuleAccess,
    getModuleAccessLevel,
    hasMinimumAccess,
    isAdmin,
    getAvailableModules,
    refreshPermissions,
    debugInfo
  };

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
};

// Hook for using permission context
export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

// Convenience component for conditional rendering
interface PermissionGateProps {
  moduleKey: string;
  requiredLevel?: ModuleAccessLevel;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  moduleKey,
  requiredLevel,
  children,
  fallback = null
}) => {
  const { hasModuleAccess, hasMinimumAccess, loading, isAdmin } = usePermissions();

  // Show loading state
  if (loading) {
    return <div className="permission-loading">Lade Berechtigungen...</div>;
  }

  // 👑 ADMINISTRATOR-BYPASS: Administrator darf alles sehen und bearbeiten
  if (isAdmin()) {
    console.log(`👑 ADMINISTRATOR-Bypass in PermissionGate für ${moduleKey} - Zugriff gewährt (umgeht alle Restrictions)`);
    return <>{children}</>;
  }

  // Check module access first
  if (!hasModuleAccess(moduleKey)) {
    console.log(`❌ Kein Zugriff auf ${moduleKey} für normalen User`);
    return <>{fallback}</>;
  }

  // Check minimum access level if specified
  if (requiredLevel && !hasMinimumAccess(moduleKey, requiredLevel)) {
    console.log(`❌ Nicht genügend Rechte für ${moduleKey} (benötigt: ${requiredLevel})`);
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Debug component to show permission info
export const PermissionDebugInfo: React.FC = () => {
  const { permissions, debugInfo, loading, error } = usePermissions();

  if (loading) return <div>Loading permissions...</div>;
  if (error) return <div style={{ color: 'red' }}>Error: {error}</div>;
  if (!permissions) return <div>No permissions loaded</div>;

  return (
    <div style={{ 
      background: '#f0f0f0', 
      padding: '12px', 
      borderRadius: '4px', 
      fontSize: '12px',
      marginBottom: '16px'
    }}>
      <strong>🔐 Permission Debug Info:</strong><br />
      User: {debugInfo.userEmail} {debugInfo.isAdmin && '👑'}<br />
      Department: {debugInfo.userDepartment}<br />
      Status: {debugInfo.isAdmin ? 'ADMINISTRATOR (alle Module)' : `${debugInfo.totalModulesWithAccess} Module verfügbar`}<br />
      Letzte Prüfung: {debugInfo.lastChecked}<br />
      <details>
        <summary>Detaillierte Module-Rechte</summary>
        <pre>{JSON.stringify(permissions.permissions, null, 2)}</pre>
      </details>
    </div>
  );
};
