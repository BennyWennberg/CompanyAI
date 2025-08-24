import { 
  EntraUser, 
  SyncResults, 
  APIResponse,
  DynamicUser 
} from '../types';
import { AdminPortalDatabaseManager } from '../core/database-manager';
import { SchemaRegistry } from '../core/schema-registry';

// Import DataSources Graph API Client (same as HR module uses)
import { getAppToken, graphGet, graphGetAllPages, testConnection } from '../../../datasources/entraac/client';

/**
 * Microsoft Entra ID (Azure AD) Integration Service
 * Synchronisiert User über Microsoft Graph API
 */
export class EntraSourceService {
  private dbManager: AdminPortalDatabaseManager;
  private schemaRegistry: SchemaRegistry;

  constructor(dbManager: AdminPortalDatabaseManager) {
    this.dbManager = dbManager;
    this.schemaRegistry = new SchemaRegistry(dbManager);
  }

  /**
   * Prüft ob Entra-Konfiguration vollständig ist (nutzt DataSources Logic)
   */
  isConfigured(): boolean {
    return !!(
      process.env.AZURE_TENANT_ID &&
      process.env.AZURE_CLIENT_ID &&
      process.env.AZURE_CLIENT_SECRET
    );
  }

  /**
   * Authentifiziert gegen Microsoft Graph API (nutzt DataSources Client)
   */
  private async authenticate(): Promise<APIResponse<string>> {
    try {
      const token = await getAppToken();
      return {
        success: true,
        data: token,
        message: 'Graph API Authentifizierung erfolgreich (DataSources Client)'
      };
    } catch (error) {
      console.error('❌ Fehler bei Entra Authentifizierung (DataSources):', error);
      return {
        success: false,
        error: 'AuthenticationError',
        message: 'Authentifizierung gegen Microsoft Graph fehlgeschlagen'
      };
    }
  }

  /**
   * Lädt alle User von Microsoft Graph API (nutzt DataSources Client)
   */
  private async fetchUsersFromGraph(): Promise<APIResponse<any[]>> {
    try {
      console.log('📥 Lade User von Microsoft Graph API (DataSources Client)...');

      // Nutze DataSources Graph API Client statt eigene Implementation
      const selectFields = [
        'id',
        'displayName',
        'userPrincipalName',
        'mail',
        'department',
        'jobTitle',
        'accountEnabled',
        'createdDateTime',
        // 'lastSignInDateTime', // Nicht verfügbar in Entra Daten
        'givenName',
        'surname',
        'officeLocation',
        'mobilePhone',
        'businessPhones',
        'companyName',
        'employeeId',
        'usageLocation',
        'preferredLanguage',
        'userType'
      ].join(',');

      const path = `/v1.0/users?$select=${selectFields}&$top=999&$filter=userType eq 'Member'`;
      const allUsers = await graphGetAllPages<any>(path);

      console.log(`✅ ${allUsers.length} User von Microsoft Graph geladen (DataSources Client)`);

      return {
        success: true,
        data: allUsers,
        message: `${allUsers.length} User von Microsoft Graph geladen`
      };

    } catch (error) {
      console.error('❌ Fehler beim Laden von Graph API User (DataSources):', error);
      return {
        success: false,
        error: 'GraphFetchError',
        message: 'User konnten nicht von Microsoft Graph geladen werden'
      };
    }
  }

  /**
   * Konvertiert Graph-User zu standardisiertem Format
   */
  private convertGraphUser(graphUser: any): DynamicUser {
    return {
      id: `entra_${graphUser.id}`,
      email: graphUser.mail || graphUser.userPrincipalName || '',
      firstName: graphUser.givenName || '',
      lastName: graphUser.surname || '',
      displayName: graphUser.displayName || '',
      isActive: graphUser.accountEnabled !== false,
      lastSync: new Date(),
      source: 'entra',
      externalId: graphUser.id,
      createdAt: graphUser.createdDateTime ? new Date(graphUser.createdDateTime) : new Date(),
      updatedAt: new Date(),
      
      // Entra-spezifische Felder
      userPrincipalName: graphUser.userPrincipalName || '',
      jobTitle: graphUser.jobTitle || '',
      department: graphUser.department || '',
      companyName: graphUser.companyName || '',
      mobilePhone: graphUser.mobilePhone || '',
      businessPhone: (graphUser.businessPhones && graphUser.businessPhones[0]) || '',
      officeLocation: graphUser.officeLocation || '',
      preferredLanguage: graphUser.preferredLanguage || '',
      userType: graphUser.userType || 'Member'
    };
  }

