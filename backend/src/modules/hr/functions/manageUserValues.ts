// HR Module - User Field Values Management
// Verwaltet die user-spezifischen Werte für die globalen Field Schemas

import { 
  UserFieldValue, 
  AdditionalInfoField,
  UpdateUserFieldValuesRequest,
  APIResponse 
} from '../types';
import { getAllFieldSchemas, getSchemaById } from './manageFieldSchemas';
import { getCombinedUsers } from '../../../datasources';
import { updateUserDetailsFile } from './manageDocuments';

// In-Memory Storage für User Field Values (für Demo)
// Key: employeeId-schemaId, Value: UserFieldValue
let userValuesStore: Map<string, UserFieldValue> = new Map();

/**
 * Lädt alle Zusatzinformationen für einen Mitarbeiter
 */
export async function getEmployeeAdditionalInfo(employeeId: string): Promise<APIResponse<AdditionalInfoField[]>> {
  try {
    // Alle verfügbaren Schemas laden
    const schemasResult = await getAllFieldSchemas();
    if (!schemasResult.success || !schemasResult.data) {
      return {
        success: false,
        error: 'SchemasLoadError',
        message: 'Field Schemas konnten nicht geladen werden'
      };
    }

    const schemas = schemasResult.data;
    const additionalInfoFields: AdditionalInfoField[] = [];

    // Für jedes Schema prüfen ob User einen Wert hat
    for (const schema of schemas) {
      const valueKey = `${employeeId}-${schema.id}`;
      const userValue = userValuesStore.get(valueKey);

      additionalInfoFields.push({
        schema: schema,
        value: userValue?.value || schema.defaultValue || '',
        hasValue: !!userValue
      });
    }

    return {
      success: true,
      data: additionalInfoFields,
      message: `${additionalInfoFields.length} Zusatzinformationen für Mitarbeiter geladen`
    };
  } catch (error) {
    console.error('Fehler beim Laden der Zusatzinformationen:', error);
    return {
      success: false,
      error: 'AdditionalInfoLoadError',
      message: 'Zusatzinformationen konnten nicht geladen werden'
    };
  }
}

/**
 * Aktualisiert die Zusatzinformationen für einen Mitarbeiter
 */
export async function updateEmployeeAdditionalInfo(
  employeeId: string,
  request: UpdateUserFieldValuesRequest,
  updatedBy: string
): Promise<APIResponse<AdditionalInfoField[]>> {
  try {
    // Alle Schemas validieren
    for (const value of request.values) {
      const schema = getSchemaById(value.schemaId);
      if (!schema) {
        return {
          success: false,
          error: 'ValidationError',
          message: `Unbekanntes Schema: ${value.schemaId}`
        };
      }

      // Wert-Validierung basierend auf Schema-Typ
      const validationError = validateFieldValue(value.value, schema);
      if (validationError) {
        return {
          success: false,
          error: 'ValidationError',
          message: `Validierungsfehler für "${schema.name}": ${validationError}`
        };
      }
    }

    // Werte speichern oder aktualisieren
    for (const value of request.values) {
      const valueKey = `${employeeId}-${value.schemaId}`;
      
      if (value.value && value.value.trim() !== '') {
        // Wert setzen oder aktualisieren
        const userFieldValue: UserFieldValue = {
          employeeId: employeeId,
          schemaId: value.schemaId,
          value: value.value.trim(),
          updatedAt: new Date(),
          updatedBy: updatedBy
        };
        userValuesStore.set(valueKey, userFieldValue);
      } else {
        // Leeren Wert löschen
        userValuesStore.delete(valueKey);
      }
    }

    // user_details.txt aktualisieren
    try {
      const userResult = await getCombinedUsers();
      const employee = userResult.find(u => u.id === employeeId);
      if (employee) {
        await updateUserDetailsFile(employee);
      }
    } catch (error) {
      console.error('Fehler beim Aktualisieren der user_details.txt:', error);
      // Fehler nicht weiterwerfen, da Haupt-Operation erfolgreich war
    }

    // Aktualisierte Zusatzinformationen zurückgeben
    return await getEmployeeAdditionalInfo(employeeId);

  } catch (error) {
    console.error('Fehler beim Aktualisieren der Zusatzinformationen:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Zusatzinformationen konnten nicht aktualisiert werden'
    };
  }
}

