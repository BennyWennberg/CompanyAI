// EntraAC Integration - In-Memory Data Store
// Verwaltet die lokal gespeicherten Entra ID Daten (Users und Devices)

import { EntraUser, EntraDevice, SyncStatus } from './types';

// In-Memory Storage für Entra Daten
let users: EntraUser[] = [];
let devices: EntraDevice[] = [];
let lastSyncStatus: SyncStatus = {
  lastSyncTime: '',
  usersCount: 0,
  devicesCount: 0,
  success: false
};

/**
 * Setzt die Benutzerdaten
 */
export function setUsers(data: EntraUser[]): void {
  users = [...data];
  console.log(`EntraAC: ${users.length} users stored`);
}

/**
 * Setzt die Gerätedaten
 */
export function setDevices(data: EntraDevice[]): void {
  devices = [...data];
  console.log(`EntraAC: ${devices.length} devices stored`);
}

/**
 * Gibt alle Benutzer zurück
 */
export function getUsers(): EntraUser[] {
  return [...users];
}

/**
 * Gibt alle Geräte zurück
 */
export function getDevices(): EntraDevice[] {
  return [...devices];
}

/**
 * Filtert Benutzer nach Kriterien
 */
export function findUsers(filter: {
  department?: string;
  accountEnabled?: boolean;
  search?: string;
}): EntraUser[] {
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
export function findDevices(filter: {
  operatingSystem?: string;
  accountEnabled?: boolean;
  search?: string;
}): EntraDevice[] {
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
export function getUserById(id: string): EntraUser | undefined {
  return users.find(user => user.id === id);
}

/**
 * Gibt ein Gerät nach ID zurück
 */
export function getDeviceById(id: string): EntraDevice | undefined {
  return devices.find(device => device.id === id);
}

/**
 * Aktualisiert den Sync-Status
 */
export function updateSyncStatus(status: Partial<SyncStatus>): void {
  lastSyncStatus = {
    ...lastSyncStatus,
    ...status,
    lastSyncTime: new Date().toISOString()
  };
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
export function getStats(): {
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
} {
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
 * Löscht alle gespeicherten Daten
 */
export function clearAll(): void {
  users = [];
  devices = [];
  lastSyncStatus = {
    lastSyncTime: new Date().toISOString(),
    usersCount: 0,
    devicesCount: 0,
    success: true
  };
  console.log('EntraAC: All data cleared');
}
