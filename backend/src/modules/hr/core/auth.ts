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
  resource: 'employee_data' | 'reports' | 'onboarding' | 'all';
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Mock-Benutzerdaten für Entwicklung
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@company.com',
    role: 'admin',
    permissions: [{ action: 'admin', resource: 'all' }]
  },
  {
    id: '2', 
    email: 'hr.manager@company.com',
    role: 'hr_manager',
    department: 'HR',
    permissions: [
      { action: 'read', resource: 'employee_data' },
      { action: 'write', resource: 'employee_data' },
      { action: 'read', resource: 'reports' },
      { action: 'write', resource: 'reports' },
      { action: 'read', resource: 'onboarding' },
      { action: 'write', resource: 'onboarding' }
    ]
  },
  {
    id: '3',
    email: 'hr.specialist@company.com', 
    role: 'hr_specialist',
    department: 'HR',
    permissions: [
      { action: 'read', resource: 'employee_data' },
      { action: 'read', resource: 'onboarding' },
      { action: 'write', resource: 'onboarding' }
    ]
  }
];

/**
 * Authentifiziert einen Benutzer anhand eines Mock-Tokens
 * In der Produktion würde hier JWT-Validierung stattfinden
 */
export function authenticateUser(token: string): User | null {
  try {
    // Mock-Implementierung: Token ist Base64-kodierte Email
    const email = Buffer.from(token, 'base64').toString('utf-8');
    return mockUsers.find(user => user.email === email) || null;
  } catch (error) {
    return null;
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
export function requireAuth(req: AuthenticatedRequest, res: any, next: any) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Bitte geben Sie einen gültigen Authorization Header an'
    });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const user = authenticateUser(token);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
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
        error: 'Authentication required',
        message: 'Authentifizierung erforderlich'
      });
    }

    if (!hasPermission(req.user, action, resource)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        message: `Keine Berechtigung für ${action} auf ${resource}`
      });
    }

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
  success: boolean = true
) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] User ${userId}: ${action}${resource ? ` on ${resource}` : ''} - ${success ? 'SUCCESS' : 'FAILED'}`;
  
  console.log(logMessage);
  
  // In der Produktion würde hier ein richtiges Logging-System verwendet
  // z.B. Winston, oder Logs an externe Services gesendet
}
