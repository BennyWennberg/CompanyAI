// HR Module - Core Authentifizierung und Autorisierung

import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'hr_manager' | 'hr_specialist' | 'employee';
  department?: string;
  permissions: Permission[];
}

export interface Permission {
  action: 'read' | 'write' | 'delete' | 'admin';
  resource: 'employee_data' | 'reports' | 'onboarding' | 'support' | 'tickets' | 'ai' | 'admin_users' | 'system_settings' | 'audit_logs' | 'system_stats' | 'audit_stats' | 'roles' | 'groups' | 'tokens' | 'audit' | 'hr_documents' | 'hr_storage_stats' | 'database_info' | 'database_schema' | 'database_clear' | 'all';
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  reqId?: string;
}

// Mock-Benutzerdaten für Entwicklung - Demo-User entfernt
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@company.com',
    role: 'admin',
    permissions: [{ action: 'admin', resource: 'all' }]
  },
  {
    id: 'test-user-1',
    email: 'test.user@company.com',
    role: 'employee',
    department: 'IT',
    permissions: []
  },
  {
    id: 'normal-user-1',
    email: 'normal.user@company.com',
    role: 'employee',
    department: 'HR',
    permissions: []
  }
];

/**
 * Analysiert Token-Type für Debugging
 */
function analyzeTokenType(token: string): string {
  if (!token) return 'EMPTY';
  
  const { isValidJWTFormat } = require('../../auth/functions/jwtUtils');
  
  if (isValidJWTFormat(token)) {
    return 'JWT';
  }
  
  // Prüfe ob es Base64 sein könnte
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    if (decoded.includes('@') && decoded.includes('.')) {
      return 'BASE64_EMAIL';
    }
    return 'BASE64_OTHER';
  } catch {
    return 'UNKNOWN';
  }
}

/**
 * Authentifiziert einen Benutzer anhand verschiedener Token-Typen
 * Unterstützt: Base64-Token (Mock) und JWT-Token (Entra ID)
 */
export async function authenticateUser(token: string): Promise<User | null> {
  try {
    const tokenType = analyzeTokenType(token);

    // 1. Versuche JWT-Token Validierung (für Entra ID)
    const jwtResult = await validateJWTToken(token);
    if (jwtResult) {
      console.log(`🔓 JWT Token validiert für: ${jwtResult.email}`);
      return jwtResult;
    }

    // 2. Fallback: Base64-Token (für Admin/Test-User)
    if (tokenType === 'BASE64_EMAIL') {
      try {
        const email = Buffer.from(token, 'base64').toString('utf-8');
        const mockUser = mockUsers.find(user => user.email === email);
        if (mockUser) {
          console.log(`🔓 Base64 Token validiert für: ${mockUser.email}`);
          
          // Robuste Admin-Erkennung für Mock-User
          let permissions = mockUser.permissions;
          
          // Prüfe ob User Admin ist
          if (mockUser.email === 'admin@company.com' || mockUser.role === 'admin') {
            console.log(`👑 Admin erkannt: ${mockUser.email} - Vollzugriff gewährt`);
            permissions = [{ action: 'admin', resource: 'all' }];
          } else {
            // Für normale User: Versuche Permission-Bridge, aber mit Fallback
            try {
              const enhancedPermissions = await getEnhancedPermissionsForUser(
                mockUser.email, 
                mockUser.department || 'standard', 
                mockUser.role
              );
              permissions = enhancedPermissions;
            } catch (error) {
              console.warn(`⚠️ Permission-Bridge Fehler für ${mockUser.email}:`, error.message);
              console.log(`🔄 Fallback zu Role-based Permissions für ${mockUser.email}`);
              // Fallback: Basis-Permissions basierend auf Role
              permissions = mockUser.permissions;
            }
          }
          
          const user: User = {
            ...mockUser,
            permissions
          };
          
          return user;
        }
      } catch (base64Error) {
        console.warn('Base64-Dekodierung fehlgeschlagen:', base64Error.message);
      }
    }

    console.warn(`❌ Token-Authentifizierung fehlgeschlagen: Type=${tokenType}`);
    return null;
  } catch (error) {
    console.error('Token-Validierung fehlgeschlagen:', error);
    return null;
  }
}

