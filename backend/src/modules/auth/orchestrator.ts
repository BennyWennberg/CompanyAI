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
   * Entra AD OAuth Callback (Redirect)
   * GET /api/auth/entra/callback
   */
  static async handleEntraCallback(req: Request, res: Response) {
    try {
      const { code, state } = req.query;
      
      if (!code) {
        const errorUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=missing_code`;
        return res.redirect(errorUrl);
      }

      // Redirect zu Frontend Callback-Handler mit Code
      const callbackUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/callback/entra?code=${encodeURIComponent(code as string)}&state=${encodeURIComponent(state as string || '')}`;
      res.redirect(callbackUrl);
      
    } catch (error) {
      console.error('Entra Callback Redirect Fehler:', error);
      const errorUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=callback_failed`;
      res.redirect(errorUrl);
    }
  }

  /**
   * Entra AD OAuth Callback (JSON API)
   * POST /api/auth/entra-callback
   */
  static async handleEntraCallbackJson(req: Request, res: Response) {
    try {
      const { code, state } = req.body;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'MissingAuthCode',
          message: 'OAuth Authorization Code fehlt'
        });
      }

      const result = await handleEntraCallback(code as string, state as string);
      
      if (result.success && result.data && result.token) {
        return res.json({
          success: true,
          token: result.token,
          user: result.data,
          message: result.message
        });
      } else {
        return res.status(401).json({
          success: false,
          error: result.error,
          message: result.message
        });
      }
    } catch (error) {
      console.error('Entra Callback JSON Fehler:', error);
      return res.status(500).json({
        success: false,
        error: 'CallbackProcessingError',
        message: 'Fehler bei der Callback-Verarbeitung'
      });
    }
  }

  /**
   * Entra ID Konfiguration testen
   * GET /api/auth/test-entra-config
   */
  static async handleTestEntraConfig(req: Request, res: Response) {
    try {
      const { getEntraConfig } = require('./functions/entraAuth');
      const config = getEntraConfig();
      
      // Test-Response mit Konfigurationsstatus (ohne Secrets)
      res.json({
        success: true,
        config: {
          enabled: config.enabled,
          hasClientId: !!config.clientId,
          hasClientSecret: !!config.clientSecret,  
          hasTenantId: !!config.tenantId,
          redirectUri: config.redirectUri,
          scope: config.scope
        },
        message: config.enabled 
          ? 'Entra ID ist aktiviert' 
          : 'Entra ID ist deaktiviert (ENTRA_SYNC_ENABLED != true)'
      });
    } catch (error) {
      console.error('Entra Config Test Fehler:', error);
      res.status(500).json({
        success: false,
        error: 'ConfigTestError',
        message: 'Fehler beim Testen der Entra ID Konfiguration'
      });
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
  /**
   * Provider-Übersicht
   * GET /api/auth/providers
   */
  static async handleGetProviders(req: Request, res: Response) {
    try {
      const providers = [
        {
          id: 'admin',
          name: 'Administrator',
          description: 'Direct admin access with token',
          enabled: true,
          icon: '🔑'
        },
        {
          id: 'manual', 
          name: 'Username/Password',
          description: 'Local user database',
          enabled: true,
          icon: '👤'
        },
        {
          id: 'entra',
          name: 'Microsoft Entra ID',
          description: 'Corporate Microsoft accounts',
          enabled: process.env.ENTRA_SYNC_ENABLED === 'true',
          icon: '🏢'
        },
        {
          id: 'ldap',
          name: 'Active Directory',
          description: 'LDAP domain authentication', 
          enabled: process.env.LDAP_ENABLED === 'true',
          icon: '🖥️'
        }
      ];

      res.json({
        success: true,
        data: providers,
        message: 'Authentication providers loaded'
      });
    } catch (error) {
      console.error('Provider list error:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Error loading authentication providers'
      });
    }
  }
}

/**
 * Registriert alle Auth-Routes
 */
export function registerAuthRoutes(router: any) {
  // Provider-spezifische Login Endpoints
  router.post('/auth/admin-token', AuthOrchestrator.handleAdminTokenLogin);
  router.post('/auth/manual-login', AuthOrchestrator.handleManualLogin);
  router.post('/auth/entra-login', AuthOrchestrator.handleEntraLogin);
  router.post('/auth/ldap-login', AuthOrchestrator.handleLdapLogin);
  
  // Entra ID OAuth Callbacks
  router.get('/auth/entra/callback', AuthOrchestrator.handleEntraCallback);  // Microsoft redirect
  router.post('/auth/entra-callback', AuthOrchestrator.handleEntraCallbackJson);  // Frontend API call
  
  // Provider-Übersicht und Test-Endpoints  
  router.get('/auth/providers', AuthOrchestrator.handleGetProviders);
  router.get('/auth/test-tokens', AuthOrchestrator.handleGetTestTokens);
  router.get('/auth/test-entra-config', AuthOrchestrator.handleTestEntraConfig);
}
