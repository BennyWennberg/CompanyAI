import jwt from 'jsonwebtoken';
import { AuthUser, JWTPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

/**
 * JWT Token generieren
 */
export function generateAuthToken(user: AuthUser): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    provider: user.provider,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 Stunden
  };

  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRY,
    issuer: 'companyai-auth',
    audience: 'companyai-app'
  });
}

/**
 * Prüft, ob ein String ein gültiges JWT-Format hat
 */
export function isValidJWTFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // JWT hat drei Teile getrennt durch Punkte
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  // Jeder Teil sollte Base64-kodiert sein (kann Padding haben oder nicht)
  const base64Regex = /^[A-Za-z0-9_-]+={0,2}$/;
  return parts.every(part => part.length > 0 && base64Regex.test(part));
}

/**
 * JWT Token validieren und dekodieren
 */
export function validateAuthToken(token: string): JWTPayload | null {
  try {
    // Erst prüfen, ob es überhaupt ein JWT-Format ist
    if (!isValidJWTFormat(token)) {
      // Stille Rückgabe - das ist kein JWT, aber kein Fehler
      return null;
    }

    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'companyai-auth',
      audience: 'companyai-app'
    }) as JWTPayload;

    console.log(`✅ JWT Token erfolgreich validiert für User: ${decoded.userId}`);
    return decoded;
  } catch (error) {
    // Nur loggen wenn es sich um einen JWT handelt, aber die Validierung fehlschlägt
    if (isValidJWTFormat(token)) {
      console.error('JWT Validation Fehler für gültiges JWT-Format:', error.message);
    }
    return null;
  }
}

/**
 * Token aus Authorization Header extrahieren
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // "Bearer token" Format prüfen
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Legacy Admin Token prüfen (für Backward-Compatibility)
 */
export function isLegacyAdminToken(token: string): boolean {
  const legacyTokens = [
    'YWRtaW5AY29tcGFueS5jb20=',
    'aHIubWFuYWdlckBjb21wYW55LmNvbQ==',
    'aHIuc3BlY2lhbGlzdEBjb21wYW55LmNvbQ=='
  ];

  return legacyTokens.includes(token);
}

/**
 * Token-Info für Debugging
 */
export function getTokenInfo(token: string): any {
  try {
    // Dekodieren ohne Verifikation (nur für Info)
    const decoded = jwt.decode(token, { complete: true });
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Token-Expiry prüfen
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    if (!decoded || !decoded.exp) {
      return true;
    }

    return decoded.exp < Math.floor(Date.now() / 1000);
  } catch (error) {
    return true;
  }
}

/**
 * Refresh Token generieren (für zukünftige Verwendung)
 */
export function generateRefreshToken(user: AuthUser): string {
  const payload = {
    userId: user.id,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  };

  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '7d', // Refresh Token läuft länger
    issuer: 'companyai-auth',
    audience: 'companyai-refresh'
  });
}
