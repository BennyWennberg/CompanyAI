import { 
  UnifiedUser,
  UserSource,
  GetUsersRequest,
  DashboardStats,
  EmailConflict,
  APIResponse,
  PaginatedResponse,
  USER_SOURCES
} from '../types';
import { AdminPortalDatabaseManager } from '../core/database-manager';

/**
 * User-Aggregator
 * Vereinheitlicht User-Daten aus allen 4 Quellen für Frontend-Anzeige
 */
export class UserAggregator {
  private dbManager: AdminPortalDatabaseManager;

  constructor(dbManager: AdminPortalDatabaseManager) {
    this.dbManager = dbManager;
  }

  /**
   * Lädt alle User aus allen oder spezifischen Quellen
   */
  async getUnifiedUsers(request: GetUsersRequest): Promise<APIResponse<PaginatedResponse<UnifiedUser>>> {
    try {
      console.log('🔍 Lade vereinheitlichte User-Ansicht');

      const sources = request.sources || USER_SOURCES;
      const page = request.page || 1;
      const limit = request.limit || 50;
      
      let allUsers: UnifiedUser[] = [];

      // User aus allen angeforderten Quellen laden
      for (const source of sources) {
        const usersResult = await this.dbManager.getUsers(source);
        
        if (usersResult.success && usersResult.data) {
          const unifiedUsers = usersResult.data.map(user => this.convertToUnifiedUser(user, source));
          allUsers = allUsers.concat(unifiedUsers);
        }
      }

      // Filter anwenden
      let filteredUsers = allUsers;

      // Suchfilter
      if (request.search) {
        const searchLower = request.search.toLowerCase();
        filteredUsers = filteredUsers.filter(user =>
          user.email.toLowerCase().includes(searchLower) ||
          (user.firstName && user.firstName.toLowerCase().includes(searchLower)) ||
          (user.lastName && user.lastName.toLowerCase().includes(searchLower)) ||
          (user.displayName && user.displayName.toLowerCase().includes(searchLower))
        );
      }

      // Status-Filter
      if (request.isActive !== undefined) {
        filteredUsers = filteredUsers.filter(user => user.isActive === request.isActive);
      }

      // Sortierung
      const sortBy = request.sortBy || 'updatedAt';
      const sortOrder = request.sortOrder || 'desc';

      filteredUsers.sort((a, b) => {
        let aVal = (a as any)[sortBy];
        let bVal = (b as any)[sortBy];

        // Datum-Handling
        if (sortBy === 'updatedAt' || sortBy === 'createdAt' || sortBy === 'lastSync') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }

        // String-Handling
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
        }
        if (typeof bVal === 'string') {
          bVal = bVal.toLowerCase();
        }

        if (sortOrder === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });

      // Paginierung
      const total = filteredUsers.length;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

      return {
        success: true,
        data: {
          data: paginatedUsers,
          pagination: {
            total,
            page,
            limit,
            hasNext: endIndex < total,
            hasPrev: page > 1
          }
        },
        message: `${paginatedUsers.length} von ${total} Usern geladen`
      };

    } catch (error) {
      console.error('❌ Fehler beim Laden der vereinheitlichten User:', error);
      return {
        success: false,
        error: 'UserLoadError',
        message: 'Vereinheitlichte User konnten nicht geladen werden'
      };
    }
  }

  /**
   * Konvertiert User aus beliebiger Quelle zu UnifiedUser
   */
  private convertToUnifiedUser(user: any, source: UserSource): UnifiedUser {
    const conflicts: string[] = [];
    
    // Basis-UnifiedUser erstellen
    const unifiedUser: UnifiedUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      displayName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      isActive: user.isActive,
      lastSync: user.lastSync,
      source,
      externalId: user.externalId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      sourceData: user,
      conflicts: conflicts // Werden später gesetzt
    };

    return unifiedUser;
  }

  /**
   * Lädt Dashboard-Statistiken aus allen Quellen
   */
  async getDashboardStats(): Promise<APIResponse<DashboardStats>> {
    try {
      console.log('📊 Lade Dashboard-Statistiken');

      let totalUsers = 0;
      const sourceBreakdown: DashboardStats['sourceBreakdown'] = [];

      // Statistiken pro Quelle sammeln
      for (const source of USER_SOURCES) {
        const usersResult = await this.dbManager.getUsers(source);
        const userCount = usersResult.data?.length || 0;
        totalUsers += userCount;

        // Status bestimmen
        let status: 'idle' | 'syncing' | 'error' | 'conflicts' | 'disabled' = 'idle';
        
        if (source === 'entra' || source === 'ldap') {
          // Für sync-fähige Quellen Status ermitteln
          // Hier könnte man den Sync-Status prüfen
          status = 'idle';
        }

        // Letzte Sync-Zeit ermitteln
        const lastSync = usersResult.data && usersResult.data.length > 0 
          ? usersResult.data[0].lastSync 
          : undefined;

        sourceBreakdown.push({
          source,
          count: userCount,
          status,
          lastSync
        });
      }

      // E-Mail-Konflikte zählen
      const conflictsResult = await this.detectEmailConflicts();
      const conflicts = conflictsResult.success ? (conflictsResult.data?.length || 0) : 0;

      // Letzte Aktivität ermitteln
      let lastActivity = new Date(0);
      for (const source of USER_SOURCES) {
        const usersResult = await this.dbManager.getUsers(source, 1, 0);
        if (usersResult.data && usersResult.data.length > 0) {
          const sourceLastActivity = new Date(usersResult.data[0].updatedAt);
          if (sourceLastActivity > lastActivity) {
            lastActivity = sourceLastActivity;
          }
        }
      }

      return {
        success: true,
        data: {
          totalUsers,
          sourceBreakdown,
          conflicts,
          lastActivity
        },
        message: 'Dashboard-Statistiken geladen'
      };

    } catch (error) {
      console.error('❌ Fehler beim Laden der Dashboard-Statistiken:', error);
      return {
        success: false,
        error: 'StatsError',
        message: 'Dashboard-Statistiken konnten nicht geladen werden'
      };
    }
  }

  /**
   * Findet User by E-Mail über alle Quellen
   */
  async findUserByEmail(email: string): Promise<APIResponse<UnifiedUser[]>> {
    try {
      const emailLower = email.toLowerCase();
      const matchingUsers: UnifiedUser[] = [];

      // In allen Quellen nach der E-Mail suchen
      for (const source of USER_SOURCES) {
        const usersResult = await this.dbManager.getUsers(source);
        
        if (usersResult.success && usersResult.data) {
          const matchingUser = usersResult.data.find(user => 
            user.email.toLowerCase() === emailLower
          );
          
          if (matchingUser) {
            matchingUsers.push(this.convertToUnifiedUser(matchingUser, source));
          }
        }
      }

      return {
        success: true,
        data: matchingUsers,
        message: `${matchingUsers.length} User mit E-Mail ${email} gefunden`
      };

    } catch (error) {
      console.error('❌ Fehler bei der User-Suche:', error);
      return {
        success: false,
        error: 'UserSearchError',
        message: 'User-Suche fehlgeschlagen'
      };
    }
  }

  /**
   * Erkennt E-Mail-Konflikte zwischen allen Quellen
   */
  async detectEmailConflicts(): Promise<APIResponse<EmailConflict[]>> {
    try {
      const emailMap = new Map<string, {source: UserSource, user: any}[]>();

      // User aus allen Quellen sammeln
      for (const source of USER_SOURCES) {
        const usersResult = await this.dbManager.getUsers(source);
        
        if (usersResult.success && usersResult.data) {
          usersResult.data.forEach(user => {
            const email = user.email.toLowerCase();
            
            if (!emailMap.has(email)) {
              emailMap.set(email, []);
            }
            
            emailMap.get(email)!.push({ source, user });
          });
        }
      }

      // Konflikte identifizieren (E-Mails die in mehreren Quellen vorkommen)
      const conflicts: EmailConflict[] = [];
      
      emailMap.forEach((entries, email) => {
        if (entries.length > 1) {
          conflicts.push({
            email,
            sources: entries.map(e => e.source),
            users: entries.map(e => ({
              id: e.user.id,
              source: e.source,
              displayName: e.user.displayName,
              lastSync: e.user.lastSync,
              isActive: e.user.isActive
            }))
          });
        }
      });

      return {
        success: true,
        data: conflicts,
        message: `${conflicts.length} E-Mail-Konflikte gefunden`
      };

    } catch (error) {
      console.error('❌ Fehler bei Konflikt-Erkennung:', error);
      return {
        success: false,
        error: 'ConflictDetectionError',
        message: 'Konflikt-Erkennung fehlgeschlagen'
      };
    }
  }

  /**
   * Exportiert alle User aus allen Quellen
   */
  async exportAllUsers(): Promise<APIResponse<{
    [source in UserSource]: any[]
  }>> {
    try {
      console.log('📤 Exportiere alle User aus allen Quellen');

      const exportData: any = {};

      for (const source of USER_SOURCES) {
        const usersResult = await this.dbManager.getUsers(source);
        
        exportData[source] = usersResult.success && usersResult.data 
          ? usersResult.data 
          : [];
      }

      const totalUsers = Object.values(exportData).reduce((sum: number, users: any) => sum + users.length, 0);

      return {
        success: true,
        data: exportData,
        message: `${totalUsers} User aus allen Quellen exportiert`
      };

    } catch (error) {
      console.error('❌ Fehler beim Exportieren aller User:', error);
      return {
        success: false,
        error: 'ExportError',
        message: 'Export aller User fehlgeschlagen'
      };
    }
  }

  /**
   * Lädt erweiterte User-Statistiken
   */
  async getAdvancedStats(): Promise<APIResponse<{
    sourceComparison: {
      source: UserSource;
      count: number;
      activeCount: number;
      uniqueEmails: number;
      duplicateEmails: string[];
      avgCreatedPerDay: number;
      lastActivity: Date | null;
    }[];
    overallMetrics: {
      uniqueEmailsAcrossSources: number;
      duplicateEmailsCount: number;
      mostActiveSource: UserSource | null;
      oldestUser: Date | null;
      newestUser: Date | null;
    };
  }>> {
    try {
      const sourceComparison: any[] = [];
      let allEmails = new Set<string>();
      let mostActiveSource: UserSource | null = null;
      let maxCount = 0;
      let oldestUser: Date | null = null;
      let newestUser: Date | null = null;

      // Pro Quelle analysieren
      for (const source of USER_SOURCES) {
        const usersResult = await this.dbManager.getUsers(source);
        const users = usersResult.data || [];

        const count = users.length;
        const activeCount = users.filter(u => u.isActive).length;
        
        // E-Mail-Eindeutigkeit prüfen
        const emails = users.map(u => u.email.toLowerCase());
        const uniqueEmails = new Set(emails);
        const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);

        // Zu globalen E-Mails hinzufügen
        emails.forEach(email => allEmails.add(email));

        // Aktivitäts-Metriken
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const recentUsers = users.filter(u => new Date(u.createdAt) >= thirtyDaysAgo);
        const avgCreatedPerDay = recentUsers.length / 30;

        // Letzte Aktivität
        const lastActivity = users.length > 0 
          ? users.reduce((latest, user) => 
              new Date(user.updatedAt) > latest ? new Date(user.updatedAt) : latest, 
              new Date(0)
            )
          : null;

        // Älteste/Neueste User global
        users.forEach(user => {
          const createdAt = new Date(user.createdAt);
          if (!oldestUser || createdAt < oldestUser) {
            oldestUser = createdAt;
          }
          if (!newestUser || createdAt > newestUser) {
            newestUser = createdAt;
          }
        });

        // Aktivste Quelle ermitteln
        if (count > maxCount) {
          maxCount = count;
          mostActiveSource = source;
        }

        sourceComparison.push({
          source,
          count,
          activeCount,
          uniqueEmails: uniqueEmails.size,
          duplicateEmails: Array.from(new Set(duplicateEmails)),
          avgCreatedPerDay: Math.round(avgCreatedPerDay * 100) / 100,
          lastActivity
        });
      }

      // Globale Duplikate erkennen
      const conflictsResult = await this.detectEmailConflicts();
      const duplicateEmailsCount = conflictsResult.success ? (conflictsResult.data?.length || 0) : 0;

      return {
        success: true,
        data: {
          sourceComparison,
          overallMetrics: {
            uniqueEmailsAcrossSources: allEmails.size,
            duplicateEmailsCount,
            mostActiveSource,
            oldestUser,
            newestUser
          }
        },
        message: 'Erweiterte Statistiken geladen'
      };

    } catch (error) {
      console.error('❌ Fehler beim Laden der erweiterten Statistiken:', error);
      return {
        success: false,
        error: 'AdvancedStatsError',
        message: 'Erweiterte Statistiken konnten nicht geladen werden'
      };
    }
  }

  /**
   * Sucht User mit erweiterten Filtern
   */
  async advancedUserSearch(filters: {
    email?: string;
    name?: string;
    sources?: UserSource[];
    isActive?: boolean;
    createdAfter?: Date;
    createdBefore?: Date;
    hasConflicts?: boolean;
    customField?: {key: string, value: any};
  }): Promise<APIResponse<UnifiedUser[]>> {
    try {
      const sources = filters.sources || USER_SOURCES;
      let allUsers: UnifiedUser[] = [];

      // User aus den gewünschten Quellen laden
      for (const source of sources) {
        const usersResult = await this.dbManager.getUsers(source);
        
        if (usersResult.success && usersResult.data) {
          const unifiedUsers = usersResult.data.map(user => this.convertToUnifiedUser(user, source));
          allUsers = allUsers.concat(unifiedUsers);
        }
      }

      // Filter anwenden
      let filteredUsers = allUsers;

      if (filters.email) {
        const emailLower = filters.email.toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
          user.email.toLowerCase().includes(emailLower)
        );
      }

      if (filters.name) {
        const nameLower = filters.name.toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
          (user.firstName && user.firstName.toLowerCase().includes(nameLower)) ||
          (user.lastName && user.lastName.toLowerCase().includes(nameLower)) ||
          (user.displayName && user.displayName.toLowerCase().includes(nameLower))
        );
      }

      if (filters.isActive !== undefined) {
        filteredUsers = filteredUsers.filter(user => user.isActive === filters.isActive);
      }

      if (filters.createdAfter) {
        filteredUsers = filteredUsers.filter(user => 
          new Date(user.createdAt) >= filters.createdAfter!
        );
      }

      if (filters.createdBefore) {
        filteredUsers = filteredUsers.filter(user => 
          new Date(user.createdAt) <= filters.createdBefore!
        );
      }

      if (filters.hasConflicts) {
        // E-Mail-Konflikte ermitteln und entsprechend filtern
        const conflictsResult = await this.detectEmailConflicts();
        if (conflictsResult.success && conflictsResult.data) {
          const conflictEmails = new Set(conflictsResult.data.map(c => c.email.toLowerCase()));
          filteredUsers = filteredUsers.filter(user => 
            conflictEmails.has(user.email.toLowerCase())
          );
        }
      }

      if (filters.customField) {
        filteredUsers = filteredUsers.filter(user => {
          const sourceData = user.sourceData;
          return sourceData[filters.customField!.key] === filters.customField!.value;
        });
      }

      return {
        success: true,
        data: filteredUsers,
        message: `${filteredUsers.length} User mit erweiterten Filtern gefunden`
      };

    } catch (error) {
      console.error('❌ Fehler bei erweiterter User-Suche:', error);
      return {
        success: false,
        error: 'AdvancedSearchError',
        message: 'Erweiterte User-Suche fehlgeschlagen'
      };
    }
  }
}
