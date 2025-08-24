// EntraAC Integration - Synchronization Service with SQLite Persistence
// Verwaltet die periodische Synchronisation von Entra ID Daten mit automatischer Schema-Erkennung

import { graphGet, graphGetAllPages, testConnection } from './client';
import { setUsers, setDevices, updateSyncStatus, getSyncStatus } from './store';
import { EntraUser, EntraDevice } from './types';

let syncInterval: NodeJS.Timeout | null = null;
let syncInProgress = false;

/**
 * Synchronisiert alle Benutzer von Microsoft Graph mit dynamischer Schema-Erkennung
 */
export async function syncUsers(): Promise<EntraUser[]> {
  try {
    console.log('🔄 EntraAC: Starting user sync with dynamic schema detection...');
    
    // Vereinfachter Feldsatz für robuste Synchronisation
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
      // zusätzliche, gewöhnlich verfügbare Felder
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

    // Ohne $expand=manager, da dies häufig Berechtigungen/Fehler verursacht
    const path = `/v1.0/users?$select=${selectFields}&$top=999&$filter=userType eq 'Member'`;
    const rawUsers = await graphGetAllPages<any>(path);

    console.log(`📥 EntraAC: Fetched ${rawUsers.length} users from Graph API`);

    const users: EntraUser[] = rawUsers.map((user: any) => {
      // Nur definierte Werte verwenden für robustes SQLite-Schema
      const userData: any = {
        id: user.id,
        displayName: user.displayName || '',
        source: 'entra' as const
      };

      // Füge nur definierte/verfügbare Werte hinzu
      if (user.userPrincipalName) userData.userPrincipalName = user.userPrincipalName;
      if (user.mail) userData.mail = user.mail;
      if (user.department) userData.department = user.department;
      if (user.jobTitle) userData.jobTitle = user.jobTitle;
      if (user.accountEnabled !== undefined) userData.accountEnabled = user.accountEnabled;
      if (user.createdDateTime) userData.createdDateTime = user.createdDateTime;
      
      // Persönliche Informationen (nur wenn vorhanden)
      if (user.givenName) userData.givenName = user.givenName;
      if (user.surname) userData.surname = user.surname;
      if (user.officeLocation) userData.officeLocation = user.officeLocation;
      if (user.mobilePhone) userData.mobilePhone = user.mobilePhone;
      if (user.businessPhones && user.businessPhones.length > 0) userData.businessPhones = user.businessPhones;
      
      // Organisatorische Informationen (nur wenn vorhanden)
      if (user.companyName) userData.companyName = user.companyName;
      if (user.employeeId) userData.employeeId = user.employeeId;
      
      // Technische/Account-Informationen (nur wenn vorhanden)
      if (user.usageLocation) userData.usageLocation = user.usageLocation;
      if (user.preferredLanguage) userData.preferredLanguage = user.preferredLanguage;
      if (user.userType) userData.userType = user.userType;

      return userData;
    });

    // Async storage mit Schema-Detection
    await setUsers(users);
    console.log(`✅ EntraAC: Successfully synced ${users.length} users to SQLite database`);
    return users;

  } catch (error) {
    console.error('❌ EntraAC: User sync failed:', error);
    throw new Error(`User sync failed: ${error}`);
  }
}

/**
 * Synchronisiert alle Geräte von Microsoft Graph mit dynamischer Schema-Erkennung
 */
export async function syncDevices(): Promise<EntraDevice[]> {
  try {
    console.log('🔄 EntraAC: Starting device sync with dynamic schema detection...');
    
    const selectFields = [
      'id',
      'displayName',
      'deviceId',
      'operatingSystem',
      'operatingSystemVersion',
      'trustType',
      'accountEnabled',
      'registrationDateTime'
    ].join(',');

    const path = `/v1.0/devices?$select=${selectFields}&$top=999`;
    const rawDevices = await graphGetAllPages<any>(path);

    console.log(`📥 EntraAC: Fetched ${rawDevices.length} devices from Graph API`);

    const devices: EntraDevice[] = rawDevices.map((device: any) => ({
      id: device.id,
      displayName: device.displayName || '',
      deviceId: device.deviceId,
      operatingSystem: device.operatingSystem,
      operatingSystemVersion: device.operatingSystemVersion,
      trustType: device.trustType,
      accountEnabled: device.accountEnabled,
      registrationDateTime: device.registrationDateTime
    }));

    // Async storage mit Schema-Detection
    await setDevices(devices);
    console.log(`✅ EntraAC: Successfully synced ${devices.length} devices to SQLite database`);
    return devices;

  } catch (error) {
    console.error('❌ EntraAC: Device sync failed:', error);
    throw new Error(`Device sync failed: ${error}`);
  }
}

