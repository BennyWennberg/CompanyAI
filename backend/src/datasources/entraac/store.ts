// EntraAC Integration - SQLite Data Store with Dynamic Schema Detection
// Verwaltet die persistent gespeicherten Entra ID Daten (Users und Devices)

import { EntraUser, EntraDevice, SyncStatus } from './types';
import { Database } from 'sqlite3';
import path from 'path';

// SQLite Database Connection
let db: Database | null = null;
let isDbInitialized = false;

// In-Memory Cache für bessere Performance
let cachedUsers: EntraUser[] = [];
let cachedDevices: EntraDevice[] = [];
let lastSyncStatus: SyncStatus = {
  lastSyncTime: '',
  usersCount: 0,
  devicesCount: 0,
  success: false
};

/**
 * Analysiert Datentyp eines Wertes
 */
function detectDataType(value: any): string {
  if (value === null || value === undefined) return 'TEXT';
  if (typeof value === 'boolean') return 'INTEGER'; // SQLite: 0/1 for boolean
  if (typeof value === 'number') return Number.isInteger(value) ? 'INTEGER' : 'REAL';
  if (typeof value === 'string') {
    // Check if it's a date
    if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) || value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return 'TEXT'; // SQLite stores dates as TEXT
    }
    return 'TEXT';
  }
  if (Array.isArray(value)) return 'TEXT'; // JSON serialized
  if (typeof value === 'object') return 'TEXT'; // JSON serialized
  return 'TEXT';
}

/**
 * Erstellt SQLite Schema basierend auf Datenobjekt
 */
function generateCreateTableSQL(tableName: string, sampleData: any[]): string {
  if (!sampleData || sampleData.length === 0) {
    throw new Error(`Cannot create schema for ${tableName}: No sample data provided`);
  }

  console.log(`🔍 EntraAC: Analyzing ${sampleData.length} records to generate schema for ${tableName}...`);

  // Analysiere alle Objekte um alle möglichen Felder zu finden
  const allFields = new Set<string>();
  const fieldTypes = new Map<string, string>();
  const fieldExamples = new Map<string, any>();

  sampleData.forEach(obj => {
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) { // Nur definierte Werte analysieren
        allFields.add(key);
        const currentType = detectDataType(obj[key]);
        fieldExamples.set(key, obj[key]);
        
        // Bevorzuge TEXT wenn verschiedene Typen gefunden werden
        if (fieldTypes.has(key)) {
          const existingType = fieldTypes.get(key);
          if (existingType !== currentType) {
            fieldTypes.set(key, 'TEXT');
          }
        } else {
          fieldTypes.set(key, currentType);
        }
      }
    });
  });

  console.log(`📊 EntraAC: Detected ${allFields.size} fields in ${tableName}:`);
  Array.from(allFields).slice(0, 10).forEach(field => {
    const type = fieldTypes.get(field);
    const example = fieldExamples.get(field);
    console.log(`   ${field}: ${type} (e.g. "${example}")`);
  });
  if (allFields.size > 10) {
    console.log(`   ... and ${allFields.size - 10} more fields`);
  }

  // SQL generieren
  const columns = Array.from(allFields).map(field => {
    const type = fieldTypes.get(field) || 'TEXT';
    const isId = field === 'id';
    return `${field} ${type}${isId ? ' PRIMARY KEY' : ''}`;
  });

  return `DROP TABLE IF EXISTS ${tableName};
CREATE TABLE ${tableName} (
    ${columns.join(',\n    ')},
    synced_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`;
}

/**
 * Initialisiert SQLite Datenbank mit Admin-Portal Pfad-Struktur
 */