/**
 * Prüft, ob ein JWT ein Entra ID Token ist (basierend auf Claims)
 */
function isEntraIDToken(decoded: any): boolean {
  // Entra ID spezifische Claims prüfen
  return !!(
    decoded.tid || // Tenant ID
    decoded.iss?.includes('login.microsoftonline.com') || // Issuer
    decoded.iss?.includes('sts.windows.net') || // Alternative Issuer
    decoded.aud?.includes('api://') || // API audience
    decoded.ver === '1.0' || decoded.ver === '2.0' || // Token version
    decoded.app_displayname || // App Display Name
    decoded.appid || // Application ID
    decoded.azp // Authorized party
  );
}

/**
 * JWT Token Validierung für verschiedene Token-Typen
 */
async function validateJWTToken(token: string): Promise<User | null> {
  try {
    // Erst dekodieren um den Token-Typ zu erkennen
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token) as any;
    
    if (!decoded) {
      return null;
    }

    // 1. Prüfe ob es ein Entra ID Token ist (höhere Priorität)
    if (isEntraIDToken(decoded)) {
      const entraJwtResult = await validateEntraJWT(token);
      if (entraJwtResult) {
        return entraJwtResult;
      }
    }

    // 2. Versuche lokale JWT-Token (mit unserem Secret)
    else if (decoded.issuer === 'companyai-auth' || decoded.iss === 'companyai-auth') {
      const localJwtResult = validateLocalJWT(token);
      if (localJwtResult) {
        return localJwtResult;
      }
    }

    // 3. Fallback: Versuche beide Validierungen
    else {
      
      // Erst Entra ID probieren
      const entraJwtResult = await validateEntraJWT(token);
      if (entraJwtResult) {
        return entraJwtResult;
      }

      // Dann lokale JWT probieren
      const localJwtResult = validateLocalJWT(token);
      if (localJwtResult) {
        return localJwtResult;
      }
    }

    return null;
  } catch (error) {
    // JWT Validierung fehlgeschlagen - das ist okay, versuche Base64
    console.warn('JWT Token-Typ-Erkennung fehlgeschlagen:', error.message);
    return null;
  }
}

/**
 * Lokale JWT-Token validieren (mit unserem JWT_SECRET)
 */
