// HR Module - Field Schemas Management (Global)
// Verwaltet die globalen Feldtypen für Zusatzinformationen aller Mitarbeiter

import { v4 as uuidv4 } from 'uuid';
import { 
  FieldSchema, 
  CreateFieldSchemaRequest, 
  UpdateFieldSchemaRequest,
  APIResponse 
} from '../types';

// In-Memory Storage für Field Schemas (für Demo)
// In Production würde das in einer echten Datenbank gespeichert
let fieldSchemasStore: Map<string, FieldSchema> = new Map();

// Vordefinierte Standard-Schemas
const initializeDefaultSchemas = () => {
  if (fieldSchemasStore.size === 0) {
    const defaultSchemas: FieldSchema[] = [
      {
        id: uuidv4(),
        name: 'Gehalt',
        type: 'number',
        category: 'Finanzen',
        unit: '€',
        required: false,
        defaultValue: '',
        createdAt: new Date(),
        createdBy: 'system'
      },
      {
        id: uuidv4(),
        name: 'Führerschein',
        type: 'boolean',
        category: 'Personal',
        required: false,
        defaultValue: 'false',
        createdAt: new Date(),
        createdBy: 'system'
      },
      {
        id: uuidv4(),
        name: 'Urlaubstage',
        type: 'number',
        category: 'HR',
        unit: 'Tage',
        required: false,
        defaultValue: '25',
        createdAt: new Date(),
        createdBy: 'system'
      },
      {
        id: uuidv4(),
        name: 'Startdatum Vertrag',
        type: 'date',
        category: 'Legal',
        required: false,
        defaultValue: '',
        createdAt: new Date(),
        createdBy: 'system'
      }
    ];

    defaultSchemas.forEach(schema => {
      fieldSchemasStore.set(schema.id, schema);
    });
  }
};

/**
 * Lädt alle Field Schemas
 */
export async function getAllFieldSchemas(): Promise<APIResponse<FieldSchema[]>> {
  try {
    initializeDefaultSchemas();
    
    const schemas = Array.from(fieldSchemasStore.values())
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    
    return {
      success: true,
      data: schemas,
      message: `${schemas.length} Field Schemas geladen`
    };
  } catch (error) {
    console.error('Fehler beim Laden der Field Schemas:', error);
    return {
      success: false,
      error: 'SchemasLoadError',
      message: 'Field Schemas konnten nicht geladen werden'
    };
  }
}

/**
 * Erstellt ein neues Field Schema
 */
export async function createFieldSchema(
  request: CreateFieldSchemaRequest,
  createdBy: string
): Promise<APIResponse<FieldSchema>> {
  try {
    // Validierung
    const validationErrors = validateSchemaRequest(request);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: 'ValidationError',
        message: validationErrors.join(', ')
      };
    }

    // Prüfen ob Name bereits existiert
    const existingSchema = Array.from(fieldSchemasStore.values())
      .find(schema => schema.name.toLowerCase() === request.name.toLowerCase());

    if (existingSchema) {
      return {
        success: false,
        error: 'DuplicateSchemaError',
        message: `Feld "${request.name}" existiert bereits`
      };
    }

    // Neues Schema erstellen
    const newSchema: FieldSchema = {
      id: uuidv4(),
      name: request.name.trim(),
      type: request.type,
      category: request.category.trim(),
      unit: request.unit?.trim(),
      required: request.required,
      defaultValue: request.defaultValue?.trim() || '',
      selectOptions: request.selectOptions || [],
      createdAt: new Date(),
      createdBy: createdBy
    };

    fieldSchemasStore.set(newSchema.id, newSchema);

    return {
      success: true,
      data: newSchema,
      message: `Field Schema "${newSchema.name}" erfolgreich erstellt`
    };

  } catch (error) {
    console.error('Fehler beim Erstellen des Field Schemas:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Field Schema konnte nicht erstellt werden'
    };
  }
}

/**
 * Aktualisiert ein bestehendes Field Schema
 */
