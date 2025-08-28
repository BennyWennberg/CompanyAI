// User Permission Checker
// Prüft welche Module ein User basierend auf seinen Berechtigungen sehen darf

import { checkUserModuleAccess, ModuleAccessLevel } from './departmentPermissions';
import { APIResponse } from '../../types';

export interface UserModuleAccess {
  moduleKey: string;
  moduleName: string;
  accessLevel: ModuleAccessLevel;
  hasAccess: boolean;
  pages: {
    [pageKey: string]: {
      pageKey: string;
      pageName: string;
      accessLevel: ModuleAccessLevel;
      hasAccess: boolean;
    };
  };
}

export interface UserPermissionSummary {
  userId: string;
  userName: string;
  userEmail: string;
  department: string;
  moduleAccess: UserModuleAccess[];
  totalModulesWithAccess: number;
  highestAccessLevel: ModuleAccessLevel;
  lastChecked: string;
  isAdmin?: boolean; // ✅ Admin-Flag für Frontend hinzugefügt
}

// Module-Definitionen (sollten zentral verwaltet werden)
const AVAILABLE_MODULES = [
  {
    key: 'hr',
    name: 'HR Management',
    icon: '👥',
    pages: [
      { key: 'employees', name: 'Mitarbeiter', requiredAccess: 'read' as ModuleAccessLevel },
      { key: 'onboarding', name: 'Onboarding', requiredAccess: 'write' as ModuleAccessLevel },
      { key: 'reports', name: 'Reports', requiredAccess: 'read' as ModuleAccessLevel },
      { key: 'analytics', name: 'Analytics', requiredAccess: 'admin' as ModuleAccessLevel }
    ]
  },
  {
    key: 'support',
    name: 'Support System',
    icon: '🎫',
    pages: [
      { key: 'tickets', name: 'Tickets', requiredAccess: 'read' as ModuleAccessLevel },
      { key: 'knowledge_base', name: 'Knowledge Base', requiredAccess: 'read' as ModuleAccessLevel },
      { key: 'escalations', name: 'Escalations', requiredAccess: 'write' as ModuleAccessLevel },
      { key: 'settings', name: 'Settings', requiredAccess: 'admin' as ModuleAccessLevel }
    ]
  },
  {
    key: 'ai',
    name: 'AI Assistant',
    icon: '🤖',
    pages: [
      { key: 'chat', name: 'Chat', requiredAccess: 'read' as ModuleAccessLevel },
      { key: 'rag', name: 'RAG System', requiredAccess: 'write' as ModuleAccessLevel },
      { key: 'models', name: 'Model Management', requiredAccess: 'admin' as ModuleAccessLevel }
    ]
  },
  {
    key: 'admin-portal',
    name: 'Admin Portal',
    icon: '⚙️',
    pages: [
      { key: 'users', name: 'User Management', requiredAccess: 'read' as ModuleAccessLevel },
      { key: 'permissions', name: 'Permissions', requiredAccess: 'admin' as ModuleAccessLevel },
      { key: 'system', name: 'System', requiredAccess: 'admin' as ModuleAccessLevel }
    ]
  }
];

/**
 * Berechnet alle Berechtigungen für einen User
 */
