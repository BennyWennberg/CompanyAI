import { 
  SchemaField, 
  UserSource, 
  DynamicUser,
  APIResponse 
} from '../types';
import { AdminPortalDatabaseManager } from './database-manager';

/**
 * Schema-Registry für automatische Felderkennung und Migration
 * Analysiert eingehende Daten und erweitert das Schema automatisch
 */
export class SchemaRegistry {
  private dbManager: AdminPortalDatabaseManager;

  constructor(dbManager: AdminPortalDatabaseManager) {
    this.dbManager = dbManager;
  }

  /**
   * Analysiert User-Daten und erkennt neue Felder
   */
  async discoverNewFields(
    source: UserSource, 
    users: any[]
  ): Promise<APIResponse<SchemaField[]>> {
    try {
      if (!users || users.length === 0) {
        return {
          success: true,
          data: [],
          message: 'Keine Daten zum Analysieren'
        };
      }

      // Aktuelle Schema laden
      const schemaResult = await this.dbManager.getSchema(source);
      if (!schemaResult.success || !schemaResult.data) {
        return {
          success: false,
          error: 'SchemaLoadError',
          message: 'Aktuelles Schema konnte nicht geladen werden'
        };
      }

      const existingFields = schemaResult.data.fields.map(f => f.fieldName);
      const newFields: SchemaField[] = [];

      // Alle Felder in den User-Daten analysieren
      const allFieldsMap = new Map<string, any[]>();
      
      users.forEach(user => {
        Object.entries(user).forEach(([key, value]) => {
          if (!existingFields.includes(key)) {
            if (!allFieldsMap.has(key)) {
              allFieldsMap.set(key, []);
            }
            allFieldsMap.get(key)?.push(value);
          }
        });
      });

      // Neue Felder analysieren und Datentypen bestimmen
      for (const [fieldName, values] of allFieldsMap) {
        const field = this.analyzeFieldType(fieldName, values, source);
        if (field) {
          newFields.push(field);
        }
      }

      return {
        success: true,
        data: newFields,
        message: `${newFields.length} neue Felder entdeckt`
      };

    } catch (error) {
      console.error(`❌ Fehler bei Schema-Discovery für ${source}:`, error);
      return {
        success: false,
        error: 'SchemaDiscoveryError',
        message: 'Schema-Discovery fehlgeschlagen'
      };
    }
  }

  /**
   * Analysiert Werte und bestimmt den besten Datentyp
   */
  private analyzeFieldType(fieldName: string, values: any[], source: UserSource): SchemaField | null {
    // Null/undefined-Werte herausfiltern
    const validValues = values.filter(v => v !== null && v !== undefined && v !== '');
    
    if (validValues.length === 0) {
      return null; // Keine gültigen Werte zum Analysieren
    }

    // Datentyp-Analyse
    let dataType: SchemaField['dataType'] = 'TEXT';
    let maxLength = 0;
    let hasNumbers = 0;
    let hasStrings = 0;
    let hasBooleans = 0;
    let hasDates = 0;

    validValues.forEach(value => {
      if (typeof value === 'boolean') {
        hasBooleans++;
      } else if (typeof value === 'number') {
        hasNumbers++;
      } else if (this.isDateString(value)) {
        hasDates++;
      } else if (typeof value === 'string') {
        hasStrings++;
        maxLength = Math.max(maxLength, value.length);
      }
    });

    const total = validValues.length;

    // Datentyp bestimmen basierend auf Häufigkeit
    if (hasBooleans / total > 0.8) {
      dataType = 'BOOLEAN';
    } else if (hasNumbers / total > 0.8) {
      // Prüfen ob Integer oder Real
      const hasDecimals = validValues.some(v => 
        typeof v === 'number' && !Number.isInteger(v)
      );
      dataType = hasDecimals ? 'REAL' : 'INTEGER';
    } else if (hasDates / total > 0.8) {
      dataType = 'DATETIME';
    } else {
      dataType = 'TEXT';
      // MaxLength für VARCHAR bestimmen
      if (maxLength > 0) {
        maxLength = Math.min(Math.max(maxLength * 1.2, 50), 1000); // 20% Puffer, min 50, max 1000
      }
    }

    // Feld-spezifische Anpassungen
    const fieldNameLower = fieldName.toLowerCase();
    
    // E-Mail-Felder
    if (fieldNameLower.includes('email') || fieldNameLower.includes('mail')) {
      dataType = 'TEXT';
      maxLength = 255;
    }
    
    // Telefonnummern
    if (fieldNameLower.includes('phone') || fieldNameLower.includes('tel')) {
      dataType = 'TEXT';
      maxLength = 50;
    }
    
    // Namen
    if (fieldNameLower.includes('name') || fieldNameLower.includes('title')) {
      dataType = 'TEXT';
      maxLength = Math.max(maxLength, 100);
    }

    // URLs
    if (fieldNameLower.includes('url') || fieldNameLower.includes('link')) {
      dataType = 'TEXT';
      maxLength = 500;
    }

    return {
      fieldName,
      dataType,
      maxLength: dataType === 'TEXT' ? maxLength : undefined,
      isRequired: false, // Neue Felder sind erstmal optional
      addedAt: new Date(),
      source
    };
  }

