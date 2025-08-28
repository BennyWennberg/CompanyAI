import { AuthUser, AdminTokenRequest, APIResponse } from '../types';

// Admin Token Mapping - Demo-Tokens entfernt
const ADMIN_TOKENS: {[key: string]: any} = {
  // Admin-Tokens werden über echte Authentifizierung verwaltet
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
