import { 
  ManualUser, 
  CreateManualUserRequest,
  UpdateManualUserRequest,
  SyncResults, 
  APIResponse,
  DynamicUser 
} from '../types';
import { AdminPortalDatabaseManager } from '../core/database-manager';
import { SchemaRegistry } from '../core/schema-registry';
import { randomUUID } from 'crypto';

/**
 * Manual Source Service
 * Verwaltet manuell erstellte User über Web-Interface
 */
export class ManualSourceService {
  private dbManager: AdminPortalDatabaseManager;
  private schemaRegistry: SchemaRegistry;

  constructor(dbManager: AdminPortalDatabaseManager) {
    this.dbManager = dbManager;
    this.schemaRegistry = new SchemaRegistry(dbManager);
  }

  /**
   * Erstellt einen neuen manuellen User
   */
  async createUser(
    request: CreateManualUserRequest,
    createdBy: string
  ): Promise<APIResponse<ManualUser>> {
    try {
      console.log(`👤 Erstelle manuellen User: ${request.email}`);

      // Validierung
      const validationErrors = this.validateCreateRequest(request);
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: 'ValidationError',
          message: validationErrors.join(', ')
        };
      }

      // Prüfen ob E-Mail bereits existiert
      const existingUsersResult = await this.dbManager.getUsers('manual');
      if (existingUsersResult.success && existingUsersResult.data) {
        const emailExists = existingUsersResult.data.some(user => 
          user.email.toLowerCase() === request.email.toLowerCase()
        );
        
        if (emailExists) {
          return {
            success: false,
            error: 'EmailAlreadyExists',
            message: 'E-Mail-Adresse bereits vorhanden'
          };
        }
      }

      // User erstellen
      const userId = `manual_${Date.now()}_${randomUUID().substr(0, 8)}`;
      const now = new Date();

      const user: DynamicUser = {
        id: userId,
        email: request.email,
        firstName: request.firstName,
        lastName: request.lastName,
        displayName: request.displayName || `${request.firstName} ${request.lastName}`.trim(),
        isActive: request.isActive !== undefined ? request.isActive : true,
        lastSync: now,
        source: 'manual',
        externalId: userId,
        createdAt: now,
        updatedAt: now,
        
        // Organisatorische Informationen (aus Entra ID Feldern)
        department: request.department || '',
        jobTitle: request.jobTitle || '',
        companyName: request.companyName || '',
        employeeId: request.employeeId || '',
        officeLocation: request.officeLocation || '',
        
        // Kontaktdaten (aus Entra ID Feldern)
        mobilePhone: request.mobilePhone || '',
        businessPhone: request.businessPhone || '',
        
        // Account-Settings (aus Entra ID Feldern)
        userPrincipalName: request.userPrincipalName || request.email,
        preferredLanguage: request.preferredLanguage || 'de-DE',
        usageLocation: request.usageLocation || 'DE',
        userType: request.userType || 'Member',
        
        // Manual-spezifische Felder
        createdBy: createdBy,
        notes: request.notes || '',
        tags: request.tags || [],
        customFields: request.customFields || {}
      };

      // Auto-Migration falls neue Custom-Fields vorhanden
      if (request.customFields && Object.keys(request.customFields).length > 0) {
        const migrationResult = await this.schemaRegistry.autoMigrate('manual', [user]);
        if (!migrationResult.success) {
          console.warn('⚠️ Auto-Migration für Custom-Fields fehlgeschlagen');
        }
      }