function validateLocalJWT(token: string): User | null {
  try {
    const { validateAuthToken } = require('../../auth/functions/jwtUtils');
    const jwtPayload = validateAuthToken(token);
    
    if (!jwtPayload || !jwtPayload.userId || !jwtPayload.email) {
      return null;
    }

    const user: User = {
      id: jwtPayload.userId,
      email: jwtPayload.email,
      role: mapJWTRoleToUserRole(jwtPayload.role),
      department: inferDepartmentFromEmail(jwtPayload.email),
      permissions: getUserPermissionsForRole(jwtPayload.role)
    };

    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Entra ID JWT-Token validieren (ohne Signatur-Prüfung für Demo)
 */
async function validateEntraJWT(token: string): Promise<User | null> {
  try {
    // Importiere JWT-Format-Prüfung
    const { isValidJWTFormat } = require('../../auth/functions/jwtUtils');
    
    // Erst prüfen, ob es überhaupt ein JWT-Format ist
    if (!isValidJWTFormat(token)) {
      return null;
    }

    // Für Demo: Dekodiere JWT ohne Signatur-Validierung
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token) as any;
    
    if (!decoded) {
      return null;
    }

    // Prüfe, ob es ein Entra ID Token ist
    if (!isEntraIDToken(decoded)) {
      return null; // Nicht unser Entra ID Token
    }

    // Prüfe ob User-Informationen vorhanden sind
    if (!decoded.sub && !decoded.oid) {
      console.warn('Entra JWT: Keine User-ID gefunden');
      return null;
    }

    // Extrahiere E-Mail aus verschiedenen Entra ID Feldern
    const email = decoded.email || decoded.unique_name || decoded.upn || decoded.preferred_username;
    
    if (!email) {
      console.warn('Entra JWT: Keine E-Mail gefunden');
      return null;
    }

    console.log(`🔓 Entra ID JWT dekodiert für: ${email} (tid: ${decoded.tid})`);
    console.log(`📋 Entra ID Claims: iss=${decoded.iss}, aud=${decoded.aud}, ver=${decoded.ver}`);

    const userId = decoded.sub || decoded.oid || 'entra-' + Math.random().toString(36);
    const role = inferRoleFromEntraUser(decoded);
    
    console.log(`👤 Entra User: ${userId} -> Rolle: ${role}`);

    // Lade Admin-Portal Permissions und konvertiere zu Core-Permissions
    const corePermissions = await getEnhancedPermissionsForUser(email, inferDepartmentFromEmail(email), role);

    const user: User = {
      id: userId,
      email: email,
      role: role,
      department: inferDepartmentFromEmail(email),
      permissions: corePermissions
    };

    return user;
  } catch (error) {
    // Nur bei echten Fehlern loggen, nicht bei Format-Problemen
    console.warn('Entra JWT-Dekodierung fehlgeschlagen:', error.message);
    return null;
  }
}

/**
 * Rolle aus Entra ID User-Claims ableiten
 */
function inferRoleFromEntraUser(claims: any): User['role'] {
  // Prüfe auf Admin-E-Mails
  const email = claims.email || claims.unique_name || claims.upn;
  if (email && email.includes('admin')) {
    return 'admin';
  }
  
  // Prüfe Rollen-Claims (falls vorhanden)
  if (claims.roles && Array.isArray(claims.roles)) {
    if (claims.roles.includes('GlobalAdmin') || claims.roles.includes('Admin')) {
      return 'admin';
    }
    if (claims.roles.includes('HR_Manager')) {
      return 'hr_manager';
    }
    if (claims.roles.includes('HR_Specialist')) {
      return 'hr_specialist';
    }
  }
  
  return 'employee'; // Standard-Rolle für Entra ID User
}

/**
 * Leite Department von E-Mail ab (fallback)
 */
function inferDepartmentFromEmail(email: string): string {
  if (email.includes('hr.')) return 'HR';
  if (email.includes('admin')) return 'IT';
  if (email.includes('support')) return 'Support';
  return 'standard';
}

/**
 * Mappe JWT-Rollen zu User-Rollen
 */
function mapJWTRoleToUserRole(jwtRole: string): User['role'] {
  switch (jwtRole) {
    case 'admin':
    case 'SUPER_ADMIN':
      return 'admin';
    case 'hr_manager':
      return 'hr_manager';
    case 'hr_specialist':
      return 'hr_specialist';
    default:
      return 'employee';
  }
}

/**
 * Berechne Permissions basierend auf Rolle
 */
function getUserPermissionsForRole(role: string): Permission[] {
  switch (role) {
    case 'admin':
    case 'SUPER_ADMIN':
      return [{ action: 'admin', resource: 'all' }];
    case 'hr_manager':
      return [
        { action: 'read', resource: 'employee_data' },
        { action: 'write', resource: 'employee_data' },
        { action: 'read', resource: 'reports' },
        { action: 'write', resource: 'reports' }
      ];
    case 'hr_specialist':
      return [
        { action: 'read', resource: 'employee_data' },
        { action: 'read', resource: 'onboarding' }
      ];
    default:
      return [{ action: 'read', resource: 'basic_access' }];
  }
}

/**
 * Bridge-Funktion: Konvertiert Admin-Portal Module-Permissions zu Core-Permissions
 */
async function getEnhancedPermissionsForUser(userEmail: string, userDepartment: string, userRole: string): Promise<Permission[]> {
  try {
    // Importiere Admin-Portal Permission-System
    const { calculateUserPermissions } = require('../../admin-portal/functions/permissions/departmentPermissions');
    
    console.log(`🔗 Permission-Bridge für ${userEmail}: Konvertiere Admin-Portal → Core-Permissions`);
    
    // Lade Admin-Portal Permissions
    const adminPermissionsResult = await calculateUserPermissions(userEmail, userDepartment, userRole);
    
    if (!adminPermissionsResult.success || !adminPermissionsResult.data) {
      console.warn(`⚠️ Admin-Portal Permissions nicht verfügbar für ${userEmail}, nutze Role-Fallback`);
      return getUserPermissionsForRole(userRole);
    }
    
    const modulePermissions = adminPermissionsResult.data.permissions;
    const corePermissions: Permission[] = [];
    
    // Admin-Status: Respektiere die spezifischen Admin-Portal Module-Permissions
    // Kein pauschaler Admin-Bypass mehr - nutze die konfigurierten Module-Permissions
    console.log(`👑 Admin-User detected: ${userEmail} - nutze spezifische Module-Permissions aus Admin-Portal`);
    
    // Konvertiere Module-Permissions zu Core-Permissions
    for (const modulePerm of modulePermissions) {
      const { moduleKey, accessLevel, hasAccess } = modulePerm;
      
      if (!hasAccess || accessLevel === 'none') {
        continue; // Kein Zugriff - überspringen
      }
      
      console.log(`🔄 Konvertiere: ${moduleKey}(${accessLevel}) → Core-Permissions`);
      
      // HR Module Mapping
      if (moduleKey === 'hr') {
        if (accessLevel === 'admin' || accessLevel === 'edit') {
          corePermissions.push(
            { action: 'read', resource: 'employee_data' },
            { action: 'write', resource: 'employee_data' },
            { action: 'read', resource: 'reports' },
            { action: 'write', resource: 'reports' },
            { action: 'read', resource: 'onboarding' },
            { action: 'write', resource: 'onboarding' },
            { action: 'read', resource: 'hr_documents' },
            { action: 'write', resource: 'hr_documents' }
          );
        } else if (accessLevel === 'read') {
          corePermissions.push(
            { action: 'read', resource: 'employee_data' },
            { action: 'read', resource: 'reports' },
            { action: 'read', resource: 'onboarding' },
            { action: 'read', resource: 'hr_documents' }
          );
        }
      }
      
      // Support Module Mapping
      if (moduleKey === 'support') {
        if (accessLevel === 'admin' || accessLevel === 'edit') {
          corePermissions.push(
            { action: 'read', resource: 'support' },
            { action: 'write', resource: 'support' },
            { action: 'read', resource: 'tickets' },
            { action: 'write', resource: 'tickets' }
          );
        } else if (accessLevel === 'read') {
          corePermissions.push(
            { action: 'read', resource: 'support' },
            { action: 'read', resource: 'tickets' }
          );
        }
      }
      
      // AI Module Mapping
      if (moduleKey === 'ai') {
        if (accessLevel === 'admin' || accessLevel === 'edit' || accessLevel === 'read') {
          corePermissions.push(
            { action: 'read', resource: 'ai' },
            { action: 'write', resource: 'ai' }
          );
        }
      }
      
      // Admin-Portal Module Mapping
      if (moduleKey === 'admin-portal') {
        if (accessLevel === 'admin') {
          corePermissions.push(
            { action: 'admin', resource: 'admin_users' },
            { action: 'admin', resource: 'system_settings' },
            { action: 'admin', resource: 'audit_logs' },
            { action: 'admin', resource: 'all' }
          );
        } else if (accessLevel === 'edit') {
          corePermissions.push(
            { action: 'read', resource: 'admin_users' },
            { action: 'write', resource: 'admin_users' },
            { action: 'read', resource: 'system_settings' }
          );
        } else if (accessLevel === 'read') {
          corePermissions.push(
            { action: 'read', resource: 'admin_users' },
            { action: 'read', resource: 'system_settings' }
          );
        }
      }
    }
    
    // Füge Admin-Portal spezifische Permissions hinzu wenn User Admin-Portal Zugriff hat
    const adminPortalModule = modulePermissions.find(m => m.moduleKey === 'admin-portal');
    if (adminPortalModule && adminPortalModule.hasAccess && adminPortalModule.accessLevel !== 'none') {
      console.log(`🔑 User ${userEmail} hat Admin-Portal Zugriff (${adminPortalModule.accessLevel})`);
      
      if (adminPortalModule.accessLevel === 'admin') {
        corePermissions.push(
          { action: 'admin', resource: 'admin_users' },
          { action: 'admin', resource: 'system_settings' },
          { action: 'admin', resource: 'audit_logs' },
          { action: 'read', resource: 'database_info' },
          { action: 'admin', resource: 'database_schema' }
        );
      } else if (adminPortalModule.accessLevel === 'edit') {
        corePermissions.push(
          { action: 'read', resource: 'admin_users' },
          { action: 'write', resource: 'admin_users' },
          { action: 'read', resource: 'system_settings' }
        );
      } else if (adminPortalModule.accessLevel === 'read') {
        corePermissions.push(
          { action: 'read', resource: 'admin_users' },
          { action: 'read', resource: 'system_settings' }
        );
      }
    }
    
    console.log(`✅ Permission-Bridge für ${userEmail}: ${corePermissions.length} Core-Permissions generiert`);
    console.log(`📋 Core-Permissions:`, corePermissions.map(p => `${p.action}:${p.resource}`).join(', '));
    console.log(`📱 Module-Sichtbarkeit:`, modulePermissions.filter(m => m.hasAccess).map(m => `${m.moduleKey}(${m.accessLevel})`).join(', '));
    
    return corePermissions.length > 0 ? corePermissions : [{ action: 'read', resource: 'basic_access' }];
    
  } catch (error) {
    console.error(`❌ Permission-Bridge Fehler für ${userEmail}:`, error);
    console.log(`🔄 Fallback zu Role-based Permissions für ${userEmail}`);
    return getUserPermissionsForRole(userRole);
  }
}

/**
 * Überprüft, ob ein Benutzer eine bestimmte Berechtigung hat
 */
export function hasPermission(
  user: User, 
  action: Permission['action'], 
  resource: Permission['resource']
): boolean {
  // Admin hat immer alle Berechtigungen
  if (user.permissions.some(p => p.action === 'admin' && p.resource === 'all')) {
    return true;
  }

  // Prüfe spezifische Berechtigung
  return user.permissions.some(p => 
    p.action === action && (p.resource === resource || p.resource === 'all')
  );
}

/**
 * Middleware für Authentifizierung
 */
export async function requireAuth(req: AuthenticatedRequest, res: any, next: any) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'AuthenticationRequired',
      message: 'Bitte geben Sie einen gültigen Authorization Header an'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const user = await authenticateUser(token);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'InvalidToken',
      message: 'Ungültiger oder abgelaufener Token'
    });
  }

  req.user = user;
  next();
}

