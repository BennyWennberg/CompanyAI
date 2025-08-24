import { 
  UserSource,
  SyncJob,
  SyncResults,
  SyncStatus,
  EmailConflict,
  APIResponse,
  USER_SOURCES
} from '../types';
import { AdminPortalDatabaseManager } from '../core/database-manager';
import { EntraSourceService } from '../sources/entra-source';
import { LdapSourceService } from '../sources/ldap-source';
import { UploadSourceService } from '../sources/upload-source';
import { ManualSourceService } from '../sources/manual-source';
import { randomUUID } from 'crypto';

/**
 * Sync-Orchestrator 
 * Koordiniert Synchronisation aller 4 User-Quellen
 */
export class SyncOrchestrator {
  private dbManager: AdminPortalDatabaseManager;
  private entraService: EntraSourceService;
  private ldapService: LdapSourceService;
  private uploadService: UploadSourceService;
  private manualService: ManualSourceService;
  
  private runningSyncJobs: Map<UserSource, SyncJob> = new Map();

  constructor(dbManager: AdminPortalDatabaseManager) {
    this.dbManager = dbManager;
    this.entraService = new EntraSourceService(dbManager);
    this.ldapService = new LdapSourceService(dbManager);
    this.uploadService = new UploadSourceService(dbManager);
    this.manualService = new ManualSourceService(dbManager);
  }

  /**
   * Startet Synchronisation für eine spezifische Quelle
   */
  async syncSource(
    source: UserSource,
    mode: 'full' | 'incremental' = 'full',
    startedBy: string = 'system'
  ): Promise<APIResponse<SyncJob>> {
    try {
      console.log(`🔄 Starte Sync für ${source} (${mode})`);

      // Prüfen ob bereits ein Sync für diese Quelle läuft
      if (this.runningSyncJobs.has(source)) {
        return {
          success: false,
          error: 'SyncInProgress',
          message: `Synchronisation für ${source} läuft bereits`
        };
      }

      // Sync-Job erstellen
      const syncJob: SyncJob = {
        id: randomUUID(),
        source,
        status: 'running',
        startedAt: new Date(),
        startedBy,
        results: {
          totalProcessed: 0,
          added: 0,
          updated: 0,
          errors: 0,
          conflicts: [],
          newFields: [],
          duration: 0
        }
      };

      this.runningSyncJobs.set(source, syncJob);

      // Source-spezifischen Service aufrufen
      let syncResult: APIResponse<SyncResults>;

      switch (source) {
        case 'entra':
          if (!this.entraService.isConfigured()) {
            syncJob.status = 'failed';
            syncJob.completedAt = new Date();
            this.runningSyncJobs.delete(source);
            return {
              success: false,
              error: 'NotConfigured',
              message: 'Entra ID ist nicht konfiguriert'
            };
          }
          syncResult = await this.entraService.syncUsers(mode);
          break;

        case 'ldap':
          if (!this.ldapService.isConfigured()) {
            syncJob.status = 'failed';
            syncJob.completedAt = new Date();
            this.runningSyncJobs.delete(source);
            return {
              success: false,
              error: 'NotConfigured',
              message: 'LDAP ist nicht konfiguriert'
            };
          }
          syncResult = await this.ldapService.syncUsers(mode);
          break;

        case 'upload':
          // Upload hat keinen direkten Sync - wird über Upload-Prozess gesteuert
          syncJob.status = 'failed';
          syncJob.completedAt = new Date();
          this.runningSyncJobs.delete(source);
          return {
            success: false,
            error: 'NoSyncSupported',
            message: 'Upload-Quelle unterstützt keinen direkten Sync'
          };

        case 'manual':
          // Manual hat keinen Sync - User werden direkt erstellt
          syncJob.status = 'failed';
          syncJob.completedAt = new Date();
          this.runningSyncJobs.delete(source);
          return {
            success: false,
            error: 'NoSyncSupported',
            message: 'Manuelle Quelle unterstützt keinen Sync'
          };

        default:
          syncJob.status = 'failed';
          syncJob.completedAt = new Date();
          this.runningSyncJobs.delete(source);
          return {
            success: false,
            error: 'UnsupportedSource',
            message: 'Unbekannte User-Quelle'
          };
      }

      // Sync-Job-Status basierend auf Ergebnis aktualisieren
      syncJob.completedAt = new Date();
      
      if (syncResult.success && syncResult.data) {
        syncJob.status = 'completed';
        syncJob.results = syncResult.data;
      } else {
        syncJob.status = 'failed';
        syncJob.results.errors = 1;
      }

      // E-Mail-Konflikte nach erfolgreichem Sync prüfen
      if (syncJob.status === 'completed') {
        const conflictsResult = await this.detectEmailConflicts();
        if (conflictsResult.success && conflictsResult.data && conflictsResult.data.length > 0) {
          syncJob.status = 'conflicts';
          syncJob.results.conflicts = conflictsResult.data;
        }
      }

      this.runningSyncJobs.delete(source);

      console.log(`✅ Sync für ${source} abgeschlossen: ${syncJob.status}`);

      return {
        success: true,
        data: syncJob,
        message: `Sync für ${source} ${syncJob.status === 'completed' ? 'erfolgreich' : 'mit Fehlern'} abgeschlossen`
      };

    } catch (error) {
      console.error(`❌ Fehler beim Sync von ${source}:`, error);
      this.runningSyncJobs.delete(source);
      
      return {
        success: false,
        error: 'SyncError',
        message: `Sync für ${source} fehlgeschlagen`
      };
    }
  }

