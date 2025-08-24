import { AuthUser, AdminTokenRequest, APIResponse } from '../types';

// Admin Token Mapping (beibehalten vom ursprünglichen System)
const ADMIN_TOKENS = {
  'YWRtaW5AY29tcGFueS5jb20=': {
    id: 'admin-001',
    name: 'Administrator',
    email: 'admin@company.com',
    role: 'admin' as const,
    provider: 'admin' as const
  },
  'aHIubWFuYWdlckBjb21wYW55LmNvbQ==': {
    id: 'hr-manager-001',
    name: 'HR Manager',
    email: 'hr.manager@company.com',
    role: 'hr_manager' as const,
    provider: 'admin' as const
  },
  'aHIuc3BlY2lhbGlzdEBjb21wYW55LmNvbQ==': {
    id: 'hr-specialist-001',
    name: 'HR Specialist',
    email: 'hr.specialist@company.com',
    role: 'hr_specialist' as const,
    provider: 'admin' as const
  }
};

/**
 * Admin Token Authentication
 * Validiert Base64-codierte Administrator-Tokens
 */
export async function authenticateAdminToken(
  request: AdminTokenRequest
): Promise<APIResponse<AuthUser>> {
  try {
    const { token } = request;

    if (!token || token.trim() === '') {
      return {
        success: false,
        error: 'MissingToken',
        message: 'Administrator-Token ist erforderlich'
      };
    }

    // Token gegen bekannte Admin-Tokens prüfen
    const adminUser = ADMIN_TOKENS[token as keyof typeof ADMIN_TOKENS];

    if (!adminUser) {
      return {
        success: false,
        error: 'InvalidToken',
        message: 'Ungültiger Administrator-Token'
      };
    }

    // Erfolgreiche Authentifizierung
    return {
      success: true,
      data: adminUser,
      message: 'Administrator-Token validiert'
    };

  } catch (error) {
    console.error('Admin Token Auth Fehler:', error);
    return {
      success: false,
      error: 'AuthenticationError',
      message: 'Fehler bei der Token-Validierung'
    };
  }
}

/**
 * Admin Token zu User-Info
 * Hilfsfunktion für schnelle Token-Lookups
 */
export function getAdminUserByToken(token: string): AuthUser | null {
  return ADMIN_TOKENS[token as keyof typeof ADMIN_TOKENS] || null;
}

/**
 * Verfügbare Admin-Tokens auflisten (für Tests/Demo)
 */
export function getAvailableAdminTokens() {
  return Object.entries(ADMIN_TOKENS).map(([token, user]) => ({
    token,
    user: {
      name: user.name,
      role: user.role,
      email: user.email
    }
  }));
}