  /**
   * Vollständige Synchronisation von Entra-Usern
   */
  async syncUsers(mode: 'full' | 'incremental' = 'full'): Promise<APIResponse<SyncResults>> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Starte Entra Sync (${mode})...`);

      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'NotConfigured',
          message: 'Entra ID ist nicht konfiguriert'
        };
      }

      // 1. User von Graph API laden
      const graphResult = await this.fetchUsersFromGraph();
      if (!graphResult.success || !graphResult.data) {
        return {
          success: false,
          error: graphResult.error,
          message: graphResult.message
        };
      }

      // 2. User zu standardisiertem Format konvertieren
      const convertedUsers = graphResult.data.map(user => this.convertGraphUser(user));

      // 3. Auto-Migration für neue Felder
      const migrationResult = await this.schemaRegistry.autoMigrate('entra', convertedUsers);
      let newFields: any[] = [];
      
      if (migrationResult.success && migrationResult.data) {
        newFields = migrationResult.data.newFields;
      }

      // 4. User in Datenbank speichern
      let added = 0;
      let updated = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      for (const user of convertedUsers) {
        try {
          // Prüfen ob User bereits existiert
          const existingUsers = await this.dbManager.getUsers('entra');
          const existingUser = existingUsers.data?.find(u => u.externalId === user.externalId);

          const saveResult = await this.dbManager.upsertUser('entra', user);
          
          if (saveResult.success) {
            if (existingUser) {
              updated++;
            } else {
              added++;
            }
          } else {
            errors++;
            errorDetails.push(`${user.email}: ${saveResult.message}`);
          }
        } catch (error) {
          errors++;
          errorDetails.push(`${user.email}: ${error}`);
        }
      }

      const duration = Date.now() - startTime;

      const results: SyncResults = {
        totalProcessed: convertedUsers.length,
        added,
        updated,
        errors,
        conflicts: [], // Werden separat geprüft
        newFields: newFields,
        duration
      };

      console.log(`✅ Entra Sync abgeschlossen: ${added} hinzugefügt, ${updated} aktualisiert, ${errors} Fehler`);

      return {
        success: true,
        data: results,
        message: `Entra Sync erfolgreich: ${results.totalProcessed} User verarbeitet`
      };

    } catch (error) {
      console.error('❌ Fehler bei Entra Sync:', error);
      return {
        success: false,
        error: 'SyncError',
        message: 'Entra Synchronisation fehlgeschlagen'
      };
    }
  }

  /**
   * Prüft Verbindung zu Microsoft Graph (nutzt DataSources Client)
   */
  async testConnection(): Promise<APIResponse<{tenantInfo: any, userCount: number}>> {
    try {
      // Nutze DataSources testConnection() für grundlegenden Check
      const connectionOk = await testConnection();
      if (!connectionOk) {
        return {
          success: false,
          error: 'ConnectionTestFailed',
          message: 'Verbindung zu Microsoft Graph fehlgeschlagen'
        };
      }

      // Erweiterte Informationen via DataSources graphGet
      const orgData = await graphGet<{value: any[]}>('/v1.0/organization');
      const tenantInfo = orgData.value ? orgData.value[0] : {};

      // User-Anzahl abrufen
      let userCount = 0;
      try {
        const userCountText = await graphGet('/v1.0/users/$count');
        userCount = typeof userCountText === 'number' ? userCountText : parseInt(String(userCountText));
      } catch (error) {
        console.log('User count API not available, using fallback');
        // Fallback: erste Seite laden und schätzen
        try {
          const firstPage = await graphGet<{value: any[]}>('/v1.0/users?$top=999') as any;
          userCount = firstPage?.value ? firstPage.value.length : 0;
        } catch (fallbackError) {
          userCount = 0;
        }
      }

      return {
        success: true,
        data: {
          tenantInfo: {
            displayName: tenantInfo.displayName || 'Unknown',
            tenantType: tenantInfo.tenantType || 'Unknown',
            countryLetterCode: tenantInfo.countryLetterCode || 'Unknown'
          },
          userCount
        },
        message: 'Microsoft Graph Verbindung erfolgreich (DataSources Client)'
      };

    } catch (error) {
      console.error('❌ Fehler bei Entra Verbindungstest (DataSources):', error);
      return {
        success: false,
        error: 'ConnectionTestError',
        message: 'Verbindungstest zu Microsoft Graph fehlgeschlagen'
      };
    }
  }

  /**
   * Lädt einen einzelnen User von Graph API (nutzt DataSources Client)
   */
  async getUserById(userId: string): Promise<APIResponse<DynamicUser>> {
    try {
      // Nutze DataSources graphGet statt eigene fetch Logic
      const graphUser = await graphGet(`/v1.0/users/${userId}`);
      const convertedUser = this.convertGraphUser(graphUser);

      return {
        success: true,
        data: convertedUser,
        message: 'User von Microsoft Graph geladen (DataSources Client)'
      };

    } catch (error) {
      console.error('❌ Fehler beim Laden des Entra-Users (DataSources):', error);
      
      if (String(error).includes('404') || String(error).includes('NotFound')) {
        return {
          success: false,
          error: 'UserNotFound',
          message: 'User nicht in Microsoft Graph gefunden'
        };
      }

      return {
        success: false,
        error: 'UserLoadError',
        message: 'User konnte nicht von Microsoft Graph geladen werden'
      };
    }
  }

  /**
   * Lädt User direkt aus Entra Admin Center und speichert sie in Datenbank
   * (Kopiert die DataSources Entra-Logic, aber speichert direkt in Admin Portal DB)
   */
  async fetchAndStoreFromAdminCenter(): Promise<APIResponse<{
    usersProcessed: number;
    usersAdded: number;
    usersUpdated: number;
    errors: number;
    duration: number;
  }>> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Hole User direkt aus Entra Admin Center und speichere in Admin Portal DB...');

      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'NotConfigured',
          message: 'Entra ID ist nicht konfiguriert'
        };
      }

      // 1. User von Graph API laden (DataSources Client)
      const graphResult = await this.fetchUsersFromGraph();
      if (!graphResult.success || !graphResult.data) {
        return {
          success: false,
          error: graphResult.error,
          message: graphResult.message
        };
      }

      // 2. User zu standardisiertem Format konvertieren
      const convertedUsers = graphResult.data.map(user => this.convertGraphUser(user));

      // 3. Auto-Migration für neue Felder
      const migrationResult = await this.schemaRegistry.autoMigrate('entra', convertedUsers);
      
      // 4. User in Admin Portal Datenbank speichern
      let added = 0;
      let updated = 0;
      let errors = 0;

      for (const user of convertedUsers) {
        try {
          // Prüfen ob User bereits existiert
          const existingUsers = await this.dbManager.getUsers('entra');
          const existingUser = existingUsers.data?.find(u => u.externalId === user.externalId);

          const saveResult = await this.dbManager.upsertUser('entra', user);
          
          if (saveResult.success) {
            if (existingUser) {
              updated++;
            } else {
              added++;
            }
          } else {
            errors++;
            console.error(`❌ Fehler beim Speichern User ${user.email}:`, saveResult.message);
          }
        } catch (error) {
          errors++;
          console.error(`❌ Fehler beim Verarbeiten User ${user.email}:`, error);
        }
      }

      const duration = Date.now() - startTime;

      console.log(`✅ Entra Admin Center Sync abgeschlossen: ${added} hinzugefügt, ${updated} aktualisiert, ${errors} Fehler (${duration}ms)`);

      return {
        success: true,
        data: {
          usersProcessed: convertedUsers.length,
          usersAdded: added,
          usersUpdated: updated,
          errors,
          duration
        },
        message: `Entra Admin Center Sync erfolgreich: ${convertedUsers.length} User aus Admin Center geholt und in Datenbank gespeichert`
      };

    } catch (error) {
      console.error('❌ Fehler beim Laden aus Entra Admin Center:', error);
      return {
        success: false,
        error: 'AdminCenterSyncError',
        message: 'User konnten nicht aus Entra Admin Center geladen und gespeichert werden'
      };
    }
  }

  /**
   * Lädt Sync-Status und Statistiken
   */
  async getSyncStatus(): Promise<APIResponse<{
    lastSync: Date | null;
    userCount: number;
    isConfigured: boolean;
    connectionStatus: 'connected' | 'error' | 'not_configured';
  }>> {
    try {
      const userCountResult = await this.dbManager.getUserCount('entra');
      const userCount = userCountResult.data || 0;

      // Letzte Sync-Zeit ermitteln (aus letztem User-Update)
      const usersResult = await this.dbManager.getUsers('entra', 1, 0);
      const lastSync = usersResult.data && usersResult.data.length > 0 
        ? usersResult.data[0].lastSync 
        : null;

      let connectionStatus: 'connected' | 'error' | 'not_configured' = 'not_configured';

      if (this.isConfigured()) {
        const testResult = await this.testConnection();
        connectionStatus = testResult.success ? 'connected' : 'error';
      }

      return {
        success: true,
        data: {
          lastSync,
          userCount,
          isConfigured: this.isConfigured(),
          connectionStatus
        },
        message: 'Entra Sync-Status ermittelt'
      };

    } catch (error) {
      console.error('❌ Fehler beim Ermitteln des Sync-Status:', error);
      return {
        success: false,
        error: 'StatusError',
        message: 'Sync-Status konnte nicht ermittelt werden'
      };
    }
  }
}
