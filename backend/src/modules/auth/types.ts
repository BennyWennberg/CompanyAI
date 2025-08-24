// Multi-Provider Authentication Types

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'hr_manager' | 'hr_specialist' | 'user';
  provider: 'admin' | 'manual' | 'entra' | 'ldap';
  department?: string;
  position?: string;
}

export interface AuthToken {
  token: string;
  user: AuthUser;
  expiresAt: string;
}

// Request Types
export interface AdminTokenRequest {
  token: string;
}

export interface ManualLoginRequest {
  username: string;
  password: string;
}

export interface EntraLoginRequest {
  // OAuth flow - meist keine direkten Credentials
  email?: string;
  redirectUrl?: string;
}

export interface LdapLoginRequest {
  username: string;
  password: string;
  domain?: string;
}

// Response Types
export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  message?: string;
  error?: string;
  redirectUrl?: string; // Für OAuth
}

// Provider Configuration
export interface AuthProvider {
  name: 'admin' | 'manual' | 'entra' | 'ldap';
  enabled: boolean;
  displayName: string;
  description: string;
  icon: string;
  authenticate: (credentials: any) => Promise<AuthUser | null>;
}

// Manual User (für Password Auth)
export interface ManualUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // bcrypt hash
  name: string;
  role: 'admin' | 'hr_manager' | 'hr_specialist' | 'user';
  department?: string;
  position?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

// LDAP Configuration
export interface LdapConfig {
  url: string;
  baseDN: string;
  bindDN?: string;
  bindPassword?: string;
  userSearchBase: string;
  userSearchFilter: string;
  groupSearchBase?: string;
  defaultDomain: string;
  enabled: boolean;
}

// Entra AD Configuration
export interface EntraConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string[];
  enabled: boolean;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  provider: string;
  iat: number;
  exp: number;
}