/**
 * Führt eine vollständige Synchronisation durch mit SQLite Persistence
 */
export async function syncAll(): Promise<void> {
  if (syncInProgress) {
    console.log('⚠️ EntraAC: Sync already in progress, skipping...');
    return;
  }

  syncInProgress = true;
  const startTime = Date.now();

  try {
    console.log('🚀 EntraAC: Starting full sync with SQLite persistence...');
    
    // Verbindung testen
    const connectionOk = await testConnection();
    if (!connectionOk) {
      throw new Error('Cannot connect to Microsoft Graph');
    }

    // Parallel sync für bessere Performance
    const [users, devices] = await Promise.all([
      syncUsers(),
      syncDevices()
    ]);

    const duration = Date.now() - startTime;

    // Status in Datenbank speichern
    await updateSyncStatus({
      usersCount: users.length,
      devicesCount: devices.length,
      success: true,
      error: undefined,
      duration_ms: duration
    });

    console.log(`🎉 EntraAC: Full sync completed in ${duration}ms`);
    console.log(`📊 EntraAC: Synced ${users.length} users and ${devices.length} devices to SQLite`);

  } catch (error) {
    console.error('❌ EntraAC: Full sync failed:', error);
    
    await updateSyncStatus({
      success: false,
      error: String(error),
      duration_ms: Date.now() - startTime
    });

    throw error;
  } finally {
    syncInProgress = false;
  }
}

/**
 * Startet die automatische Synchronisation
 */
export function startEntraSync(): void {
  const enabled = String(process.env.ENTRA_SYNC_ENABLED || 'false').toLowerCase() === 'true';
  const hasCredentials = !!(
    process.env.AZURE_TENANT_ID && 
    process.env.AZURE_CLIENT_ID && 
    process.env.AZURE_CLIENT_SECRET
  );

  if (!enabled) {
    console.log('⚠️ EntraAC: Sync disabled (ENTRA_SYNC_ENABLED=false)');
    return;
  }

  if (!hasCredentials) {
    console.log('⚠️ EntraAC: Sync disabled - missing Azure credentials in .env');
    console.log('   Required: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET');
    return;
  }

  const intervalMs = Number(process.env.ENTRA_SYNC_INTERVAL_MS || 3600000); // Default: 1 hour
  
  console.log(`🔄 EntraAC: Starting auto-sync with ${intervalMs}ms interval (SQLite persistence enabled)`);

  // Initial sync
  (async () => {
    try {
      await syncAll();
      console.log('✅ EntraAC: Initial sync completed successfully');
    } catch (error) {
      console.error('❌ EntraAC: Initial sync failed:', error);
    }
  })();

  // Periodic sync
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  syncInterval = setInterval(async () => {
    try {
      await syncAll();
      console.log('✅ EntraAC: Periodic sync completed successfully');
    } catch (error) {
      console.error('❌ EntraAC: Periodic sync failed:', error);
    }
  }, intervalMs);

  console.log('🚀 EntraAC: Auto-sync started with SQLite persistence');
}

/**
 * Stoppt die automatische Synchronisation
 */
export function stopEntraSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('⏹️ EntraAC: Auto-sync stopped');
  }
}

/**
 * Führt eine manuelle Synchronisation durch
 */
export async function manualSync(): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    await syncAll();
    const status = getSyncStatus();
    
    return {
      success: true,
      message: `Sync completed: ${status.usersCount} users, ${status.devicesCount} devices (persisted to SQLite)`,
      data: status
    };
  } catch (error) {
    return {
      success: false,
      message: `Sync failed: ${error}`
    };
  }
}

/**
 * Gibt den aktuellen Sync-Status zurück
 */
export function getEntraSyncStatus(): {
  enabled: boolean;
  hasCredentials: boolean;
  syncInProgress: boolean;
  lastSync: any;
} {
  const enabled = String(process.env.ENTRA_SYNC_ENABLED || 'false').toLowerCase() === 'true';
  const hasCredentials = !!(
    process.env.AZURE_TENANT_ID && 
    process.env.AZURE_CLIENT_ID && 
    process.env.AZURE_CLIENT_SECRET
  );

  return {
    enabled,
    hasCredentials,
    syncInProgress,
    lastSync: getSyncStatus()
  };
}