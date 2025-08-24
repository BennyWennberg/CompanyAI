// Zentrale User-Service-Schicht für CompanyAI
// SINGLE SOURCE OF TRUTH für alle User-Operations (Mock-Implementierung bis DataSources integriert sind)

import { User, CreateUserRequest, UpdateUserRequest, GetUsersRequest, APIResponse, LegacyMapping } from '../types/user';
import { v4 as uuidv4 } from 'uuid';

export class UserService {
  private static instance: UserService;
  
  private constructor() {
    // Simplified user service without external dependencies
  }
  
  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }
  
  /**
   * Get all users - mock implementation for now (to be connected to actual datasources)
   */
  public async getUsers(params: GetUsersRequest = {}): Promise<APIResponse<{ users: User[]; pagination: any }>> {
    try {
      // Mock implementation - in production this would connect to actual datasources
      const mockUsers: User[] = [
        {
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
        }
      ];
      
      const { limit = 20, page = 1 } = params;
      const filteredUsers = mockUsers.filter(user => {
        if (params.search) {
          const search = params.search.toLowerCase();
          return user.firstName.toLowerCase().includes(search) ||
                 user.lastName.toLowerCase().includes(search) ||
                 user.email.toLowerCase().includes(search);
        }
        return true;
      });
      
      const pagination = {
        page,
        limit,
        total: filteredUsers.length,
        hasNext: false,
        hasPrev: false
      };
      
      return {
        success: true,
        data: { users: filteredUsers, pagination },
        message: `${filteredUsers.length} Users geladen (Mock-Implementierung)`
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
   * Get single user by ID - mock implementation
   */
  public async getUserById(userId: string): Promise<APIResponse<User>> {
    try {
      // Mock implementation - would connect to actual datasources in production
      if (userId === 'demo_admin_001') {
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
          success: true,
          data: demoAdmin,
          message: 'User erfolgreich geladen (Demo)'
        };
      }
      
      return {
        success: false,
        error: 'UserNotFound',
        message: 'User nicht gefunden'
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
   * Create new user - mock implementation for now
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
        groups: userData.groups || []
      };
      
      console.log(`✅ UserService: Created user ${newUser.email} (Mock-Implementierung)`);
      
      return {
        success: true,
        data: newUser,
        message: 'User erfolgreich erstellt (Mock-Implementierung)'
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
   * Update existing user - mock implementation for now
   */
  public async updateUser(userId: string, userData: UpdateUserRequest, updatedBy?: string): Promise<APIResponse<User>> {
    try {
      // Get existing user
      const existingUserResponse = await this.getUserById(userId);
      if (!existingUserResponse.success || !existingUserResponse.data) {
        return existingUserResponse as APIResponse<User>;
      }
      
      const existingUser = existingUserResponse.data;
      
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
        updatedAt: new Date().toISOString(),
        updatedBy
      };
      
      console.log(`✅ UserService: Updated user ${updatedUser.email} (Mock-Implementierung)`);
      
      return {
        success: true,
        data: updatedUser,
        message: 'User erfolgreich aktualisiert (Mock-Implementierung)'
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
   * Delete user - mock implementation for now
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
      
      console.log(`✅ UserService: Deleted user ${existingUser.email} (Mock-Implementierung)`);
      
      return {
        success: true,
        message: 'User erfolgreich gelöscht (Mock-Implementierung)'
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
   * Get user statistics - mock implementation
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
      // Mock statistics
      const stats = {
        total: 1,
        active: 1,
        inactive: 0,
        byRole: { 'SUPER_ADMIN': 1 },
        bySource: { 'demo': 1 },
        byDepartment: { 'IT': 1 },
        recentLogins: 0
      };
      
      return {
        success: true,
        data: stats,
        message: 'User-Statistiken erfolgreich geladen (Mock-Implementierung)'
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