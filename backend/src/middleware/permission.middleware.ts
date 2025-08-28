import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../modules/hr/core/auth';
import { authenticateWithPermissions } from '../services/auth-with-permissions.service';
import { isAdministrator } from '../config/admin.config';

export interface ModulePermissions {
  [key: string]: 'access' | 'admin' | 'none';
}

export interface EnhancedAuthenticatedRequest extends AuthenticatedRequest {
  permissions?: ModulePermissions;
  visibleModules?: string[];
}

/**
 * Enhanced Permission Middleware für JSON-basierte Module-Berechtigungen
 * Ersetzt das alte requirePermission System
 */
export function requireModuleAccess(
  moduleKey: string, 
  minimumLevel: 'access' | 'admin' = 'access'
) {
  return async (req: EnhancedAuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      console.log(`🔒 Permission-Check: Modul '${moduleKey}' benötigt '${minimumLevel}'`);

      // Stelle sicher, dass User authentifiziert ist und Permissions geladen sind
      await authenticateWithPermissions(req as any, res, () => {});
      
      if (!req.user) {
        console.log(`❌ Permission-Check: User nicht authentifiziert`);
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentifizierung erforderlich'
        });
      }

      // 👑 ADMINISTRATOR-BYPASS: Administratoren haben IMMER alle Rechte!
      if (isAdministrator(req.user.email)) {
        console.log(`👑 ADMINISTRATOR-BYPASS: ${req.user.email} ist Administrator - Vollzugriff auf '${moduleKey}' gewährt!`);
        return next();
      }

      // Fallback: Falls permissions nicht direkt gesetzt, aus req.user.modulePermissions übernehmen
      if (!req.permissions && (req as any).user?.modulePermissions) {
        (req as any).permissions = (req as any).user.modulePermissions;
      }

      if (!req.permissions) {
        console.log(`❌ Permission-Check: Permissions nicht geladen für User ${req.user.email}`);
        return res.status(403).json({
          success: false,
          error: 'PermissionsNotLoaded',
          message: 'Berechtigungen konnten nicht geladen werden'
        });
      }

      // Prüfe Module-Berechtigung
      const userModuleLevel = req.permissions[moduleKey];
      console.log(`🔍 User ${req.user.email} hat '${userModuleLevel}' für Modul '${moduleKey}'`);

      // Mapping für Level-Vergleich
      const levelPriority = { 'none': 0, 'access': 1, 'admin': 2 };
      const userPriority = levelPriority[userModuleLevel] || 0;
      const requiredPriority = levelPriority[minimumLevel];

      if (userPriority < requiredPriority) {
        console.log(`❌ Permission-Check: User ${req.user.email} hat unzureichende Berechtigung für '${moduleKey}' (${userModuleLevel} < ${minimumLevel})`);
        return res.status(403).json({
          success: false,
          error: 'InsufficientPermissions',
          message: `Keine ausreichende Berechtigung für ${moduleKey}. Erforderlich: ${minimumLevel}, Vorhanden: ${userModuleLevel || 'none'}`
        });
      }

      console.log(`✅ Permission-Check: User ${req.user.email} hat Zugriff auf '${moduleKey}' (${userModuleLevel} >= ${minimumLevel})`);
      
      next();
    } catch (error) {
      console.error(`❌ Permission-Check Fehler für Modul '${moduleKey}':`, error);
      res.status(500).json({
        success: false,
        error: 'PermissionCheckError',
        message: 'Fehler bei der Berechtigungsprüfung'
      });
    }
  };
}

/**
 * Abkürzungen für häufig verwendete Permission-Checks
 */
export const requireSupportAccess = () => requireModuleAccess('support', 'access');
export const requireSupportAdmin = () => requireModuleAccess('support', 'admin');

export const requireAIAccess = () => requireModuleAccess('ai', 'access');
export const requireAIAdmin = () => requireModuleAccess('ai', 'admin');

export const requireHRAccess = () => requireModuleAccess('hr', 'access');
export const requireHRAdmin = () => requireModuleAccess('hr', 'admin');

export const requireAdminPortalAccess = () => requireModuleAccess('admin_portal', 'access');
export const requireAdminPortalAdmin = () => requireModuleAccess('admin_portal', 'admin');

export const requireAdminAccess = () => requireModuleAccess('admin', 'access');
export const requireAdminAdmin = () => requireModuleAccess('admin', 'admin');

// Spezielle Middleware für User-Overview Route - akzeptiert sowohl HR als auch Admin-Portal Zugriff
export const requireUserDataAccess = () => {
  return async (req: EnhancedAuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      console.log(`🔒 Permission-Check: User-Data benötigt HR oder Admin-Portal Zugriff`);

      // Stelle sicher, dass User authentifiziert ist und Permissions geladen sind
      await authenticateWithPermissions(req as any, res, () => {});
      
      if (!req.user) {
        console.log(`❌ Permission-Check: User nicht authentifiziert`);
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Authentifizierung erforderlich'
        });
      }

      // 👑 ADMINISTRATOR-BYPASS: Administratoren haben IMMER alle Rechte!
      if (isAdministrator(req.user.email)) {
        console.log(`👑 ADMINISTRATOR-BYPASS: ${req.user.email} ist Administrator - Vollzugriff gewährt!`);
        return next();
      }

      if (!req.permissions) {
        console.log(`❌ Permission-Check: Permissions nicht geladen für User ${req.user.email}`);
        return res.status(403).json({
          success: false,
          error: 'PermissionsNotLoaded',
          message: 'Berechtigungen konnten nicht geladen werden'
        });
      }

      // Prüfe sowohl HR als auch Admin-Portal Zugriff
      const hrLevel = req.permissions['hr'];
      const adminPortalLevel = req.permissions['admin_portal'];
      
      console.log(`🔍 User ${req.user.email} hat HR:'${hrLevel}', Admin-Portal:'${adminPortalLevel}'`);

      // Mapping für Level-Vergleich
      const levelPriority = { 'none': 0, 'access': 1, 'admin': 2 };

      const hasHRAccess = levelPriority[hrLevel as keyof typeof levelPriority] >= 1;
      const hasAdminPortalAccess = levelPriority[adminPortalLevel as keyof typeof levelPriority] >= 1;

      if (hasHRAccess || hasAdminPortalAccess) {
        const accessType = hasHRAccess ? 'HR' : 'Admin-Portal';
        console.log(`✅ Permission-Check: ${accessType}-Zugriff gewährt für User ${req.user.email}`);
        return next();
      } else {
        console.log(`❌ Permission-Check: Weder HR noch Admin-Portal Zugriff für User ${req.user.email}`);
        return res.status(403).json({
          success: false,
          error: 'InsufficientPermissions',
          message: 'HR- oder Admin-Portal-Zugriff erforderlich'
        });
      }
      
    } catch (error) {
      console.error('❌ Fehler in requireUserDataAccess:', error);
      return res.status(500).json({
        success: false,
        error: 'PermissionCheckError',
        message: 'Fehler bei Berechtigungsprüfung'
      });
    }
  };
};