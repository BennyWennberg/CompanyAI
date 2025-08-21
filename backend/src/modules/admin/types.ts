// Admin Module - Typdefinitionen und Schnittstellen

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'hr_manager' | 'hr_specialist' | 'support_manager' | 'support_agent' | 'user';
  permissions: AdminPermission[];
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface AdminPermission {
  id: string;
  resource: string; // 'employee_data', 'reports', 'onboarding', 'tickets', 'all'
  action: string; // 'read', 'write', 'delete', 'admin'
  granted: boolean;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  category: 'general' | 'security' | 'notifications' | 'integration';
  description: string;
  isSecret: boolean;
  updatedAt: Date;
  updatedBy: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details?: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalModules: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastSync: Date;
  uptime: number;
  memoryUsage: number;
  diskUsage: number;
}

// Input-Typen für API-Requests
export interface CreateAdminUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  role: AdminUser['role'];
  permissions?: Partial<AdminPermission>[];
  initialPassword?: string;
}

export interface UpdateAdminUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: AdminUser['role'];
  permissions?: Partial<AdminPermission>[];
  status?: AdminUser['status'];
}

export interface UpdateSystemSettingRequest {
  key: string;
  value: string;
  category?: SystemSetting['category'];
  description?: string;
}

export interface GetAuditLogsRequest {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface BulkUserActionRequest {
  userIds: string[];
  action: 'activate' | 'deactivate' | 'suspend' | 'delete';
  reason?: string;
}

// Response-Typen für API-Responses
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Module-spezifische Konstanten
export const ADMIN_ROLES = [
  'admin',
  'hr_manager',
  'hr_specialist', 
  'support_manager',
  'support_agent',
  'user'
] as const;

export const PERMISSION_RESOURCES = [
  'employee_data',
  'reports',
  'onboarding',
  'tickets',
  'support',
  'ai',
  'admin',
  'all'
] as const;

export const PERMISSION_ACTIONS = [
  'read',
  'write',
  'delete',
  'admin'
] as const;

export const SYSTEM_SETTING_CATEGORIES = [
  'general',
  'security',
  'notifications',
  'integration'
] as const;

export const USER_STATUS_OPTIONS = [
  'active',
  'inactive',
  'suspended'
] as const;

// Default Permissions per Role
export const DEFAULT_ROLE_PERMISSIONS = {
  admin: [
    { resource: 'all', action: 'admin', granted: true }
  ],
  hr_manager: [
    { resource: 'employee_data', action: 'admin', granted: true },
    { resource: 'reports', action: 'admin', granted: true },
    { resource: 'onboarding', action: 'admin', granted: true }
  ],
  hr_specialist: [
    { resource: 'employee_data', action: 'write', granted: true },
    { resource: 'reports', action: 'read', granted: true },
    { resource: 'onboarding', action: 'write', granted: true }
  ],
  support_manager: [
    { resource: 'support', action: 'admin', granted: true },
    { resource: 'tickets', action: 'admin', granted: true }
  ],
  support_agent: [
    { resource: 'support', action: 'write', granted: true },
    { resource: 'tickets', action: 'write', granted: true }
  ],
  user: [
    { resource: 'employee_data', action: 'read', granted: true }
  ]
};
