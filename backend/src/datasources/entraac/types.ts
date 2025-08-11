// EntraAC Integration - TypeScript Types
// Definiert die Datenstrukturen für Entra ID (Azure AD) Benutzer und Geräte

export interface EntraUser {
  id: string;
  displayName: string;
  userPrincipalName?: string;
  mail?: string;
  department?: string;
  jobTitle?: string;
  accountEnabled?: boolean;
  createdDateTime?: string;
  lastSignInDateTime?: string;
}

export interface EntraDevice {
  id: string;
  displayName: string;
  deviceId?: string;
  operatingSystem?: string;
  operatingSystemVersion?: string;
  trustType?: string;
  accountEnabled?: boolean;
  registrationDateTime?: string;
  lastSyncDateTime?: string;
}

export interface SyncStatus {
  lastSyncTime: string;
  usersCount: number;
  devicesCount: number;
  success: boolean;
  error?: string;
}

export interface GraphResponse<T> {
  value: T[];
  '@odata.nextLink'?: string;
  '@odata.count'?: number;
}