export async function calculateUserPermissions(
  userId: string,
  userName: string,
  userEmail: string,
  userDepartment: string,
  userRole?: string
): Promise<APIResponse<UserPermissionSummary>> {
  try {
    const moduleAccess: UserModuleAccess[] = [];
    let totalModulesWithAccess = 0;
    let highestAccessLevel: ModuleAccessLevel = 'none';

    // Prüfe Zugriff für jedes Modul
    for (const module of AVAILABLE_MODULES) {
      const accessResult = await checkUserModuleAccess(userEmail, userDepartment, module.key, userRole);
      
      if (!accessResult.success) {
        console.error(`Fehler beim Prüfen des Zugriffs auf ${module.key}:`, accessResult.message);
        continue;
      }

      const moduleAccessLevel = accessResult.data?.accessLevel || 'none';
      const hasModuleAccess = accessResult.data?.hasAccess || false;

      if (hasModuleAccess) {
        totalModulesWithAccess++;
        
        // Aktualisiere höchstes Access-Level
        if (getAccessLevelWeight(moduleAccessLevel) > getAccessLevelWeight(highestAccessLevel)) {
          highestAccessLevel = moduleAccessLevel;
        }
      }

      // Berechne Page-Access für dieses Modul
      const pages: {[pageKey: string]: any} = {};
      for (const page of module.pages) {
        const hasPageAccess = hasModuleAccess && hasRequiredAccess(moduleAccessLevel, page.requiredAccess);
        
        pages[page.key] = {
          pageKey: page.key,
          pageName: page.name,
          accessLevel: hasPageAccess ? moduleAccessLevel : 'none',
          hasAccess: hasPageAccess
        };
      }

      moduleAccess.push({
        moduleKey: module.key,
        moduleName: module.name,
        accessLevel: moduleAccessLevel,
        hasAccess: hasModuleAccess,
        pages
      });
    }

    // ✅ Admin-Check für Frontend
    const { isUserAdmin } = await import('./departmentPermissions');
    const isAdmin = isUserAdmin(userEmail, userRole);

    const permissionSummary: UserPermissionSummary = {
      userId,
      userName,
      userEmail,
      department: userDepartment,
      moduleAccess,
      totalModulesWithAccess,
      highestAccessLevel,
      lastChecked: new Date().toISOString(),
      isAdmin // ✅ Admin-Flag hinzugefügt
    };

    return {
      success: true,
      data: permissionSummary,
      message: `Permissions berechnet für ${userName} (${totalModulesWithAccess} Module zugänglich)`
    };

  } catch (error) {
    console.error('Fehler beim Berechnen der User-Permissions:', error);
    return {
      success: false,
      error: 'PermissionCalculationError',
      message: 'Fehler beim Berechnen der Benutzer-Berechtigungen'
    };
  }
}

/**
 * Hilfsfunktion: Access-Level zu numerischem Gewicht
 */
function getAccessLevelWeight(level: ModuleAccessLevel): number {
  const weights = { 'none': 0, 'access': 1, 'admin': 2 };
  return weights[level] || 0;
}

/**
 * Hilfsfunktion: Prüft ob Access-Level ausreichend ist
 */
function hasRequiredAccess(userLevel: ModuleAccessLevel, requiredLevel: ModuleAccessLevel): boolean {
  return getAccessLevelWeight(userLevel) >= getAccessLevelWeight(requiredLevel);
}

/**
 * Filtert verfügbare Module basierend auf User-Permissions
 */
export async function getAvailableModulesForUser(
  userId: string,
  userDepartment: string
): Promise<APIResponse<string[]>> {
  try {
    const availableModules: string[] = [];

    for (const module of AVAILABLE_MODULES) {
      const accessResult = await checkUserModuleAccess(userId, userDepartment, module.key);
      
      if (accessResult.success && accessResult.data?.hasAccess) {
        availableModules.push(module.key);
      }
    }

    return {
      success: true,
      data: availableModules,
      message: `${availableModules.length} Module verfügbar für User`
    };

  } catch (error) {
    console.error('Fehler beim Abrufen verfügbarer Module:', error);
    return {
      success: false,
      error: 'ModuleFetchError',
      message: 'Fehler beim Abrufen der verfügbaren Module'
    };
  }
}

/**
 * Schnelle Access-Prüfung für einzelne Module
 */
export async function checkModuleAccessQuick(
  userId: string,
  userDepartment: string,
  moduleKey: string,
  requiredLevel: ModuleAccessLevel = 'access'
): Promise<boolean> {
  try {
    const accessResult = await checkUserModuleAccess(userId, userDepartment, moduleKey);
    
    if (!accessResult.success || !accessResult.data?.hasAccess) {
      return false;
    }

    return hasRequiredAccess(accessResult.data?.accessLevel || 'none', requiredLevel);
  } catch (error) {
    console.error(`Fehler bei Quick-Access-Check für ${moduleKey}:`, error);
    return false;
  }
}
