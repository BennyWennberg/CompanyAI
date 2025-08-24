import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs/promises';
import { 
  UserSource, 
  DatabaseConfig, 
  SchemaField, 
  DEFAULT_SCHEMA_FIELDS,
  DynamicUser,
  APIResponse 
} from '../types';

/**
 * Database-Manager für 4 externe SQLite-Datenbanken
 * Verwaltet Schema-Migration und CRUD-Operationen
 */
export class AdminPortalDatabaseManager {
  private databases: Map<UserSource, Database> = new Map();
  private schedulerDb: Database | null = null;
  private analyticsDb: Database | null = null;
  private auditDb: Database | null = null;
  private cacheDb: Database | null = null;
  private basePath: string;
  
  constructor(basePath?: string) {
    this.basePath = basePath || process.env.ADMIN_PORTAL_DB_PATH || 
                   path.join(process.cwd(), '..', '${ADMIN_DATA_PATH}', 'databases', 'Users');
  }

  /**
   * Initialisiert alle 4 Datenbanken
   */
  async initialize(): Promise<APIResponse<boolean>> {
    try {
      // Sicherstellen, dass der Ordner existiert
      await this.ensureDirectoryExists();

      // Alle 4 Quellen-Datenbanken initialisieren
      const sources: UserSource[] = ['entra', 'ldap', 'upload', 'manual'];
      
      for (const source of sources) {
        await this.initializeDatabase(source);
      }

      // Scheduler-Datenbank initialisieren
      await this.initializeSchedulerDatabase();

      console.log('🗃️ Admin-Portal Datenbanken erfolgreich initialisiert');
      return {
        success: true,
        data: true,
        message: '4 Datenbanken erfolgreich initialisiert'
      };

    } catch (error) {
      console.error('❌ Fehler bei Datenbankinitialisierung:', error);
      return {
        success: false,
        error: 'DatabaseInitializationError',
        message: 'Datenbanken konnten nicht initialisiert werden'
      };
    }
  }

  /**
   * Initialisiert eine einzelne Datenbank pro Quelle
   */
  private async initializeDatabase(source: UserSource): Promise<void> {
    const dbPath = path.join(this.basePath, `db_${source}.sqlite`);
    
    console.log(`📁 Initialisiere ${source} Datenbank: ${dbPath}`);
    
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Standard-Schema erstellen
    await this.createBaseSchema(db, source);
    
    // Schema-Registry initialisieren
    await this.initializeSchemaRegistry(db, source);
    
    this.databases.set(source, db);
  }

  /**
   * Erstellt das Basis-Schema für Users-Tabelle
   */
  private async createBaseSchema(db: Database, source: UserSource): Promise<void> {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        firstName TEXT,
        lastName TEXT,
        displayName TEXT,
        isActive BOOLEAN DEFAULT 1,
        lastSync DATETIME NOT NULL,
        source TEXT NOT NULL DEFAULT '${source}',
        externalId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createSchemaRegistryTable = `
      CREATE TABLE IF NOT EXISTS schema_registry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fieldName TEXT NOT NULL,
        dataType TEXT NOT NULL,
        maxLength INTEGER,
        isRequired BOOLEAN DEFAULT 0,
        addedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        source TEXT NOT NULL
      )
    `;

    await db.exec(createUsersTable);
    await db.exec(createSchemaRegistryTable);
    
    // Indices für Performance
    await db.exec('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_users_source ON users(source)');
    await db.exec('CREATE INDEX IF NOT EXISTS idx_users_lastSync ON users(lastSync)');
  }

  /**
   * Initialisiert Schema-Registry mit Standard-Feldern
   */
  private async initializeSchemaRegistry(db: Database, source: UserSource): Promise<void> {
    // Prüfen ob bereits initialisiert
    const existingFields = await db.get('SELECT COUNT(*) as count FROM schema_registry');
    if (existingFields.count > 0) {
      return; // Bereits initialisiert
    }

    // Standard-Felder in Schema-Registry einfügen
    const insertField = `
      INSERT INTO schema_registry (fieldName, dataType, maxLength, isRequired, source)
      VALUES (?, ?, ?, ?, ?)
    `;

    for (const field of DEFAULT_SCHEMA_FIELDS) {
      await db.run(insertField, [
        field.fieldName,
        field.dataType,
        field.maxLength,
        field.isRequired ? 1 : 0,
        source
      ]);
    }
  }