/**
 * Middleware für Autorisierung mit spezifischen Berechtigungen
 */
export function requirePermission(
  action: Permission['action'], 
  resource: Permission['resource']
) {
  return (req: AuthenticatedRequest, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'AuthenticationRequired',
        message: 'Authentifizierung erforderlich'
      });
    }

    // 🚨 TEMPORARY: Allow all authenticated users during migration to Enhanced Permission System
    console.log(`⚠️ DEPRECATED HR-Permission-Check: ${action} auf ${resource} für ${req.user.email} - ERLAUBT (Migration-Modus)`);

    next();
  };
}

/**
 * Hilfsfunktion zum Generieren von Mock-Tokens für Tests
 */
export function generateMockToken(email: string): string {
  return Buffer.from(email).toString('base64');
}

/**
 * Logging-Funktion für Authentifizierungs-Ereignisse
 */
export function logAuthEvent(
  userId: string, 
  action: string, 
  resource?: string, 
  reqId?: string,
  success: boolean = true
) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] User ${userId}: ${action}${resource ? ` on ${resource}` : ''}${reqId ? ` (reqId: ${reqId})` : ''} - ${success ? 'SUCCESS' : 'FAILED'}`;
  
  console.log(logMessage);
  
  // In der Produktion würde hier ein richtiges Logging-System verwendet
  // z.B. Winston, oder Logs an externe Services gesendet
}