async function initializeDatabase(): Promise<void> {
  if (isDbInitialized) return;

  return new Promise((resolve, reject) => {
    // Environment-basierter Pfad: ${ADMIN_DATA_PATH}/databases/Users/db_entra.sqlite
    const adminDataPath = process.env.ADMIN_DATA_PATH || 'admin-data';
    const dbPath = path.join(process.cwd(), adminDataPath, 'databases', 'Users', 'db_entra.sqlite');
    
    // Erstelle Ordner-Struktur falls nicht vorhanden
    const fs = require('fs');
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 EntraAC: Created database directory structure: ${dataDir}`);
    }

    db = new Database(dbPath, (err) => {
      if (err) {
        console.error('❌ EntraAC: Failed to initialize SQLite database:', err);
        reject(err);
        return;
      }

      console.log(`💾 EntraAC: SQLite database connected at ${dbPath}`);
      
      // Erstelle Sync-Status Tabelle
      db!.run(`
        CREATE TABLE IF NOT EXISTS sync_status (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          lastSyncTime TEXT,
          usersCount INTEGER DEFAULT 0,
          devicesCount INTEGER DEFAULT 0,
          success INTEGER DEFAULT 0,
          error TEXT,
          duration_ms INTEGER,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('❌ EntraAC: Failed to create sync_status table:', err);
          reject(err);
          return;
        }

        isDbInitialized = true;
        loadSyncStatus().then(() => {
          console.log('✅ EntraAC: Database initialized successfully');
          resolve();
        }).catch(reject);
      });
    });
  });
}

/**
 * Lädt Sync-Status aus Datenbank
 */
async function loadSyncStatus(): Promise<void> {
  if (!db) return;

  return new Promise((resolve) => {
    db!.get('SELECT * FROM sync_status ORDER BY id DESC LIMIT 1', (err, row: any) => {
      if (err) {
        console.error('❌ EntraAC: Failed to load sync status:', err);
      } else if (row) {
        lastSyncStatus = {
          lastSyncTime: row.lastSyncTime || '',
          usersCount: row.usersCount || 0,
          devicesCount: row.devicesCount || 0,
          success: !!row.success,
          error: row.error
        };
        console.log(`📊 EntraAC: Loaded last sync: ${lastSyncStatus.lastSyncTime} (${lastSyncStatus.usersCount} users, ${lastSyncStatus.devicesCount} devices)`);
      }
      resolve();
    });
  });
}

/**
 * Erstellt/erweitert Tabelle basierend auf Datenstruktur
 */
async function ensureTableSchema(tableName: string, data: any[]): Promise<void> {
  if (!db || !data || data.length === 0) return;

  return new Promise((resolve, reject) => {
    // Prüfe ob Tabelle existiert
    // Erstelle Tabelle immer neu mit aktuellem Schema (DROP + CREATE)
    const createSQL = generateCreateTableSQL(tableName, data);
    console.log(`🏗️ EntraAC: Creating/Recreating table ${tableName} with dynamic schema...`);
    
    // Führe SQL aus (DROP + CREATE)
    db!.exec(createSQL, (err) => {
      if (err) {
        console.error(`❌ EntraAC: Failed to create table ${tableName}:`, err);
        reject(err);
      } else {
        console.log(`✅ EntraAC: Created table ${tableName} with dynamic schema`);
        resolve();
      }
    });
  });
}

/**
 * Serialisiert komplexe Datentypen für SQLite
 */
function serializeForSQLite(obj: any): any {
  const serialized: any = {};
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    if (value === null || value === undefined) {
      serialized[key] = null;
    } else if (typeof value === 'boolean') {
      serialized[key] = value ? 1 : 0;
    } else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      serialized[key] = JSON.stringify(value);
    } else {
      serialized[key] = value;
    }
  });

  return serialized;
}

/**
 * Deserialisiert Daten aus SQLite
 */
function deserializeFromSQLite(obj: any): any {
  if (!obj) return obj;
  
  const result = { ...obj };
  
  Object.keys(result).forEach(key => {
    const value = result[key];
    
    // Boolean-Konvertierung für *Enabled Felder
    if (key.includes('Enabled') || key.includes('enabled')) {
      result[key] = !!value;
    }
    
    // JSON-Parsing für Arrays/Objects
    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      try {
        result[key] = JSON.parse(value);
      } catch (e) {
        // Nicht JSON - als String belassen
      }
    }
  });

  return result;
}

/**
 * Speichert Users in SQLite
 */