/**
 * Löscht alle Werte für ein bestimmtes Schema (wird aufgerufen wenn Schema gelöscht wird)
 */
export async function deleteValuesForSchema(schemaId: string): Promise<APIResponse<{ deletedCount: number }>> {
  try {
    let deletedCount = 0;
    
    // Alle Einträge durchgehen und die mit der schemaId löschen
    const keysToDelete: string[] = [];
    for (const [key, value] of userValuesStore.entries()) {
      if (value.schemaId === schemaId) {
        keysToDelete.push(key);
        deletedCount++;
      }
    }

    // Gefundene Einträge löschen
    keysToDelete.forEach(key => userValuesStore.delete(key));

    return {
      success: true,
      data: { deletedCount },
      message: `${deletedCount} User-Werte für Schema gelöscht`
    };

  } catch (error) {
    console.error('Fehler beim Löschen der Schema-Werte:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Schema-Werte konnten nicht gelöscht werden'
    };
  }
}

/**
 * Lädt alle User Values für Statistiken/Debug
 */
export async function getAllUserValues(): Promise<APIResponse<UserFieldValue[]>> {
  try {
    const allValues = Array.from(userValuesStore.values());
    
    return {
      success: true,
      data: allValues,
      message: `${allValues.length} User Values geladen`
    };
  } catch (error) {
    console.error('Fehler beim Laden der User Values:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'User Values konnten nicht geladen werden'
    };
  }
}

/**
 * Lädt Statistiken über Zusatzinformationen
 */
export async function getAdditionalInfoStats(): Promise<APIResponse<{
  totalSchemas: number;
  totalUserValues: number;
  schemaUsage: { schemaId: string; schemaName: string; userCount: number; }[];
}>> {
  try {
    const schemasResult = await getAllFieldSchemas();
    if (!schemasResult.success || !schemasResult.data) {
      throw new Error('Schemas konnten nicht geladen werden');
    }

    const schemas = schemasResult.data;
    const allValues = Array.from(userValuesStore.values());

    // Schema-Verwendungsstatistiken
    const schemaUsage = schemas.map(schema => {
      const userCount = allValues.filter(value => value.schemaId === schema.id).length;
      return {
        schemaId: schema.id,
        schemaName: schema.name,
        userCount: userCount
      };
    });

    return {
      success: true,
      data: {
        totalSchemas: schemas.length,
        totalUserValues: allValues.length,
        schemaUsage: schemaUsage
      },
      message: 'Zusatzinformationen-Statistiken erfolgreich geladen'
    };

  } catch (error) {
    console.error('Fehler beim Laden der Zusatzinformationen-Statistiken:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Statistiken konnten nicht geladen werden'
    };
  }
}

/**
 * Validiert einen Feld-Wert basierend auf dem Schema-Typ
 */
function validateFieldValue(value: string, schema: any): string | null {
  if (!value || value.trim() === '') {
    if (schema.required) {
      return 'Wert ist erforderlich';
    }
    return null; // Leerer Wert ist OK wenn nicht required
  }

  const trimmedValue = value.trim();

  switch (schema.type) {
    case 'number':
      if (isNaN(Number(trimmedValue))) {
        return 'Wert muss eine Zahl sein';
      }
      break;

    case 'boolean':
      if (trimmedValue !== 'true' && trimmedValue !== 'false') {
        return 'Wert muss true oder false sein';
      }
      break;

    case 'date':
      const dateValue = new Date(trimmedValue);
      if (isNaN(dateValue.getTime())) {
        return 'Wert muss ein gültiges Datum sein (YYYY-MM-DD)';
      }
      break;

    case 'select':
      if (schema.selectOptions && schema.selectOptions.length > 0) {
        if (!schema.selectOptions.includes(trimmedValue)) {
          return `Wert muss eine der folgenden Optionen sein: ${schema.selectOptions.join(', ')}`;
        }
      }
      break;

    case 'text':
      if (trimmedValue.length > 500) {
        return 'Text darf maximal 500 Zeichen lang sein';
      }
      break;

    default:
      break;
  }

  return null;
}
