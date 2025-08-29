// HR Module - Orchestrator
// Steuert die Abläufe im HR-Modul und koordiniert die verschiedenen Funktionen

import { Request, Response } from 'express';
import multer from 'multer';
import { 
  CreateOnboardingPlanRequest,
  FetchEmployeeDataRequest,
  CreateHRReportRequest,
  CreateFieldSchemaRequest,
  UpdateFieldSchemaRequest,
  UpdateUserFieldValuesRequest,
  APIResponse 
} from './types';

// Import functions
import { generateOnboardingPlan, updateOnboardingTask, validateOnboardingRequest } from './functions/generateOnboardingPlan';
import { fetchEmployeeData, fetchEmployeeById, createEmployee, updateEmployee, getEmployeeStats } from './functions/fetchEmployeeData';
import { createHRReport, createDetailedHRReport } from './functions/createHRReport';
import { 
  getEmployeeDocuments, 
  downloadEmployeeDocument, 
  deleteEmployeeDocument, 
  uploadEmployeeDocument,
  getHRStorageStats,
  initializeAllUserDirectories,
  updateEmployeeDetailsFile
} from './functions/manageDocuments';
import {
  getAllFieldSchemas,
  createFieldSchema,
  updateFieldSchema,
  deleteFieldSchema,
  getFieldSchemaCategories
} from './functions/manageFieldSchemas';
import {
  getEmployeeAdditionalInfo,
  updateEmployeeAdditionalInfo,
  getAdditionalInfoStats
} from './functions/manageUserValues';

// Import core functionality
import { AuthenticatedRequest, requirePermission, logAuthEvent } from './core/auth';
import { requireHRAccess, requireHRAdmin } from '../../middleware/permission.middleware';

// Multer Configuration für HR-Dokumente
const hrDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['pdf', 'doc', 'docx', 'xlsx', 'xls', 'jpg', 'jpeg', 'png', 'txt'];
    const fileType = file.originalname.split('.').pop()?.toLowerCase() || '';
    
    if (allowedTypes.includes(fileType)) {
      cb(null, true);
    } else {
      cb(new Error(`Dateityp .${fileType} nicht erlaubt. Erlaubt: ${allowedTypes.join(', ')}`));
    }
  }
});

/**
 * HR-Orchestrator Klasse - Koordiniert alle HR-Module-Funktionen
 */
export class HROrchestrator {
  
