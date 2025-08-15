// Manual DataSource - User/Device Management
// Verwaltet manuell erstellte Benutzer und Geräte (getrennt von externen Sync-Quellen)

import { v4 as uuidv4 } from 'uuid';

// Manual User/Device Types
export interface ManualUser {
  id: string;
  displayName: string;
  userPrincipalName?: string;
  mail?: string;
  department?: string;
  jobTitle?: string;
  accountEnabled: boolean;
  source: 'manual';
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // User ID der das erstellt hat
}

export interface ManualDevice {
  id: string;
  displayName: string;
  deviceId?: string;
  operatingSystem?: string;
  operatingSystemVersion?: string;
  trustType: string;
  accountEnabled: boolean;
  source: 'manual';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface CreateManualUserRequest {
  displayName: string;
  userPrincipalName?: string;
  mail?: string;
  department?: string;
  jobTitle?: string;
  accountEnabled?: boolean;
}

export interface CreateManualDeviceRequest {
  displayName: string;
  deviceId?: string;
  operatingSystem?: string;
  operatingSystemVersion?: string;
  trustType?: string;
  accountEnabled?: boolean;
}

// In-Memory Storage für manuelle Daten
let manualUsers: ManualUser[] = [];
let manualDevices: ManualDevice[] = [];

/**
 * Erstellt einen neuen manuellen Benutzer
 */
export function createManualUser(request: CreateManualUserRequest, createdBy?: string): ManualUser {
  // Validierung
  if (!request.displayName || request.displayName.trim().length === 0) {
    throw new Error('DisplayName ist erforderlich');
  }

  // E-Mail Validierung falls vorhanden
  if (request.mail && !isValidEmail(request.mail)) {
    throw new Error('Ungültige E-Mail-Adresse');
  }

  // UserPrincipalName falls vorhanden validieren
  if (request.userPrincipalName && !isValidUserPrincipalName(request.userPrincipalName)) {
    throw new Error('Ungültiger UserPrincipalName');
  }

  // Duplikat-Check
  const existingUser = manualUsers.find(u => 
    u.userPrincipalName === request.userPrincipalName ||
    (request.mail && u.mail === request.mail)
  );
  
  if (existingUser) {
    throw new Error('Benutzer mit dieser E-Mail oder UserPrincipalName existiert bereits');
  }

  const now = new Date().toISOString();
  const newUser: ManualUser = {
    id: uuidv4(),
    displayName: request.displayName.trim(),
    userPrincipalName: request.userPrincipalName?.trim(),
    mail: request.mail?.trim(),
    department: request.department?.trim(),
    jobTitle: request.jobTitle?.trim(),
    accountEnabled: request.accountEnabled ?? true,
    source: 'manual',
    createdAt: now,
    updatedAt: now,
    createdBy
  };

  manualUsers.push(newUser);
  console.log(`Manual User created: ${newUser.displayName} (${newUser.id})`);
  return newUser;
}

/**
 * Erstellt ein neues manuelles Gerät
 */
export function createManualDevice(request: CreateManualDeviceRequest, createdBy?: string): ManualDevice {
  // Validierung
  if (!request.displayName || request.displayName.trim().length === 0) {
    throw new Error('DisplayName ist erforderlich');
  }

  // Duplikat-Check
  const existingDevice = manualDevices.find(d => 
    d.deviceId === request.deviceId || d.displayName === request.displayName
  );
  
  if (existingDevice) {
    throw new Error('Gerät mit dieser ID oder diesem Namen existiert bereits');
  }

  const now = new Date().toISOString();
  const newDevice: ManualDevice = {
    id: uuidv4(),
    displayName: request.displayName.trim(),
    deviceId: request.deviceId?.trim(),
    operatingSystem: request.operatingSystem?.trim(),
    operatingSystemVersion: request.operatingSystemVersion?.trim(),
    trustType: request.trustType?.trim() || 'Manual',
    accountEnabled: request.accountEnabled ?? true,
    source: 'manual',
    createdAt: now,
    updatedAt: now,
    createdBy
  };

  manualDevices.push(newDevice);
  console.log(`Manual Device created: ${newDevice.displayName} (${newDevice.id})`);
  return newDevice;
}

/**
 * Aktualisiert einen manuellen Benutzer
 */
export function updateManualUser(id: string, updates: Partial<CreateManualUserRequest>, updatedBy?: string): ManualUser {
  const userIndex = manualUsers.findIndex(u => u.id === id);
  if (userIndex === -1) {
    throw new Error('Benutzer nicht gefunden');
  }

  const user = manualUsers[userIndex];
  
  // Validierung der Updates
  if (updates.mail && !isValidEmail(updates.mail)) {
    throw new Error('Ungültige E-Mail-Adresse');
  }

  if (updates.userPrincipalName && !isValidUserPrincipalName(updates.userPrincipalName)) {
    throw new Error('Ungültiger UserPrincipalName');
  }

  // Duplikat-Check für E-Mail/UPN (außer für den aktuellen User)
  if (updates.userPrincipalName || updates.mail) {
    const conflictUser = manualUsers.find(u => 
      u.id !== id && (
        u.userPrincipalName === updates.userPrincipalName ||
        (updates.mail && u.mail === updates.mail)
      )
    );
    
    if (conflictUser) {
      throw new Error('Benutzer mit dieser E-Mail oder UserPrincipalName existiert bereits');
    }
  }

  const updatedUser: ManualUser = {
    ...user,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  manualUsers[userIndex] = updatedUser;
  console.log(`Manual User updated: ${updatedUser.displayName} (${updatedUser.id})`);
  return updatedUser;
}

/**
 * Aktualisiert ein manuelles Gerät
 */
export function updateManualDevice(id: string, updates: Partial<CreateManualDeviceRequest>, updatedBy?: string): ManualDevice {
  const deviceIndex = manualDevices.findIndex(d => d.id === id);
  if (deviceIndex === -1) {
    throw new Error('Gerät nicht gefunden');
  }

  const device = manualDevices[deviceIndex];
  
  // Duplikat-Check (außer für das aktuelle Gerät)
  if (updates.deviceId || updates.displayName) {
    const conflictDevice = manualDevices.find(d => 
      d.id !== id && (
        d.deviceId === updates.deviceId || d.displayName === updates.displayName
      )
    );
    
    if (conflictDevice) {
      throw new Error('Gerät mit dieser ID oder diesem Namen existiert bereits');
    }
  }

  const updatedDevice: ManualDevice = {
    ...device,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  manualDevices[deviceIndex] = updatedDevice;
  console.log(`Manual Device updated: ${updatedDevice.displayName} (${updatedDevice.id})`);
  return updatedDevice;
}

/**
 * Seedet die manuellen Benutzer mit den bisherigen HR-Mock-Mitarbeitern (nur, wenn noch leer)
 */
export function seedManualUsersIfEmpty(): void {
  if (manualUsers.length > 0) {
    return;
  }

  const seed = [
    {
      displayName: 'Max Mustermann',
      userPrincipalName: 'max.mustermann@company.com',
      mail: 'max.mustermann@company.com',
      department: 'IT',
      jobTitle: 'Senior Developer',
      accountEnabled: true
    }
  ] as CreateManualUserRequest[];

  for (const u of seed) {
    try {
      createManualUser(u, 'system-seed');
    } catch {
      // ignorieren, falls durch Duplikat-Prüfung verhindert
    }
  }
}

/**
 * Löscht einen manuellen Benutzer
 */
export function deleteManualUser(id: string): boolean {
  const initialLength = manualUsers.length;
  manualUsers = manualUsers.filter(u => u.id !== id);
  const deleted = manualUsers.length < initialLength;
  
  if (deleted) {
    console.log(`Manual User deleted: ${id}`);
  }
  
  return deleted;
}

/**
 * Löscht ein manuelles Gerät
 */
export function deleteManualDevice(id: string): boolean {
  const initialLength = manualDevices.length;
  manualDevices = manualDevices.filter(d => d.id !== id);
  const deleted = manualDevices.length < initialLength;
  
  if (deleted) {
    console.log(`Manual Device deleted: ${id}`);
  }
  
  return deleted;
}

/**
 * Gibt alle manuellen Benutzer zurück
 */
export function getManualUsers(): ManualUser[] {
  return [...manualUsers];
}

/**
 * Gibt alle manuellen Geräte zurück
 */
export function getManualDevices(): ManualDevice[] {
  return [...manualDevices];
}

/**
 * Findet einen manuellen Benutzer nach ID
 */
export function getManualUserById(id: string): ManualUser | undefined {
  return manualUsers.find(u => u.id === id);
}

/**
 * Findet ein manuelles Gerät nach ID
 */
export function getManualDeviceById(id: string): ManualDevice | undefined {
  return manualDevices.find(d => d.id === id);
}

/**
 * Filtert manuelle Benutzer
 */
export function findManualUsers(filter: {
  department?: string;
  accountEnabled?: boolean;
  search?: string;
}): ManualUser[] {
  let filtered = [...manualUsers];

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
 * Filtert manuelle Geräte
 */
export function findManualDevices(filter: {
  operatingSystem?: string;
  accountEnabled?: boolean;
  search?: string;
}): ManualDevice[] {
  let filtered = [...manualDevices];

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
 * Löscht alle manuellen Daten
 */
export function clearManualData(): void {
  manualUsers = [];
  manualDevices = [];
  console.log('All manual data cleared');
}

/**
 * Gibt Statistiken über manuelle Daten zurück
 */
export function getManualStats(): {
  users: { total: number; enabled: number; disabled: number };
  devices: { total: number; enabled: number; disabled: number };
} {
  return {
    users: {
      total: manualUsers.length,
      enabled: manualUsers.filter(u => u.accountEnabled).length,
      disabled: manualUsers.filter(u => !u.accountEnabled).length
    },
    devices: {
      total: manualDevices.length,
      enabled: manualDevices.filter(d => d.accountEnabled).length,
      disabled: manualDevices.filter(d => !d.accountEnabled).length
    }
  };
}

// Helper Functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidUserPrincipalName(upn: string): boolean {
  // Basis-Validierung für UPN Format
  return upn.includes('@') && upn.length > 3;
}
