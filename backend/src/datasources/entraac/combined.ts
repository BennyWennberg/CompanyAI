// EntraAC Integration - Combined Data Store
// Vereint Entra ID Daten und manuelle Daten in einem einheitlichen Interface

import { EntraUser, EntraDevice } from './types';
import { ManualUser, ManualDevice } from '../manual';
import { getUsers as getEntraUsers, getDevices as getEntraDevices } from './store';
import { getManualUsers, getManualDevices } from '../manual';

// Union Types für kombinierte Daten
export type CombinedUser = EntraUser & { source: 'entra' } | ManualUser & { source: 'manual' };
export type CombinedDevice = EntraDevice & { source: 'entra' } | ManualDevice & { source: 'manual' };

// Source Types
export type DataSource = 'all' | 'entra' | 'manual';

/**
 * Konvertiert Entra User zu Combined User Format
 */
function convertEntraUser(user: EntraUser): CombinedUser {
  return {
    ...user,
    source: 'entra' as const
  };
}

/**
 * Konvertiert Entra Device zu Combined Device Format
 */
function convertEntraDevice(device: EntraDevice): CombinedDevice {
  return {
    ...device,
    source: 'entra' as const
  };
}

/**
 * Gibt alle Benutzer aus der gewählten Quelle zurück
 */
