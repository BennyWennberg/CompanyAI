// DataSources - Zentrale Datenquellen-Verwaltung
// Vereint alle Datenquellen (EntraAC, Manual, CSV, API, etc.) in einem einheitlichen Interface

// EntraAC Integration (Microsoft Entra ID)
export * from './entraac';

// Manual Integration (Manual Users/Devices)
export * from './manual';

// Hier können weitere Datenquellen hinzugefügt werden:
// export * from './csv';      // CSV-Import/Export
// export * from './ldap';     // LDAP Integration
// export * from './database'; // Direct Database Integration
// export * from './api';      // External API Integration

// Re-export wichtiger Funktionen mit klaren Namen
export { 
  getCombinedUsers as getUsers,
  getCombinedDevices as getDevices,
  findCombinedUsers as findUsers,
  findCombinedDevices as findDevices,
  getCombinedStats as getDataSourceStats,
  getAvailableDataSources as getAvailableSources
} from './entraac/combined';

export {
  createManualUser,
  createManualDevice,
  updateManualUser,
  updateManualDevice,
  deleteManualUser,
  deleteManualDevice
} from './manual';

export {
  startEntraSync as startDataSourceSync,
  stopEntraSync as stopDataSourceSync,
  manualSync as triggerManualSync,
  getEntraSyncStatus as getSyncStatus
} from './entraac/sync';