  /**
   * Erstellt einen Onboarding-Plan für einen neuen Mitarbeiter
   */
  static async handleCreateOnboardingPlan(req: AuthenticatedRequest, res: Response) {
    try {
      const request: CreateOnboardingPlanRequest = req.body;
      const userId = req.user?.id || 'unknown';

      // Log the action
      logAuthEvent(userId, 'create_onboarding_plan', 'onboarding');

      // Validierung
      const validationErrors = validateOnboardingRequest(request);
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: validationErrors.join(', ')
        });
      }

      // Onboarding-Plan generieren
      const result = await generateOnboardingPlan(request);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Fehler im Onboarding-Plan Handler:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Onboarding-Plan konnte nicht erstellt werden'
      });
    }
  }

  /**
   * Aktualisiert eine Onboarding-Aufgabe
   */
  static async handleUpdateOnboardingTask(req: AuthenticatedRequest, res: Response) {
    try {
      const { planId, taskId } = req.params;
      const updates = req.body;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'update_onboarding_task', 'onboarding');

      const result = await updateOnboardingTask(planId, taskId, updates);

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Aktualisieren der Onboarding-Aufgabe:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Aufgabe konnte nicht aktualisiert werden'
      });
    }
  }

  /**
   * Lädt Mitarbeiterdaten mit optionalen Filtern
   */
  static async handleFetchEmployeeData(req: AuthenticatedRequest, res: Response) {
    try {
      const request: FetchEmployeeDataRequest = {
        employeeId: req.query.employeeId as string,
        department: req.query.department as string,
        status: req.query.status as any,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };

      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';
      console.log(`🚀 HR handleFetchEmployeeData: User ${userEmail} (${userId}) requesting employee data`);
      
      logAuthEvent(userId, 'fetch_employee_data', 'employee_data');

      const result = await fetchEmployeeData(request);
      console.log(`📤 HR handleFetchEmployeeData: Returning ${result.success ? 'SUCCESS' : 'ERROR'} with ${result.data?.data?.length || 0} employees`);

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeiterdaten:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Mitarbeiterdaten konnten nicht geladen werden'
      });
    }
  }

  /**
   * Lädt einen einzelnen Mitarbeiter
   */
  static async handleFetchEmployeeById(req: AuthenticatedRequest, res: Response) {
    try {
      const { employeeId } = req.params;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'fetch_employee_by_id', 'employee_data');

      const result = await fetchEmployeeById(employeeId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Laden des Mitarbeiters:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Mitarbeiter konnte nicht geladen werden'
      });
    }
  }

  /**
   * Erstellt einen neuen Mitarbeiter
   */
  static async handleCreateEmployee(req: AuthenticatedRequest, res: Response) {
    try {
      const employeeData = req.body;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'create_employee', 'employee_data');

      const result = await createEmployee(employeeData);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Erstellen des Mitarbeiters:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Mitarbeiter konnte nicht erstellt werden'
      });
    }
  }

  /**
   * Aktualisiert einen bestehenden Mitarbeiter
   */
  static async handleUpdateEmployee(req: AuthenticatedRequest, res: Response) {
    try {
      const { employeeId } = req.params;
      const updates = req.body;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'update_employee', 'employee_data');

      const result = await updateEmployee(employeeId, updates);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Aktualisieren des Mitarbeiters:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Mitarbeiter konnte nicht aktualisiert werden'
      });
    }
  }

  /**
   * Lädt Mitarbeiterstatistiken
   */
  static async handleGetEmployeeStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'get_employee_stats', 'reports');

      const result = await getEmployeeStats();

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Laden der Statistiken:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Statistiken konnten nicht geladen werden'
      });
    }
  }

  /**
   * Erstellt einen HR-Report
   */
  static async handleCreateHRReport(req: AuthenticatedRequest, res: Response) {
    try {
      const request: CreateHRReportRequest = req.body;
      const userId = req.user?.id || 'unknown';
      const generatedBy = req.user?.email || 'system';

      logAuthEvent(userId, 'create_hr_report', 'reports');

      const result = await createHRReport(request, generatedBy);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Erstellen des HR-Reports:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'HR-Report konnte nicht erstellt werden'
      });
    }
  }

  /**
   * Erstellt einen detaillierten HR-Report
   */
  static async handleCreateDetailedHRReport(req: AuthenticatedRequest, res: Response) {
    try {
      const request: CreateHRReportRequest = req.body;
      const userId = req.user?.id || 'unknown';
      const generatedBy = req.user?.email || 'system';

      logAuthEvent(userId, 'create_detailed_hr_report', 'reports');

      const result = await createDetailedHRReport(request, generatedBy);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Erstellen des detaillierten HR-Reports:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Detaillierter HR-Report konnte nicht erstellt werden'
      });
    }
  }

  /**
   * Generiert Test-Daten für Entwicklung und Demo
   */
  static async handleGenerateTestData(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'generate_test_data', 'all');

      // Beispiel Onboarding-Plan generieren
      const onboardingRequest: CreateOnboardingPlanRequest = {
        employeeId: 'emp_test_001',
        department: 'IT',
        position: 'Software Developer',
        customTasks: [
          {
            title: 'Repository-Zugang einrichten',
            description: 'Zugang zu Git-Repositories und Entwicklungstools',
            category: 'equipment'
          }
        ]
      };

      const onboardingResult = await generateOnboardingPlan(onboardingRequest);

      // Beispiel HR-Report generieren
      const reportRequest: CreateHRReportRequest = {
        type: 'monthly',
        title: 'Test-Report für Entwicklung',
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 Tage zurück
          end: new Date().toISOString()
        }
      };

      const reportResult = await createHRReport(reportRequest, req.user?.email || 'test-user');

      // Mitarbeiterstatistiken abrufen
      const statsResult = await getEmployeeStats();

      res.json({
        success: true,
        data: {
          onboardingPlan: onboardingResult.data,
          hrReport: reportResult.data,
          employeeStats: statsResult.data
        },
        message: 'Test-Daten erfolgreich generiert'
      });

    } catch (error) {
      console.error('Fehler beim Generieren der Test-Daten:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Test-Daten konnten nicht generiert werden'
      });
    }
  }

  // ===== DOCUMENT MANAGEMENT HANDLERS =====

  /**
   * Lädt alle Dokumente eines Mitarbeiters
   */
  static async handleGetEmployeeDocuments(req: AuthenticatedRequest, res: Response) {
    try {
      const { employeeId } = req.params;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'read', 'hr_documents');

      const result = await getEmployeeDocuments(employeeId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Laden der Mitarbeiter-Dokumente:', error);
      res.status(500).json({
        success: false,
        error: 'DocumentsLoadError',
        message: 'Dokumente konnten nicht geladen werden'
      });
    }
  }

  /**
   * Lädt Dokument für Download
   */
  static async handleDownloadEmployeeDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { employeeId, documentId } = req.params;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'download', 'hr_documents');

      const result = await downloadEmployeeDocument(employeeId, documentId);

      if (result.success && result.data) {
        // Content-Type basierend auf Dateiendung setzen
        const documentsResult = await getEmployeeDocuments(employeeId);
        const document = documentsResult.data?.find(d => d.id === documentId);
        
        if (document) {
          const contentType = getContentType(document.fileType);
          res.setHeader('Content-Type', contentType);
          res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
          res.send(result.data);
        } else {
          res.status(404).json({
            success: false,
            error: 'DocumentNotFound',
            message: 'Dokument nicht gefunden'
          });
        }
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Download:', error);
      res.status(500).json({
        success: false,
        error: 'DocumentDownloadError',
        message: 'Download fehlgeschlagen'
      });
    }
  }

  /**
   * Lädt Dokument hoch (mit Multer für File-Upload)
   */
  static async handleUploadEmployeeDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { employeeId } = req.params;
      const { category } = req.body;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'upload', 'hr_documents');

      // File aus req.file holen (Multer)
      const file = req.file as any;
      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'NoFileProvided',
          message: 'Keine Datei bereitgestellt'
        });
      }

      const uploadRequest = {
        employeeId: employeeId,
        fileName: file.originalname,
        category: category || 'Sonstiges',
        fileBuffer: file.buffer
      };

      const result = await uploadEmployeeDocument(uploadRequest);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Upload:', error);
      res.status(500).json({
        success: false,
        error: 'DocumentUploadError',
        message: 'Upload fehlgeschlagen'
      });
    }
  }

  /**
   * Löscht Dokument
   */
  static async handleDeleteEmployeeDocument(req: AuthenticatedRequest, res: Response) {
    try {
      const { employeeId, documentId } = req.params;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'delete', 'hr_documents');

      const result = await deleteEmployeeDocument(employeeId, documentId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Löschen:', error);
      res.status(500).json({
        success: false,
        error: 'DocumentDeleteError',
        message: 'Dokument konnte nicht gelöscht werden'
      });
    }
  }

  /**
   * Lädt HR-Speicher-Statistiken
   */
  static async handleGetHRStorageStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'read', 'hr_storage_stats');

      const result = await getHRStorageStats();

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler bei Speicher-Statistiken:', error);
      res.status(500).json({
        success: false,
        error: 'StorageStatsError',
        message: 'Speicher-Statistiken konnten nicht geladen werden'
      });
    }
  }

  /**
   * Initialisiert automatisch Ordnerstruktur für alle Users
   */
  static async handleInitializeUserDirectories(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      
      logAuthEvent(userId, 'admin', 'hr_documents');
      
      const result = await initializeAllUserDirectories();
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
      
    } catch (error) {
      console.error('❌ Fehler bei der User-Directory-Initialisierung:', error);
      res.status(500).json({
        success: false,
        error: 'InitializationError',
        message: 'User-Directories konnten nicht initialisiert werden'
      });
    }
  }

  // ===== FIELD SCHEMAS HANDLERS (GLOBAL) =====

  /**
   * Lädt alle Field Schemas (für Schema-Management)
   */
  static async handleGetFieldSchemas(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'read', 'hr_field_schemas');

      const result = await getAllFieldSchemas();

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Laden der Field Schemas:', error);
      res.status(500).json({
        success: false,
        error: 'SchemasLoadError',
        message: 'Field Schemas konnten nicht geladen werden'
      });
    }
  }

  /**
   * Erstellt ein neues Field Schema
   */
  static async handleCreateFieldSchema(req: AuthenticatedRequest, res: Response) {
    try {
      const request: CreateFieldSchemaRequest = req.body;
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'create', 'hr_field_schemas');

      const result = await createFieldSchema(request, userEmail);

      if (result.success) {
        res.status(201).json(result);
      } else {
        const statusCode = result.error === 'ValidationError' ? 400 : 
                          result.error === 'DuplicateSchemaError' ? 409 : 500;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Field Schemas:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Field Schema konnte nicht erstellt werden'
      });
    }
  }

  /**
   * Aktualisiert ein bestehendes Field Schema
   */
  static async handleUpdateFieldSchema(req: AuthenticatedRequest, res: Response) {
    try {
      const { schemaId } = req.params;
      const request: UpdateFieldSchemaRequest = req.body;
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'update', 'hr_field_schemas');

      const result = await updateFieldSchema(schemaId, request, userEmail);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error === 'NotFoundError' ? 404 : 500;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des Field Schemas:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Field Schema konnte nicht aktualisiert werden'
      });
    }
  }

  /**
   * Löscht ein Field Schema (und alle User Values)
   */
  static async handleDeleteFieldSchema(req: AuthenticatedRequest, res: Response) {
    try {
      const { schemaId } = req.params;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'delete', 'hr_field_schemas');

      const result = await deleteFieldSchema(schemaId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error === 'NotFoundError' ? 404 : 500;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Löschen des Field Schemas:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Field Schema konnte nicht gelöscht werden'
      });
    }
  }

  /**
   * Lädt verfügbare Schema-Kategorien
   */
  static async handleGetFieldSchemaCategories(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'read', 'hr_field_schemas');

      const result = await getFieldSchemaCategories();
      res.json(result);

    } catch (error) {
      console.error('❌ Fehler beim Laden der Kategorien:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Kategorien konnten nicht geladen werden'
      });
    }
  }

  // ===== USER FIELD VALUES HANDLERS (USER-SPECIFIC) =====

  /**
   * Lädt Zusatzinformationen für einen Mitarbeiter
   */
  static async handleGetEmployeeAdditionalInfo(req: AuthenticatedRequest, res: Response) {
    try {
      const { employeeId } = req.params;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'read', 'hr_additional_info');

      const result = await getEmployeeAdditionalInfo(employeeId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Laden der Zusatzinformationen:', error);
      res.status(500).json({
        success: false,
        error: 'AdditionalInfoLoadError',
        message: 'Zusatzinformationen konnten nicht geladen werden'
      });
    }
  }

  /**
   * Aktualisiert Zusatzinformationen für einen Mitarbeiter
   */
  static async handleUpdateEmployeeAdditionalInfo(req: AuthenticatedRequest, res: Response) {
    try {
      const { employeeId } = req.params;
      const request: UpdateUserFieldValuesRequest = req.body;
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'update', 'hr_additional_info');

      const result = await updateEmployeeAdditionalInfo(employeeId, request, userEmail);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error === 'ValidationError' ? 400 : 500;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren der Zusatzinformationen:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Zusatzinformationen konnten nicht aktualisiert werden'
      });
    }
  }

  /**
   * Lädt Statistiken über Zusatzinformationen
   */
  static async handleGetAdditionalInfoStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'read', 'hr_additional_info');

      const result = await getAdditionalInfoStats();
      res.json(result);

    } catch (error) {
      console.error('❌ Fehler beim Laden der Zusatzinformationen-Statistiken:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Statistiken konnten nicht geladen werden'
      });
    }
  }

  /**
   * Aktualisiert die user_details.txt Datei für einen Mitarbeiter
   */
  static async handleUpdateEmployeeDetailsFile(req: AuthenticatedRequest, res: Response) {
    try {
      const { employeeId } = req.params;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'update', 'hr_details_file');

      const result = await updateEmployeeDetailsFile(employeeId);

      if (result.success) {
        res.json(result);
      } else {
        const statusCode = result.error === 'UserNotFound' ? 404 : 500;
        res.status(statusCode).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren der Details-Datei:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Details-Datei konnte nicht aktualisiert werden'
      });
    }
  }

  /**
   * Synchronisiert DataSources (Entra ID, Manual, etc.)
   */
  static async handleSyncDataSources(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      console.log(`🔄 HR Sync: User ${userEmail} (${userId}) triggering DataSources sync`);
      logAuthEvent(userId, 'sync', 'datasources');

      // Import sync functions
      const { syncAll } = require('../../datasources/entraac/sync');
      const { getCombinedStats } = require('../../datasources/entraac/combined');

      // Get stats before sync
      const statsBefore = await getCombinedStats();
      console.log(`📊 HR Sync: Stats before sync:`, statsBefore);

      // Trigger sync
      const syncStartTime = Date.now();
      await syncAll();
      const syncDuration = Date.now() - syncStartTime;

      // Get stats after sync
      const statsAfter = await getCombinedStats();
      console.log(`📊 HR Sync: Stats after sync:`, statsAfter);

      res.json({
        success: true,
        data: {
          entra: statsAfter.users?.bySource?.entra || 0,
          manual: statsAfter.users?.bySource?.manual || 0,
          ldap: 0, // LDAP not implemented yet
          upload: 0, // Upload not implemented yet
          total: statsAfter.users?.total || 0,
          syncDuration: `${syncDuration}ms`
        },
        message: `DataSources erfolgreich synchronisiert in ${syncDuration}ms`
      });

    } catch (error) {
      console.error('❌ HR Sync Fehler:', error);
      res.status(500).json({
        success: false,
        error: 'SyncError',
        message: 'DataSources Synchronisation fehlgeschlagen'
      });
    }
  }
}