async function saveUsersToDatabase(users: EntraUser[]): Promise<void> {
  if (!db || !users.length) return;

  await ensureTableSchema('users', users);

  return new Promise((resolve, reject) => {
    db!.run('DELETE FROM users', (err) => {
      if (err) {
        reject(err);
        return;
      }

      const insertSQL = `INSERT INTO users (${Object.keys(users[0]).join(', ')}) VALUES (${Object.keys(users[0]).map(() => '?').join(', ')})`;
      const stmt = db!.prepare(insertSQL);

      users.forEach(user => {
        const serialized = serializeForSQLite(user);
        stmt.run(Object.values(serialized));
      });

      stmt.finalize((err) => {
        if (err) {
          console.error('❌ EntraAC: Failed to save users:', err);
          reject(err);
        } else {
          console.log(`✅ EntraAC: Saved ${users.length} users to database`);
          resolve();
        }
      });
    });
  });
}

/**
 * Lädt Users aus SQLite
 */
async function loadUsersFromDatabase(): Promise<EntraUser[]> {
  if (!db) return [];

  return new Promise((resolve, reject) => {
    db!.all('SELECT * FROM users ORDER BY displayName', (err, rows: any[]) => {
      if (err) {
        if (err.message.includes('no such table')) {
          resolve([]);
        } else {
          reject(err);
        }
        return;
      }

      const users = rows.map(row => deserializeFromSQLite(row) as EntraUser);
      resolve(users);
    });
  });
}

/**
 * Speichert Devices in SQLite
 */
async function saveDevicesToDatabase(devices: EntraDevice[]): Promise<void> {
  if (!db || !devices.length) return;

  await ensureTableSchema('devices', devices);

  return new Promise((resolve, reject) => {
    db!.run('DELETE FROM devices', (err) => {
      if (err) {
        reject(err);
        return;
      }

      if (devices.length === 0) {
        resolve();
        return;
      }

      const insertSQL = `INSERT INTO devices (${Object.keys(devices[0]).join(', ')}) VALUES (${Object.keys(devices[0]).map(() => '?').join(', ')})`;
      const stmt = db!.prepare(insertSQL);

      devices.forEach(device => {
        const serialized = serializeForSQLite(device);
        stmt.run(Object.values(serialized));
      });

      stmt.finalize((err) => {
        if (err) {
          console.error('❌ EntraAC: Failed to save devices:', err);
          reject(err);
        } else {
          console.log(`✅ EntraAC: Saved ${devices.length} devices to database`);
          resolve();
        }
      });
    });
  });
}

/**
 * Lädt Devices aus SQLite
 */
async function loadDevicesFromDatabase(): Promise<EntraDevice[]> {
  if (!db) return [];

  return new Promise((resolve, reject) => {
    db!.all('SELECT * FROM devices ORDER BY displayName', (err, rows: any[]) => {
      if (err) {
        if (err.message.includes('no such table')) {
          resolve([]);
        } else {
          reject(err);
        }
        return;
      }

      const devices = rows.map(row => deserializeFromSQLite(row) as EntraDevice);
      resolve(devices);
    });
  });
}

/**
 * Setzt die Benutzerdaten (mit SQLite Persistence)
 */
export async function setUsers(data: EntraUser[]): Promise<void> {
  await initializeDatabase();
  
  // Cache aktualisieren
  cachedUsers = [...data];
  
  // In Datenbank speichern
  await saveUsersToDatabase(data);
  
  console.log(`💾 EntraAC: ${data.length} users stored (cached + persisted)`);
}

/**
 * Setzt die Gerätedaten (mit SQLite Persistence)
 */
export async function setDevices(data: EntraDevice[]): Promise<void> {
  await initializeDatabase();
  
  // Cache aktualisieren
  cachedDevices = [...data];
  
  // In Datenbank speichern
  await saveDevicesToDatabase(data);
  
  console.log(`💾 EntraAC: ${data.length} devices stored (cached + persisted)`);
}

/**
 * Gibt alle Benutzer zurück (mit DB Fallback)
 */
