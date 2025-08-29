// Erweiterte Auth-Middleware mit Permission-System
// Erweitert die bestehende HR Auth um JSON-basierte Permissions

import { Request, Response, NextFunction } from 'express';
import { authenticateUser, User as CoreUser, AuthenticatedRequest } from '../modules/hr/core/auth';
import { PermissionService, ModulePermissions, ModuleName } from './permission.service';

// Erweiterte User-Interface mit Permissions
export interface UserWithPermissions extends CoreUser {
  modulePermissions: ModulePermissions;
  visibleModules: ModuleName[];
  hasModuleAccess: (module: ModuleName) => boolean;
  hasAdminAccess: (module: ModuleName) => boolean;
}

// Erweiterte Request-Interface
export interface AuthenticatedRequestWithPermissions extends AuthenticatedRequest {
  user?: UserWithPermissions;
}

/**
 * Authentifiziert User und lädt deren Module-Permissions
 */
export async function authenticateWithPermissions(
  req: AuthenticatedRequestWithPermissions, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'AuthenticationRequired',
        message: 'Bearer Token erforderlich'
      });
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer '
    
    // 1. Normale Auth über bestehende HR Auth
    const coreUser = await authenticateUser(token);
    
    if (!coreUser) {
      res.status(401).json({
        success: false,
        error: 'InvalidToken',
        message: 'Token ungültig oder abgelaufen'
      });
      return;
    }
    
    console.log(`🔑 Auth: User ${coreUser.email} authenticated`);
    
    // 2. Robuste Admin-Erkennung
    const isAdmin = coreUser.email === 'admin@company.com' || 
                   coreUser.email === 'administrator@company.com' || 
                   coreUser.role === 'admin' || 
                   coreUser.role === 'administrator' ||
                   coreUser.id === '1'; // Mock-Admin-ID
    
    console.log(`🔍 Admin-Check: Email=${coreUser.email}, Role=${coreUser.role}, IsAdmin=${isAdmin}`);
    
    // 3. Generiere User-ID für Permission-System
    const permissionUserId = generatePermissionUserId(coreUser);
    
    let modulePermissions: ModulePermissions;
    let visibleModules: ModuleName[];
    
    if (isAdmin) {
      // Admin bekommt Vollzugriff auf alle Module
      modulePermissions = {
        ai: 'admin',
        support: 'admin', 
        hr: 'admin',
        admin_portal: 'admin'
      };
      visibleModules = ['ai', 'support', 'hr', 'admin_portal'];
      console.log(`👑 Admin-Permissions gewährt für: ${coreUser.email}`);
    } else {
      // Für normale User: Lade Module-Permissions aus JSON
      modulePermissions = await PermissionService.getUserPermissions(permissionUserId);
      visibleModules = PermissionService.getVisibleModules(modulePermissions);
    }
    
    console.log(`🔑 Permissions: User ${coreUser.email} (${permissionUserId}) hat Zugriff auf: [${visibleModules.join(', ')}]`);
    
    // 4. Erstelle erweiterten User mit Permission-Helpers
    const userWithPermissions: UserWithPermissions = {
      ...coreUser,
      modulePermissions,
      visibleModules,
      hasModuleAccess: (module: ModuleName) => PermissionService.hasModuleAccess(modulePermissions, module),
      hasAdminAccess: (module: ModuleName) => PermissionService.hasAdminAccess(modulePermissions, module)
    };
    
    // 5. User an Request anhängen
    req.user = userWithPermissions;
    // 5a. Kompatibilität: Permissions auch direkt auf Request setzen (für Middleware)
    (req as any).permissions = modulePermissions;
    (req as any).visibleModules = visibleModules;
    
    // 6. Debug-Info für Entwicklung
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔑 User-Debug: ${JSON.stringify({
        id: coreUser.id,
        email: coreUser.email,
        permissionUserId,
        modulePermissions,
        visibleModules
      }, null, 2)}`);
    }
    
    next();
    
  } catch (error) {
    console.error('❌ Auth-with-Permissions Fehler:', error);
    res.status(500).json({
      success: false,
      error: 'AuthenticationError',
      message: 'Authentifizierung fehlgeschlagen'
    });
  }
}

/**
 * Generiert eindeutige User-ID für Permission-System
 * Format: entra_{original-id} oder manual_{email-hash}
 */
function generatePermissionUserId(user: CoreUser): string {
  // Wenn User-ID bereits richtig formatiert ist, verwende sie
  if (user.id.startsWith('entra_') || user.id.startsWith('manual_')) {
    return user.id;
  }
  
  // Für Entra-User: Präfix hinzufügen
  if (user.id.length > 10 && user.id.includes('-')) {
    return `entra_${user.id}`;
  }
  
  // Für andere User: Hash aus E-Mail erstellen
  const crypto = require('crypto');
  const emailHash = crypto.createHash('md5').update(user.email).digest('hex').substring(0, 8);
  return `manual_${emailHash}`;
}

/**
 * Middleware: Prüft ob User Zugriff auf bestimmtes Modul hat
 */
export function requireModuleAccess(module: ModuleName) {
  return (req: AuthenticatedRequestWithPermissions, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'AuthenticationRequired',
        message: 'Authentifizierung erforderlich'
      });
      return;
    }
    
    if (!req.user.hasModuleAccess(module)) {
      res.status(403).json({
        success: false,
        error: 'ModuleAccessDenied',
        message: `Kein Zugriff auf Modul: ${module}`
      });
      return;
    }
    
    next();
  };
}

/**
 * Middleware: Prüft ob User Admin-Zugriff auf Modul hat
 */
export function requireModuleAdmin(module: ModuleName) {
  return (req: AuthenticatedRequestWithPermissions, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'AuthenticationRequired', 
        message: 'Authentifizierung erforderlich'
      });
      return;
    }
    
    if (!req.user.hasAdminAccess(module)) {
      res.status(403).json({
        success: false,
        error: 'ModuleAdminRequired',
        message: `Admin-Zugriff auf Modul ${module} erforderlich`
      });
      return;
    }
    
    next();
  };
}

/**
 * API-Endpoint: Gibt User-Permissions und sichtbare Module zurück
 */
export async function getUserPermissionsEndpoint(
  req: AuthenticatedRequestWithPermissions, 
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'AuthenticationRequired',
        message: 'Authentifizierung erforderlich'
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
          department: req.user.department
        },
        permissions: {
          modules: req.user.modulePermissions,
          visibleModules: req.user.visibleModules
        },
        meta: {
          cacheStats: PermissionService.getCacheStats()
        }
      }
    });
    
  } catch (error) {
    console.error('❌ getUserPermissions Fehler:', error);
    res.status(500).json({
      success: false,
      error: 'PermissionLoadError',
      message: 'Permissions konnten nicht geladen werden'
    });
  }
}

/**
 * API-Endpoint: Invalidiert Permission-Cache für User
 */
export async function invalidateUserPermissionCache(
  req: AuthenticatedRequestWithPermissions,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'AuthenticationRequired',
        message: 'Authentifizierung erforderlich'
      });
      return;
    }
    
    const targetUserId = req.body.userId || generatePermissionUserId(req.user);
    PermissionService.invalidateCache(targetUserId);
    
    res.json({
      success: true,
      message: `Cache für User ${targetUserId} invalidiert`
    });
    
  } catch (error) {
    console.error('❌ Cache-Invalidierung Fehler:', error);
    res.status(500).json({
      success: false,
      error: 'CacheInvalidationError',
      message: 'Cache konnte nicht invalidiert werden'
    });
  }
}

/**
 * Debug-Helper: Zeigt Permission-System-Status
 */
export function getPermissionSystemStatus(): any {
  return {
    cacheStats: PermissionService.getCacheStats(),
    availableModules: ['ai', 'support', 'hr', 'admin_portal'] as ModuleName[],
    permissionLevels: ['admin', 'access', 'none'],
    timestamp: new Date().toISOString()
  };
}
