// Zentrale Authentication-Service für CompanyAI
// GETRENNT von User-Management - nur für Login/Tokens/Permissions

import { User, Permission, UserRole } from '../types/user';
import { UserService } from './user.service';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  token: string;
  expiresAt: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
  provider?: 'manual' | 'azure-ad' | 'ldap';
}

export interface AuthToken {
  userId: string;
  email: string;
  role: UserRole;
  issuedAt: string;
  expiresAt: string;
}

export class AuthService {
  private static instance: AuthService;
  private userService: UserService;
  
  private constructor() {
    this.userService = UserService.getInstance();
  }
  
  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
  
  /**
   * Authenticate user and return token (Mock-Implementation)
   */
  public async login(credentials: LoginRequest): Promise<{ success: boolean; user?: AuthenticatedUser; error?: string }> {
    try {
      // In production: Validate credentials against external providers or password hash
      // For now: Mock authentication based on email
      
      const userResponse = await this.userService.getUsers({ search: credentials.email, limit: 1 });
      if (!userResponse.success || !userResponse.data?.users.length) {
        return {
          success: false,
          error: 'User nicht gefunden oder deaktiviert'
        };
      }
      
      const user = userResponse.data.users[0];
      
      if (user.status !== 'active') {
        return {
          success: false,
          error: 'User-Account ist deaktiviert'
        };
      }
      
      // Generate mock token (in production: use JWT)
      const token = Buffer.from(user.email).toString('base64');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours
      
      // Update last login
      await this.userService.updateUser(user.id, {}, 'auth-service');
      
      const authenticatedUser: AuthenticatedUser = {
        id: user.id,
        email: user.email,
        role: user.role || 'USER',
        permissions: user.permissions || [],
        token,
        expiresAt
      };
      
      console.log(`✅ AuthService: User ${user.email} authenticated successfully`);
      
      return {
        success: true,
        user: authenticatedUser
      };
      
    } catch (error: any) {
      console.error('❌ AuthService: Login error:', error);
      return {
        success: false,
        error: error.message || 'Authentifizierung fehlgeschlagen'
      };
    }
  }
  