export function getCombinedUsers(source: DataSource = 'all'): CombinedUser[] {
  let users: CombinedUser[] = [];

  if (source === 'all' || source === 'entra') {
    const entraUsers = getEntraUsers().map(convertEntraUser);
    users.push(...entraUsers);
  }

  if (source === 'all' || source === 'manual') {
    const manualUsers = getManualUsers();
    users.push(...manualUsers);
  }

  // Sortierung nach DisplayName
  return users.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Gibt alle Geräte aus der gewählten Quelle zurück
 */
export function getCombinedDevices(source: DataSource = 'all'): CombinedDevice[] {
  let devices: CombinedDevice[] = [];

  if (source === 'all' || source === 'entra') {
    const entraDevices = getEntraDevices().map(convertEntraDevice);
    devices.push(...entraDevices);
  }

  if (source === 'all' || source === 'manual') {
    const manualDevices = getManualDevices();
    devices.push(...manualDevices);
  }

  // Sortierung nach DisplayName
  return devices.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

/**
 * Filtert kombinierte Benutzer nach Kriterien
 */
export function findCombinedUsers(filter: {
  source?: DataSource;
  department?: string;
  accountEnabled?: boolean;
  search?: string;
}): CombinedUser[] {
  let users = getCombinedUsers(filter.source);

  if (filter.department) {
    users = users.filter(user => 
      user.department?.toLowerCase().includes(filter.department!.toLowerCase())
    );
  }

  if (filter.accountEnabled !== undefined) {
    users = users.filter(user => user.accountEnabled === filter.accountEnabled);
  }

  if (filter.search) {
    const searchTerm = filter.search.toLowerCase();
    users = users.filter(user =>
      user.displayName.toLowerCase().includes(searchTerm) ||
      user.userPrincipalName?.toLowerCase().includes(searchTerm) ||
      user.mail?.toLowerCase().includes(searchTerm) ||
      user.jobTitle?.toLowerCase().includes(searchTerm)
    );
  }

  return users;
}

/**
 * Filtert kombinierte Geräte nach Kriterien
 */
export function findCombinedDevices(filter: {
  source?: DataSource;
  operatingSystem?: string;
  accountEnabled?: boolean;
  search?: string;
}): CombinedDevice[] {
  let devices = getCombinedDevices(filter.source);

  if (filter.operatingSystem) {
    devices = devices.filter(device => 
      device.operatingSystem?.toLowerCase().includes(filter.operatingSystem!.toLowerCase())
    );
  }

  if (filter.accountEnabled !== undefined) {
    devices = devices.filter(device => device.accountEnabled === filter.accountEnabled);
  }

  if (filter.search) {
    const searchTerm = filter.search.toLowerCase();
    devices = devices.filter(device =>
      device.displayName.toLowerCase().includes(searchTerm) ||
      device.deviceId?.toLowerCase().includes(searchTerm) ||
      device.operatingSystem?.toLowerCase().includes(searchTerm)
    );
  }

  return devices;
}

/**
 * Findet einen Benutzer nach ID (aus beiden Quellen)
 */
export function findCombinedUserById(id: string): CombinedUser | undefined {
  // Erst in Entra suchen
  const entraUsers = getEntraUsers();
  const entraUser = entraUsers.find(u => u.id === id);
  if (entraUser) {
    return convertEntraUser(entraUser);
  }

  // Dann in Manual suchen
  const manualUsers = getManualUsers();
  const manualUser = manualUsers.find(u => u.id === id);
  if (manualUser) {
    return manualUser;
  }

  return undefined;
}

/**
 * Findet ein Gerät nach ID (aus beiden Quellen)
 */
export function findCombinedDeviceById(id: string): CombinedDevice | undefined {
  // Erst in Entra suchen
  const entraDevices = getEntraDevices();
  const entraDevice = entraDevices.find(d => d.id === id);
  if (entraDevice) {
    return convertEntraDevice(entraDevice);
  }

  // Dann in Manual suchen
  const manualDevices = getManualDevices();
  const manualDevice = manualDevices.find(d => d.id === id);
  if (manualDevice) {
    return manualDevice;
  }

  return undefined;
}

/**
 * Gibt kombinierte Statistiken zurück
 */
export function getCombinedStats(): {
  users: {
    total: number;
    enabled: number;
    disabled: number;
    bySource: { entra: number; manual: number };
    byDepartment: Record<string, number>;
  };
  devices: {
    total: number;
    enabled: number;
    disabled: number;
    bySource: { entra: number; manual: number };
    byOS: Record<string, number>;
  };
} {
  const allUsers = getCombinedUsers();
  const allDevices = getCombinedDevices();

  // User Statistiken
  const userStats = {
    total: allUsers.length,
    enabled: allUsers.filter(u => u.accountEnabled).length,
    disabled: allUsers.filter(u => !u.accountEnabled).length,
    bySource: {
      entra: allUsers.filter(u => u.source === 'entra').length,
      manual: allUsers.filter(u => u.source === 'manual').length
    },
    byDepartment: allUsers.reduce((acc, user) => {
      const dept = user.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  // Device Statistiken
  const deviceStats = {
    total: allDevices.length,
    enabled: allDevices.filter(d => d.accountEnabled).length,
    disabled: allDevices.filter(d => !d.accountEnabled).length,
    bySource: {
      entra: allDevices.filter(d => d.source === 'entra').length,
      manual: allDevices.filter(d => d.source === 'manual').length
    },
    byOS: allDevices.reduce((acc, device) => {
      const os = device.operatingSystem || 'Unknown';
      acc[os] = (acc[os] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  };

  return { users: userStats, devices: deviceStats };
}

/**
 * Überprüft ob eine E-Mail/UPN bereits verwendet wird (in beiden Quellen)
 */
export function isEmailOrUpnInUse(email?: string, upn?: string, excludeId?: string): boolean {
  const allUsers = getCombinedUsers();
  
  return allUsers.some(user => 
    user.id !== excludeId && (
      (email && user.mail === email) ||
      (upn && user.userPrincipalName === upn)
    )
  );
}

/**
 * Überprüft ob ein Gerätename bereits verwendet wird (in beiden Quellen)
 */
export function isDeviceNameInUse(displayName: string, deviceId?: string, excludeId?: string): boolean {
  const allDevices = getCombinedDevices();
  
  return allDevices.some(device => 
    device.id !== excludeId && (
      device.displayName === displayName ||
      (deviceId && device.deviceId === deviceId)
    )
  );
}

/**
 * Gibt verfügbare Datenquellen zurück
 */
export function getAvailableDataSources(): { 
  source: DataSource; 
  label: string; 
  description: string; 
  userCount: number; 
  deviceCount: number; 
}[] {
  const entraUsers = getEntraUsers();
  const manualUsers = getManualUsers();
  const entraDevices = getEntraDevices();
  const manualDevices = getManualDevices();

  return [
    {
      source: 'all',
      label: 'Alle Quellen',
      description: 'Kombiniert Entra ID und manuelle Einträge',
      userCount: entraUsers.length + manualUsers.length,
      deviceCount: entraDevices.length + manualDevices.length
    },
    {
      source: 'entra',
      label: 'Entra ID',
      description: 'Automatisch synchronisiert aus Microsoft Entra ID',
      userCount: entraUsers.length,
      deviceCount: entraDevices.length
    },
    {
      source: 'manual',
      label: 'Manuell',
      description: 'Manuell erstellte Benutzer und Geräte',
      userCount: manualUsers.length,
      deviceCount: manualDevices.length
    }
  ];
}
