// Admin-Portal Module - Typdefinitionen und Schnittstellen
// Multi-Source User-Integration System

export interface BaseUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  isActive: boolean;
  lastSync: Date;
  source: UserSource;
  externalId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DynamicUser extends BaseUser {
  [key: string]: any; // Dynamische Felder je nach Quelle
}

export interface UnifiedUser extends BaseUser {
  sourceData: any; // Original-Daten je nach Quelle
  conflicts: string[]; // E-Mail-Konflikte mit anderen Quellen
}

export type UserSource = 'entra' | 'ldap' | 'upload' | 'manual';

export interface SourceConfig {
  source: UserSource;
  enabled: boolean;
  autoSync: boolean;
  connectionString: string;
  lastSync?: Date;
  userCount: number;
  status: SyncStatus;
}

export interface SyncJob {
  id: string;
  source: UserSource;
  status: 'running' | 'completed' | 'failed' | 'conflicts';
  startedAt: Date;
  completedAt?: Date;
  startedBy: string;
  results: SyncResults;
}

export interface SyncResults {
  totalProcessed: number;
  added: number;
  updated: number;
  errors: number;
  conflicts: EmailConflict[];
  newFields: SchemaField[];
  duration: number; // milliseconds
}

export interface EmailConflict {
  email: string;
  sources: UserSource[];
  users: Partial<BaseUser>[];
}

export interface SchemaField {
  fieldName: string;
  dataType: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'BOOLEAN' | 'DATETIME';
  maxLength?: number;
  isRequired: boolean;
  addedAt: Date;
  source: UserSource;
}

export interface SourceSchema {
  source: UserSource;
  version: number;
  fields: SchemaField[];
  lastUpdate: Date;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'conflicts' | 'disabled';

// Entra-spezifische Typen
export interface EntraUser extends BaseUser {
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
  companyName?: string;
  mobilePhone?: string;
  businessPhone?: string;
  officeLocation?: string;
  preferredLanguage?: string;
  userType?: string;
}

// LDAP-spezifische Typen
export interface LdapUser extends BaseUser {
  dn: string; // Distinguished Name
  cn?: string; // Common Name
  sn?: string; // Surname
  givenName?: string;
  telephoneNumber?: string;
  mobile?: string;
  title?: string;
  department?: string;
  company?: string;
  office?: string;
  memberOf?: string[]; // Group memberships
}

// Upload-spezifische Typen
export interface UploadUser extends BaseUser {
  uploadBatch: string;
  uploadedAt: Date;
  uploadedBy: string;
  originalRow: number;
  validationErrors?: string[];
}

export interface UploadJob {
  id: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date;
  mode: 'add' | 'replace';
  status: 'processing' | 'completed' | 'failed';
  results: SyncResults;
}

// Manual-spezifische Typen
export interface ManualUser extends BaseUser {
  createdBy: string;
  notes?: string;
  tags?: string[];
  customFields?: {[key: string]: any};
}

// Request-Typen für API-Endpoints
export interface SyncSourceRequest {
  source: UserSource;
  mode?: 'full' | 'incremental';
  dryRun?: boolean;
}

export interface UploadUsersRequest {
  file: Buffer;
  fileName: string;
  mode: 'add' | 'replace';
  mapping?: {[csvColumn: string]: string}; // CSV-zu-DB-Feld-Mapping
}

export interface CreateManualUserRequest {
  // Grundlegende Identität (Pflichtfelder)
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
  
  // Organisatorische Informationen (optional)
  department?: string;
  jobTitle?: string;
  companyName?: string;
  employeeId?: string;
  officeLocation?: string;
  
  // Kontaktdaten (optional)
  mobilePhone?: string;
  businessPhone?: string;
  
  // Account-Settings (optional)
  userPrincipalName?: string;
  preferredLanguage?: string;
  usageLocation?: string;
  userType?: string;
  isActive?: boolean;
  
  // Manual-spezifische Felder
  notes?: string;
  tags?: string[];
  customFields?: {[key: string]: any};
}

export interface UpdateManualUserRequest {
  // Grundlegende Identität
  firstName?: string;
  lastName?: string;
  email?: string;
  displayName?: string;
  
  // Organisatorische Informationen
  department?: string;
  jobTitle?: string;
  companyName?: string;
  employeeId?: string;
  officeLocation?: string;
  