export async function getUsers(): Promise<EntraUser[]> {
  await initializeDatabase();
  
  // Wenn Cache leer, aus Datenbank laden
  if (cachedUsers.length === 0) {
    cachedUsers = await loadUsersFromDatabase();
    console.log(`📖 EntraAC: Loaded ${cachedUsers.length} users from database`);
  }
  
  return [...cachedUsers];
}

/**
 * Gibt alle Geräte zurück (mit DB Fallback)
 */
export async function getDevices(): Promise<EntraDevice[]> {
  await initializeDatabase();
  
  // Wenn Cache leer, aus Datenbank laden
  if (cachedDevices.length === 0) {
    cachedDevices = await loadDevicesFromDatabase();
    console.log(`📖 EntraAC: Loaded ${cachedDevices.length} devices from database`);
  }
  
  return [...cachedDevices];
}

/**
 * Filtert Benutzer nach Kriterien
 */
export async function findUsers(filter: {
  department?: string;
  accountEnabled?: boolean;
  search?: string;
}): Promise<EntraUser[]> {
  const users = await getUsers();
  let filtered = [...users];

  if (filter.department) {
    filtered = filtered.filter(user => 
      user.department?.toLowerCase().includes(filter.department!.toLowerCase())
    );
  }

  if (filter.accountEnabled !== undefined) {
    filtered = filtered.filter(user => user.accountEnabled === filter.accountEnabled);
  }

  if (filter.search) {
    const searchTerm = filter.search.toLowerCase();
    filtered = filtered.filter(user =>
      user.displayName.toLowerCase().includes(searchTerm) ||
      user.userPrincipalName?.toLowerCase().includes(searchTerm) ||
      user.mail?.toLowerCase().includes(searchTerm) ||
      user.jobTitle?.toLowerCase().includes(searchTerm)
    );
  }

  return filtered;
}

/**
 * Filtert Geräte nach Kriterien
 */
export async function findDevices(filter: {
  operatingSystem?: string;
  accountEnabled?: boolean;
  search?: string;
}): Promise<EntraDevice[]> {
  const devices = await getDevices();
  let filtered = [...devices];

  if (filter.operatingSystem) {
    filtered = filtered.filter(device => 
      device.operatingSystem?.toLowerCase().includes(filter.operatingSystem!.toLowerCase())
    );
  }

  if (filter.accountEnabled !== undefined) {
    filtered = filtered.filter(device => device.accountEnabled === filter.accountEnabled);
  }

  if (filter.search) {
    const searchTerm = filter.search.toLowerCase();
    filtered = filtered.filter(device =>
      device.displayName.toLowerCase().includes(searchTerm) ||
      device.deviceId?.toLowerCase().includes(searchTerm) ||
      device.operatingSystem?.toLowerCase().includes(searchTerm)
    );
  }

  return filtered;
}

/**
 * Gibt einen Benutzer nach ID zurück
 */
export async function getUserById(id: string): Promise<EntraUser | undefined> {
  const users = await getUsers();
  return users.find(user => user.id === id);
}

/**
 * Gibt ein Gerät nach ID zurück
 */
export async function getDeviceById(id: string): Promise<EntraDevice | undefined> {
  const devices = await getDevices();
  return devices.find(device => device.id === id);
}

/**
 * Aktualisiert den Sync-Status (mit DB Persistence)
 */
