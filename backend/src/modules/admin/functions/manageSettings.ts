import { 
  SystemSetting, 
  UpdateSystemSettingRequest,
  APIResponse,
  SYSTEM_SETTING_CATEGORIES
} from '../types';
import { randomUUID } from 'crypto';

// In-Memory Settings Store (in Production würde dies eine Datenbank sein)
let settingsStore: SystemSetting[] = [
  {
    id: randomUUID(),
    key: 'COMPANY_NAME',
    value: 'CompanyAI',
    category: 'general',
    description: 'Name des Unternehmens',
    isSecret: false,
    updatedAt: new Date(),
    updatedBy: 'system'
  },
  {
    id: randomUUID(),
    key: 'MAX_LOGIN_ATTEMPTS',
    value: '5',
    category: 'security',
    description: 'Maximale Anzahl fehlgeschlagener Login-Versuche',
    isSecret: false,
    updatedAt: new Date(),
    updatedBy: 'system'
  },
  {
    id: randomUUID(),
    key: 'SESSION_TIMEOUT',
    value: '3600',
    category: 'security',
    description: 'Session-Timeout in Sekunden',
    isSecret: false,
    updatedAt: new Date(),
    updatedBy: 'system'
  },
  {
    id: randomUUID(),
    key: 'EMAIL_NOTIFICATIONS',
    value: 'true',
    category: 'notifications',
    description: 'E-Mail-Benachrichtigungen aktiviert',
    isSecret: false,
    updatedAt: new Date(),
    updatedBy: 'system'
  },
  {
    id: randomUUID(),
    key: 'OPENAI_API_KEY',
    value: process.env.OPENAI_API_KEY || '',
    category: 'integration',
    description: 'OpenAI API Schlüssel für AI-Features',
    isSecret: true,
    updatedAt: new Date(),
    updatedBy: 'system'
  },
  {
    id: randomUUID(),
    key: 'ENTRA_CLIENT_ID',
    value: process.env.ENTRA_CLIENT_ID || '',
    category: 'integration',
    description: 'Microsoft Entra ID Client ID',
    isSecret: false,
    updatedAt: new Date(),
    updatedBy: 'system'
  }
];

/**
 * Lädt alle System-Settings
 */
export async function fetchSystemSettings(
  category?: string,
  includeSecrets: boolean = false
): Promise<APIResponse<SystemSetting[]>> {
  try {
    let filteredSettings = [...settingsStore];

    // Nach Kategorie filtern
    if (category) {
      filteredSettings = filteredSettings.filter(setting => setting.category === category);
    }

    // Geheime Werte ausblenden (außer wenn explizit angefordert)
    if (!includeSecrets) {
      filteredSettings = filteredSettings.map(setting => ({
        ...setting,
        value: setting.isSecret ? '***HIDDEN***' : setting.value
      }));
    }

    return {
      success: true,
      data: filteredSettings,
      message: `${filteredSettings.length} System-Settings erfolgreich geladen`
    };

  } catch (error) {
    console.error('Fehler beim Laden der System-Settings:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'System-Settings konnten nicht geladen werden'
    };
  }
}

/**
 * Lädt ein einzelnes System-Setting by Key
 */
export async function fetchSystemSettingByKey(
  key: string,
  includeSecret: boolean = false
): Promise<APIResponse<SystemSetting>> {
  try {
    const setting = settingsStore.find(s => s.key === key);
    
    if (!setting) {
      return {
        success: false,
        error: 'NotFound',
        message: 'System-Setting nicht gefunden'
      };
    }

    // Geheimen Wert ausblenden (außer wenn explizit angefordert)
    const returnSetting = {
      ...setting,
      value: setting.isSecret && !includeSecret ? '***HIDDEN***' : setting.value
    };

    return {
      success: true,
      data: returnSetting,
      message: 'System-Setting erfolgreich geladen'
    };

  } catch (error) {
    console.error('Fehler beim Laden des System-Settings:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'System-Setting konnte nicht geladen werden'
    };
  }
}

/**
 * Aktualisiert oder erstellt ein System-Setting
 */
export async function updateSystemSetting(
  request: UpdateSystemSettingRequest,
  updatedBy: string
): Promise<APIResponse<SystemSetting>> {
  try {
    // Validierung
    const validationErrors = validateSettingRequest(request);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: 'ValidationError',
        message: validationErrors.join(', ')
      };
    }

    // Existierendes Setting finden oder neues erstellen
    let existingIndex = settingsStore.findIndex(s => s.key === request.key);
    
    if (existingIndex >= 0) {
      // Setting aktualisieren
      const existingSetting = settingsStore[existingIndex];
      settingsStore[existingIndex] = {
        ...existingSetting,
        value: request.value,
        category: request.category || existingSetting.category,
        description: request.description || existingSetting.description,
        updatedAt: new Date(),
        updatedBy
      };

      return {
        success: true,
        data: settingsStore[existingIndex],
        message: 'System-Setting erfolgreich aktualisiert'
      };
    } else {
      // Neues Setting erstellen
      const newSetting: SystemSetting = {
        id: randomUUID(),
        key: request.key,
        value: request.value,
        category: request.category || 'general',
        description: request.description || `Setting für ${request.key}`,
        isSecret: isSecretKey(request.key),
        updatedAt: new Date(),
        updatedBy
      };

      settingsStore.push(newSetting);

      return {
        success: true,
        data: newSetting,
        message: 'System-Setting erfolgreich erstellt'
      };
    }

  } catch (error) {
    console.error('Fehler beim Aktualisieren des System-Settings:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'System-Setting konnte nicht aktualisiert werden'
    };
  }
}