  // Kontaktdaten
  mobilePhone?: string;
  businessPhone?: string;
  
  // Account-Settings
  userPrincipalName?: string;
  preferredLanguage?: string;
  usageLocation?: string;
  userType?: string;
  isActive?: boolean;
  
  // Manual-spezifische Felder
  notes?: string;
  tags?: string[];
  customFields?: {[key: string]: any};
}

export interface GetUsersRequest {
  sources?: UserSource[];
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ResolveConflictRequest {
  email: string;
  keepSource: UserSource;
  deleteFromSources: UserSource[];
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

export interface DashboardStats {
  totalUsers: number;
  sourceBreakdown: {
    source: UserSource;
    count: number;
    status: SyncStatus;
    lastSync?: Date;
  }[];
  conflicts: number;
  lastActivity: Date;
}

// Scheduler-System
export interface SyncScheduleConfig {
  id: string;
  source: 'entra' | 'ldap';
  enabled: boolean;
  cronExpression: string;
  description: string;
  timezone: string;
  retryOnError: boolean;
  retryAttempts: number;
  retryDelay: number; // minutes
  lastRun?: Date;
  nextRun?: Date;
  status: 'active' | 'inactive' | 'error';
}

export interface SyncHistoryEntry {
  id: string;
  scheduleId: string;
  source: 'entra' | 'ldap';
  triggerType: 'scheduled' | 'manual' | 'retry';
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  usersProcessed?: number;
  usersAdded?: number;
  usersUpdated?: number;
  errorMessage?: string;
  duration?: number; // milliseconds
}

export interface CreateScheduleRequest {
  source: 'entra' | 'ldap';
  enabled: boolean;
  cronExpression: string;
  description: string;
  timezone?: string;
  retryOnError?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface UpdateScheduleRequest {
  enabled?: boolean;
  cronExpression?: string;
  description?: string;
  timezone?: string;
  retryOnError?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface SchedulerStats {
  totalSchedules: number;
  activeSchedules: number;
  totalSyncs: number;
  todaySyncs: number;
  recentErrors: SyncHistoryEntry[];
  sourcesStats: Array<{
    source: string;
    totalSyncs: number;
    totalUsers: number;
    avgDuration: number;
    lastSync: Date | null;
  }>;
}

// Database-Configuration
export interface DatabaseConfig {
  path: string;
  source: UserSource;
  connectionString: string;
  autoMigrate: boolean;
}

// Module-spezifische Konstanten
export const USER_SOURCES: UserSource[] = ['entra', 'ldap', 'upload', 'manual'];

export const SYNC_MODES = ['full', 'incremental'] as const;

export const UPLOAD_MODES = ['add', 'replace'] as const;

export const SUPPORTED_FILE_TYPES = ['.csv', '.xlsx', '.xls'] as const;

export const DEFAULT_SCHEMA_FIELDS: SchemaField[] = [
  {
    fieldName: 'id',
    dataType: 'TEXT',
    isRequired: true,
    addedAt: new Date(),
    source: 'manual'
  },
  {
    fieldName: 'email',
    dataType: 'TEXT',
    maxLength: 255,
    isRequired: true,
    addedAt: new Date(),
    source: 'manual'
  },
  {
    fieldName: 'firstName',
    dataType: 'TEXT',
    maxLength: 100,
    isRequired: false,
    addedAt: new Date(),
    source: 'manual'
  },
  {
    fieldName: 'lastName', 
    dataType: 'TEXT',
    maxLength: 100,
    isRequired: false,
    addedAt: new Date(),
    source: 'manual'
  },
  {
    fieldName: 'displayName',
    dataType: 'TEXT',
    maxLength: 200,
    isRequired: false,
    addedAt: new Date(),
    source: 'manual'
  },
  {
    fieldName: 'isActive',
    dataType: 'BOOLEAN',
    isRequired: true,
    addedAt: new Date(),
    source: 'manual'
  },
  {
    fieldName: 'lastSync',
    dataType: 'DATETIME',
    isRequired: true,
    addedAt: new Date(),
    source: 'manual'
  },
  {
    fieldName: 'source',
    dataType: 'TEXT',
    maxLength: 20,
    isRequired: true,
    addedAt: new Date(),
    source: 'manual'
  },
  {
    fieldName: 'externalId',
    dataType: 'TEXT',
    maxLength: 255,
    isRequired: false,
    addedAt: new Date(),
    source: 'manual'
  },
  {
    fieldName: 'createdAt',
    dataType: 'DATETIME',
    isRequired: true,
    addedAt: new Date(),
    source: 'manual'
  },
  {
    fieldName: 'updatedAt',
    dataType: 'DATETIME',
    isRequired: true,
    addedAt: new Date(),
    source: 'manual'
  }
];

// ===== PERMISSIONS & ROLES SYSTEM =====

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface Permission {
  id: string;
  action: 'read' | 'write' | 'delete' | 'admin';
  resource: string;
  description: string;
}

export interface UserGroup {
  id: string;
  name: string;
  description: string;
  roles: string[];
  users: string[];
  permissions: string[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface APIToken {
  id: string;
  name: string;
  token: string;
  permissions: string[];
  expiresAt: Date | null;
  lastUsed: Date | null;
  isActive: boolean;
  createdAt: Date;
  createdBy: string;
  ipWhitelist?: string[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}

// Request-Typen für Permission-APIs
export interface CreateRoleRequest {
  name: string;
  description: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissions?: string[];
}

export interface CreateGroupRequest {
  name: string;
  description: string;
  roles: string[];
  isDefault?: boolean;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  roles?: string[];
  isDefault?: boolean;
}

export interface CreateTokenRequest {
  name: string;
  permissions: string[];
  expiresAt?: Date;
  ipWhitelist?: string[];
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resource?: string;
  dateFrom?: Date;
  dateTo?: Date;
  success?: boolean;
  page?: number;
  limit?: number;
}

export const SYSTEM_PERMISSIONS: Permission[] = [
  { id: 'read_users', action: 'read', resource: 'users', description: 'Benutzer anzeigen' },
  { id: 'write_users', action: 'write', resource: 'users', description: 'Benutzer bearbeiten' },
  { id: 'delete_users', action: 'delete', resource: 'users', description: 'Benutzer löschen' },
  { id: 'admin_users', action: 'admin', resource: 'users', description: 'Vollzugriff auf Benutzer' },
  { id: 'read_roles', action: 'read', resource: 'roles', description: 'Rollen anzeigen' },
  { id: 'write_roles', action: 'write', resource: 'roles', description: 'Rollen bearbeiten' },
  { id: 'delete_roles', action: 'delete', resource: 'roles', description: 'Rollen löschen' },
  { id: 'admin_roles', action: 'admin', resource: 'roles', description: 'Vollzugriff auf Rollen' },
  { id: 'read_groups', action: 'read', resource: 'groups', description: 'Gruppen anzeigen' },
  { id: 'write_groups', action: 'write', resource: 'groups', description: 'Gruppen bearbeiten' },
  { id: 'delete_groups', action: 'delete', resource: 'groups', description: 'Gruppen löschen' },
  { id: 'admin_groups', action: 'admin', resource: 'groups', description: 'Vollzugriff auf Gruppen' },
  { id: 'read_tokens', action: 'read', resource: 'tokens', description: 'API-Tokens anzeigen' },
  { id: 'write_tokens', action: 'write', resource: 'tokens', description: 'API-Tokens bearbeiten' },
  { id: 'delete_tokens', action: 'delete', resource: 'tokens', description: 'API-Tokens löschen' },
  { id: 'admin_tokens', action: 'admin', resource: 'tokens', description: 'Vollzugriff auf API-Tokens' },
  { id: 'read_audit', action: 'read', resource: 'audit', description: 'Audit-Logs anzeigen' },
  { id: 'admin_all', action: 'admin', resource: 'all', description: 'Vollzugriff auf alle Ressourcen' }
];

export const DEFAULT_ROLES: Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'userCount'>[] = [
  {
    name: 'Administrator',
    description: 'Vollzugriff auf alle Funktionen des Admin-Portals',
    permissions: [{ id: 'admin_all', action: 'admin', resource: 'all', description: 'Vollzugriff auf alle Ressourcen' }],
    isSystemRole: true
  },
  {
    name: 'User Manager',
    description: 'Kann Benutzer verwalten und Synchronisation durchführen',
    permissions: [
      { id: 'admin_users', action: 'admin', resource: 'users', description: 'Vollzugriff auf Benutzer' },
      { id: 'read_groups', action: 'read', resource: 'groups', description: 'Gruppen anzeigen' },
      { id: 'read_audit', action: 'read', resource: 'audit', description: 'Audit-Logs anzeigen' }
    ],
    isSystemRole: true
  },
  {
    name: 'Viewer',
    description: 'Kann nur Daten anzeigen, keine Änderungen vornehmen',
    permissions: [
      { id: 'read_users', action: 'read', resource: 'users', description: 'Benutzer anzeigen' },
      { id: 'read_roles', action: 'read', resource: 'roles', description: 'Rollen anzeigen' },
      { id: 'read_groups', action: 'read', resource: 'groups', description: 'Gruppen anzeigen' }
    ],
    isSystemRole: true
  }
];

// ===== HIERARCHICAL PERMISSIONS SYSTEM =====

// Module-Definition für Permission-System
export interface ModuleDefinition {
  key: string;
  name: string;
  icon: string;
  pages: PageDefinition[];
}

export interface PageDefinition {
  key: string;
  name: string;
  icon: string;
  actions: ActionDefinition[];
  limits?: LimitDefinition[];
}

export interface ActionDefinition {
  key: string;
  name: string;
  description: string;
}

export interface LimitDefinition {
  key: string;
  name: string;
  type: 'number' | 'string' | 'boolean';
  unit?: string;
  defaultValue: any;
}

// Hierarchische Permission-Strukturen
export interface DepartmentPermissions {
  departmentId: string;
  departmentName: string;
  moduleAccess: {
    [moduleKey: string]: ModuleAccessLevel;
  };
  pagePermissions: {
    [pageKey: string]: PagePermission;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface SubGroupPermissions {
  subGroupId: string;
  subGroupName: string;
  parentDepartmentId: string;
  additionalModuleAccess?: {
    [moduleKey: string]: ModuleAccessLevel;
  };
  additionalPagePermissions?: {
    [pageKey: string]: Partial<PagePermission>;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface UserPermissionOverrides {
  userId: string;
  overrides: {
    moduleAccess?: {
      [moduleKey: string]: ModuleAccessLevel;
    };
    pagePermissions?: {
      [pageKey: string]: Partial<PagePermission>;
    };
  };
  reason: string;
  temporary?: {
    expiresAt: Date;
    createdBy: string;
    approvedBy?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface EffectiveUserPermissions {
  userId: string;
  userName: string;
  department: string;
  subGroup?: string;
  moduleAccess: {
    [moduleKey: string]: ModuleAccessLevel;
  };
  pagePermissions: {
    [pageKey: string]: PagePermission;
  };
  permissionSources: {
    department: boolean;
    subGroup: boolean;
    individual: boolean;
  };
  calculatedAt: Date;
}

export type ModuleAccessLevel = 'none' | 'read' | 'write' | 'admin';

export interface PagePermission {
  access: ModuleAccessLevel;
  actions: {
    [actionKey: string]: boolean;
  };
  limits?: {
    [limitKey: string]: any;
  };
}

// Request-Typen für Hierarchical-Permission-APIs
export interface UpdateDepartmentPermissionsRequest {
  moduleAccess: {
    [moduleKey: string]: ModuleAccessLevel;
  };
  pagePermissions: {
    [pageKey: string]: PagePermission;
  };
}

export interface UpdateSubGroupPermissionsRequest {
  additionalModuleAccess?: {
    [moduleKey: string]: ModuleAccessLevel;
  };
  additionalPagePermissions?: {
    [pageKey: string]: Partial<PagePermission>;
  };
}

export interface CreateUserOverrideRequest {
  userId: string;
  overrides: {
    moduleAccess?: {
      [moduleKey: string]: ModuleAccessLevel;
    };
    pagePermissions?: {
      [pageKey: string]: Partial<PagePermission>;
    };
  };
  reason: string;
  temporary?: {
    expiresAt: Date;
    approvedBy?: string;
  };
}

// Modul-Definitionen (basierend auf aktueller Struktur)
export const AVAILABLE_MODULES: ModuleDefinition[] = [
  {
    key: 'hr',
    name: 'HR',
    icon: '👥',
    pages: [
      {
        key: 'employees',
        name: 'Mitarbeiter',
        icon: '📊',
        actions: [
          { key: 'view', name: 'Anzeigen', description: 'Mitarbeiter-Liste anzeigen' },
          { key: 'create', name: 'Erstellen', description: 'Neue Mitarbeiter anlegen' },
          { key: 'edit', name: 'Bearbeiten', description: 'Mitarbeiter-Daten ändern' },
          { key: 'delete', name: 'Löschen', description: 'Mitarbeiter entfernen' },
          { key: 'export', name: 'Exportieren', description: 'Daten exportieren' },
          { key: 'import', name: 'Importieren', description: 'Daten importieren' }
        ]
      },
      {
        key: 'reports',
        name: 'Berichte',
        icon: '📝',
        actions: [
          { key: 'view', name: 'Anzeigen', description: 'Berichte anzeigen' },
          { key: 'create', name: 'Erstellen', description: 'Neue Berichte erstellen' },
          { key: 'export', name: 'Exportieren', description: 'Berichte exportieren' },
          { key: 'delete', name: 'Löschen', description: 'Berichte löschen' }
        ]
      },
      {
        key: 'onboarding',
        name: 'Onboarding',
        icon: '🎯',
        actions: [
          { key: 'view', name: 'Anzeigen', description: 'Onboarding-Prozesse anzeigen' },
          { key: 'create', name: 'Erstellen', description: 'Neue Onboarding-Pläne' },
          { key: 'edit', name: 'Bearbeiten', description: 'Onboarding-Pläne bearbeiten' }
        ]
      },
      {
        key: 'stats',
        name: 'Statistiken',
        icon: '📈',
        actions: [
          { key: 'view', name: 'Anzeigen', description: 'HR-Statistiken anzeigen' },
          { key: 'export', name: 'Exportieren', description: 'Statistiken exportieren' }
        ]
      }
    ]
  },
  {
    key: 'support',
    name: 'Support',
    icon: '🎧',
    pages: [
      {
        key: 'tickets',
        name: 'Tickets',
        icon: '🎫',
        actions: [
          { key: 'view', name: 'Anzeigen', description: 'Tickets anzeigen' },
          { key: 'create', name: 'Erstellen', description: 'Neue Tickets erstellen' },
          { key: 'edit', name: 'Bearbeiten', description: 'Tickets bearbeiten' },
          { key: 'close', name: 'Schließen', description: 'Tickets schließen' },
          { key: 'delete', name: 'Löschen', description: 'Tickets löschen' },
          { key: 'assign', name: 'Zuweisen', description: 'Tickets zuweisen' }
        ]
      },
      {
        key: 'create',
        name: 'Erstellen',
        icon: '➕',
        actions: [
          { key: 'access', name: 'Zugriff', description: 'Ticket-Erstellung zugreifen' }
        ]
      },
      {
        key: 'dashboard',
        name: 'Dashboard',
        icon: '📊',
        actions: [
          { key: 'view', name: 'Anzeigen', description: 'Support-Dashboard anzeigen' },
          { key: 'configure', name: 'Konfigurieren', description: 'Dashboard konfigurieren' }
        ]
      }
    ]
  },
  {
    key: 'ai',
    name: 'AI',
    icon: '🤖',
    pages: [
      {
        key: 'chat',
        name: 'Chat',
        icon: '💬',
        actions: [
          { key: 'access', name: 'Zugriff', description: 'KI-Chat nutzen' },
          { key: 'upload_docs', name: 'Dokumente hochladen', description: 'Dokumente für KI hochladen' },
          { key: 'delete_history', name: 'Historie löschen', description: 'Chat-Historie löschen' }
        ],
        limits: [
          { key: 'dailyQuota', name: 'Tägliche Anfragen', type: 'number', defaultValue: 50 },
          { key: 'maxTokens', name: 'Max. Tokens pro Anfrage', type: 'number', defaultValue: 4000 }
        ]
      },
      {
        key: 'docs',
        name: 'Dokumente',
        icon: '📚',
        actions: [
          { key: 'view', name: 'Anzeigen', description: 'KI-Dokumente anzeigen' },
          { key: 'upload', name: 'Hochladen', description: 'Dokumente hochladen' },
          { key: 'delete', name: 'Löschen', description: 'Dokumente löschen' }
        ],
        limits: [
          { key: 'maxUploadMB', name: 'Max. Upload-Größe', type: 'number', unit: 'MB', defaultValue: 10 }
        ]
      }
    ]
  },
  {
    key: 'admin_portal',
    name: 'Admin Portal',
    icon: '⚙️',
    pages: [
      {
        key: 'users',
        name: 'Benutzer',
        icon: '👥',
        actions: [
          { key: 'view', name: 'Anzeigen', description: 'Benutzer anzeigen' },
          { key: 'create', name: 'Erstellen', description: 'Benutzer erstellen' },
          { key: 'edit', name: 'Bearbeiten', description: 'Benutzer bearbeiten' },
          { key: 'delete', name: 'Löschen', description: 'Benutzer löschen' },
          { key: 'sync', name: 'Synchronisieren', description: 'Benutzer synchronisieren' }
        ]
      },
      {
        key: 'permissions',
        name: 'Berechtigungen',
        icon: '🔐',
        actions: [
          { key: 'view', name: 'Anzeigen', description: 'Berechtigungen anzeigen' },
          { key: 'edit', name: 'Bearbeiten', description: 'Berechtigungen bearbeiten' },
          { key: 'create', name: 'Erstellen', description: 'Berechtigungen erstellen' },
          { key: 'delete', name: 'Löschen', description: 'Berechtigungen löschen' }
        ]
      },
      {
        key: 'system',
        name: 'System',
        icon: '🔧',
        actions: [
          { key: 'view', name: 'Anzeigen', description: 'System-Status anzeigen' },
          { key: 'configure', name: 'Konfigurieren', description: 'System konfigurieren' },
          { key: 'backup', name: 'Backup', description: 'System-Backup durchführen' }
        ]
      }
    ]
  }
];

// Helper-Funktionen für Module
export function getModuleDefinition(moduleKey: string): ModuleDefinition | undefined {
  return AVAILABLE_MODULES.find(m => m.key === moduleKey);
}

export function getPageDefinition(moduleKey: string, pageKey: string): PageDefinition | undefined {
  const module = getModuleDefinition(moduleKey);
  return module?.pages.find(p => p.key === pageKey);
}

export function getActionDefinition(moduleKey: string, pageKey: string, actionKey: string): ActionDefinition | undefined {
  const page = getPageDefinition(moduleKey, pageKey);
  return page?.actions.find(a => a.key === actionKey);
}

export const ERROR_MESSAGES = {
  SOURCE_NOT_CONFIGURED: 'Datenquelle ist nicht konfiguriert',
  SYNC_IN_PROGRESS: 'Synchronisation bereits läuft',
  EMAIL_CONFLICTS_FOUND: 'E-Mail-Konflikte gefunden - manuelle Auflösung erforderlich',
  INVALID_FILE_FORMAT: 'Ungültiges Dateiformat - nur CSV, Excel unterstützt',
  DATABASE_CONNECTION_FAILED: 'Datenbankverbindung fehlgeschlagen',
  SCHEMA_MIGRATION_FAILED: 'Schema-Migration fehlgeschlagen',
  EXTERNAL_SOURCE_UNAVAILABLE: 'Externe Datenquelle nicht erreichbar',
  ROLE_NOT_FOUND: 'Rolle nicht gefunden',
  GROUP_NOT_FOUND: 'Gruppe nicht gefunden',
  TOKEN_NOT_FOUND: 'API-Token nicht gefunden',
  PERMISSION_DENIED: 'Berechtigung verweigert',
  INVALID_PERMISSION: 'Ungültige Berechtigung',
  ROLE_IN_USE: 'Rolle wird noch verwendet und kann nicht gelöscht werden',
  GROUP_IN_USE: 'Gruppe wird noch verwendet und kann nicht gelöscht werden',
  SYSTEM_ROLE_PROTECTED: 'System-Rollen können nicht gelöscht werden',
  // Hierarchical Permission Errors
  DEPARTMENT_NOT_FOUND: 'Abteilung nicht gefunden',
  SUBGROUP_NOT_FOUND: 'Untergruppe nicht gefunden',
  HIERARCHY_ANALYSIS_FAILED: 'Hierarchie-Analyse fehlgeschlagen',
  PERMISSION_INHERITANCE_ERROR: 'Fehler bei der Rechte-Vererbung',
  INVALID_MODULE_KEY: 'Ungültiger Modul-Schlüssel',
  INVALID_PAGE_KEY: 'Ungültiger Seiten-Schlüssel',
  INVALID_ACTION_KEY: 'Ungültiger Action-Schlüssel'
} as const;