/**
 * Helper: Content-Type für Dateitypen
 */
function getContentType(fileType: string): string {
  const types: Record<string, string> = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'xls': 'application/vnd.ms-excel',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'txt': 'text/plain'
  };
  return types[fileType.toLowerCase()] || 'application/octet-stream';
}

/**
 * Hilfsfunktion zur Registrierung der HR-Module-Routes
 */
export function registerHRRoutes(router: any) {
  // Onboarding Routes
  router.post('/hr/onboarding/plans', 
    requirePermission('write', 'onboarding'),
    HROrchestrator.handleCreateOnboardingPlan
  );
  
  router.put('/hr/onboarding/plans/:planId/tasks/:taskId',
    requirePermission('write', 'onboarding'),
    HROrchestrator.handleUpdateOnboardingTask
  );

  // Employee Data Routes
  router.get('/hr/employees',
    requireHRAccess(),
    HROrchestrator.handleFetchEmployeeData
  );
  
  router.get('/hr/employees/:employeeId',
    requireHRAccess(),
    HROrchestrator.handleFetchEmployeeById
  );
  
  router.post('/hr/employees',
    requireHRAccess(),
    HROrchestrator.handleCreateEmployee
  );
  
  router.put('/hr/employees/:employeeId',
    requireHRAccess(),
    HROrchestrator.handleUpdateEmployee
  );

  // Statistics Routes
  router.get('/hr/stats',
    requireHRAccess(),
    HROrchestrator.handleGetEmployeeStats
  );

  // Reports Routes
  router.post('/hr/reports',
    requireHRAccess(),
    HROrchestrator.handleCreateHRReport
  );
  
  router.post('/hr/reports/detailed',
    requireHRAccess(),
    HROrchestrator.handleCreateDetailedHRReport
  );

  // Development/Test Routes
  router.post('/hr/test-data',
    requirePermission('admin', 'all'),
    HROrchestrator.handleGenerateTestData
  );

  // DataSources Sync Route
  router.post('/hr/sync-datasources',
    requireHRAdmin(),
    HROrchestrator.handleSyncDataSources
  );

  // ===== DOCUMENT MANAGEMENT ROUTES =====
  router.get('/hr/employees/:employeeId/documents',
    requirePermission('read', 'hr_documents'),
    HROrchestrator.handleGetEmployeeDocuments
  );
  
  router.get('/hr/employees/:employeeId/documents/:documentId',
    requirePermission('read', 'hr_documents'),
    HROrchestrator.handleDownloadEmployeeDocument
  );
  
  // Upload route mit Multer middleware
  router.post('/hr/employees/:employeeId/documents/upload',
    requirePermission('write', 'hr_documents'),
    hrDocumentUpload.single('document'),
    HROrchestrator.handleUploadEmployeeDocument
  );
  
  router.delete('/hr/employees/:employeeId/documents/:documentId',
    requirePermission('delete', 'hr_documents'),
    HROrchestrator.handleDeleteEmployeeDocument
  );

  // Storage Statistics
  router.get('/hr/storage/stats',
    requirePermission('read', 'hr_storage_stats'),
    HROrchestrator.handleGetHRStorageStats
  );

  // User Directory Initialization (automatisch)
  router.post('/hr/directories/initialize',
    requirePermission('admin', 'hr_documents'),
    HROrchestrator.handleInitializeUserDirectories
  );

  // ===== FIELD SCHEMAS ROUTES (GLOBAL SCHEMA MANAGEMENT) =====
  router.get('/hr/field-schemas',
    requirePermission('read', 'employee_data'),
    HROrchestrator.handleGetFieldSchemas
  );

  router.post('/hr/field-schemas',
    requirePermission('admin', 'employee_data'),
    HROrchestrator.handleCreateFieldSchema
  );

  router.put('/hr/field-schemas/:schemaId',
    requirePermission('admin', 'employee_data'),
    HROrchestrator.handleUpdateFieldSchema
  );

  router.delete('/hr/field-schemas/:schemaId',
    requirePermission('admin', 'employee_data'),
    HROrchestrator.handleDeleteFieldSchema
  );

  router.get('/hr/field-schemas/categories',
    requirePermission('read', 'employee_data'),
    HROrchestrator.handleGetFieldSchemaCategories
  );

  // ===== USER ADDITIONAL INFO ROUTES (USER-SPECIFIC VALUES) =====
  router.get('/hr/employees/:employeeId/additional-info',
    requirePermission('read', 'employee_data'),
    HROrchestrator.handleGetEmployeeAdditionalInfo
  );

  router.put('/hr/employees/:employeeId/additional-info',
    requirePermission('write', 'employee_data'),
    HROrchestrator.handleUpdateEmployeeAdditionalInfo
  );

  router.get('/hr/additional-info/stats',
    requirePermission('read', 'reports'),
    HROrchestrator.handleGetAdditionalInfoStats
  );

  // ===== USER DETAILS FILE MANAGEMENT =====
  router.put('/hr/employees/:employeeId/details-file',
    requirePermission('write', 'employee_data'),
    HROrchestrator.handleUpdateEmployeeDetailsFile
  );
}