  /**
   * Auto-Migration: Neue Felder zur Datenbank hinzufügen
   */
  async addField(source: UserSource, field: SchemaField): Promise<APIResponse<boolean>> {
    try {
      const db = this.databases.get(source);
      if (!db) {
        return {
          success: false,
          error: 'DatabaseNotFound',
          message: `Datenbank für ${source} nicht gefunden`
        };
      }

      // Prüfen ob Feld bereits existiert
      const existingField = await db.get(
        'SELECT fieldName FROM schema_registry WHERE fieldName = ? AND source = ?',
        [field.fieldName, source]
      );

      if (existingField) {
        return {
          success: true,
          data: false,
          message: `Feld ${field.fieldName} bereits vorhanden`
        };
      }

      // ALTER TABLE für neues Feld
      let alterQuery = `ALTER TABLE users ADD COLUMN ${field.fieldName} ${field.dataType}`;
      
      if (field.maxLength && field.dataType === 'TEXT') {
        alterQuery += `(${field.maxLength})`;
      }
      
      if (field.isRequired) {
        alterQuery += ' NOT NULL DEFAULT ""';
      }

      await db.exec(alterQuery);

      // Schema-Registry aktualisieren
      await db.run(
        'INSERT INTO schema_registry (fieldName, dataType, maxLength, isRequired, source) VALUES (?, ?, ?, ?, ?)',
        [field.fieldName, field.dataType, field.maxLength, field.isRequired ? 1 : 0, source]
      );

      console.log(`✅ Neues Feld hinzugefügt: ${source}.${field.fieldName} (${field.dataType})`);
      
      return {
        success: true,
        data: true,
        message: `Feld ${field.fieldName} erfolgreich hinzugefügt`
      };

    } catch (error) {
      console.error(`❌ Fehler beim Hinzufügen des Feldes ${field.fieldName}:`, error);
      return {
        success: false,
        error: 'FieldAddError',
        message: `Feld ${field.fieldName} konnte nicht hinzugefügt werden`
      };
    }
  }

  /**
   * Lädt alle User aus einer Datenbank
   */
  async getUsers(source: UserSource, limit?: number, offset?: number): Promise<APIResponse<DynamicUser[]>> {
    try {
      const db = this.databases.get(source);
      if (!db) {
        return {
          success: false,
          error: 'DatabaseNotFound',
          message: `Datenbank für ${source} nicht gefunden`
        };
      }

      let query = 'SELECT * FROM users ORDER BY updatedAt DESC';
      const params: any[] = [];

      if (limit) {
        query += ' LIMIT ?';
        params.push(limit);
        
        if (offset) {
          query += ' OFFSET ?';
          params.push(offset);
        }
      }

      const users = await db.all(query, params);
      
      // SQLite BOOLEAN als 0/1 zu boolean konvertieren
      const convertedUsers: DynamicUser[] = users.map(user => ({
        ...user,
        isActive: Boolean(user.isActive),
        lastSync: new Date(user.lastSync),
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
        source: source
      }));

      return {
        success: true,
        data: convertedUsers,
        message: `${convertedUsers.length} User aus ${source} geladen`
      };

    } catch (error) {
      console.error(`❌ Fehler beim Laden der User aus ${source}:`, error);
      return {
        success: false,
        error: 'UserLoadError',
        message: `User aus ${source} konnten nicht geladen werden`
      };
    }
  }