/**
 * Löscht ein System-Setting
 */
export async function deleteSystemSetting(
  key: string,
  deletedBy: string
): Promise<APIResponse<boolean>> {
  try {
    const settingIndex = settingsStore.findIndex(s => s.key === key);
    
    if (settingIndex === -1) {
      return {
        success: false,
        error: 'NotFound',
        message: 'System-Setting nicht gefunden'
      };
    }

    // Kritische Settings nicht löschen
    const criticalSettings = ['COMPANY_NAME', 'MAX_LOGIN_ATTEMPTS', 'SESSION_TIMEOUT'];
    if (criticalSettings.includes(key)) {
      return {
        success: false,
        error: 'ProtectedSetting',
        message: 'Kritische System-Settings können nicht gelöscht werden'
      };
    }

    settingsStore.splice(settingIndex, 1);

    return {
      success: true,
      data: true,
      message: 'System-Setting erfolgreich gelöscht'
    };

  } catch (error) {
    console.error('Fehler beim Löschen des System-Settings:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'System-Setting konnte nicht gelöscht werden'
    };
  }
}

/**
 * Lädt Settings nach Kategorie
 */
export async function fetchSettingsByCategory(): Promise<APIResponse<{[category: string]: SystemSetting[]}>> {
  try {
    const settingsResult = await fetchSystemSettings();
    
    if (!settingsResult.success || !settingsResult.data) {
      return {
        success: false,
        error: 'LoadError',
        message: 'Fehler beim Laden der Settings'
      };
    }

    // Nach Kategorien gruppieren
    const grouped = settingsResult.data.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {} as {[category: string]: SystemSetting[]});

    return {
      success: true,
      data: grouped,
      message: 'Settings erfolgreich nach Kategorien gruppiert'
    };

  } catch (error) {
    console.error('Fehler beim Gruppieren der Settings:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Settings konnten nicht gruppiert werden'
    };
  }
}

/**
 * Exportiert alle Settings (für Backup/Migration)
 */
export async function exportSettings(): Promise<APIResponse<SystemSetting[]>> {
  try {
    // Alle Settings mit geheimen Werten laden (für Admin-Export)
    const settingsResult = await fetchSystemSettings(undefined, true);
    
    if (!settingsResult.success || !settingsResult.data) {
      return {
        success: false,
        error: 'LoadError',
        message: 'Fehler beim Laden der Settings für Export'
      };
    }

    return {
      success: true,
      data: settingsResult.data,
      message: `${settingsResult.data.length} Settings erfolgreich exportiert`
    };

  } catch (error) {
    console.error('Fehler beim Exportieren der Settings:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Settings konnten nicht exportiert werden'
    };
  }
}

/**
 * Importiert Settings aus Backup (überschreibt existierende)
 */
export async function importSettings(
  settings: SystemSetting[],
  importedBy: string
): Promise<APIResponse<{imported: number, skipped: number}>> {
  try {
    let imported = 0;
    let skipped = 0;

    for (const setting of settings) {
      try {
        // Validierung
        if (!setting.key || !setting.value) {
          skipped++;
          continue;
        }

        await updateSystemSetting({
          key: setting.key,
          value: setting.value,
          category: setting.category,
          description: setting.description
        }, importedBy);

        imported++;
      } catch (error) {
        console.error(`Fehler beim Importieren von Setting ${setting.key}:`, error);
        skipped++;
      }
    }

    return {
      success: true,
      data: { imported, skipped },
      message: `Settings-Import abgeschlossen: ${imported} importiert, ${skipped} übersprungen`
    };

  } catch (error) {
    console.error('Fehler beim Importieren der Settings:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Settings konnten nicht importiert werden'
    };
  }
}

/**
 * Prüft ob ein Key als geheim eingestuft werden soll
 */
function isSecretKey(key: string): boolean {
  const secretKeywords = ['API_KEY', 'SECRET', 'PASSWORD', 'TOKEN', 'CLIENT_SECRET'];
  return secretKeywords.some(keyword => key.toUpperCase().includes(keyword));
}

/**
 * Validiert UpdateSystemSettingRequest
 */
function validateSettingRequest(request: UpdateSystemSettingRequest): string[] {
  const errors: string[] = [];

  if (!request.key?.trim()) {
    errors.push('Setting-Key ist erforderlich');
  }

  if (request.value === undefined || request.value === null) {
    errors.push('Setting-Wert ist erforderlich');
  }

  if (request.category && !SYSTEM_SETTING_CATEGORIES.includes(request.category as any)) {
    errors.push('Ungültige Setting-Kategorie');
  }

  return errors;
}
