// Zentrale User-Type-Definition für das gesamte CompanyAI System
// SINGLE SOURCE OF TRUTH für alle Module (HR, Admin, Auth, DataSources)

export interface User {
  // Core Identity (REQUIRED)
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string; // Auto-generated: firstName + lastName
  
  // Professional Information (OPTIONAL)
  department?: string;
  position?: string; // Maps from jobTitle (Azure AD)
  companyName?: string;
  employeeId?: string;
  manager?: string;
  
  // Contact Information (OPTIONAL)
  phone?: string;
  mobilePhone?: string;
  businessPhones?: string[];
  officeLocation?: string;
  usageLocation?: string;
  preferredLanguage?: string;
  
  // System Information (REQUIRED)
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  source: 'azure-ad' | 'ldap' | 'manual' | 'bulk' | 'demo';
  accountEnabled: boolean;
  
  // External Integration (OPTIONAL)
  azureId?: string;
  userPrincipalName?: string; // Azure AD UPN
  userType?: string; // Azure AD userType
  onPremisesSamAccountName?: string;
  
  // Timestamps (REQUIRED)
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  lastSync?: string; // For external sources
  
  // Admin Portal Features (OPTIONAL - only for Admin Portal)
  role?: UserRole;
  adminRole?: AdminRole;
  permissions?: Permission[];
  groups?: string[];
  quotas?: UserQuotas;
  preferences?: UserPreferences;
  
  // Audit Trail (OPTIONAL)
  createdBy?: string;
  updatedBy?: string;
}

// Role Definitions
export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'ADMIN' 
  | 'IT_ADMIN'
  | 'HR_ADMIN'
  | 'USER' 
  | 'VIEWER' 
  | 'GUEST';

export type AdminRole = 
  | 'SUPER_ADMIN'
  | 'IT_ADMIN'
  | 'USER_ADMIN'
  | 'VIEWER_ADMIN';

// Permission System
export interface Permission {
  resource: PermissionResource;
  action: PermissionAction;
  scope: PermissionScope;
  conditions?: PermissionCondition[];
}

export type PermissionResource = 
  | 'ai' | 'rag' | 'sessions' | 'users' | 'models' 
  | 'analytics' | 'system' | 'files' | 'voice' | 'admin' | 'all';

export type PermissionAction = 
  | 'create' | 'read' | 'update' | 'delete' | 'execute' | 'admin';

export type PermissionScope = 
  | 'own' | 'group' | 'all' | 'hr';

export interface PermissionCondition {
  type: 'time' | 'quota' | 'model' | 'custom';
  value: any;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in';
}

// Quotas & Preferences
export interface UserQuotas {
  tokensPerDay: number;
  tokensUsedToday: number;
  requestsPerHour: number;
  requestsUsedThisHour: number;
  maxSessions: number;
  maxFileUploads: number;
  allowedModels: string[];
  resetDaily: boolean;
}

export interface UserPreferences {
  defaultProvider: 'openai' | 'gemini' | 'ollama';
  defaultModel: string;
  defaultTemperature: number;
  autoTTS: boolean;
  ttsVoice: string;
  language: 'de' | 'en';
  theme: 'light' | 'dark' | 'auto';
}

// API Request/Response Types
export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  department?: string;
  position?: string;
  phone?: string;
  status?: User['status'];
  source?: User['source'];
  role?: UserRole;
  groups?: string[];
  quotas?: Partial<UserQuotas>;
  preferences?: Partial<UserPreferences>;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  department?: string;
  position?: string;
  phone?: string;
  status?: User['status'];
  role?: UserRole;
  groups?: string[];
  permissions?: Permission[];
  quotas?: Partial<UserQuotas>;
  preferences?: Partial<UserPreferences>;
}

export interface GetUsersRequest {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: User['status'];
  source?: User['source'];
  department?: string;
  sortBy?: keyof User;
  sortOrder?: 'asc' | 'desc';
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Legacy Mapping Functions (für Migration)
export namespace LegacyMapping {
  // Azure AD User → Zentrale User
  export function fromAzureUser(azureUser: any): User {
    return {
      id: azureUser.id,
      email: azureUser.mail || azureUser.userPrincipalName || '',
      firstName: azureUser.givenName || '',
      lastName: azureUser.surname || '',
      displayName: azureUser.displayName || `${azureUser.givenName || ''} ${azureUser.surname || ''}`.trim(),
      department: azureUser.department,
      position: azureUser.jobTitle,
      companyName: azureUser.companyName,
      phone: azureUser.businessPhones?.[0],
      mobilePhone: azureUser.mobilePhone,
      officeLocation: azureUser.officeLocation,
      usageLocation: azureUser.usageLocation,
      preferredLanguage: azureUser.preferredLanguage,
      status: azureUser.accountEnabled ? 'active' : 'inactive',
      source: 'azure-ad',
      azureId: azureUser.id,
      userPrincipalName: azureUser.userPrincipalName,
      userType: azureUser.userType,
      onPremisesSamAccountName: azureUser.onPremisesSamAccountName,
      accountEnabled: azureUser.accountEnabled ?? true,
      createdAt: azureUser.createdDateTime || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastSync: new Date().toISOString()
    };
  }
  
  // Manual User → Zentrale User
  export function fromManualUser(manualUser: any): User {
    const nameParts = manualUser.displayName?.split(' ') || ['', ''];
    return {
      id: manualUser.id,
      email: manualUser.mail || manualUser.userPrincipalName || '',
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      displayName: manualUser.displayName || '',
      department: manualUser.department,
      position: manualUser.jobTitle,
      status: manualUser.accountEnabled ? 'active' : 'inactive',
      source: 'manual',
      userPrincipalName: manualUser.userPrincipalName,
      accountEnabled: manualUser.accountEnabled ?? true,
      createdAt: manualUser.createdAt || new Date().toISOString(),
      updatedAt: manualUser.updatedAt || new Date().toISOString(),
      createdBy: manualUser.createdBy
    };
  }
  
  // Zentrale User → Employee (für HR Module)
  export function toEmployee(user: User): any {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      department: user.department || '',
      position: user.position || '',
      startDate: new Date(user.createdAt),
      status: user.status
    };
  }
  
  // Zentrale User → Admin Portal Format
  export function toAdminPortalUser(user: User): any {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      role: user.role || 'USER',
      provider: user.source,
      status: user.status,
      groups: user.groups || [],
      department: user.department,
      position: user.position,
      jobTitle: user.position,
      companyName: user.companyName,
      phone: user.phone,
      mobilePhone: user.mobilePhone,
      businessPhones: user.businessPhones,
      officeLocation: user.officeLocation,
      usageLocation: user.usageLocation,
      preferredLanguage: user.preferredLanguage,
      accountEnabled: user.accountEnabled,
      userType: user.userType,
      onPremisesSamAccountName: user.onPremisesSamAccountName,
      azureId: user.azureId,
      quotas: user.quotas,
      preferences: user.preferences,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      createdBy: user.createdBy,
      updatedBy: user.updatedBy
    };
  }
}
