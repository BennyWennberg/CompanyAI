// Zentrale User-Service-Schicht für CompanyAI
// SINGLE SOURCE OF TRUTH für alle User-Operations (ersetzt DataSources Combined + Admin User Management)

import { User, CreateUserRequest, UpdateUserRequest, GetUsersRequest, APIResponse, LegacyMapping } from '../types/user';
import { v4 as uuidv4 } from 'uuid';
import { AdminPortalBackend } from '../modules/admin/core/external-data-manager';

export class UserService {
  private static instance: UserService;
  private adminBackend: AdminPortalBackend;
  
  private constructor() {
    this.adminBackend = AdminPortalBackend.getInstance();
  }
  
  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }
  
  /**
   * Get all users from single users database (vereinfacht von 4-5 DBs)
   */
  public async getUsers(params: GetUsersRequest = {}): Promise<APIResponse<{ users: User[]; pagination: any }>> {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        role,
        status,
        source,
        department,
        sortBy = 'displayName',
        sortOrder = 'asc'
      } = params;
      
      // Initialize Admin Portal Backend
      await this.adminBackend.initialize();
      
      // Verwende EINE User-Database statt 4-5 separate
      const db = this.adminBackend.dbManager.getUserConnectionByEnv('users') || 
                 this.adminBackend.dbManager.getUserConnectionByEnv('main');
      
      if (!db) {
        throw new Error('Users database not connected');
      }
      
      // Build SQL query with filters
      let sql = 'SELECT * FROM users WHERE 1=1';
      const params_sql: any[] = [];
      
      if (search) {
        sql += ' AND (firstName LIKE ? OR lastName LIKE ? OR email LIKE ? OR displayName LIKE ?)';
        const searchTerm = `%${search}%`;
        params_sql.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      if (role) {
        sql += ' AND role = ?';
        params_sql.push(role);
      }
      
      if (status) {
        sql += ' AND status = ?';
        params_sql.push(status);
      }
      
      if (source) {
        sql += ' AND source = ?';
        params_sql.push(source);
      }
      
      if (department) {
        sql += ' AND department LIKE ?';
        params_sql.push(`%${department}%`);
      }
      
      // Add sorting
      const allowedSortFields = ['displayName', 'email', 'department', 'createdAt', 'lastLogin'];
      const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'displayName';
      const safeSortOrder = sortOrder === 'desc' ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${safeSortBy} ${safeSortOrder}`;
      
      // Get total count for pagination
      const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
      const countResult = await this.adminBackend.dbManager.query(db, countSql, params_sql);
      const total = Array.isArray(countResult) && countResult[0] ? countResult[0].count : 0;
      
      // Add pagination
      sql += ' LIMIT ? OFFSET ?';
      params_sql.push(limit, (page - 1) * limit);
      
      // Execute query
      const rawUsers = await this.adminBackend.dbManager.query(db, sql, params_sql);
      const users = Array.isArray(rawUsers) ? rawUsers : [];
      
      // Parse JSON fields and ensure consistent User format
      const parsedUsers: User[] = users
        .filter((user: any) => user && user.id)
        .map((user: any) => ({
          ...user,
          displayName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          groups: user.groups ? (typeof user.groups === 'string' ? JSON.parse(user.groups) : user.groups) : [],
          permissions: user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : [],
          quotas: user.quotas ? (typeof user.quotas === 'string' ? JSON.parse(user.quotas) : user.quotas) : undefined,
          preferences: user.preferences ? (typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences) : undefined,
          businessPhones: user.businessPhones ? (typeof user.businessPhones === 'string' ? JSON.parse(user.businessPhones) : user.businessPhones) : []
        }));
      
      const pagination = {
        page,
        limit,
        total,
        hasNext: (page * limit) < total,
        hasPrev: page > 1
      };
      
      console.log(`✅ UserService: Loaded ${parsedUsers.length}/${total} users from single database`);
      
      return {
        success: true,
        data: { users: parsedUsers, pagination },
        message: `${parsedUsers.length} Users geladen aus zentraler Datenbank`
      };
      
    } catch (error: any) {
      console.error('❌ UserService: Error loading users:', error);
      return {
        success: false,
        error: 'UserLoadError',
        message: error.message || 'Users konnten nicht geladen werden'
      };
    }
  }
  
  /**
   * Get single user by ID from single database
   */
  public async getUserById(userId: string): Promise<APIResponse<User>> {
    try {
      await this.adminBackend.initialize();
      
      const db = this.adminBackend.dbManager.getUserConnectionByEnv('users') || 
                 this.adminBackend.dbManager.getUserConnectionByEnv('main');
      
      if (!db) {
        throw new Error('Users database not connected');
      }
      
      const rawUsers = await this.adminBackend.dbManager.query(db, 'SELECT * FROM users WHERE id = ?', [userId]);
      const userArray = Array.isArray(rawUsers) ? rawUsers : [];
      
      if (userArray.length === 0) {
        return {
          success: false,
          error: 'UserNotFound',
          message: 'User nicht gefunden'
        };
      }
      
      const rawUser = userArray[0];
      const user: User = {
        ...rawUser,
        displayName: rawUser.displayName || `${rawUser.firstName || ''} ${rawUser.lastName || ''}`.trim(),
        groups: rawUser.groups ? (typeof rawUser.groups === 'string' ? JSON.parse(rawUser.groups) : rawUser.groups) : [],
        permissions: rawUser.permissions ? (typeof rawUser.permissions === 'string' ? JSON.parse(rawUser.permissions) : rawUser.permissions) : [],
        quotas: rawUser.quotas ? (typeof rawUser.quotas === 'string' ? JSON.parse(rawUser.quotas) : rawUser.quotas) : undefined,
        preferences: rawUser.preferences ? (typeof rawUser.preferences === 'string' ? JSON.parse(rawUser.preferences) : rawUser.preferences) : undefined,
        businessPhones: rawUser.businessPhones ? (typeof rawUser.businessPhones === 'string' ? JSON.parse(rawUser.businessPhones) : rawUser.businessPhones) : []
      };
      
      return {
        success: true,
        data: user,
        message: 'User erfolgreich geladen'
      };
      
    } catch (error: any) {
      console.error('❌ UserService: Error loading user by ID:', error);
      return {
        success: false,
        error: 'UserLoadError',
        message: error.message || 'User konnte nicht geladen werden'
      };
    }
  }
  
  /**
   * Create new user in single database
   */
  public async createUser(userData: CreateUserRequest, createdBy?: string): Promise<APIResponse<User>> {
    try {
      // Validate required fields
      if (!userData.email || !userData.firstName || !userData.lastName) {
        return {
          success: false,
          error: 'ValidationError',
          message: 'Email, Vorname und Nachname sind erforderlich'
        };
      }
      
      await this.adminBackend.initialize();
      
      const db = this.adminBackend.dbManager.getUserConnectionByEnv('users') || 
                 this.adminBackend.dbManager.getUserConnectionByEnv('main');
      
      if (!db) {
        throw new Error('Users database not connected');
      }
      
      // Check for duplicate email
      const existingUsers = await this.adminBackend.dbManager.query(db, 'SELECT id FROM users WHERE email = ?', [userData.email]);
      if (Array.isArray(existingUsers) && existingUsers.length > 0) {
        return {
          success: false,
          error: 'DuplicateEmail',
          message: 'Email-Adresse bereits vergeben'
        };
      }
      
      const now = new Date().toISOString();
      const newUser: User = {
        id: uuidv4(),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: `${userData.firstName} ${userData.lastName}`,
        department: userData.department,
        position: userData.position,
        phone: userData.phone,
        status: userData.status || 'active',
        source: userData.source || 'manual',
        accountEnabled: true,
        createdAt: now,
        updatedAt: now,
        createdBy,
        role: userData.role,
        groups: userData.groups || [],
        quotas: userData.quotas,
        preferences: userData.preferences
      };
      
      // Insert into single database
      await this.adminBackend.dbManager.run(db, `
        INSERT INTO users (
          id, email, firstName, lastName, displayName, department, position, phone,
          status, source, accountEnabled, role, groups, quotas, preferences,
          createdAt, updatedAt, createdBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newUser.id,
        newUser.email,
        newUser.firstName,
        newUser.lastName,
        newUser.displayName,
        newUser.department,
        newUser.position,
        newUser.phone,
        newUser.status,
        newUser.source,
        newUser.accountEnabled,
        newUser.role,
        JSON.stringify(newUser.groups),
        JSON.stringify(newUser.quotas),
        JSON.stringify(newUser.preferences),
        newUser.createdAt,
        newUser.updatedAt,
        newUser.createdBy
      ]);
      
      console.log(`✅ UserService: Created user ${newUser.email} in single database`);
      
      return {
        success: true,
        data: newUser,
        message: 'User erfolgreich erstellt'
      };
      
    } catch (error: any) {
      console.error('❌ UserService: Error creating user:', error);
      return {
        success: false,
        error: 'UserCreationError',
        message: error.message || 'User konnte nicht erstellt werden'
      };
    }
  }
  
  /**
   * Update existing user in single database
   */
  public async updateUser(userId: string, userData: UpdateUserRequest, updatedBy?: string): Promise<APIResponse<User>> {
    try {
      // Get existing user
      const existingUserResponse = await this.getUserById(userId);
      if (!existingUserResponse.success || !existingUserResponse.data) {
        return existingUserResponse as APIResponse<User>;
      }
      
      const existingUser = existingUserResponse.data;
      const db = this.adminBackend.dbManager.getUserConnectionByEnv('users') || 
                 this.adminBackend.dbManager.getUserConnectionByEnv('main');
      
      if (!db) {
        throw new Error('Users database not connected');
      }
      
      // Merge updates
      const updatedUser: User = {
        ...existingUser,
        firstName: userData.firstName ?? existingUser.firstName,
        lastName: userData.lastName ?? existingUser.lastName,
        displayName: userData.firstName || userData.lastName 
          ? `${userData.firstName ?? existingUser.firstName} ${userData.lastName ?? existingUser.lastName}`
          : existingUser.displayName,
        department: userData.department ?? existingUser.department,
        position: userData.position ?? existingUser.position,
        phone: userData.phone ?? existingUser.phone,
        status: userData.status ?? existingUser.status,
        role: userData.role ?? existingUser.role,
        groups: userData.groups ?? existingUser.groups,
        permissions: userData.permissions ?? existingUser.permissions,
        quotas: userData.quotas ? { ...existingUser.quotas, ...userData.quotas } : existingUser.quotas,
        preferences: userData.preferences ? { ...existingUser.preferences, ...userData.preferences } : existingUser.preferences,
        updatedAt: new Date().toISOString(),
        updatedBy
      };
      
      // Update in single database
      await this.adminBackend.dbManager.run(db, `
        UPDATE users SET 
          firstName = ?, lastName = ?, displayName = ?, department = ?, position = ?, phone = ?,
          status = ?, role = ?, groups = ?, quotas = ?, preferences = ?, updatedAt = ?, updatedBy = ?
        WHERE id = ?
      `, [
        updatedUser.firstName,
        updatedUser.lastName,
        updatedUser.displayName,
        updatedUser.department,
        updatedUser.position,
        updatedUser.phone,
        updatedUser.status,
        updatedUser.role,
        JSON.stringify(updatedUser.groups),
        JSON.stringify(updatedUser.quotas),
        JSON.stringify(updatedUser.preferences),
        updatedUser.updatedAt,
        updatedUser.updatedBy,
        userId
      ]);
      
      console.log(`✅ UserService: Updated user ${updatedUser.email} in single database`);
      
      return {
        success: true,
        data: updatedUser,
        message: 'User erfolgreich aktualisiert'
      };
      
    } catch (error: any) {
      console.error('❌ UserService: Error updating user:', error);
      return {
        success: false,
        error: 'UserUpdateError',
        message: error.message || 'User konnte nicht aktualisiert werden'
      };
    }
  }
  
  /**
   * Delete user from single database
   */
  public async deleteUser(userId: string): Promise<APIResponse<void>> {
    try {
      // Get existing user to check role restrictions
      const existingUserResponse = await this.getUserById(userId);
      if (!existingUserResponse.success || !existingUserResponse.data) {
        return {
          success: false,
          error: 'UserNotFound',
          message: 'User nicht gefunden'
        };
      }
      
      const existingUser = existingUserResponse.data;
      
      // Prevent deletion of SUPER_ADMIN users
      if (existingUser.role === 'SUPER_ADMIN') {
        return {
          success: false,
          error: 'DeleteRestricted',
          message: 'Super-Admin-Accounts können nicht gelöscht werden'
        };
      }
      
      const db = this.adminBackend.dbManager.getUserConnectionByEnv('users') || 
                 this.adminBackend.dbManager.getUserConnectionByEnv('main');
      
      if (!db) {
        throw new Error('Users database not connected');
      }
      
      // Delete from single database
      await this.adminBackend.dbManager.run(db, 'DELETE FROM users WHERE id = ?', [userId]);
      
      console.log(`✅ UserService: Deleted user ${existingUser.email} from single database`);
      
      return {
        success: true,
        message: 'User erfolgreich gelöscht'
      };
      
    } catch (error: any) {
      console.error('❌ UserService: Error deleting user:', error);
      return {
        success: false,
        error: 'UserDeletionError',
        message: error.message || 'User konnte nicht gelöscht werden'
      };
    }
  }
  
  /**
   * Get user statistics from single database
   */
  public async getUserStats(): Promise<APIResponse<{
    total: number;
    active: number;
    inactive: number;
    byRole: Record<string, number>;
    bySource: Record<string, number>;
    byDepartment: Record<string, number>;
    recentLogins: number;
  }>> {
    try {
      await this.adminBackend.initialize();
      
      const db = this.adminBackend.dbManager.getUserConnectionByEnv('users') || 
                 this.adminBackend.dbManager.getUserConnectionByEnv('main');
      
      if (!db) {
        throw new Error('Users database not connected');
      }
      
      // Get all users for statistics
      const rawUsers = await this.adminBackend.dbManager.query(db, 'SELECT * FROM users', []);
      const users = Array.isArray(rawUsers) ? rawUsers : [];
      
      const total = users.length;
      const active = users.filter((u: any) => u.status === 'active').length;
      const inactive = users.filter((u: any) => u.status === 'inactive').length;
      
      const byRole = users.reduce((acc: Record<string, number>, user: any) => {
        const role = user.role || 'USER';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});
      
      const bySource = users.reduce((acc: Record<string, number>, user: any) => {
        const source = user.source || 'manual';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});
      
      const byDepartment = users.reduce((acc: Record<string, number>, user: any) => {
        const dept = user.department || 'Unknown';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});
      
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentLogins = users.filter((u: any) => {
        if (!u.lastLogin) return false;
        return new Date(u.lastLogin) > oneDayAgo;
      }).length;
      
      return {
        success: true,
        data: {
          total,
          active,
          inactive,
          byRole,
          bySource,
          byDepartment,
          recentLogins
        },
        message: 'User-Statistiken erfolgreich geladen'
      };
      
    } catch (error: any) {
      console.error('❌ UserService: Error loading user stats:', error);
      return {
        success: false,
        error: 'UserStatsError',
        message: error.message || 'User-Statistiken konnten nicht geladen werden'
      };
    }
  }
  
  /**
   * Sync users from Azure AD to single database
   */
  public async syncFromAzure(): Promise<APIResponse<{ imported: number; updated: number; errors: string[] }>> {
    try {
      await this.adminBackend.initialize();
      
      // Import Azure AD sync logic from existing functions
      const { getAzureSyncedUsers } = await import('../modules/admin/functions/azure-user-sync');
      const azureUsers = await getAzureSyncedUsers();
      
      const db = this.adminBackend.dbManager.getUserConnectionByEnv('users') || 
                 this.adminBackend.dbManager.getUserConnectionByEnv('main');
      
      if (!db) {
        throw new Error('Users database not connected');
      }
      
      let imported = 0;
      let updated = 0;
      const errors: string[] = [];
      
      for (const azureUser of azureUsers) {
        try {
          // Convert Azure User to central User format
          const user = LegacyMapping.fromAzureUser(azureUser);
          
          // Check if user exists
          const existingUsers = await this.adminBackend.dbManager.query(db, 'SELECT id FROM users WHERE azureId = ? OR email = ?', [user.azureId, user.email]);
          
          if (Array.isArray(existingUsers) && existingUsers.length > 0) {
            // Update existing user
            await this.updateUser(existingUsers[0].id, {
              firstName: user.firstName,
              lastName: user.lastName,
              department: user.department,
              position: user.position,
              status: user.status
            }, 'azure-sync');
            updated++;
          } else {
            // Create new user
            await this.createUser({
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              department: user.department,
              position: user.position,
              source: 'azure-ad'
            }, 'azure-sync');
            imported++;
          }
        } catch (error: any) {
          errors.push(`User ${azureUser.email}: ${error.message}`);
        }
      }
      
      return {
        success: true,
        data: { imported, updated, errors },
        message: `Azure Sync: ${imported} importiert, ${updated} aktualisiert, ${errors.length} Fehler`
      };
      
    } catch (error: any) {
      console.error('❌ UserService: Error syncing from Azure:', error);
      return {
        success: false,
        error: 'AzureSyncError',
        message: error.message || 'Azure Sync fehlgeschlagen'
      };
    }
  }
  
  /**
   * Get users in Employee format (für HR Module Kompatibilität)
   */
  public async getEmployees(params: any = {}): Promise<APIResponse<{ data: any[]; pagination: any }>> {
    try {
      const usersResponse = await this.getUsers({
        page: params.page,
        limit: params.limit,
        search: params.search,
        department: params.department,
        status: params.status
      });
      
      if (!usersResponse.success || !usersResponse.data) {
        return usersResponse as any;
      }
      
      // Convert Users to Employee format
      const employees = usersResponse.data.users.map(user => LegacyMapping.toEmployee(user));
      
      return {
        success: true,
        data: {
          data: employees,
          pagination: usersResponse.data.pagination
        },
        message: `${employees.length} Mitarbeiter geladen (via UserService)`
      };
      
    } catch (error: any) {
      console.error('❌ UserService: Error loading employees:', error);
      return {
        success: false,
        error: 'EmployeeLoadError',
        message: error.message || 'Mitarbeiter konnten nicht geladen werden'
      };
    }
  }
  
  /**
   * Create employee (für HR Module Kompatibilität)
   */
  public async createEmployee(employeeData: any, createdBy?: string): Promise<APIResponse<any>> {
    try {
      const userResponse = await this.createUser({
        email: employeeData.email,
        firstName: employeeData.firstName,
        lastName: employeeData.lastName,
        department: employeeData.department,
        position: employeeData.position,
        status: employeeData.status,
        source: 'manual'
      }, createdBy);
      
      if (!userResponse.success || !userResponse.data) {
        return userResponse as any;
      }
      
      // Convert back to Employee format
      const employee = LegacyMapping.toEmployee(userResponse.data);
      
      return {
        success: true,
        data: employee,
        message: 'Mitarbeiter erfolgreich erstellt (via UserService)'
      };
      
    } catch (error: any) {
      console.error('❌ UserService: Error creating employee:', error);
      return {
        success: false,
        error: 'EmployeeCreationError',
        message: error.message || 'Mitarbeiter konnte nicht erstellt werden'
      };
    }
  }
}

// Singleton export
export const userService = UserService.getInstance();

// Default exports für Legacy-Kompatibilität
export default UserService;
