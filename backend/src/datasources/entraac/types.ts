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
  
  // Persönliche Informationen
  givenName?: string;
  surname?: string;
  officeLocation?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  mobilePhone?: string;
  businessPhones?: string[];
  faxNumber?: string;
  
  // Organisatorische Informationen
  companyName?: string;
  employeeId?: string;
  employeeType?: string;
  costCenter?: string;
  division?: string;
  manager?: {
    id: string;
    displayName: string;
  };
  
  // Technische/Account-Informationen
  signInSessionsValidFromDateTime?: string;
  passwordPolicies?: string;
  usageLocation?: string;
  preferredLanguage?: string;
  aboutMe?: string;
  
  // Lizenzen & Apps
  assignedLicenses?: Array<{
    skuId: string;
    disabledPlans?: string[];
  }>;
  assignedPlans?: Array<{
    assignedDateTime: string;
    capabilityStatus: string;
    service: string;
    servicePlanId: string;
  }>;
  
  // Sicherheit & Sync
  userType?: string;
  onPremisesSecurityIdentifier?: string;
  onPremisesSyncEnabled?: boolean;
  onPremisesDistinguishedName?: string;
  onPremisesDomainName?: string;
  onPremisesSamAccountName?: string;
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