  /**
   * Speichert/aktualisiert einen User (UPSERT)
   */
  async upsertUser(source: UserSource, user: Partial<DynamicUser>): Promise<APIResponse<DynamicUser>> {
    try {
      const db = this.databases.get(source);
      if (!db) {
        return {
          success: false,
          error: 'DatabaseNotFound',
          message: `Datenbank für ${source} nicht gefunden`
        };
      }

      // Schema der Tabelle laden
      const schema = await this.getSchema(source);
      if (!schema.success || !schema.data) {
        return {
          success: false,
          error: 'SchemaLoadError',
          message: 'Schema konnte nicht geladen werden'
        };
      }

      // Nur bekannte Felder verwenden
      const knownFields = schema.data.fields.map(f => f.fieldName);
      const filteredUser: any = {};
      
      for (const [key, value] of Object.entries(user)) {
        if (knownFields.includes(key)) {
          filteredUser[key] = value;
        }
      }

      // Timestamps setzen
      filteredUser.updatedAt = new Date().toISOString();
      if (!filteredUser.id) {
        filteredUser.id = `${source}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        filteredUser.createdAt = filteredUser.updatedAt;
      }
      filteredUser.source = source;

      // UPSERT Query bauen
      const fields = Object.keys(filteredUser);
      const values = Object.values(filteredUser);
      
      const insertQuery = `
        INSERT OR REPLACE INTO users (${fields.join(', ')})
        VALUES (${fields.map(() => '?').join(', ')})
      `;

      await db.run(insertQuery, values);

      return {
        success: true,
        data: filteredUser as DynamicUser,
        message: `User ${filteredUser.email} erfolgreich gespeichert`
      };

    } catch (error) {
      console.error(`❌ Fehler beim Speichern des Users in ${source}:`, error);
      return {
        success: false,
        error: 'UserSaveError',
        message: 'User konnte nicht gespeichert werden'
      };
    }
  }

  /**
   * Löscht alle User aus einer Quelle (für Replace-Mode)
   */
  async truncateUsers(source: UserSource): Promise<APIResponse<boolean>> {
    try {
      const db = this.databases.get(source);
      if (!db) {
        return {
          success: false,
          error: 'DatabaseNotFound',
          message: `Datenbank für ${source} nicht gefunden`
        };
      }

      await db.run('DELETE FROM users');
      
      console.log(`🗑️ Alle User aus ${source} gelöscht`);
      
      return {
        success: true,
        data: true,
        message: `Alle User aus ${source} gelöscht`
      };

    } catch (error) {
      console.error(`❌ Fehler beim Löschen der User aus ${source}:`, error);
      return {
        success: false,
        error: 'UserDeleteError',
        message: `User aus ${source} konnten nicht gelöscht werden`
      };
    }
  }

  /**
   * Lädt Schema einer Datenbank
   */
  async getSchema(source: UserSource): Promise<APIResponse<{ fields: SchemaField[] }>> {
    try {
      const db = this.databases.get(source);
      if (!db) {
        return {
          success: false,
          error: 'DatabaseNotFound',
          message: `Datenbank für ${source} nicht gefunden`
        };
      }

      const fields = await db.all('SELECT * FROM schema_registry ORDER BY addedAt');
      
      const schemaFields: SchemaField[] = fields.map(field => ({
        fieldName: field.fieldName,
        dataType: field.dataType,
        maxLength: field.maxLength,
        isRequired: Boolean(field.isRequired),
        addedAt: new Date(field.addedAt),
        source: field.source
      }));

      return {
        success: true,
        data: { fields: schemaFields },
        message: `Schema für ${source} geladen`
      };

    } catch (error) {
      console.error(`❌ Fehler beim Laden des Schemas für ${source}:`, error);
      return {
        success: false,
        error: 'SchemaLoadError',
        message: `Schema für ${source} konnte nicht geladen werden`
      };
    }
  }

  /**
   * Zählt User pro Quelle
   */
  async getUserCount(source: UserSource): Promise<APIResponse<number>> {
    try {
      const db = this.databases.get(source);
      if (!db) {
        return {
          success: false,
          error: 'DatabaseNotFound',
          message: `Datenbank für ${source} nicht gefunden`
        };
      }

      const result = await db.get('SELECT COUNT(*) as count FROM users');
      
      return {
        success: true,
        data: result.count,
        message: `${result.count} User in ${source}`
      };

    } catch (error) {
      console.error(`❌ Fehler beim Zählen der User in ${source}:`, error);
      return {
        success: false,
        error: 'UserCountError',
        message: `User-Anzahl für ${source} konnte nicht ermittelt werden`
      };
    }
  }

  /**
   * Initialisiert die Scheduler-Datenbank
   */
  private async initializeSchedulerDatabase(): Promise<void> {
    const dbPath = path.join(this.basePath, 'db_scheduler.sqlite');
    
    console.log(`📅 Initialisiere Scheduler-Datenbank: ${dbPath}`);
    
    this.schedulerDb = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Schedule-Tabellen erstellen
    await this.schedulerDb.exec(`
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

    await this.schedulerDb.exec(`
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
  }

  /**
   * Datenbankverbindung abrufen
   */
  getConnection(type: UserSource | 'scheduler' | 'analytics' | 'audit' | 'cache'): Database {
    switch (type) {
      case 'scheduler':
        if (!this.schedulerDb) {
          throw new Error('Scheduler-Datenbank nicht initialisiert');
        }
        return this.schedulerDb;
      
      case 'analytics':
        if (!this.analyticsDb) {
          throw new Error('Analytics-Datenbank nicht initialisiert');
        }
        return this.analyticsDb;
        
      case 'audit':
        if (!this.auditDb) {
          throw new Error('Audit-Datenbank nicht initialisiert');
        }
        return this.auditDb;
        
      case 'cache':
        if (!this.cacheDb) {
          throw new Error('Cache-Datenbank nicht initialisiert');
        }
        return this.cacheDb;
      
      default:
        const db = this.databases.get(type as UserSource);
        if (!db) {
          throw new Error(`Datenbank für ${type} nicht gefunden`);
        }
        return db;
    }
  }

  /**
   * Schließt alle Datenbankverbindungen
   */
  async close(): Promise<void> {
    for (const [source, db] of this.databases) {
      await db.close();
      console.log(`🔐 Datenbank ${source} geschlossen`);
    }
    
    if (this.schedulerDb) {
      await this.schedulerDb.close();
      console.log('🔐 Scheduler-Datenbank geschlossen');
    }
    
    if (this.analyticsDb) {
      await this.analyticsDb.close();
      console.log('🔐 Analytics-Datenbank geschlossen');
    }
    
    if (this.auditDb) {
      await this.auditDb.close();
      console.log('🔐 Audit-Datenbank geschlossen');
    }
    
    if (this.cacheDb) {
      await this.cacheDb.close();
      console.log('🔐 Cache-Datenbank geschlossen');
    }
    
    this.databases.clear();
  }

  /**
   * Stellt sicher, dass das Verzeichnis existiert
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.basePath);
    } catch {
      await fs.mkdir(this.basePath, { recursive: true });
      console.log(`📁 Verzeichnis erstellt: ${this.basePath}`);
    }
  }

  /**
   * Prüft ob eine Datenbank verfügbar ist
   */
  isDatabaseReady(source: UserSource): boolean {
    return this.databases.has(source);
  }

  /**
   * Exportiert alle Datenbanken als JSON (für Backup)
   */
  async exportAllSources(): Promise<APIResponse<{[source: string]: DynamicUser[]}>> {
    try {
      const exports: {[source: string]: DynamicUser[]} = {};
      
      for (const source of ['entra', 'ldap', 'upload', 'manual'] as UserSource[]) {
        const usersResult = await this.getUsers(source);
        if (usersResult.success && usersResult.data) {
          exports[source] = usersResult.data;
        }
      }

      return {
        success: true,
        data: exports,
        message: 'Alle Datenbanken erfolgreich exportiert'
      };

    } catch (error) {
      console.error('❌ Fehler beim Exportieren der Datenbanken:', error);
      return {
        success: false,
        error: 'ExportError',
        message: 'Datenbanken konnten nicht exportiert werden'
      };
    }
  }
}

// Singleton-Instanz für anderen Module
export const DatabaseManager = AdminPortalDatabaseManager;