  /**
   * Validate token and return user data
   */
  public async validateToken(token: string): Promise<{ valid: boolean; user?: User; error?: string }> {
    try {
      // DEMO MODE: Special handling for demo tokens
      if (token === 'demo_admin_token_12345') {
        console.log('🎭 Demo Mode: Using demo admin user');
        const demoAdmin: User = {
          id: 'demo_admin_001',
          email: 'admin@company.com',
          firstName: 'Demo',
          lastName: 'Admin',
          displayName: 'Demo Admin',
          department: 'IT',
          position: 'System Administrator',
          role: 'SUPER_ADMIN',
          source: 'demo',
          status: 'active',
          accountEnabled: true,
          groups: [],
          permissions: [
            { resource: 'admin', action: 'admin', scope: 'all' },
            { resource: 'users', action: 'admin', scope: 'all' },
            { resource: 'analytics', action: 'admin', scope: 'all' },
            { resource: 'system', action: 'admin', scope: 'all' }
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        return {
          valid: true,
          user: demoAdmin
        };
      }
      
      // Mock token validation (in production: verify JWT)
      const email = Buffer.from(token, 'base64').toString('utf-8');
      
      const userResponse = await this.userService.getUsers({ search: email, limit: 1 });
      if (!userResponse.success || !userResponse.data?.users.length) {
        return {
          valid: false,
          error: 'Token ungültig - User nicht gefunden'
        };
      }
      
      const user = userResponse.data.users[0];
      
      if (user.status !== 'active') {
        return {
          valid: false,
          error: 'Token ungültig - User deaktiviert'
        };
      }
      
      return {
        valid: true,
        user
      };
      
    } catch (error: any) {
      console.error('❌ AuthService: Token validation error:', error);
      return {
        valid: false,
        error: error.message || 'Token-Validierung fehlgeschlagen'
      };
    }
  }
  
  /**
   * Check if user has specific permission
   */
  public hasPermission(user: User, action: string, resource: string): boolean {
    if (!user.permissions) {
      return false;
    }
    
    // Super Admin has all permissions
    if (user.role === 'SUPER_ADMIN') {
      return true;
    }
    
    // Check specific permissions
    return user.permissions.some(permission => 
      (permission.resource === resource || permission.resource === 'all') &&
      (permission.action === action || permission.action === 'admin')
    );
  }
  
  /**
   * Get default permissions for role
   */
  public getDefaultPermissions(role: UserRole): Permission[] {
    const rolePermissions: Record<UserRole, Permission[]> = {
      SUPER_ADMIN: [
        { resource: 'admin', action: 'admin', scope: 'all' },
        { resource: 'users', action: 'admin', scope: 'all' },
        { resource: 'analytics', action: 'admin', scope: 'all' },
        { resource: 'system', action: 'admin', scope: 'all' }
      ],
      ADMIN: [
        { resource: 'users', action: 'admin', scope: 'all' },
        { resource: 'analytics', action: 'read', scope: 'all' },
        { resource: 'system', action: 'read', scope: 'all' }
      ],
      IT_ADMIN: [
        { resource: 'system', action: 'admin', scope: 'all' },
        { resource: 'users', action: 'read', scope: 'all' },
        { resource: 'analytics', action: 'read', scope: 'all' }
      ],
      HR_ADMIN: [
        { resource: 'users', action: 'read', scope: 'all' },
        { resource: 'analytics', action: 'read', scope: 'hr' }
      ],
      USER: [
        { resource: 'ai', action: 'execute', scope: 'own' },
        { resource: 'sessions', action: 'create', scope: 'own' }
      ],
      VIEWER: [
        { resource: 'analytics', action: 'read', scope: 'own' }
      ],
      GUEST: [
        { resource: 'ai', action: 'read', scope: 'own' }
      ]
    };
    
    return rolePermissions[role] || rolePermissions.USER;
  }
  
  /**
   * Create authentication middleware compatible with existing code
   */
  public createAuthMiddleware() {
    return async (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'AuthenticationRequired',
          message: 'Bitte geben Sie einen gültigen Authorization Header an'
        });
      }
      
      const token = authHeader.substring(7);
      const validation = await this.validateToken(token);
      
      if (!validation.valid || !validation.user) {
        return res.status(401).json({
          success: false,
          error: 'InvalidToken',
          message: 'Ungültiger oder abgelaufener Token'
        });
      }
      
      // Add user to request (compatible with existing AuthenticatedRequest)
      req.user = {
        id: validation.user.id,
        email: validation.user.email,
        role: validation.user.role || 'USER',
        department: validation.user.department,
        permissions: validation.user.permissions || []
      };
      
      req.reqId = req.reqId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      next();
    };
  }
  
  /**
   * ⚠️ DEPRECATED: Old permission middleware - replaced by Enhanced Permission System
   * This method now allows all authenticated users to maintain backward compatibility
   * while the new Enhanced Permission System is being rolled out.
   */
  public createPermissionMiddleware(requiredAction: string, requiredResource: string) {
    return async (req: any, res: any, next: any) => {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'AuthenticationRequired',
          message: 'User nicht authentifiziert'
        });
      }
      
      // 🚨 TEMPORARY: Allow all authenticated users during migration to Enhanced Permission System
      console.log(`⚠️ DEPRECATED Permission-Check: ${requiredAction} auf ${requiredResource} für ${user.email} - ERLAUBT (Migration-Modus)`);
      
      next();
    };
  }
}

// Singleton export
export const authService = AuthService.getInstance();

// Export middleware functions for compatibility with existing code
export const requireAuth = authService.createAuthMiddleware();
export const requirePermission = (action: string, resource: string) => authService.createPermissionMiddleware(action, resource);

// Export for direct usage
export default AuthService;