  /**
   * Prüft ob ein String ein Datum repräsentiert
   */
  private isDateString(value: any): boolean {
    if (typeof value !== 'string') return false;
    
    // ISO-Format prüfen
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return !isNaN(Date.parse(value));
    }
    
    // Andere Datumsformate
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/,         // MM/DD/YYYY
      /^\d{2}\.\d{2}\.\d{4}$/,         // DD.MM.YYYY
    ];
    
    return datePatterns.some(pattern => {
      if (pattern.test(value)) {
        return !isNaN(Date.parse(value));
      }
      return false;
    });
  }

  /**
   * Wendet Schema-Änderungen auf die Datenbank an
   */
  async applySchemaChanges(
    source: UserSource, 
    newFields: SchemaField[]
  ): Promise<APIResponse<{applied: number, failed: string[]}>> {
    try {
      const applied: string[] = [];
      const failed: string[] = [];

      for (const field of newFields) {
        const addResult = await this.dbManager.addField(source, field);
        
        if (addResult.success && addResult.data) {
          applied.push(field.fieldName);
          console.log(`✅ Feld hinzugefügt: ${source}.${field.fieldName}`);
        } else {
          failed.push(field.fieldName);
          console.log(`❌ Feld fehlgeschlagen: ${source}.${field.fieldName}`);
        }
      }

      return {
        success: true,
        data: { applied: applied.length, failed },
        message: `${applied.length} Felder angewendet, ${failed.length} fehlgeschlagen`
      };

    } catch (error) {
      console.error(`❌ Fehler beim Anwenden der Schema-Änderungen für ${source}:`, error);
      return {
        success: false,
        error: 'SchemaApplyError',
        message: 'Schema-Änderungen konnten nicht angewendet werden'
      };
    }
  }

  /**
   * Vollständiger Auto-Migration-Workflow
   */
  async autoMigrate(
    source: UserSource, 
    userData: any[]
  ): Promise<APIResponse<{newFields: SchemaField[], applied: number}>> {
    try {
      console.log(`🔍 Auto-Migration für ${source} - ${userData.length} Datensätze`);

      // 1. Neue Felder entdecken
      const discoveryResult = await this.discoverNewFields(source, userData);
      if (!discoveryResult.success || !discoveryResult.data) {
        return {
          success: false,
          error: discoveryResult.error,
          message: discoveryResult.message
        };
      }

      const newFields = discoveryResult.data;
      
      if (newFields.length === 0) {
        return {
          success: true,
          data: { newFields: [], applied: 0 },
          message: 'Keine neuen Felder gefunden'
        };
      }

      console.log(`🆕 ${newFields.length} neue Felder gefunden:`, newFields.map(f => f.fieldName));

      // 2. Schema-Änderungen anwenden
      const applyResult = await this.applySchemaChanges(source, newFields);
      if (!applyResult.success || !applyResult.data) {
        return {
          success: false,
          error: applyResult.error,
          message: applyResult.message
        };
      }

      return {
        success: true,
        data: {
          newFields,
          applied: applyResult.data.applied
        },
        message: `Auto-Migration abgeschlossen: ${applyResult.data.applied} neue Felder`
      };

    } catch (error) {
      console.error(`❌ Fehler bei Auto-Migration für ${source}:`, error);
      return {
        success: false,
        error: 'AutoMigrationError',
        message: 'Auto-Migration fehlgeschlagen'
      };
    }
  }

  /**
   * Validiert User-Daten gegen aktuelles Schema
   */
  async validateUserData(
    source: UserSource, 
    users: any[]
  ): Promise<APIResponse<{valid: any[], invalid: {user: any, errors: string[]}[]}>> {
    try {
      const schemaResult = await this.dbManager.getSchema(source);
      if (!schemaResult.success || !schemaResult.data) {
        return {
          success: false,
          error: 'SchemaLoadError',
          message: 'Schema konnte nicht geladen werden'
        };
      }

      const requiredFields = schemaResult.data.fields
        .filter(f => f.isRequired)
        .map(f => f.fieldName);

      const valid: any[] = [];
      const invalid: {user: any, errors: string[]}[] = [];

      users.forEach(user => {
        const errors: string[] = [];

        // Erforderliche Felder prüfen
        requiredFields.forEach(field => {
          if (!user[field] || user[field] === null || user[field] === '') {
            errors.push(`Erforderliches Feld fehlt: ${field}`);
          }
        });

        // E-Mail-Validierung
        if (user.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email)) {
          errors.push('Ungültige E-Mail-Adresse');
        }

        if (errors.length > 0) {
          invalid.push({ user, errors });
        } else {
          valid.push(user);
        }
      });

      return {
        success: true,
        data: { valid, invalid },
        message: `${valid.length} gültig, ${invalid.length} ungültig`
      };

    } catch (error) {
      console.error(`❌ Fehler bei Datenvalidierung für ${source}:`, error);
      return {
        success: false,
        error: 'ValidationError',
        message: 'Datenvalidierung fehlgeschlagen'
      };
    }
  }

  /**
   * Generiert Schema-Bericht für eine Quelle
   */
  async generateSchemaReport(source: UserSource): Promise<APIResponse<{
    totalFields: number;
    recentFields: SchemaField[];
    fieldTypes: {[type: string]: number};
    lastUpdate: Date;
  }>> {
    try {
      const schemaResult = await this.dbManager.getSchema(source);
      if (!schemaResult.success || !schemaResult.data) {
        return {
          success: false,
          error: 'SchemaLoadError',
          message: 'Schema konnte nicht geladen werden'
        };
      }

      const fields = schemaResult.data.fields;
      const totalFields = fields.length;
      
      // Neueste Felder (letzte 7 Tage)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentFields = fields.filter(f => f.addedAt > sevenDaysAgo);

      // Feldtyp-Statistiken
      const fieldTypes: {[type: string]: number} = {};
      fields.forEach(f => {
        fieldTypes[f.dataType] = (fieldTypes[f.dataType] || 0) + 1;
      });

      // Letztes Update
      const lastUpdate = fields.reduce((latest, field) => 
        field.addedAt > latest ? field.addedAt : latest, 
        new Date(0)
      );

      return {
        success: true,
        data: {
          totalFields,
          recentFields,
          fieldTypes,
          lastUpdate
        },
        message: `Schema-Bericht für ${source} generiert`
      };

    } catch (error) {
      console.error(`❌ Fehler beim Generieren des Schema-Berichts für ${source}:`, error);
      return {
        success: false,
        error: 'SchemaReportError',
        message: 'Schema-Bericht konnte nicht generiert werden'
      };
    }
  }
}
