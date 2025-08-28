import { AuthUser, EntraLoginRequest, APIResponse } from '../types';

/**
 * Entra AD (Microsoft) OAuth Authentication
 * TODO: Vollständige Microsoft OAuth2 Integration implementieren
 */
export async function authenticateEntraUser(
  request: EntraLoginRequest
): Promise<APIResponse<{ redirectUrl: string } | AuthUser>> {
  try {
    // Lade Entra ID Konfiguration aus Environment-Variablen
    const config = getEntraConfig();
    
    if (!config.enabled || !config.clientId || !config.tenantId) {
      return {
        success: false,
        error: 'EntraConfigError',
        message: 'Entra ID ist nicht konfiguriert oder deaktiviert'
      };
    }

    console.log('🔐 Entra AD Auth - Weiterleitung zu Microsoft');
    console.log('Request:', request);
    console.log('Config:', { clientId: config.clientId, tenantId: config.tenantId });

    // Erstelle OAuth Redirect URL mit echten Werten
    const redirectUrl = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/authorize?` +
      `client_id=${config.clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
      `scope=${encodeURIComponent(config.scope.join(' '))}&` +
      `state=${Math.random().toString(36).substring(2, 15)}`;

    return {
      success: true,
      data: { redirectUrl },
      message: 'Weiterleitung zu Microsoft OAuth'
    };

  } catch (error) {
    console.error('Entra AD Auth Fehler:', error);
    return {
      success: false,
      error: 'EntraAuthError',
      message: 'Entra AD Authentifizierung nicht verfügbar'
    };
  }
}

/**
 * Entra AD OAuth Callback Handler
 * Verarbeitet den Rückruf von Microsoft OAuth
 */
export async function handleEntraCallback(
  code: string,
  state: string
): Promise<APIResponse<AuthUser>> {
  try {
    const config = getEntraConfig();
    
    if (!config.enabled || !config.clientId || !config.clientSecret || !config.tenantId) {
      return {
        success: false,
        error: 'EntraConfigError',
        message: 'Entra ID ist nicht konfiguriert'
      };
    }

    console.log('🔐 Entra AD Callback - Processing authorization code');
    console.log('Authorization Code:', code?.substring(0, 10) + '...');
    console.log('State:', state);
    console.log('🔧 Using Entra Config:', {
      tenantId: config.tenantId ? config.tenantId.substring(0, 8) + '...' : 'MISSING',
      clientId: config.clientId ? config.clientId.substring(0, 8) + '...' : 'MISSING',
      redirectUri: config.redirectUri
    });

    // 1. Authorization Code gegen Access Token tauschen
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error('❌ Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: tokenError
      });
      return {
        success: false,
        error: 'TokenExchangeError',
        message: `Token-Austausch fehlgeschlagen: ${tokenResponse.status} - ${tokenError.substring(0, 200)}`
      };
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Microsoft Graph API User-Profil abrufen
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!userResponse.ok) {
      const userError = await userResponse.text();
      console.error('User profile fetch failed:', userError);
      return {
        success: false,
        error: 'UserProfileError',
        message: 'Fehler beim Abrufen des Benutzerprofils'
      };
    }

    const userData = await userResponse.json();
    console.log('✅ Microsoft user profile:', { 
      id: userData.id, 
      email: userData.mail || userData.userPrincipalName,
      name: userData.displayName 
    });

    // 3. User-Objekt erstellen
    const authUser: AuthUser = {
      id: userData.id,
      email: userData.mail || userData.userPrincipalName,
      name: userData.displayName,
      role: 'user', // Default-Rolle, kann später erweitert werden
      provider: 'entra',
      department: userData.department || '',
      position: userData.jobTitle || ''
    };

    // 4. JWT Token generieren (speziell für Entra User)
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        userId: authUser.id, 
        email: authUser.email, 
        role: authUser.role,
        provider: 'entra',
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.JWT_SECRET || 'default-secret',
      { 
        expiresIn: '24h',
        issuer: 'companyai-auth',
        audience: 'companyai-app'
      }
    );

    console.log('✅ Entra AD authentication successful for:', authUser.email);

    return {
      success: true,
      data: authUser,
      token,
      message: 'Entra AD Anmeldung erfolgreich'
    };

  } catch (error) {
    console.error('Entra AD Callback Fehler:', error);
    return {
      success: false,
      error: 'EntraCallbackError', 
      message: 'Fehler beim Verarbeiten der Microsoft-Anmeldung'
    };
  }
}

/**
 * Entra AD Konfiguration laden
 */
export function getEntraConfig() {
  const config = {
    enabled: process.env.ENTRA_SYNC_ENABLED === 'true', // Verwende die korrekte ENV-Variable
    tenantId: process.env.AZURE_TENANT_ID || '', // Verwende die korrekte ENV-Variable
    clientId: process.env.AZURE_CLIENT_ID || '', // Verwende die korrekte ENV-Variable
    clientSecret: process.env.AZURE_CLIENT_SECRET || '', // Verwende die korrekte ENV-Variable
    redirectUri: process.env.AZURE_REDIRECT_URI || 'http://localhost:5000/api/auth/entra/callback',
    scope: ['openid', 'profile', 'email', 'User.Read']
  };

  // Debug-Ausgabe der Konfiguration (ohne Secrets vollständig zu loggen)
  console.log('🔧 Entra Config:', {
    enabled: config.enabled,
    tenantId: config.tenantId ? config.tenantId.substring(0, 8) + '...' : 'MISSING',
    clientId: config.clientId ? config.clientId.substring(0, 8) + '...' : 'MISSING',
    clientSecret: config.clientSecret ? '***GESETZT***' : 'MISSING',
    redirectUri: config.redirectUri
  });

  return config;
}

/**
 * Microsoft Graph API User-Info abrufen
 * TODO: Implementieren
 */
export async function getMicrosoftUserProfile(accessToken: string) {
  // TODO: Microsoft Graph API Call
  // GET https://graph.microsoft.com/v1.0/me
  
  console.log('🚧 Microsoft Graph - In Entwicklung');
  console.log('Access Token:', accessToken ? 'Vorhanden' : 'Fehlend');
  
  return null;
}
