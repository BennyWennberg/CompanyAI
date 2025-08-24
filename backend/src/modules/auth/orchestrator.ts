import { Request, Response } from 'express';
import { 
  AdminTokenRequest, 
  ManualLoginRequest, 
  EntraLoginRequest, 
  LdapLoginRequest,
  LoginResponse,
  APIResponse
} from './types';

// Import Auth Provider Functions
import { authenticateAdminToken, getAvailableAdminTokens } from './functions/adminAuth';
import { authenticateManualUser } from './functions/manualAuth';
import { authenticateEntraUser, handleEntraCallback } from './functions/entraAuth';
import { authenticateLdapUser, getLdapConfig } from './functions/ldapAuth';
import { generateAuthToken } from './functions/jwtUtils';

export class AuthOrchestrator {
  /**
   * Admin Token Login
   * POST /api/auth/admin-token
   */
  static async handleAdminTokenLogin(req: Request, res: Response) {
    try {
      const request: AdminTokenRequest = req.body;
      
      const result = await authenticateAdminToken(request);
      
      if (result.success && result.data) {
        // JWT Token generieren
        const jwtToken = generateAuthToken(result.data);
        
        const response: LoginResponse = {
          success: true,
          token: jwtToken,
          user: result.data,
          message: result.message
        };
        
        res.json(response);
      } else {
        res.status(401).json({
          success: false,
          error: result.error,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Admin Token Login Fehler:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Unerwarteter Fehler bei der Admin-Authentifizierung'
      });
    }
  }

  /**
   * Manual User Login
   * POST /api/auth/manual-login
   */
  static async handleManualLogin(req: Request, res: Response) {
    try {
      const request: ManualLoginRequest = req.body;
      
      const result = await authenticateManualUser(request);
      
      if (result.success && result.data) {
        // JWT Token generieren
        const jwtToken = generateAuthToken(result.data);
        
        const response: LoginResponse = {
          success: true,
          token: jwtToken,
          user: result.data,
          message: result.message
        };
        
        res.json(response);
      } else {
        res.status(401).json({
          success: false,
          error: result.error,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Manual Login Fehler:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Unerwarteter Fehler bei der Benutzer-Authentifizierung'
      });
    }
  }

  /**
   * Entra AD OAuth Login
   * POST /api/auth/entra-login
   */
  static async handleEntraLogin(req: Request, res: Response) {
    try {
      const request: EntraLoginRequest = req.body;
      
      const result = await authenticateEntraUser(request);
      
      if (result.success && result.data) {
        // OAuth Redirect oder fertiger User
        if ('redirectUrl' in result.data) {
          res.json({
            success: true,
            redirectUrl: result.data.redirectUrl,
            message: result.message
          });
        } else {
          // Direkter User (falls OAuth bereits abgeschlossen)
          const jwtToken = generateAuthToken(result.data);
          
          const response: LoginResponse = {
            success: true,
            token: jwtToken,
            user: result.data,
            message: result.message
          };
          
          res.json(response);
        }
      } else {
        res.status(503).json({
          success: false,
          error: result.error,
          message: result.message || 'Entra AD nicht verfügbar'
        });
      }
    } catch (error) {
      console.error('Entra Login Fehler:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Unerwarteter Fehler bei der Entra AD-Authentifizierung'
      });
    }
  }

  /**
   * LDAP Login
   * POST /api/auth/ldap-login
   */
  static async handleLdapLogin(req: Request, res: Response) {
    try {
      const request: LdapLoginRequest = req.body;
      
      const result = await authenticateLdapUser(request);
      
      if (result.success && result.data) {
        // JWT Token generieren
        const jwtToken = generateAuthToken(result.data);
        
        const response: LoginResponse = {
          success: true,
          token: jwtToken,
          user: result.data,
          message: result.message
        };
        
        res.json(response);
      } else {
        res.status(401).json({
          success: false,
          error: result.error,
          message: result.message
        });
      }
    } catch (error) {
      console.error('LDAP Login Fehler:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Unerwarteter Fehler bei der LDAP-Authentifizierung'
      });
    }
  }

  /**
   * Entra AD OAuth Callback
   * GET /api/auth/entra/callback
   */
  static async handleEntraCallback(req: Request, res: Response) {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'MissingAuthCode',
          message: 'OAuth Authorization Code fehlt'
        });
      }

      const result = await handleEntraCallback(code as string, state as string);
      
      if (result.success && result.data) {
        // JWT Token generieren
        const jwtToken = generateAuthToken(result.data);
        
        // Redirect zum Frontend mit Token
        const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/success?token=${jwtToken}`;
        res.redirect(redirectUrl);
      } else {
        const errorUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=${result.error}`;
        res.redirect(errorUrl);
      }
    } catch (error) {
      console.error('Entra Callback Fehler:', error);
      const errorUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=callback_failed`;
      res.redirect(errorUrl);
    }
  }

  /**
   * Auth Provider Status
   * GET /api/auth/providers
   */
  static async handleGetProviders(req: Request, res: Response) {
    try {
      const providers = [
        {
          id: 'admin',
          name: 'Administrator Token',
          description: 'System-Administrator Token',
          enabled: true,
          status: 'active'
        },
        {
          id: 'manual',
          name: 'Benutzername/Passwort',
          description: 'Lokale CompanyAI-Benutzer',
          enabled: true,
          status: 'development' // TODO: Auf 'active' ändern wenn implementiert
        },
        {
          id: 'entra',
          name: 'Microsoft Entra AD',
          description: 'Firmen-Microsoft-Konto',
          enabled: process.env.ENTRA_ENABLED === 'true',
          status: 'development'
        },
        {
          id: 'ldap',
          name: 'LDAP Active Directory',
          description: 'Domain Controller',
          enabled: process.env.LDAP_ENABLED === 'true',
          status: 'development'
        }
      ];

      res.json({
        success: true,
        data: providers,
        message: 'Verfügbare Auth-Provider'
      });
    } catch (error) {
      console.error('Get Providers Fehler:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Fehler beim Laden der Auth-Provider'
      });
    }
  }

  /**
   * Demo/Test-Tokens (nur Development)
   */
  static async handleGetTestTokens(req: Request, res: Response) {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: 'NotAllowed',
          message: 'Test-Tokens sind nur in Development verfügbar'
        });
      }

      const adminTokens = getAvailableAdminTokens();
      
      res.json({
        success: true,
        data: {
          adminTokens,
          info: 'Diese Tokens sind nur für Tests/Demo gedacht'
        },
        message: 'Test-Tokens geladen'
      });
    } catch (error) {
      console.error('Get Test Tokens Fehler:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Fehler beim Laden der Test-Tokens'
      });
    }
  }
}

/**
 * Auth Routes registrieren
 */
export function registerAuthRoutes(router: any) {
  // Auth Provider Endpunkte
  router.post('/auth/admin-token', AuthOrchestrator.handleAdminTokenLogin);
  router.post('/auth/manual-login', AuthOrchestrator.handleManualLogin);
  router.post('/auth/entra-login', AuthOrchestrator.handleEntraLogin);
  router.post('/auth/ldap-login', AuthOrchestrator.handleLdapLogin);
  
  // OAuth Callback (ohne Auth-Middleware)
  router.get('/auth/entra/callback', AuthOrchestrator.handleEntraCallback);
  
  // Info Endpunkte
  router.get('/auth/providers', AuthOrchestrator.handleGetProviders);
  router.get('/auth/test-tokens', AuthOrchestrator.handleGetTestTokens);
}