  /**
   * Startet Sync für alle konfigurierten Quellen
   */
  async syncAllSources(
    startedBy: string = 'system'
  ): Promise<APIResponse<{syncJobs: SyncJob[], summary: {completed: number, failed: number, conflicts: number}}>> {
    try {
      console.log('🔄 Starte Sync für alle Quellen');

      const syncJobs: SyncJob[] = [];
      const syncPromises: Promise<any>[] = [];

      // Nur Entra und LDAP haben automatischen Sync
      const syncableSources: UserSource[] = ['entra', 'ldap'];

      for (const source of syncableSources) {
        // Prüfen ob Quelle konfiguriert ist
        let isConfigured = false;
        
        if (source === 'entra') {
          isConfigured = this.entraService.isConfigured();
        } else if (source === 'ldap') {
          isConfigured = this.ldapService.isConfigured();
        }

        if (isConfigured) {
          const syncPromise = this.syncSource(source, 'full', startedBy);
          syncPromises.push(syncPromise);
        } else {
          console.log(`⚠️ ${source} nicht konfiguriert - überspringe`);
        }
      }

      // Alle Sync-Jobs parallel ausführen
      const results = await Promise.allSettled(syncPromises);
      
      // Ergebnisse sammeln
      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value.success) {
          syncJobs.push(result.value.data);
        }
      });

      // Zusammenfassung erstellen
      const completed = syncJobs.filter(job => job.status === 'completed').length;
      const failed = syncJobs.filter(job => job.status === 'failed').length;
      const conflicts = syncJobs.filter(job => job.status === 'conflicts').length;

      console.log(`✅ Sync für alle Quellen abgeschlossen: ${completed} erfolgreich, ${failed} fehlgeschlagen, ${conflicts} mit Konflikten`);

      return {
        success: true,
        data: {
          syncJobs,
          summary: { completed, failed, conflicts }
        },
        message: `Sync für alle Quellen abgeschlossen: ${completed + conflicts} von ${syncJobs.length} erfolgreich`
      };

    } catch (error) {
      console.error('❌ Fehler beim Sync aller Quellen:', error);
      return {
        success: false,
        error: 'BulkSyncError',
        message: 'Sync für alle Quellen fehlgeschlagen'
      };
    }
  }

  /**
   * Erkennt E-Mail-Konflikte zwischen den Quellen
   */
  async detectEmailConflicts(): Promise<APIResponse<EmailConflict[]>> {
    try {
      console.log('🔍 Prüfe E-Mail-Konflikte zwischen Quellen');

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

      // Konflikte identifizieren
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
              lastSync: e.user.lastSync
            }))
          });
        }
      });

      console.log(`📊 ${conflicts.length} E-Mail-Konflikte gefunden`);

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
   * Lädt Status aller Quellen
   */
  async getAllSourceStatus(): Promise<APIResponse<{
    [source in UserSource]: {
      status: SyncStatus;
      lastSync: Date | null;
      userCount: number;
      isConfigured: boolean;
      connectionStatus?: 'connected' | 'error' | 'not_configured';
    }
  }>> {
    try {
      const statusMap: any = {};

      // Status für jede Quelle laden
      for (const source of USER_SOURCES) {
        let status: SyncStatus = 'idle';
        let lastSync: Date | null = null;
        let userCount = 0;
        let isConfigured = false;
        let connectionStatus: 'connected' | 'error' | 'not_configured' = 'not_configured';

        // Laufenden Sync-Job prüfen
        if (this.runningSyncJobs.has(source)) {
          status = 'syncing';
        }

        // User-Anzahl laden
        const userCountResult = await this.dbManager.getUserCount(source);
        if (userCountResult.success) {
          userCount = userCountResult.data || 0;
        }

        // Letzte Sync-Zeit ermitteln
        const usersResult = await this.dbManager.getUsers(source, 1, 0);
        if (usersResult.success && usersResult.data && usersResult.data.length > 0) {
          lastSync = usersResult.data[0].lastSync;
        }

        // Source-spezifischen Status laden
        if (source === 'entra') {
          const entraStatus = await this.entraService.getSyncStatus();
          if (entraStatus.success && entraStatus.data) {
            isConfigured = entraStatus.data.isConfigured;
            connectionStatus = entraStatus.data.connectionStatus;
          }
        } else if (source === 'ldap') {
          const ldapStatus = await this.ldapService.getSyncStatus();
          if (ldapStatus.success && ldapStatus.data) {
            isConfigured = ldapStatus.data.isConfigured;
            connectionStatus = ldapStatus.data.connectionStatus;
          }
        } else if (source === 'upload') {
          // Upload ist immer "konfiguriert"
          isConfigured = true;
          connectionStatus = 'connected';
        } else if (source === 'manual') {
          // Manual ist immer "konfiguriert"
          isConfigured = true;
          connectionStatus = 'connected';
        }

        statusMap[source] = {
          status,
          lastSync,
          userCount,
          isConfigured,
          connectionStatus
        };
      }

      return {
        success: true,
        data: statusMap,
        message: 'Status aller Quellen geladen'
      };

    } catch (error) {
      console.error('❌ Fehler beim Laden des Status aller Quellen:', error);
      return {
        success: false,
        error: 'StatusLoadError',
        message: 'Status konnte nicht geladen werden'
      };
    }
  }

  /**
   * Prüft ob ein Sync für eine Quelle läuft
   */
  isSyncRunning(source: UserSource): boolean {
    return this.runningSyncJobs.has(source);
  }

  /**
   * Bricht einen laufenden Sync ab
   */
  async cancelSync(source: UserSource): Promise<APIResponse<boolean>> {
    try {
      if (!this.runningSyncJobs.has(source)) {
        return {
          success: false,
          error: 'NoSyncRunning',
          message: `Kein laufender Sync für ${source} gefunden`
        };
      }

      const syncJob = this.runningSyncJobs.get(source)!;
      syncJob.status = 'failed';
      syncJob.completedAt = new Date();
      
      this.runningSyncJobs.delete(source);

      console.log(`🛑 Sync für ${source} abgebrochen`);

      return {
        success: true,
        data: true,
        message: `Sync für ${source} abgebrochen`
      };

    } catch (error) {
      console.error(`❌ Fehler beim Abbrechen des Syncs für ${source}:`, error);
      return {
        success: false,
        error: 'CancelError',
        message: `Sync für ${source} konnte nicht abgebrochen werden`
      };
    }
  }

  /**
   * Lädt laufende Sync-Jobs
   */
  getRunningSyncJobs(): SyncJob[] {
    return Array.from(this.runningSyncJobs.values());
  }

  /**
   * Testet Verbindungen zu allen externen Quellen
   */
  async testAllConnections(): Promise<APIResponse<{
    [source in UserSource]?: {
      success: boolean;
      message: string;
      details?: any;
    }
  }>> {
    try {
      console.log('🔧 Teste Verbindungen zu allen Quellen');

      const results: any = {};

      // Entra testen
      if (this.entraService.isConfigured()) {
        const entraTest = await this.entraService.testConnection();
        results.entra = {
          success: entraTest.success,
          message: entraTest.message,
          details: entraTest.data
        };
      } else {
        results.entra = {
          success: false,
          message: 'Entra ID nicht konfiguriert'
        };
      }

      // LDAP testen
      if (this.ldapService.isConfigured()) {
        const ldapTest = await this.ldapService.testConnection();
        results.ldap = {
          success: ldapTest.success,
          message: ldapTest.message,
          details: ldapTest.data
        };
      } else {
        results.ldap = {
          success: false,
          message: 'LDAP nicht konfiguriert'
        };
      }

      // Upload und Manual sind lokale Services
      results.upload = {
        success: true,
        message: 'Upload-Service verfügbar'
      };

      results.manual = {
        success: true,
        message: 'Manual-Service verfügbar'
      };

      return {
        success: true,
        data: results,
        message: 'Verbindungstests abgeschlossen'
      };

    } catch (error) {
      console.error('❌ Fehler beim Testen der Verbindungen:', error);
      return {
        success: false,
        error: 'ConnectionTestError',
        message: 'Verbindungstests fehlgeschlagen'
      };
    }
  }
}
