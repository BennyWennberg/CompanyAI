import { Client } from 'ldapts';
import { 
  LdapUser, 
  SyncResults, 
  APIResponse,
  DynamicUser 
} from '../types';
import { AdminPortalDatabaseManager } from '../core/database-manager';
import { SchemaRegistry } from '../core/schema-registry';

/**
 * LDAP Integration Service
 * Synchronisiert User über LDAP-Server
 */
export class LdapSourceService {
  private dbManager: AdminPortalDatabaseManager;
  private schemaRegistry: SchemaRegistry;
  private client: Client | null = null;

  constructor(dbManager: AdminPortalDatabaseManager) {
    this.dbManager = dbManager;
    this.schemaRegistry = new SchemaRegistry(dbManager);
  }

  /**
   * Prüft ob LDAP-Konfiguration vollständig ist
   */
  isConfigured(): boolean {
    return !!(
      process.env.LDAP_URL &&
      process.env.LDAP_BIND_DN &&
      process.env.LDAP_BIND_PW &&
      process.env.LDAP_BASE_DN
    );
  }

  /**
   * Erstellt LDAP-Client und verbindet sich
   */
  private async connect(): Promise<APIResponse<Client>> {
    try {
      if (this.client) {
        return {
          success: true,
          data: this.client,
          message: 'LDAP-Client bereits verbunden'
        };
      }

      const url = process.env.LDAP_URL;
      const bindDN = process.env.LDAP_BIND_DN;
      const bindPassword = process.env.LDAP_BIND_PW;

      if (!url || !bindDN || !bindPassword) {
        return {
          success: false,
          error: 'MissingConfiguration',
          message: 'LDAP-Konfiguration unvollständig'
        };
      }

      console.log('🔐 Verbinde mit LDAP-Server:', url);

      this.client = new Client({
        url,
        timeout: 30000,
        connectTimeout: 10000,
        tlsOptions: {
          rejectUnauthorized: false // Für Development
        }
      });

      // Authentifizieren
      await this.client.bind(bindDN, bindPassword);

      console.log('✅ LDAP-Verbindung erfolgreich');

      return {
        success: true,
        data: this.client,
        message: 'LDAP-Verbindung erfolgreich'
      };

    } catch (error) {
      console.error('❌ Fehler bei LDAP-Verbindung:', error);
      return {
        success: false,
        error: 'ConnectionError',
        message: 'LDAP-Verbindung fehlgeschlagen'
      };
    }
  }

