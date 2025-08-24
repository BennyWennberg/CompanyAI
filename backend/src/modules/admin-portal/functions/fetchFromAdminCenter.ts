// Admin-Portal Module - Fetch From Entra Admin Center Function
// Lädt User direkt aus Entra Admin Center und speichert sie in Admin Portal DB

import { 
  APIResponse,
  SyncResults 
} from '../types';
import { AdminPortalDatabaseManager } from '../core/database-manager';
import { EntraSourceService } from '../sources/entra-source';

/**
 * Lädt User direkt aus Entra Admin Center und speichert sie in Admin Portal DB
 * (Nutzt die gleiche DataSources Logic wie das HR Modul)
 */
export async function fetchFromAdminCenter(
  dbManager: AdminPortalDatabaseManager
): Promise<APIResponse<{
  usersProcessed: number;
  usersAdded: number;
  usersUpdated: number;
  errors: number;
  duration: number;
}>> {
  try {
    console.log('🔄 Starte Fetch aus Entra Admin Center...');

    // EntraSourceService nutzen (jetzt mit DataSources Logic)
    const entraService = new EntraSourceService(dbManager);
    
    // User aus Admin Center holen und in DB speichern
    const result = await entraService.fetchAndStoreFromAdminCenter();

    if (result.success) {
      console.log(`✅ Entra Admin Center Fetch erfolgreich: ${result.data?.usersProcessed} User verarbeitet`);
    } else {
      console.error(`❌ Entra Admin Center Fetch fehlgeschlagen: ${result.message}`);
    }

    return result;

  } catch (error) {
    console.error('❌ Fehler beim Fetch aus Entra Admin Center:', error);
    return {
      success: false,
      error: 'AdminCenterFetchError',
      message: 'Fetch aus Entra Admin Center fehlgeschlagen'
    };
  }
}

/**
 * Prüft ob Entra Admin Center verfügbar ist
 */
export async function checkAdminCenterAvailability(
  dbManager: AdminPortalDatabaseManager
): Promise<APIResponse<{
  isConfigured: boolean;
  connectionStatus: 'connected' | 'error' | 'not_configured';
  tenantInfo?: any;
  estimatedUserCount?: number;
}>> {
  try {
    const entraService = new EntraSourceService(dbManager);
    
    if (!entraService.isConfigured()) {
      return {
        success: false,
        error: 'NotConfigured',
        message: 'Entra ID ist nicht konfiguriert - fehlende Environment-Variablen'
      };
    }

    // Teste Verbindung zu Admin Center
    const connectionTest = await entraService.testConnection();
    
    if (connectionTest.success) {
      return {
        success: true,
        data: {
          isConfigured: true,
          connectionStatus: 'connected',
          tenantInfo: connectionTest.data?.tenantInfo,
          estimatedUserCount: connectionTest.data?.userCount
        },
        message: 'Entra Admin Center ist verfügbar'
      };
    } else {
      return {
        success: false,
        error: 'ConnectionFailed',
        message: connectionTest.message || 'Verbindung zu Entra Admin Center fehlgeschlagen'
      };
    }

  } catch (error) {
    console.error('❌ Fehler bei Admin Center Availability Check:', error);
    return {
      success: false,
      error: 'AvailabilityCheckError',
      message: 'Admin Center Verfügbarkeit konnte nicht geprüft werden'
    };
  }
}
