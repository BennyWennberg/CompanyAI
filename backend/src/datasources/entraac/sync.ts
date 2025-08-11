// EntraAC Integration - Synchronization Service
// Verwaltet die periodische Synchronisation von Entra ID Daten

import { graphGet, graphGetAllPages, testConnection } from './client';
import { setUsers, setDevices, updateSyncStatus, getSyncStatus } from './store';
import { EntraUser, EntraDevice } from './types';

let syncInterval: NodeJS.Timeout | null = null;
let syncInProgress = false;

/**
 * Synchronisiert alle Benutzer von Microsoft Graph
 */
export async function syncUsers(): Promise<EntraUser[]> {
  try {
    console.log('EntraAC: Starting user sync...');
    
    const selectFields = [
      'id',
      'displayName', 
      'userPrincipalName',
      'mail',
      'department',
      'jobTitle',
      'accountEnabled',
      'createdDateTime'
    ].join(',');

    const path = `/v1.0/users?$select=${selectFields}&$top=999&$filter=userType eq 'Member'`;
    const rawUsers = await graphGetAllPages<any>(path);

    const users: EntraUser[] = rawUsers.map((user: any) => ({
      id: user.id,
      displayName: user.displayName || '',
      userPrincipalName: user.userPrincipalName,
      mail: user.mail,
      department: user.department,
      jobTitle: user.jobTitle,
      accountEnabled: user.accountEnabled,
      createdDateTime: user.createdDateTime
    }));

    setUsers(users);
    console.log(`EntraAC: Successfully synced ${users.length} users`);
    return users;

  } catch (error) {
    console.error('EntraAC: User sync failed:', error);
    throw new Error(`User sync failed: ${error}`);
  }
}

/**
 * Synchronisiert alle Geräte von Microsoft Graph
 */
export async function syncDevices(): Promise<EntraDevice[]> {
  try {
    console.log('EntraAC: Starting device sync...');
    
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

    setDevices(devices);
    console.log(`EntraAC: Successfully synced ${devices.length} devices`);
    return devices;

  } catch (error) {
    console.error('EntraAC: Device sync failed:', error);
    throw new Error(`Device sync failed: ${error}`);
  }
}

/**
 * Führt eine vollständige Synchronisation durch
 */
export async function syncAll(): Promise<void> {
  if (syncInProgress) {
    console.log('EntraAC: Sync already in progress, skipping...');
    return;
  }

  syncInProgress = true;
  const startTime = Date.now();

  try {
    console.log('EntraAC: Starting full sync...');
    
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

    updateSyncStatus({
      usersCount: users.length,
      devicesCount: devices.length,
      success: true,
      error: undefined
    });

    const duration = Date.now() - startTime;
    console.log(`EntraAC: Full sync completed in ${duration}ms (${users.length} users, ${devices.length} devices)`);

  } catch (error) {
    console.error('EntraAC: Full sync failed:', error);
    
    updateSyncStatus({
      success: false,
      error: String(error)
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
    console.log('EntraAC: Sync disabled (ENTRA_SYNC_ENABLED=false)');
    return;
  }

  if (!hasCredentials) {
    console.log('EntraAC: Sync disabled - missing Azure credentials in .env');
    console.log('Required: AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET');
    return;
  }

  const intervalMs = Number(process.env.ENTRA_SYNC_INTERVAL_MS || 3600000); // Default: 1 hour
  
  console.log(`EntraAC: Starting auto-sync with ${intervalMs}ms interval`);

  // Initial sync
  (async () => {
    try {
      await syncAll();
      console.log('EntraAC: Initial sync completed successfully');
    } catch (error) {
      console.error('EntraAC: Initial sync failed:', error);
    }
  })();

  // Periodic sync
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  syncInterval = setInterval(async () => {
    try {
      await syncAll();
      console.log('EntraAC: Periodic sync completed successfully');
    } catch (error) {
      console.error('EntraAC: Periodic sync failed:', error);
    }
  }, intervalMs);

  console.log('EntraAC: Auto-sync started');
}

/**
 * Stoppt die automatische Synchronisation
 */
export function stopEntraSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('EntraAC: Auto-sync stopped');
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
      message: `Sync completed: ${status.usersCount} users, ${status.devicesCount} devices`,
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
