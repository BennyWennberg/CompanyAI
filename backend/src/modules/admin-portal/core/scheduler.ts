import cron from 'node-cron';
import { SyncOrchestrator } from '../functions/sync-orchestrator';
import { AdminPortalDatabaseManager } from './database-manager';

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

export class SchedulerService {
  private dbManager: AdminPortalDatabaseManager;
  private activeTasks: Map<string, any> = new Map();
  private syncHistory: SyncHistoryEntry[] = [];
  private syncOrchestrator: SyncOrchestrator;

  constructor(dbManager?: AdminPortalDatabaseManager) {
    this.dbManager = dbManager || new AdminPortalDatabaseManager();
    this.syncOrchestrator = new SyncOrchestrator(this.dbManager);
    // initializeScheduleTables wird später in initialize() aufgerufen
  }

  private async initializeScheduleTables(): Promise<void> {
    try {
      // Schedule-Konfiguration in einer separaten DB speichern
      const scheduleDb = this.dbManager.getConnection('scheduler');
      
      await scheduleDb.exec(`
        CREATE TABLE IF NOT EXISTS sync_schedules (
          id TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1,
          cron_expression TEXT NOT NULL,
          description TEXT,
          timezone TEXT DEFAULT 'Europe/Berlin',
          retry_on_error INTEGER DEFAULT 1,
          retry_attempts INTEGER DEFAULT 3,
          retry_delay INTEGER DEFAULT 15,
          last_run TEXT,
          next_run TEXT,
          status TEXT DEFAULT 'inactive',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await scheduleDb.exec(`
        CREATE TABLE IF NOT EXISTS sync_history (
          id TEXT PRIMARY KEY,
          schedule_id TEXT,
          source TEXT NOT NULL,
          trigger_type TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT,
          status TEXT NOT NULL,
          users_processed INTEGER DEFAULT 0,
          users_added INTEGER DEFAULT 0,
          users_updated INTEGER DEFAULT 0,
          error_message TEXT,
          duration INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log('📅 Scheduler-Tabellen erfolgreich initialisiert');
    } catch (error) {
      console.error('❌ Fehler beim Initialisieren der Scheduler-Tabellen:', error);
    }
  }

  /**
   * Standard-Schedules erstellen falls keine vorhanden
   */
  async createDefaultSchedules(): Promise<void> {
    try {
      const existing = await this.getSchedules();
      
      if (existing.length === 0) {
        const defaultSchedules: Omit<SyncScheduleConfig, 'id' | 'lastRun' | 'nextRun'>[] = [
          {
            source: 'entra',
            enabled: true,
            cronExpression: '0 6 * * *', // Täglich 06:00
            description: 'Tägliche Entra ID Synchronisation',
            timezone: 'Europe/Berlin',
            retryOnError: true,
            retryAttempts: 3,
            retryDelay: 15,
            status: 'inactive'
          },
          {
            source: 'ldap',
            enabled: true,
            cronExpression: '15 6 * * *', // Täglich 06:15 (15min nach Entra)
            description: 'Tägliche LDAP Synchronisation',
            timezone: 'Europe/Berlin',
            retryOnError: true,
            retryAttempts: 3,
            retryDelay: 15,
            status: 'inactive'
          }
        ];

        for (const schedule of defaultSchedules) {
          await this.createSchedule(schedule);
        }
        
        console.log('📅 Standard-Schedules erstellt');
      }
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Standard-Schedules:', error);
    }
  }

  /**
   * Schedule erstellen
   */
  async createSchedule(config: Omit<SyncScheduleConfig, 'id' | 'lastRun' | 'nextRun'>): Promise<SyncScheduleConfig> {
    try {
      const scheduleDb = this.dbManager.getConnection('scheduler');
      const id = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const nextRun = this.calculateNextRun(config.cronExpression);
      
      await scheduleDb.run(`
        INSERT INTO sync_schedules (
          id, source, enabled, cron_expression, description, timezone,
          retry_on_error, retry_attempts, retry_delay, next_run, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, config.source, config.enabled ? 1 : 0, config.cronExpression,
        config.description, config.timezone, config.retryOnError ? 1 : 0,
        config.retryAttempts, config.retryDelay, nextRun?.toISOString(), config.status
      ]);

      const newSchedule: SyncScheduleConfig = {
        id,
        ...config,
        nextRun: nextRun || undefined
      };

      // Wenn enabled, Task starten
      if (config.enabled) {
        await this.startScheduledTask(newSchedule);
      }

      return newSchedule;
    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Schedules:', error);
      throw error;
    }
  }

  /**
   * Alle Schedules abrufen
   */
  async getSchedules(): Promise<SyncScheduleConfig[]> {
    try {
      const scheduleDb = this.dbManager.getConnection('scheduler');
      const rows = await scheduleDb.all(`
        SELECT * FROM sync_schedules ORDER BY created_at DESC
      `);

      return rows.map((row: any) => ({
        id: row.id,
        source: row.source,
        enabled: row.enabled === 1,
        cronExpression: row.cron_expression,
        description: row.description,
        timezone: row.timezone,
        retryOnError: row.retry_on_error === 1,
        retryAttempts: row.retry_attempts,
        retryDelay: row.retry_delay,
        lastRun: row.last_run ? new Date(row.last_run) : undefined,
        nextRun: row.next_run ? new Date(row.next_run) : undefined,
        status: row.status
      }));
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Schedules:', error);
      return [];
    }
  }

  /**
   * Schedule aktualisieren
   */
  async updateSchedule(id: string, updates: Partial<SyncScheduleConfig>): Promise<boolean> {
    try {
      const scheduleDb = this.dbManager.getConnection('scheduler');
      
      const setClauses = [];
      const values = [];
      
      if (updates.enabled !== undefined) {
        setClauses.push('enabled = ?');
        values.push(updates.enabled ? 1 : 0);
      }
      if (updates.cronExpression) {
        setClauses.push('cron_expression = ?');
        values.push(updates.cronExpression);
        
        // Neue Next-Run berechnen
        const nextRun = this.calculateNextRun(updates.cronExpression);
        setClauses.push('next_run = ?');
        values.push(nextRun?.toISOString());
      }
      if (updates.description) {
        setClauses.push('description = ?');
        values.push(updates.description);
      }
      if (updates.retryOnError !== undefined) {
        setClauses.push('retry_on_error = ?');
        values.push(updates.retryOnError ? 1 : 0);
      }
      if (updates.retryAttempts) {
        setClauses.push('retry_attempts = ?');
        values.push(updates.retryAttempts);
      }
      if (updates.retryDelay) {
        setClauses.push('retry_delay = ?');
        values.push(updates.retryDelay);
      }

      setClauses.push('updated_at = ?');
      values.push(new Date().toISOString());
      values.push(id);

      await scheduleDb.run(`
        UPDATE sync_schedules SET ${setClauses.join(', ')} WHERE id = ?
      `, values);

      // Task neu starten falls enabled/cron geändert
      if (updates.enabled !== undefined || updates.cronExpression) {
        await this.stopScheduledTask(id);
        if (updates.enabled !== false) {
          const schedule = await this.getScheduleById(id);
          if (schedule) {
            await this.startScheduledTask(schedule);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des Schedules:', error);
      return false;
    }
  }

  /**
   * Schedule abrufen
   */
  async getScheduleById(id: string): Promise<SyncScheduleConfig | null> {
    try {
      const schedules = await this.getSchedules();
      return schedules.find(s => s.id === id) || null;
    } catch (error) {
      console.error('❌ Fehler beim Abrufen des Schedules:', error);
      return null;
    }
  }

  /**
   * Geplanten Task starten
   */
  async startScheduledTask(schedule: SyncScheduleConfig): Promise<void> {
    try {
      // Bestehenden Task stoppen falls vorhanden
      await this.stopScheduledTask(schedule.id);

      const task = cron.schedule(schedule.cronExpression, async () => {
        console.log(`⏰ Scheduled Sync gestartet: ${schedule.source} (${schedule.description})`);
        await this.executeScheduledSync(schedule);
      }, {
        timezone: schedule.timezone
      });

      this.activeTasks.set(schedule.id, task);
      
      // Status aktualisieren
      await this.updateScheduleStatus(schedule.id, 'active');
      
      console.log(`📅 Schedule aktiviert: ${schedule.source} - ${schedule.description}`);
    } catch (error) {
      console.error('❌ Fehler beim Starten des geplanten Tasks:', error);
      await this.updateScheduleStatus(schedule.id, 'error');
    }
  }

  /**
   * Geplanten Task stoppen
   */
  async stopScheduledTask(scheduleId: string): Promise<void> {
    const task = this.activeTasks.get(scheduleId);
    if (task) {
      task.stop();
      task.destroy();
      this.activeTasks.delete(scheduleId);
      await this.updateScheduleStatus(scheduleId, 'inactive');
      console.log(`⏹️ Schedule gestoppt: ${scheduleId}`);
    }
  }

  /**
   * Alle aktiven Schedules starten
   */
  async startAllSchedules(): Promise<void> {
    try {
      const schedules = await this.getSchedules();
      const enabledSchedules = schedules.filter(s => s.enabled);
      
      for (const schedule of enabledSchedules) {
        await this.startScheduledTask(schedule);
      }
      
      console.log(`📅 ${enabledSchedules.length} Schedules gestartet`);
    } catch (error) {
      console.error('❌ Fehler beim Starten aller Schedules:', error);
    }
  }

  /**
   * Geplanten Sync ausführen
   */
  private async executeScheduledSync(schedule: SyncScheduleConfig): Promise<void> {
    const historyEntry: SyncHistoryEntry = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      scheduleId: schedule.id,
      source: schedule.source,
      triggerType: 'scheduled',
      startTime: new Date(),
      status: 'running'
    };

    try {
      // Historie-Eintrag erstellen
      await this.addHistoryEntry(historyEntry);
      
      const startTime = Date.now();
      console.log(`🔄 Starte geplanten ${schedule.source} Sync...`);
      
      // Sync ausführen
      const syncResult = await this.syncOrchestrator.syncSource(
        schedule.source,
        'full',
        'Scheduler-Service'
      );

      const duration = Date.now() - startTime;

      // Historie aktualisieren
      historyEntry.endTime = new Date();
      historyEntry.status = syncResult.success ? 'completed' : 'failed';
      historyEntry.usersProcessed = syncResult.data?.results?.totalProcessed || 0;
      historyEntry.usersAdded = syncResult.data?.results?.added || 0;
      historyEntry.usersUpdated = syncResult.data?.results?.updated || 0;
      historyEntry.duration = duration;
      historyEntry.errorMessage = syncResult.error;

      await this.updateHistoryEntry(historyEntry);
      
      // Schedule Status aktualisieren
      await this.updateScheduleLastRun(schedule.id, new Date());

      if (syncResult.success) {
        console.log(`✅ Geplanter ${schedule.source} Sync erfolgreich (${duration}ms)`);
      } else {
        console.error(`❌ Geplanter ${schedule.source} Sync fehlgeschlagen:`, syncResult.error);
        
        // Retry-Logic
        if (schedule.retryOnError) {
          await this.scheduleRetry(schedule, historyEntry.id);
        }
      }

    } catch (error) {
      console.error(`❌ Fehler beim geplanten ${schedule.source} Sync:`, error);
      
      // Fehler-Historie
      historyEntry.endTime = new Date();
      historyEntry.status = 'failed';
      historyEntry.errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      await this.updateHistoryEntry(historyEntry);
      
      // Retry-Logic
      if (schedule.retryOnError) {
        await this.scheduleRetry(schedule, historyEntry.id);
      }
    }
  }

  /**
   * Retry planen
   */
  private async scheduleRetry(schedule: SyncScheduleConfig, failedHistoryId: string): Promise<void> {
    const retryCount = await this.getRetryCount(failedHistoryId);
    
    if (retryCount < schedule.retryAttempts) {
      console.log(`🔄 Plane Retry ${retryCount + 1}/${schedule.retryAttempts} für ${schedule.source} in ${schedule.retryDelay} Minuten`);
      
      setTimeout(async () => {
        const retryHistoryEntry: SyncHistoryEntry = {
          id: `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          scheduleId: schedule.id,
          source: schedule.source,
          triggerType: 'retry',
          startTime: new Date(),
          status: 'running'
        };

        try {
          await this.addHistoryEntry(retryHistoryEntry);
          
          const startTime = Date.now();
          const syncResult = await this.syncOrchestrator.syncSource(
            schedule.source,
            'full',
            `Retry ${retryCount + 1}/${schedule.retryAttempts}`
          );

          const duration = Date.now() - startTime;

          retryHistoryEntry.endTime = new Date();
          retryHistoryEntry.status = syncResult.success ? 'completed' : 'failed';
          retryHistoryEntry.usersProcessed = syncResult.data?.results?.totalProcessed || 0;
          retryHistoryEntry.usersAdded = syncResult.data?.results?.added || 0;
          retryHistoryEntry.usersUpdated = syncResult.data?.results?.updated || 0;
          retryHistoryEntry.duration = duration;
          retryHistoryEntry.errorMessage = syncResult.error;

          await this.updateHistoryEntry(retryHistoryEntry);

          if (syncResult.success) {
            console.log(`✅ Retry ${retryCount + 1} für ${schedule.source} erfolgreich`);
          } else if (retryCount + 1 < schedule.retryAttempts) {
            await this.scheduleRetry(schedule, failedHistoryId);
          } else {
            console.error(`❌ Alle Retry-Versuche für ${schedule.source} fehlgeschlagen`);
          }

        } catch (error) {
          console.error(`❌ Retry-Fehler für ${schedule.source}:`, error);
          retryHistoryEntry.endTime = new Date();
          retryHistoryEntry.status = 'failed';
          retryHistoryEntry.errorMessage = error instanceof Error ? error.message : 'Retry-Fehler';
          await this.updateHistoryEntry(retryHistoryEntry);
        }
      }, schedule.retryDelay * 60 * 1000);
    }
  }