  /**
   * Schließt LDAP-Verbindung
   */
  private async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.unbind();
        this.client = null;
        console.log('🔐 LDAP-Verbindung geschlossen');
      } catch (error) {
        console.error('❌ Fehler beim Schließen der LDAP-Verbindung:', error);
      }
    }
  }

  /**
   * Lädt alle User vom LDAP-Server
   */
  private async fetchUsersFromLdap(): Promise<APIResponse<any[]>> {
    try {
      const connectResult = await this.connect();
      if (!connectResult.success || !connectResult.data) {
        return connectResult as any;
      }

      const client = connectResult.data;
      const baseDN = process.env.LDAP_BASE_DN!;

      console.log('📥 Lade User von LDAP-Server...');

      // LDAP-Search für User
      const { searchEntries } = await client.search(baseDN, {
        scope: 'sub',
        filter: '(&(objectClass=person)(mail=*))', // Nur Personen mit E-Mail
        attributes: [
          'dn',
          'cn', 
          'sn', 
          'givenName',
          'displayName',
          'mail',
          'telephoneNumber',
          'mobile',
          'title',
          'department',
          'company',
          'o', // Organization
          'physicalDeliveryOfficeName',
          'memberOf',
          'employeeID',
          'employeeNumber',
          'userAccountControl',
          'whenCreated',
          'whenChanged'
        ]
      });

      console.log(`✅ ${searchEntries.length} User von LDAP geladen`);

      return {
        success: true,
        data: searchEntries,
        message: `${searchEntries.length} User von LDAP geladen`
      };

    } catch (error) {
      console.error('❌ Fehler beim Laden von LDAP-Usern:', error);
      return {
        success: false,
        error: 'LdapFetchError',
        message: 'User konnten nicht von LDAP geladen werden'
      };
    } finally {
      await this.disconnect();
    }
  }

  /**
   * Konvertiert LDAP-User zu standardisiertem Format
   */
  private convertLdapUser(ldapUser: any): DynamicUser {
    // LDAP-Attribute können Arrays oder Strings sein
    const getValue = (attr: any): string => {
      if (Array.isArray(attr)) {
        return attr[0] || '';
      }
      return attr || '';
    };

    const email = getValue(ldapUser.mail);
    const givenName = getValue(ldapUser.givenName);
    const surname = getValue(ldapUser.sn);
    const displayName = getValue(ldapUser.displayName) || getValue(ldapUser.cn);

    // User-Account-Control interpretieren (falls vorhanden)
    let isActive = true;
    if (ldapUser.userAccountControl) {
      const uac = parseInt(getValue(ldapUser.userAccountControl));
      isActive = !(uac & 0x0002); // ACCOUNTDISABLE bit prüfen
    }

    return {
      id: `ldap_${Buffer.from(getValue(ldapUser.dn)).toString('base64').substring(0, 20)}`,
      email: email,
      firstName: givenName,
      lastName: surname,
      displayName: displayName,
      isActive: isActive,
      lastSync: new Date(),
      source: 'ldap',
      externalId: getValue(ldapUser.dn),
      createdAt: ldapUser.whenCreated ? new Date(getValue(ldapUser.whenCreated)) : new Date(),
      updatedAt: new Date(),
      
      // LDAP-spezifische Felder
      dn: getValue(ldapUser.dn),
      cn: getValue(ldapUser.cn),
      sn: getValue(ldapUser.sn),
      givenName: givenName,
      telephoneNumber: getValue(ldapUser.telephoneNumber),
      mobile: getValue(ldapUser.mobile),
      title: getValue(ldapUser.title),
      department: getValue(ldapUser.department),
      company: getValue(ldapUser.company) || getValue(ldapUser.o),
      office: getValue(ldapUser.physicalDeliveryOfficeName),
      memberOf: Array.isArray(ldapUser.memberOf) ? ldapUser.memberOf : (ldapUser.memberOf ? [ldapUser.memberOf] : []),
      employeeID: getValue(ldapUser.employeeID),
      employeeNumber: getValue(ldapUser.employeeNumber),
      whenCreated: getValue(ldapUser.whenCreated),
      whenChanged: getValue(ldapUser.whenChanged)
    };
  }

  /**
   * Vollständige Synchronisation von LDAP-Usern
   */
  async syncUsers(mode: 'full' | 'incremental' = 'full'): Promise<APIResponse<SyncResults>> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Starte LDAP Sync (${mode})...`);

      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'NotConfigured',
          message: 'LDAP ist nicht konfiguriert'
        };
      }

      // 1. User von LDAP-Server laden
      const ldapResult = await this.fetchUsersFromLdap();
      if (!ldapResult.success || !ldapResult.data) {
        return {
          success: false,
          error: ldapResult.error,
          message: ldapResult.message
        };
      }

      // 2. User zu standardisiertem Format konvertieren
      const convertedUsers = ldapResult.data
        .map(user => this.convertLdapUser(user))
        .filter(user => user.email); // Nur User mit E-Mail

      // 3. Auto-Migration für neue Felder
      const migrationResult = await this.schemaRegistry.autoMigrate('ldap', convertedUsers);
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
          const existingUsers = await this.dbManager.getUsers('ldap');
          const existingUser = existingUsers.data?.find(u => u.externalId === user.externalId);

          const saveResult = await this.dbManager.upsertUser('ldap', user);
          
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

      console.log(`✅ LDAP Sync abgeschlossen: ${added} hinzugefügt, ${updated} aktualisiert, ${errors} Fehler`);

      return {
        success: true,
        data: results,
        message: `LDAP Sync erfolgreich: ${results.totalProcessed} User verarbeitet`
      };

    } catch (error) {
      console.error('❌ Fehler bei LDAP Sync:', error);
      return {
        success: false,
        error: 'SyncError',
        message: 'LDAP Synchronisation fehlgeschlagen'
      };
    }
  }

  /**
   * Prüft Verbindung zum LDAP-Server
   */
  async testConnection(): Promise<APIResponse<{serverInfo: any, userCount: number}>> {
    try {
      const connectResult = await this.connect();
      if (!connectResult.success) {
        return connectResult as any;
      }

      const client = connectResult.data!;

      // Root DSE Information abrufen
      const { searchEntries: rootDSE } = await client.search('', {
        scope: 'base',
        attributes: ['namingContexts', 'supportedLDAPVersion', 'vendorName', 'vendorVersion']
      });

      const serverInfo = rootDSE[0] || {};

      // User-Anzahl ermitteln
      const baseDN = process.env.LDAP_BASE_DN!;
      const { searchEntries: users } = await client.search(baseDN, {
        scope: 'sub',
        filter: '(&(objectClass=person)(mail=*))',
        attributes: ['dn'],
        sizeLimit: 1000 // Nur für Zählung
      });

      await this.disconnect();

      return {
        success: true,
        data: {
          serverInfo: {
            namingContexts: serverInfo.namingContexts,
            supportedLDAPVersion: serverInfo.supportedLDAPVersion,
            vendorName: serverInfo.vendorName,
            vendorVersion: serverInfo.vendorVersion
          },
          userCount: users.length
        },
        message: 'LDAP-Verbindung erfolgreich'
      };

    } catch (error) {
      console.error('❌ Fehler bei LDAP-Verbindungstest:', error);
      await this.disconnect();
      return {
        success: false,
        error: 'ConnectionTestError',
        message: 'Verbindungstest zum LDAP-Server fehlgeschlagen'
      };
    }
  }

  /**
   * Sucht nach einem User im LDAP
   */
  async findUserByEmail(email: string): Promise<APIResponse<DynamicUser>> {
    try {
      const connectResult = await this.connect();
      if (!connectResult.success || !connectResult.data) {
        return connectResult as any;
      }

      const client = connectResult.data;
      const baseDN = process.env.LDAP_BASE_DN!;

      const { searchEntries } = await client.search(baseDN, {
        scope: 'sub',
        filter: `(&(objectClass=person)(mail=${email}))`,
        attributes: ['*']
      });

      await this.disconnect();

      if (searchEntries.length === 0) {
        return {
          success: false,
          error: 'UserNotFound',
          message: 'User nicht im LDAP gefunden'
        };
      }

      const ldapUser = searchEntries[0];
      const convertedUser = this.convertLdapUser(ldapUser);

      return {
        success: true,
        data: convertedUser,
        message: 'User im LDAP gefunden'
      };

    } catch (error) {
      console.error('❌ Fehler bei LDAP-Usersuche:', error);
      await this.disconnect();
      return {
        success: false,
        error: 'UserSearchError',
        message: 'User-Suche im LDAP fehlgeschlagen'
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
      const userCountResult = await this.dbManager.getUserCount('ldap');
      const userCount = userCountResult.data || 0;

      // Letzte Sync-Zeit ermitteln
      const usersResult = await this.dbManager.getUsers('ldap', 1, 0);
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
        message: 'LDAP Sync-Status ermittelt'
      };

    } catch (error) {
      console.error('❌ Fehler beim Ermitteln des LDAP-Status:', error);
      return {
        success: false,
        error: 'StatusError',
        message: 'LDAP-Status konnte nicht ermittelt werden'
      };
    }
  }

  /**
   * Lädt verfügbare LDAP-Attribute für Schema-Analyse
   */
  async getAvailableAttributes(): Promise<APIResponse<string[]>> {
    try {
      const connectResult = await this.connect();
      if (!connectResult.success || !connectResult.data) {
        return connectResult as any;
      }

      const client = connectResult.data;
      const baseDN = process.env.LDAP_BASE_DN!;

      // Sample von Usern laden um alle Attribute zu finden
      const { searchEntries } = await client.search(baseDN, {
        scope: 'sub',
        filter: '(&(objectClass=person)(mail=*))',
        attributes: ['*'],
        sizeLimit: 10 // Nur Sample
      });

      await this.disconnect();

      // Alle einzigartigen Attribute sammeln
      const attributeSet = new Set<string>();
      
      searchEntries.forEach(entry => {
        Object.keys(entry).forEach(attr => {
          if (attr !== 'dn') { // DN ausschließen
            attributeSet.add(attr);
          }
        });
      });

      const attributes = Array.from(attributeSet).sort();

      return {
        success: true,
        data: attributes,
        message: `${attributes.length} LDAP-Attribute gefunden`
      };

    } catch (error) {
      console.error('❌ Fehler beim Laden der LDAP-Attribute:', error);
      await this.disconnect();
      return {
        success: false,
        error: 'AttributeLoadError',
        message: 'LDAP-Attribute konnten nicht geladen werden'
      };
    }
  }
}