      // User speichern
      const saveResult = await this.dbManager.upsertUser('manual', user);
      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error,
          message: saveResult.message
        };
      }

      console.log(`✅ Manueller User erstellt: ${request.email}`);

      return {
        success: true,
        data: user as ManualUser,
        message: 'User erfolgreich erstellt'
      };

    } catch (error) {
      console.error('❌ Fehler beim Erstellen des manuellen Users:', error);
      return {
        success: false,
        error: 'CreateError',
        message: 'User konnte nicht erstellt werden'
      };
    }
  }

  /**
   * Aktualisiert einen bestehenden manuellen User
   */
  async updateUser(
    userId: string,
    updates: UpdateManualUserRequest,
    updatedBy: string
  ): Promise<APIResponse<ManualUser>> {
    try {
      console.log(`📝 Aktualisiere manuellen User: ${userId}`);

      // Bestehenden User laden
      const usersResult = await this.dbManager.getUsers('manual');
      if (!usersResult.success || !usersResult.data) {
        return {
          success: false,
          error: 'LoadError',
          message: 'User konnten nicht geladen werden'
        };
      }

      const existingUser = usersResult.data.find(user => user.id === userId);
      if (!existingUser) {
        return {
          success: false,
          error: 'UserNotFound',
          message: 'User nicht gefunden'
        };
      }

      // E-Mail-Eindeutigkeit prüfen (falls E-Mail geändert wird)
      if (updates.email && updates.email !== existingUser.email) {
        const emailExists = usersResult.data.some(user => 
          user.id !== userId && user.email.toLowerCase() === updates.email!.toLowerCase()
        );
        
        if (emailExists) {
          return {
            success: false,
            error: 'EmailAlreadyExists',
            message: 'E-Mail-Adresse bereits vorhanden'
          };
        }
      }

      // Updates anwenden
      const updatedUser: DynamicUser = {
        ...existingUser,
        // Grundlegende Identität
        email: updates.email || existingUser.email,
        firstName: updates.firstName || existingUser.firstName,
        lastName: updates.lastName || existingUser.lastName,
        displayName: updates.displayName || (updates.firstName || updates.lastName 
          ? `${updates.firstName || existingUser.firstName} ${updates.lastName || existingUser.lastName}`.trim()
          : existingUser.displayName),
        isActive: updates.isActive !== undefined ? updates.isActive : existingUser.isActive,
        updatedAt: new Date(),
        
        // Organisatorische Informationen (aus Entra ID Feldern)
        department: updates.department !== undefined ? updates.department : (existingUser as any).department,
        jobTitle: updates.jobTitle !== undefined ? updates.jobTitle : (existingUser as any).jobTitle,
        companyName: updates.companyName !== undefined ? updates.companyName : (existingUser as any).companyName,
        employeeId: updates.employeeId !== undefined ? updates.employeeId : (existingUser as any).employeeId,
        officeLocation: updates.officeLocation !== undefined ? updates.officeLocation : (existingUser as any).officeLocation,
        
        // Kontaktdaten (aus Entra ID Feldern)
        mobilePhone: updates.mobilePhone !== undefined ? updates.mobilePhone : (existingUser as any).mobilePhone,
        businessPhone: updates.businessPhone !== undefined ? updates.businessPhone : (existingUser as any).businessPhone,
        
        // Account-Settings (aus Entra ID Feldern)
        userPrincipalName: updates.userPrincipalName !== undefined ? updates.userPrincipalName : (existingUser as any).userPrincipalName,
        preferredLanguage: updates.preferredLanguage !== undefined ? updates.preferredLanguage : (existingUser as any).preferredLanguage,
        usageLocation: updates.usageLocation !== undefined ? updates.usageLocation : (existingUser as any).usageLocation,
        userType: updates.userType !== undefined ? updates.userType : (existingUser as any).userType,
        
        // Manual-spezifische Updates
        notes: updates.notes !== undefined ? updates.notes : (existingUser as any).notes,
        tags: updates.tags !== undefined ? updates.tags : (existingUser as any).tags,
        customFields: updates.customFields 
          ? { ...(existingUser as any).customFields, ...updates.customFields }
          : (existingUser as any).customFields,
        updatedBy: updatedBy
      };

      // Auto-Migration für neue Custom-Fields
      if (updates.customFields && Object.keys(updates.customFields).length > 0) {
        const migrationResult = await this.schemaRegistry.autoMigrate('manual', [updatedUser]);
        if (!migrationResult.success) {
          console.warn('⚠️ Auto-Migration für Custom-Fields fehlgeschlagen');
        }
      }

      // User speichern
      const saveResult = await this.dbManager.upsertUser('manual', updatedUser);
      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error,
          message: saveResult.message
        };
      }

      console.log(`✅ Manueller User aktualisiert: ${userId}`);

      return {
        success: true,
        data: updatedUser as ManualUser,
        message: 'User erfolgreich aktualisiert'
      };

    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des manuellen Users:', error);
      return {
        success: false,
        error: 'UpdateError',
        message: 'User konnte nicht aktualisiert werden'
      };
    }
  }

  /**
   * Löscht einen manuellen User
   */
  async deleteUser(userId: string, deletedBy: string): Promise<APIResponse<boolean>> {
    try {
      console.log(`🗑️ Lösche manuellen User: ${userId}`);

      // User existiert prüfen
      const usersResult = await this.dbManager.getUsers('manual');
      if (!usersResult.success || !usersResult.data) {
        return {
          success: false,
          error: 'LoadError',
          message: 'User konnten nicht geladen werden'
        };
      }

      const existingUser = usersResult.data.find(user => user.id === userId);
      if (!existingUser) {
        return {
          success: false,
          error: 'UserNotFound',
          message: 'User nicht gefunden'
        };
      }

      // Hier würde normalerweise eine delete-Funktion implementiert werden
      // Für jetzt simulieren wir das Löschen durch Deaktivierung
      const deactivatedUser = {
        ...existingUser,
        isActive: false,
        updatedAt: new Date(),
        deletedBy: deletedBy,
        deletedAt: new Date()
      };

      const saveResult = await this.dbManager.upsertUser('manual', deactivatedUser);
      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error,
          message: saveResult.message
        };
      }

      console.log(`✅ Manueller User gelöscht: ${userId}`);

      return {
        success: true,
        data: true,
        message: 'User erfolgreich gelöscht'
      };

    } catch (error) {
      console.error('❌ Fehler beim Löschen des manuellen Users:', error);
      return {
        success: false,
        error: 'DeleteError',
        message: 'User konnte nicht gelöscht werden'
      };
    }
  }

  /**
   * Lädt einen einzelnen manuellen User
   */
  async getUserById(userId: string): Promise<APIResponse<ManualUser>> {
    try {
      const usersResult = await this.dbManager.getUsers('manual');
      if (!usersResult.success || !usersResult.data) {
        return {
          success: false,
          error: 'LoadError',
          message: 'User konnten nicht geladen werden'
        };
      }

      const user = usersResult.data.find(u => u.id === userId);
      if (!user) {
        return {
          success: false,
          error: 'UserNotFound',
          message: 'User nicht gefunden'
        };
      }

      return {
        success: true,
        data: user as ManualUser,
        message: 'User erfolgreich geladen'
      };

    } catch (error) {
      console.error('❌ Fehler beim Laden des manuellen Users:', error);
      return {
        success: false,
        error: 'LoadError',
        message: 'User konnte nicht geladen werden'
      };
    }
  }

  /**
   * Lädt alle manuellen User mit Filtern
   */
  async getUsers(
    page: number = 1,
    limit: number = 50,
    search?: string,
    isActive?: boolean
  ): Promise<APIResponse<{users: ManualUser[], total: number}>> {
    try {
      const usersResult = await this.dbManager.getUsers('manual');
      if (!usersResult.success || !usersResult.data) {
        return {
          success: false,
          error: 'LoadError',
          message: 'User konnten nicht geladen werden'
        };
      }

      let filteredUsers = usersResult.data as ManualUser[];

      // Filter anwenden
      if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
          user.email.toLowerCase().includes(searchLower) ||
          (user.firstName?.toLowerCase().includes(searchLower)) ||
          (user.lastName?.toLowerCase().includes(searchLower)) ||
          (user.displayName?.toLowerCase().includes(searchLower))
        );
      }

      if (isActive !== undefined) {
        filteredUsers = filteredUsers.filter(user => user.isActive === isActive);
      }

      // Sortieren (neueste zuerst)
      filteredUsers.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      // Paginierung
      const total = filteredUsers.length;
      const startIndex = (page - 1) * limit;
      const paginatedUsers = filteredUsers.slice(startIndex, startIndex + limit);

      return {
        success: true,
        data: {
          users: paginatedUsers,
          total
        },
        message: `${paginatedUsers.length} von ${total} manuellen Usern geladen`
      };

    } catch (error) {
      console.error('❌ Fehler beim Laden der manuellen User:', error);
      return {
        success: false,
        error: 'LoadError',
        message: 'User konnten nicht geladen werden'
      };
    }
  }

  /**
   * Lädt Statistiken für manuelle User
   */
  async getStats(): Promise<APIResponse<{
    totalUsers: number;
    activeUsers: number;
    recentUsers: ManualUser[];
    createdToday: number;
    createdThisWeek: number;
    topCreators: {creator: string, count: number}[];
  }>> {
    try {
      const usersResult = await this.dbManager.getUsers('manual');
      if (!usersResult.success || !usersResult.data) {
        return {
          success: false,
          error: 'LoadError',
          message: 'User konnten nicht geladen werden'
        };
      }

      const users = usersResult.data as ManualUser[];
      
      // Basis-Statistiken
      const totalUsers = users.length;
      const activeUsers = users.filter(u => u.isActive).length;

      // Neueste User (letzte 5)
      const recentUsers = users
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

      // Zeitraum-Statistiken
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const createdToday = users.filter(u => 
        new Date(u.createdAt) >= today
      ).length;

      const createdThisWeek = users.filter(u => 
        new Date(u.createdAt) >= weekAgo
      ).length;

      // Top-Creator
      const creatorCounts = new Map<string, number>();
      users.forEach(user => {
        const creator = (user as any).createdBy || 'unknown';
        creatorCounts.set(creator, (creatorCounts.get(creator) || 0) + 1);
      });

      const topCreators = Array.from(creatorCounts.entries())
        .map(([creator, count]) => ({ creator, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        success: true,
        data: {
          totalUsers,
          activeUsers,
          recentUsers,
          createdToday,
          createdThisWeek,
          topCreators
        },
        message: 'Statistiken erfolgreich geladen'
      };

    } catch (error) {
      console.error('❌ Fehler beim Laden der Statistiken:', error);
      return {
        success: false,
        error: 'StatsError',
        message: 'Statistiken konnten nicht geladen werden'
      };
    }
  }

  /**
   * Bulk-Import von manuellen Usern (z.B. aus API-Call)
   */
  async bulkCreateUsers(
    users: CreateManualUserRequest[],
    createdBy: string
  ): Promise<APIResponse<SyncResults>> {
    const startTime = Date.now();
    
    try {
      console.log(`👥 Bulk-Import von ${users.length} manuellen Usern`);

      let added = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (const userRequest of users) {
        try {
          const createResult = await this.createUser(userRequest, createdBy);
          
          if (createResult.success) {
            added++;
          } else {
            errors++;
            errorDetails.push(`${userRequest.email}: ${createResult.message}`);
          }
        } catch (error) {
          errors++;
          errorDetails.push(`${userRequest.email}: ${error}`);
        }
      }

      const duration = Date.now() - startTime;

      const results: SyncResults = {
        totalProcessed: users.length,
        added,
        updated: 0, // Bei Bulk-Create keine Updates
        errors,
        conflicts: [], // Bei manuellen Usern normalerweise keine Konflikte
        newFields: [], // Schema-Discovery bei Bulk-Create
        duration
      };

      console.log(`✅ Bulk-Import abgeschlossen: ${added} erstellt, ${errors} Fehler`);

      return {
        success: true,
        data: results,
        message: `Bulk-Import erfolgreich: ${results.totalProcessed} User verarbeitet`
      };

    } catch (error) {
      console.error('❌ Fehler beim Bulk-Import:', error);
      return {
        success: false,
        error: 'BulkCreateError',
        message: 'Bulk-Import fehlgeschlagen'
      };
    }
  }

  /**
   * Validiert CreateManualUserRequest
   */
  private validateCreateRequest(request: CreateManualUserRequest): string[] {
    const errors: string[] = [];

    if (!request.firstName?.trim()) {
      errors.push('Vorname ist erforderlich');
    }

    if (!request.lastName?.trim()) {
      errors.push('Nachname ist erforderlich');
    }

    if (!request.email?.trim()) {
      errors.push('E-Mail ist erforderlich');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) {
      errors.push('Ungültige E-Mail-Adresse');
    }

    // Custom Fields validieren (falls vorhanden)
    if (request.customFields) {
      Object.entries(request.customFields).forEach(([key, value]) => {
        if (key.trim() === '') {
          errors.push('Custom-Field-Namen dürfen nicht leer sein');
        }
        if (typeof value === 'object' && value !== null) {
          errors.push(`Custom-Field "${key}": Verschachtelte Objekte nicht erlaubt`);
        }
      });
    }

    return errors;
  }

  /**
   * Exportiert alle manuellen User als JSON
   */
  async exportUsers(): Promise<APIResponse<ManualUser[]>> {
    try {
      const usersResult = await this.dbManager.getUsers('manual');
      if (!usersResult.success || !usersResult.data) {
        return {
          success: false,
          error: 'LoadError',
          message: 'User konnten nicht geladen werden'
        };
      }

      return {
        success: true,
        data: usersResult.data as ManualUser[],
        message: `${usersResult.data.length} manuelle User exportiert`
      };

    } catch (error) {
      console.error('❌ Fehler beim Exportieren der manuellen User:', error);
      return {
        success: false,
        error: 'ExportError',
        message: 'User konnten nicht exportiert werden'
      };
    }
  }
}