export async function updateSyncStatus(status: Partial<SyncStatus>): Promise<void> {
  await initializeDatabase();
  
  lastSyncStatus = {
    ...lastSyncStatus,
    ...status,
    lastSyncTime: new Date().toISOString()
  };

  if (!db) return;

  return new Promise((resolve, reject) => {
    db!.run(
      'INSERT INTO sync_status (lastSyncTime, usersCount, devicesCount, success, error, duration_ms) VALUES (?, ?, ?, ?, ?, ?)',
      [
        lastSyncStatus.lastSyncTime,
        lastSyncStatus.usersCount || 0,
        lastSyncStatus.devicesCount || 0,
        lastSyncStatus.success ? 1 : 0,
        lastSyncStatus.error || null,
        status.duration_ms || null
      ],
      (err) => {
        if (err) {
          console.error('❌ EntraAC: Failed to update sync status:', err);
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

/**
 * Gibt den aktuellen Sync-Status zurück
 */
export function getSyncStatus(): SyncStatus {
  return { ...lastSyncStatus };
}

/**
 * Gibt Statistiken über die gespeicherten Daten zurück
 */
export async function getStats(): Promise<{
  users: {
    total: number;
    enabled: number;
    disabled: number;
    byDepartment: Record<string, number>;
  };
  devices: {
    total: number;
    enabled: number;
    disabled: number;
    byOS: Record<string, number>;
  };
}> {
  const users = await getUsers();
  const devices = await getDevices();

  const userStats = {
    total: users.length,
    enabled: users.filter(u => u.accountEnabled).length,
    disabled: users.filter(u => !u.accountEnabled).length,
    byDepartment: users.reduce((acc, user) => {
      const dept = user.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  const deviceStats = {
    total: devices.length,
    enabled: devices.filter(d => d.accountEnabled).length,
    disabled: devices.filter(d => !d.accountEnabled).length,
    byOS: devices.reduce((acc, device) => {
      const os = device.operatingSystem || 'Unknown';
      acc[os] = (acc[os] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  return { users: userStats, devices: deviceStats };
}

/**
 * Gibt Datenbank-Info für Admin Portal zurück
 */
export async function getDatabaseInfo(): Promise<{
  path: string;
  size: number;
  tableCount: number;
  tables: Array<{
    name: string;
    rowCount: number;
    columns: string[];
  }>;
  lastSync: SyncStatus;
}> {
  await initializeDatabase();
  
  const adminDataPath = process.env.ADMIN_DATA_PATH || 'admin-data';
  const dbPath = path.join(process.cwd(), adminDataPath, 'databases', 'Users', 'db_entra.sqlite');
  
  if (!db) {
    return {
      path: dbPath,
      size: 0,
      tableCount: 0,
      tables: [],
      lastSync: lastSyncStatus
    };
  }

  return new Promise((resolve, reject) => {
    // Tabellen-Info sammeln
    db!.all(`SELECT name FROM sqlite_master WHERE type='table'`, async (err, tables: any[]) => {
      if (err) {
        reject(err);
        return;
      }

      const tableInfos = await Promise.all(
        tables.map(async (table) => {
          return new Promise<any>((res) => {
            db!.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, countRow: any) => {
              if (err) {
                res({ name: table.name, rowCount: 0, columns: [] });
                return;
              }

              db!.all(`PRAGMA table_info(${table.name})`, (err, columns: any[]) => {
                const columnNames = columns ? columns.map(col => col.name) : [];
                res({
                  name: table.name,
                  rowCount: countRow?.count || 0,
                  columns: columnNames
                });
              });
            });
          });
        })
      );

      // Dateigröße ermitteln
      let fileSize = 0;
      try {
        const fs = require('fs');
        if (fs.existsSync(dbPath)) {
          const stats = fs.statSync(dbPath);
          fileSize = stats.size;
        }
      } catch (e) {
        console.error('Could not get file size:', e);
      }

      resolve({
        path: dbPath,
        size: fileSize,
        tableCount: tables.length,
        tables: tableInfos,
        lastSync: lastSyncStatus
      });
    });
  });
}

/**
 * Löscht alle gespeicherten Daten (Cache + Database)
 */
export async function clearAll(): Promise<void> {
  await initializeDatabase();
  
  // Cache leeren
  cachedUsers = [];
  cachedDevices = [];
  lastSyncStatus = {
    lastSyncTime: new Date().toISOString(),
    usersCount: 0,
    devicesCount: 0,
    success: true
  };

  if (!db) return;

  // Database leeren
  return new Promise((resolve, reject) => {
    db!.serialize(() => {
      db!.run('DELETE FROM users');
      db!.run('DELETE FROM devices');
      db!.run('DELETE FROM sync_status', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('🧹 EntraAC: All data cleared (cache + database)');
          resolve();
        }
      });
    });
  });
}