  /**
   * Retry-Anzahl für fehlgeschlagenen Sync ermitteln
   */
  private async getRetryCount(originalHistoryId: string): Promise<number> {
    try {
      const scheduleDb = this.dbManager.getConnection('scheduler');
      const result = await scheduleDb.get(`
        SELECT COUNT(*) as retry_count FROM sync_history 
        WHERE trigger_type = 'retry' AND created_at > (
          SELECT created_at FROM sync_history WHERE id = ?
        )
      `, [originalHistoryId]);
      
      return result?.retry_count || 0;
    } catch (error) {
      console.error('❌ Fehler beim Ermitteln der Retry-Anzahl:', error);
      return 0;
    }
  }

  /**
   * Nächste Ausführungszeit berechnen
   */
  private calculateNextRun(cronExpression: string): Date | null {
    try {
      // Verwende eine simple Implementierung für die häufigsten Fälle
      const [minute, hour, day, month, weekday] = cronExpression.split(' ');
      
      const now = new Date();
      const next = new Date();
      
      if (hour !== '*') {
        next.setHours(parseInt(hour));
      }
      if (minute !== '*') {
        next.setMinutes(parseInt(minute));
      }
      next.setSeconds(0);
      next.setMilliseconds(0);
      
      // Wenn die Zeit heute schon vorbei ist, nächster Tag
      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
      
      return next;
    } catch (error) {
      console.error('❌ Fehler beim Berechnen der nächsten Ausführungszeit:', error);
      return null;
    }
  }

