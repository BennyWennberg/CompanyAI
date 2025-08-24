import bcrypt from 'bcrypt';
import { AuthUser, ManualLoginRequest, APIResponse } from '../types';
import { getCombinedUsers } from '../../../datasources';

/**
 * Manual Username/Password Authentication
 * Authentifiziert gegen lokale CompanyAI-Benutzer aus Manual DataSource
 */
export async function authenticateManualUser(
  request: ManualLoginRequest
): Promise<APIResponse<AuthUser>> {
  try {
    const { username, password } = request;

    if (!username || !password) {
      return {
        success: false,
        error: 'MissingCredentials',
        message: 'Benutzername und Passwort sind erforderlich'
      };
    }

    // Benutzer aus Combined DataSource laden (bevorzugt Manual)
    const combinedUsers = await getCombinedUsers();
    
    // Suche nach Benutzer (username oder email)
    const user = combinedUsers.find(u => 
      u.userPrincipalName?.toLowerCase() === username.toLowerCase() ||
      u.mail?.toLowerCase() === username.toLowerCase() ||
      u.displayName?.toLowerCase() === username.toLowerCase()
    );

    if (!user) {
      return {
        success: false,
        error: 'UserNotFound',
        message: 'Benutzer nicht gefunden'
      };
    }

    // Nur Manual-Source-Benutzer können sich mit Passwort anmelden
    if (user.source !== 'manual') {
      return {
        success: false,
        error: 'InvalidAuthProvider',
        message: 'Dieser Benutzer kann sich nicht mit Benutzername/Passwort anmelden. Nutzen Sie Entra AD oder LDAP.'
      };
    }

    // Password-Hash prüfen (falls gesetzt)
    // TODO: In Manual DataSource sollten wir ein passwordHash-Feld hinzufügen
    const storedPasswordHash = (user as any).passwordHash;
    
    if (!storedPasswordHash) {
      return {
        success: false,
        error: 'NoPasswordSet',
        message: 'Für diesen Benutzer ist kein Passwort hinterlegt'
      };
    }

    // Passwort validieren
    const isValidPassword = await bcrypt.compare(password, storedPasswordHash);
    
    if (!isValidPassword) {
      return {
        success: false,
        error: 'InvalidPassword',
        message: 'Ungültiges Passwort'
      };
    }

    // Benutzer ist nicht aktiv
    if (!user.accountEnabled) {
      return {
        success: false,
        error: 'AccountDisabled',
        message: 'Benutzerkonto ist deaktiviert'
      };
    }

    // Role-Mapping basierend auf Department/Position
    const role = mapUserToRole(user);

    // AuthUser-Objekt erstellen
    const authUser: AuthUser = {
      id: user.id,
      name: user.displayName,
      email: user.mail || user.userPrincipalName || '',
      role,
      provider: 'manual',
      department: user.department,
      position: user.jobTitle
    };

    // Last-Login-Zeit aktualisieren (optional)
    // TODO: Manual DataSource mit lastLogin erweitern

    return {
      success: true,
      data: authUser,
      message: 'Anmeldung erfolgreich'
    };

  } catch (error) {
    console.error('Manual Auth Fehler:', error);
    return {
      success: false,
      error: 'AuthenticationError',
      message: 'Fehler bei der Benutzer-Authentifizierung'
    };
  }
}

/**
 * Role-Mapping für Manual-User
 * Basiert auf Department, Position oder anderen Faktoren
 */
function mapUserToRole(user: any): 'admin' | 'hr_manager' | 'hr_specialist' | 'user' {
  const department = user.department?.toLowerCase() || '';
  const position = user.jobTitle?.toLowerCase() || '';
  
  // Admin-Erkennung
  if (position.includes('admin') || position.includes('administrator')) {
    return 'admin';
  }
  
  // HR-Manager-Erkennung
  if (department.includes('hr') || department.includes('human resource')) {
    if (position.includes('manager') || position.includes('lead') || position.includes('direktor')) {
      return 'hr_manager';
    }
    // HR-Specialist
    return 'hr_specialist';
  }
  
  // Standard-Benutzer
  return 'user';
}

/**
 * Passwort-Hash erstellen (für Benutzer-Erstellung)
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Test-Manual-User erstellen (für Demo/Development)
 */
export function createTestManualUsers() {
  return [
    {
      id: 'manual-001',
      username: 'max.mustermann',
      email: 'max.mustermann@company.com',
      displayName: 'Max Mustermann',
      department: 'HR',
      jobTitle: 'HR Specialist',
      // Password: "password123" -> gehashed
      passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqyPuHapxHvNiQa.B.k2Wti'
    },
    {
      id: 'manual-002', 
      username: 'anna.admin',
      email: 'anna.admin@company.com',
      displayName: 'Anna Administrator',
      department: 'IT',
      jobTitle: 'System Administrator',
      // Password: "admin123" -> gehashed
      passwordHash: '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
    }
  ];
}