export async function updateFieldSchema(
  schemaId: string,
  request: UpdateFieldSchemaRequest,
  updatedBy: string
): Promise<APIResponse<FieldSchema>> {
  try {
    const existingSchema = fieldSchemasStore.get(schemaId);
    if (!existingSchema) {
      return {
        success: false,
        error: 'NotFoundError',
        message: 'Field Schema nicht gefunden'
      };
    }

    // Schema aktualisieren
    const updatedSchema: FieldSchema = {
      ...existingSchema,
      name: request.name?.trim() || existingSchema.name,
      category: request.category?.trim() || existingSchema.category,
      unit: request.unit?.trim() || existingSchema.unit,
      required: request.required !== undefined ? request.required : existingSchema.required,
      defaultValue: request.defaultValue?.trim() || existingSchema.defaultValue,
      selectOptions: request.selectOptions || existingSchema.selectOptions,
      updatedAt: new Date(),
      updatedBy: updatedBy
    };

    fieldSchemasStore.set(schemaId, updatedSchema);

    return {
      success: true,
      data: updatedSchema,
      message: `Field Schema "${updatedSchema.name}" erfolgreich aktualisiert`
    };

  } catch (error) {
    console.error('Fehler beim Aktualisieren des Field Schemas:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Field Schema konnte nicht aktualisiert werden'
    };
  }
}

/**
 * Löscht ein Field Schema (und alle zugehörigen User Values)
 */
export async function deleteFieldSchema(schemaId: string): Promise<APIResponse<void>> {
  try {
    const existingSchema = fieldSchemasStore.get(schemaId);
    if (!existingSchema) {
      return {
        success: false,
        error: 'NotFoundError',
        message: 'Field Schema nicht gefunden'
      };
    }

    fieldSchemasStore.delete(schemaId);

    // TODO: Hier sollten auch alle UserFieldValues mit dieser schemaId gelöscht werden
    // Das implementieren wir in manageUserValues.ts

    return {
      success: true,
      message: `Field Schema "${existingSchema.name}" erfolgreich gelöscht`
    };

  } catch (error) {
    console.error('Fehler beim Löschen des Field Schemas:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Field Schema konnte nicht gelöscht werden'
    };
  }
}

/**
 * Lädt alle verfügbaren Kategorien
 */
export async function getFieldSchemaCategories(): Promise<APIResponse<string[]>> {
  try {
    initializeDefaultSchemas();
    
    const schemas = Array.from(fieldSchemasStore.values());
    const categories = Array.from(new Set(schemas.map(schema => schema.category)))
      .sort();

    // Standard-Kategorien hinzufügen falls keine existieren
    const defaultCategories = ['HR', 'Finanzen', 'Personal', 'Legal', 'IT', 'Sonstiges'];
    const mergedCategories = Array.from(new Set([...categories, ...defaultCategories]));

    return {
      success: true,
      data: mergedCategories,
      message: `${mergedCategories.length} Kategorien verfügbar`
    };

  } catch (error) {
    console.error('Fehler beim Laden der Kategorien:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Kategorien konnten nicht geladen werden'
    };
  }
}

/**
 * Utility-Funktion: Gibt ein Schema per ID zurück
 */
export function getSchemaById(schemaId: string): FieldSchema | null {
  initializeDefaultSchemas();
  return fieldSchemasStore.get(schemaId) || null;
}

/**
 * Validiert Schema-Requests
 */
function validateSchemaRequest(request: CreateFieldSchemaRequest): string[] {
  const errors: string[] = [];

  if (!request.name?.trim()) {
    errors.push('Feld-Name ist erforderlich');
  }

  if (!request.type) {
    errors.push('Feld-Typ ist erforderlich');
  }

  if (!request.category?.trim()) {
    errors.push('Kategorie ist erforderlich');
  }

  // Feld-Name Validierung
  if (request.name && !/^[a-zA-ZäöüÄÖÜß0-9\s\-_]{2,50}$/.test(request.name.trim())) {
    errors.push('Feld-Name muss 2-50 Zeichen lang sein und darf nur Buchstaben, Zahlen, Leerzeichen, - und _ enthalten');
  }

  // Kategorie Validierung
  if (request.category && !/^[a-zA-ZäöüÄÖÜß0-9\s\-_]{2,30}$/.test(request.category.trim())) {
    errors.push('Kategorie muss 2-30 Zeichen lang sein');
  }

  // Select Options Validierung
  if (request.type === 'select' && (!request.selectOptions || request.selectOptions.length === 0)) {
    errors.push('Select-Felder benötigen mindestens eine Option');
  }

  return errors;
}