  /**
   * Schedule Status aktualisieren
   */
  private async updateScheduleStatus(scheduleId: string, status: SyncScheduleConfig['status']): Promise<void> {
    try {
      const scheduleDb = this.dbManager.getConnection('scheduler');
      await scheduleDb.run(`
        UPDATE sync_schedules SET status = ?, updated_at = ? WHERE id = ?
      `, [status, new Date().toISOString(), scheduleId]);
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des Schedule-Status:', error);
    }
  }

  /**
   * Schedule lastRun aktualisieren
   */
  private async updateScheduleLastRun(scheduleId: string, lastRun: Date): Promise<void> {
    try {
      const scheduleDb = this.dbManager.getConnection('scheduler');
      const nextRun = await this.getScheduleById(scheduleId);
      const newNextRun = nextRun ? this.calculateNextRun(nextRun.cronExpression) : null;
      
      await scheduleDb.run(`
        UPDATE sync_schedules SET last_run = ?, next_run = ?, updated_at = ? WHERE id = ?
      `, [lastRun.toISOString(), newNextRun?.toISOString(), new Date().toISOString(), scheduleId]);
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren der Schedule-Zeit:', error);
    }
  }

  /**
   * Historie-Eintrag hinzufügen
   */
  async addHistoryEntry(entry: SyncHistoryEntry): Promise<void> {
    try {
      const scheduleDb = this.dbManager.getConnection('scheduler');
      await scheduleDb.run(`
        INSERT INTO sync_history (
          id, schedule_id, source, trigger_type, start_time, end_time,
          status, users_processed, users_added, users_updated, 
          error_message, duration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        entry.id, entry.scheduleId, entry.source, entry.triggerType,
        entry.startTime.toISOString(), entry.endTime?.toISOString(),
        entry.status, entry.usersProcessed, entry.usersAdded, 
        entry.usersUpdated, entry.errorMessage, entry.duration
      ]);
    } catch (error) {
      console.error('❌ Fehler beim Hinzufügen des Historie-Eintrags:', error);
    }
  }

  /**
   * Historie-Eintrag aktualisieren
   */
  async updateHistoryEntry(entry: SyncHistoryEntry): Promise<void> {
    try {
      const scheduleDb = this.dbManager.getConnection('scheduler');
      await scheduleDb.run(`
        UPDATE sync_history SET 
          end_time = ?, status = ?, users_processed = ?, users_added = ?,
          users_updated = ?, error_message = ?, duration = ?
        WHERE id = ?
      `, [
        entry.endTime?.toISOString(), entry.status, entry.usersProcessed,
        entry.usersAdded, entry.usersUpdated, entry.errorMessage, 
        entry.duration, entry.id
      ]);
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des Historie-Eintrags:', error);
    }
  }

  /**
   * Sync-Historie abrufen
   */
  async getSyncHistory(limit: number = 50): Promise<SyncHistoryEntry[]> {
    try {
      const scheduleDb = this.dbManager.getConnection('scheduler');
      const rows = await scheduleDb.all(`
        SELECT * FROM sync_history 
        ORDER BY start_time DESC 
        LIMIT ?
      `, [limit]);

      return rows.map((row: any) => ({
        id: row.id,
        scheduleId: row.schedule_id,
        source: row.source,
        triggerType: row.trigger_type,
        startTime: new Date(row.start_time),
        endTime: row.end_time ? new Date(row.end_time) : undefined,
        status: row.status,
        usersProcessed: row.users_processed,
        usersAdded: row.users_added,
        usersUpdated: row.users_updated,
        errorMessage: row.error_message,
        duration: row.duration
      }));
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Sync-Historie:', error);
      return [];
    }
  }

  /**
   * Alle Tasks stoppen
   */
  async stopAllTasks(): Promise<void> {
    for (const [scheduleId, task] of this.activeTasks) {
      task.stop();
      task.destroy();
      await this.updateScheduleStatus(scheduleId, 'inactive');
    }
    this.activeTasks.clear();
    console.log('⏹️ Alle geplanten Tasks gestoppt');
  }

  /**
   * Scheduler-Service initialisieren
   */
  async initialize(): Promise<void> {
    try {
      // Erst Tabellen initialisieren
      await this.initializeScheduleTables();
      
      // Dann Default-Schedules und starten
      await this.createDefaultSchedules();
      await this.startAllSchedules();
      console.log('📅 Scheduler-Service erfolgreich initialisiert');
    } catch (error) {
      console.error('❌ Fehler beim Initialisieren des Scheduler-Service:', error);
    }
  }

  /**
   * Schedule löschen
   */
  async deleteSchedule(id: string): Promise<boolean> {
    try {
      await this.stopScheduledTask(id);
      
      const scheduleDb = this.dbManager.getConnection('scheduler');
      await scheduleDb.run('DELETE FROM sync_schedules WHERE id = ?', [id]);
      
      console.log(`🗑️ Schedule gelöscht: ${id}`);
      return true;
    } catch (error) {
      console.error('❌ Fehler beim Löschen des Schedules:', error);
      return false;
    }
  }

  /**
   * Sync-Statistiken abrufen
   */
  async getSyncStats(): Promise<any> {
    try {
      const scheduleDb = this.dbManager.getConnection('scheduler');
      
      const totalSyncs = await scheduleDb.get(`
        SELECT COUNT(*) as total FROM sync_history WHERE status = 'completed'
      `);
      
      const todaySyncs = await scheduleDb.get(`
        SELECT COUNT(*) as today FROM sync_history 
        WHERE status = 'completed' AND DATE(start_time) = DATE('now')
      `);
      
      const recentErrors = await scheduleDb.all(`
        SELECT * FROM sync_history 
        WHERE status = 'failed' 
        ORDER BY start_time DESC LIMIT 5
      `);

      const sourcesStats = await scheduleDb.all(`
        SELECT 
          source,
          COUNT(*) as total_syncs,
          SUM(users_processed) as total_users,
          AVG(duration) as avg_duration,
          MAX(start_time) as last_sync
        FROM sync_history 
        WHERE status = 'completed'
        GROUP BY source
      `);

      return {
        totalSyncs: totalSyncs?.total || 0,
        todaySyncs: todaySyncs?.today || 0,
        recentErrors: recentErrors || [],
        sourcesStats: sourcesStats || []
      };
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Sync-Statistiken:', error);
      return null;
    }
  }
}

// SchedulerService wird vom AdminPortalOrchestrator verwaltet
// Kein Singleton erforderlich
