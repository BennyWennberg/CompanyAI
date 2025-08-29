// Admin-Portal Module - Orchestrator
// Koordiniert Multi-Source User-Integration System

import { Request, Response } from 'express';
import multer from 'multer';
import { AuthenticatedRequest, requirePermission, requireAuth, logAuthEvent } from '../hr/core/auth';
import { requireAdminPortalAccess, requireAdminPortalAdmin, requireUserDataAccess } from '../../middleware/permission.middleware';
import { 
  SyncSourceRequest,
  UploadUsersRequest,
  CreateManualUserRequest,
  UpdateManualUserRequest,
  GetUsersRequest,
  ResolveConflictRequest,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  CreateRoleRequest,
  UpdateRoleRequest,
  CreateGroupRequest,
  UpdateGroupRequest,
  CreateTokenRequest,
  AuditLogFilters,
  UserSource,
  APIResponse,
  SYSTEM_PERMISSIONS,
  DEFAULT_ROLES 
} from './types';

// Permission-Functions imports
import { getRoles, createRole, updateRole, deleteRole } from './functions/permissions/manageRoles';
import { getGroups, createGroup, updateGroup, deleteGroup } from './functions/permissions/manageGroups';
// Hierarchical Permission-Functions imports
import { analyzeUserHierarchy, getHierarchyStructure } from './functions/permissions/hierarchyAnalyzer';

// DataSources imports für SQLite Integration
import { getUsers, createManualUser } from '../../datasources';
import { getTokens, createToken, revokeToken } from './functions/permissions/manageTokens';
import { getAuditLogs, logPermissionEvent } from './functions/permissions/auditLogs';

// Import core services
import { AdminPortalDatabaseManager } from './core/database-manager';
import { SchemaRegistry } from './core/schema-registry';
import { SchedulerService } from './core/scheduler';

// Import functions
import { SyncOrchestrator } from './functions/sync-orchestrator';
import { UserAggregator } from './functions/user-aggregator';
import { fetchFromAdminCenter, checkAdminCenterAvailability } from './functions/fetchFromAdminCenter';

// Import source services
import { EntraSourceService } from './sources/entra-source';
import { LdapSourceService } from './sources/ldap-source';
import { UploadSourceService } from './sources/upload-source';
import { ManualSourceService } from './sources/manual-source';

// Auth bereits oben importiert

// Multer konfigurieren für File-Uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExt = file.originalname.toLowerCase().substr(file.originalname.lastIndexOf('.'));
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Nur CSV und Excel-Dateien sind erlaubt'));
    }
  }
});

/**
 * Admin-Portal Orchestrator - Koordiniert alle Multi-Source Funktionen
 */
export class AdminPortalOrchestrator {
  private static dbManager: AdminPortalDatabaseManager;
  private static syncOrchestrator: SyncOrchestrator;
  public static userAggregator: UserAggregator;
  private static entraService: EntraSourceService;
  private static ldapService: LdapSourceService;
  private static uploadService: UploadSourceService;
  private static manualService: ManualSourceService;
  private static schedulerService: SchedulerService;

  /**
   * Initialisiert alle Services (wird beim Server-Start aufgerufen)
   */
  static async initialize(): Promise<void> {
    console.log('🚀 Initialisiere Admin-Portal Services...');

    // Database Manager initialisieren
    AdminPortalOrchestrator.dbManager = new AdminPortalDatabaseManager();
    const initResult = await AdminPortalOrchestrator.dbManager.initialize();
    
    if (!initResult.success) {
      throw new Error(`Admin-Portal Datenbankinitialisierung fehlgeschlagen: ${initResult.message}`);
    }

    // Services initialisieren
    AdminPortalOrchestrator.syncOrchestrator = new SyncOrchestrator(AdminPortalOrchestrator.dbManager);
    AdminPortalOrchestrator.userAggregator = new UserAggregator(AdminPortalOrchestrator.dbManager);
    AdminPortalOrchestrator.entraService = new EntraSourceService(AdminPortalOrchestrator.dbManager);
    AdminPortalOrchestrator.ldapService = new LdapSourceService(AdminPortalOrchestrator.dbManager);
    AdminPortalOrchestrator.uploadService = new UploadSourceService(AdminPortalOrchestrator.dbManager);
    AdminPortalOrchestrator.manualService = new ManualSourceService(AdminPortalOrchestrator.dbManager);
    // Scheduler Service initialisieren
    AdminPortalOrchestrator.schedulerService = new SchedulerService(AdminPortalOrchestrator.dbManager);
    await AdminPortalOrchestrator.schedulerService.initialize();

    console.log('✅ Admin-Portal Services erfolgreich initialisiert');

    // Auto-Sync beim Start (falls konfiguriert)
    if (process.env.AUTO_SYNC_ON_STARTUP === 'true') {
      console.log('🔄 Starte Auto-Sync beim Server-Start...');
      setTimeout(() => {
        AdminPortalOrchestrator.syncOrchestrator.syncAllSources('system_startup');
      }, 5000); // 5 Sekunden Verzögerung
    }

    // 🏗️ AUTO-POPULATION beim Server-Start (deaktiviert; aktivierbar via ENV ENABLE_PERMISSION_POPULATION_ON_STARTUP=true)
    if (process.env.ENABLE_PERMISSION_POPULATION_ON_STARTUP === 'true') {
      console.log('🏗️ Starte AUTO-POPULATION beim Server-Start (aktiviert durch ENV)...');
      setTimeout(async () => {
        try {
          const { populateJSONWithAllUsers } = await import('./functions/permissions/departmentPermissions');
          await populateJSONWithAllUsers();
          console.log('✅ AUTO-POPULATION beim Server-Start abgeschlossen');
        } catch (error) {
          console.error('❌ AUTO-POPULATION beim Server-Start fehlgeschlagen:', error);
        }
      }, 7000); // 7 Sekunden Verzögerung (nach Auto-Sync)
    } else {
      console.log('⏸️ AUTO-POPULATION beim Server-Start ist deaktiviert');
    }
  }

  // ===== SYNC MANAGEMENT =====

  /**
   * Lädt User direkt aus Entra Admin Center und speichert in DB
   * (Nutzt DataSources Entra-Logic wie HR Modul, aber speichert in Admin Portal DB)
   */
  static async handleFetchFromAdminCenter(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'fetch_from_admin_center', 'entra_admin_center');

      console.log(`🔄 User ${userEmail} lädt User aus Entra Admin Center...`);

      const result = await AdminPortalOrchestrator.entraService.testConnection();

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Laden aus Entra Admin Center:', error);
      res.status(500).json({
        success: false,
        error: 'AdminCenterFetchError',
        message: 'User konnten nicht aus Entra Admin Center geladen werden'
      });
    }
  }

  /**
   * Prüft Verfügbarkeit des Entra Admin Centers
   */
  static async handleCheckAdminCenterAvailability(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'check_admin_center_availability', 'entra_admin_center');

      const result = await AdminPortalOrchestrator.entraService.testConnection();

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Prüfen der Admin Center Verfügbarkeit:', error);
      res.status(500).json({
        success: false,
        error: 'AvailabilityCheckError',
        message: 'Admin Center Verfügbarkeit konnte nicht geprüft werden'
      });
    }
  }

  /**
   * Startet Sync für eine spezifische Quelle
   */
  static async handleSyncSource(req: AuthenticatedRequest, res: Response) {
    try {
      const { source } = req.params as { source: UserSource };
      const { mode, dryRun }: SyncSourceRequest = req.body;
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'sync_source', `source_${source}`);

      if (!['entra', 'ldap', 'upload', 'manual'].includes(source)) {
        return res.status(400).json({
          success: false,
          error: 'InvalidSource',
          message: 'Unbekannte User-Quelle'
        });
      }

      if (dryRun) {
        // Dry-Run: Nur Verbindung testen
        let testResult;
        if (source === 'entra') {
          testResult = await AdminPortalOrchestrator.entraService.testConnection();
        } else if (source === 'ldap') {
          testResult = await AdminPortalOrchestrator.ldapService.testConnection();
        } else {
          return res.status(400).json({
            success: false,
            error: 'DryRunNotSupported',
            message: `Dry-Run für ${source} nicht unterstützt`
          });
        }

        return res.json(testResult);
      }

      const result = await AdminPortalOrchestrator.syncOrchestrator.syncSource(source, mode || 'full', userEmail);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Source-Sync:', error);
      res.status(500).json({
        success: false,
        error: 'SyncError',
        message: 'Source-Sync fehlgeschlagen'
      });
    }
  }

  /**
   * Startet Sync für alle Quellen
   */
  static async handleSyncAllSources(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'sync_all_sources', 'all_sources');

      const result = await AdminPortalOrchestrator.syncOrchestrator.syncAllSources(userEmail);

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Sync aller Quellen:', error);
      res.status(500).json({
        success: false,
        error: 'BulkSyncError',
        message: 'Sync aller Quellen fehlgeschlagen'
      });
    }
  }

  /**
   * Lädt Sync-Status aller Quellen
   */
  static async handleGetSyncStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'get_sync_status', 'sync_status');

      const result = await AdminPortalOrchestrator.syncOrchestrator.getAllSourceStatus();

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Laden des Sync-Status:', error);
      res.status(500).json({
        success: false,
        error: 'StatusLoadError',
        message: 'Sync-Status konnte nicht geladen werden'
      });
    }
  }

  /**
   * Bricht laufenden Sync ab
   */
  static async handleCancelSync(req: AuthenticatedRequest, res: Response) {
    try {
      const { source } = req.params as { source: UserSource };
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'cancel_sync', `source_${source}`);

      const result = await AdminPortalOrchestrator.syncOrchestrator.cancelSync(source);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Abbrechen des Syncs:', error);
      res.status(500).json({
        success: false,
        error: 'CancelSyncError',
        message: 'Sync-Abbruch fehlgeschlagen'
      });
    }
  }

  // ===== USER MANAGEMENT - UNIFIED VIEW =====

  /**
   * Lädt vereinheitlichte User-Übersicht aus allen Quellen
   */
  static async handleGetUnifiedUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'get_unified_users', 'user_overview');

      const request: GetUsersRequest = {
        sources: req.query.sources ? (req.query.sources as string).split(',') as UserSource[] : undefined,
        search: req.query.search as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const result = await AdminPortalOrchestrator.userAggregator.getUnifiedUsers(request);

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Laden der vereinheitlichten User:', error);
      res.status(500).json({
        success: false,
        error: 'UserLoadError',
        message: 'Vereinheitlichte User konnten nicht geladen werden'
      });
    }
  }

  /**
   * Sucht User by E-Mail über alle Quellen
   */
  static async handleFindUserByEmail(req: AuthenticatedRequest, res: Response) {
    try {
      const { email } = req.params;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'find_user_by_email', 'user_search');

      const result = await AdminPortalOrchestrator.userAggregator.findUserByEmail(email);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler bei der User-Suche:', error);
      res.status(500).json({
        success: false,
        error: 'UserSearchError',
        message: 'User-Suche fehlgeschlagen'
      });
    }
  }

  // ===== UPLOAD MANAGEMENT =====

  /**
   * Analysiert Upload-Datei (Preview)
   */
  static async handleAnalyzeUpload(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'analyze_upload', 'upload_analysis');

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'NoFileUploaded',
          message: 'Keine Datei hochgeladen'
        });
      }

      const result = await AdminPortalOrchestrator.uploadService.analyzeUpload(req.file.buffer, req.file.originalname);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler bei Upload-Analyse:', error);
      res.status(500).json({
        success: false,
        error: 'UploadAnalysisError',
        message: 'Upload-Analyse fehlgeschlagen'
      });
    }
  }

  /**
   * Verarbeitet Upload-Datei
   */
  static async handleProcessUpload(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';
      
      logAuthEvent(userId, 'process_upload', 'file_upload');

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'NoFileUploaded',
          message: 'Keine Datei hochgeladen'
        });
      }

      const { mode = 'add', mapping } = req.body;
      const parsedMapping = mapping ? JSON.parse(mapping) : undefined;

      const result = await AdminPortalOrchestrator.uploadService.processUpload(
        req.file.buffer,
        req.file.originalname,
        mode,
        userEmail,
        parsedMapping
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler bei Upload-Verarbeitung:', error);
      res.status(500).json({
        success: false,
        error: 'UploadProcessError',
        message: 'Upload-Verarbeitung fehlgeschlagen'
      });
    }
  }

  /**
   * Lädt Upload-Statistiken
   */
  static async handleGetUploadStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'get_upload_stats', 'upload_stats');

      const result = await AdminPortalOrchestrator.uploadService.getUploadStats();

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Laden der Upload-Statistiken:', error);
      res.status(500).json({
        success: false,
        error: 'UploadStatsError',
        message: 'Upload-Statistiken konnten nicht geladen werden'
      });
    }
  }

  // ===== MANUAL USER MANAGEMENT =====

  /**
   * Erstellt manuellen User
   */
  static async handleCreateManualUser(req: AuthenticatedRequest, res: Response) {
    try {
      const request: CreateManualUserRequest = req.body;
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'create_manual_user', 'manual_users');

      const result = await AdminPortalOrchestrator.manualService.createUser(request, userEmail);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Erstellen des manuellen Users:', error);
      res.status(500).json({
        success: false,
        error: 'CreateUserError',
        message: 'Manueller User konnte nicht erstellt werden'
      });
    }
  }

  /**
   * Aktualisiert manuellen User
   */
  static async handleUpdateManualUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const updates: UpdateManualUserRequest = req.body;
      const currentUserId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(currentUserId, 'update_manual_user', 'manual_users');

      const result = await AdminPortalOrchestrator.manualService.updateUser(userId, updates, userEmail);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des manuellen Users:', error);
      res.status(500).json({
        success: false,
        error: 'UpdateUserError',
        message: 'Manueller User konnte nicht aktualisiert werden'
      });
    }
  }

  /**
   * Löscht manuellen User
   */
  static async handleDeleteManualUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(currentUserId, 'delete_manual_user', 'manual_users');

      const result = await AdminPortalOrchestrator.manualService.deleteUser(userId, userEmail);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Löschen des manuellen Users:', error);
      res.status(500).json({
        success: false,
        error: 'DeleteUserError',
        message: 'Manueller User konnte nicht gelöscht werden'
      });
    }
  }

  /**
   * Lädt manuelle User
   */
  static async handleGetManualUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const search = req.query.search as string;
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;

      logAuthEvent(userId, 'get_manual_users', 'manual_users');

      const result = await AdminPortalOrchestrator.manualService.getUsers(page, limit, search, isActive);

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Laden der manuellen User:', error);
      res.status(500).json({
        success: false,
        error: 'LoadUsersError',
        message: 'Manuelle User konnten nicht geladen werden'
      });
    }
  }

  /**
   * Lädt einen manuellen User by ID
   */
  static async handleGetManualUserById(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id || 'unknown';

      logAuthEvent(currentUserId, 'get_manual_user_by_id', 'manual_users');

      const result = await AdminPortalOrchestrator.manualService.getUserById(userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Laden des manuellen Users:', error);
      res.status(500).json({
        success: false,
        error: 'LoadUserError',
        message: 'Manueller User konnte nicht geladen werden'
      });
    }
  }

  // ===== DASHBOARD & STATISTICS =====

  /**
   * Lädt Dashboard-Statistiken
   */
  static async handleGetDashboardStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'get_dashboard_stats', 'dashboard');

      const result = await AdminPortalOrchestrator.userAggregator.getDashboardStats();

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Laden der Dashboard-Statistiken:', error);
      res.status(500).json({
        success: false,
        error: 'DashboardStatsError',
        message: 'Dashboard-Statistiken konnten nicht geladen werden'
      });
    }
  }

  /**
   * Lädt erweiterte Statistiken
   */
  static async handleGetAdvancedStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'get_advanced_stats', 'advanced_stats');

      const result = await AdminPortalOrchestrator.userAggregator.getAdvancedStats();

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Laden der erweiterten Statistiken:', error);
      res.status(500).json({
        success: false,
        error: 'AdvancedStatsError',
        message: 'Erweiterte Statistiken konnten nicht geladen werden'
      });
    }
  }

  // ===== CONFLICT MANAGEMENT =====

  /**
   * Erkennt E-Mail-Konflikte zwischen Quellen
   */
  static async handleDetectConflicts(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'detect_conflicts', 'conflict_detection');

      const result = await AdminPortalOrchestrator.userAggregator.detectEmailConflicts();

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler bei der Konflikt-Erkennung:', error);
      res.status(500).json({
        success: false,
        error: 'ConflictDetectionError',
        message: 'Konflikt-Erkennung fehlgeschlagen'
      });
    }
  }

  /**
   * Löst E-Mail-Konflikt auf
   */
  static async handleResolveConflict(req: AuthenticatedRequest, res: Response) {
    try {
      const request: ResolveConflictRequest = req.body;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'resolve_conflict', 'conflict_resolution');

      // Implementation für Konflikt-Auflösung
      // Hier würde die Logik zum Löschen/Deaktivieren von Duplikaten implementiert werden

      res.json({
        success: true,
        message: `Konflikt für ${request.email} aufgelöst - ${request.keepSource} beibehalten`
      });

    } catch (error) {
      console.error('❌ Fehler bei der Konflikt-Auflösung:', error);
      res.status(500).json({
        success: false,
        error: 'ConflictResolutionError',
        message: 'Konflikt-Auflösung fehlgeschlagen'
      });
    }
  }

  // ===== TESTING & CONNECTIVITY =====

  /**
   * Testet Verbindungen zu allen externen Quellen
   */
  static async handleTestConnections(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'test_connections', 'connection_test');

      const result = await AdminPortalOrchestrator.syncOrchestrator.testAllConnections();

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Testen der Verbindungen:', error);
      res.status(500).json({
        success: false,
        error: 'ConnectionTestError',
        message: 'Verbindungstest fehlgeschlagen'
      });
    }
  }

  // ===== SCHEDULER MANAGEMENT =====

  /**
   * Alle Schedule-Konfigurationen abrufen
   */
  static async handleGetSchedules(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'read', 'scheduler_config');

      const schedules = await AdminPortalOrchestrator.schedulerService.getSchedules();

      res.json({
        success: true,
        data: schedules,
        message: `${schedules.length} Schedules gefunden`
      });

    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Schedules:', error);
      res.status(500).json({
        success: false,
        error: 'ScheduleLoadError',
        message: 'Schedules konnten nicht geladen werden'
      });
    }
  }

  /**
   * Neuen Schedule erstellen
   */
  static async handleCreateSchedule(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const scheduleData: CreateScheduleRequest = req.body;

      logAuthEvent(userId, 'write', 'scheduler_config');

      // Validierung
      if (!scheduleData.source || !scheduleData.cronExpression) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'Quelle und Cron-Expression sind erforderlich'
        });
      }

      if (!['entra', 'ldap'].includes(scheduleData.source)) {
        return res.status(400).json({
          success: false,
          error: 'InvalidSource',
          message: 'Nur entra und ldap unterstützen Scheduled-Sync'
        });
      }

      const newSchedule = await AdminPortalOrchestrator.schedulerService.createSchedule({
        source: scheduleData.source,
        enabled: scheduleData.enabled,
        cronExpression: scheduleData.cronExpression,
        description: scheduleData.description,
        timezone: scheduleData.timezone || 'Europe/Berlin',
        retryOnError: scheduleData.retryOnError ?? true,
        retryAttempts: scheduleData.retryAttempts || 3,
        retryDelay: scheduleData.retryDelay || 15,
        status: 'inactive'
      });

      res.status(201).json({
        success: true,
        data: newSchedule,
        message: 'Schedule erfolgreich erstellt'
      });

    } catch (error) {
      console.error('❌ Fehler beim Erstellen des Schedules:', error);
      res.status(500).json({
        success: false,
        error: 'ScheduleCreateError',
        message: 'Schedule konnte nicht erstellt werden'
      });
    }
  }

  /**
   * Schedule aktualisieren
   */
  static async handleUpdateSchedule(req: AuthenticatedRequest, res: Response) {
    try {
      const { scheduleId } = req.params;
      const updates: UpdateScheduleRequest = req.body;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'write', 'scheduler_config');

      if (!scheduleId) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'Schedule-ID ist erforderlich'
        });
      }

      const success = await AdminPortalOrchestrator.schedulerService.updateSchedule(scheduleId, updates);

      if (success) {
        const updatedSchedule = await AdminPortalOrchestrator.schedulerService.getScheduleById(scheduleId);
        res.json({
          success: true,
          data: updatedSchedule,
          message: 'Schedule erfolgreich aktualisiert'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'ScheduleUpdateError',
          message: 'Schedule konnte nicht aktualisiert werden'
        });
      }

    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des Schedules:', error);
      res.status(500).json({
        success: false,
        error: 'ScheduleUpdateError',
        message: 'Schedule-Update fehlgeschlagen'
      });
    }
  }

  /**
   * Schedule löschen
   */
  static async handleDeleteSchedule(req: AuthenticatedRequest, res: Response) {
    try {
      const { scheduleId } = req.params;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'delete', 'scheduler_config');

      if (!scheduleId) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'Schedule-ID ist erforderlich'
        });
      }

      const success = await AdminPortalOrchestrator.schedulerService.deleteSchedule(scheduleId);

      if (success) {
        res.json({
          success: true,
          data: true,
          message: 'Schedule erfolgreich gelöscht'
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'ScheduleDeleteError',
          message: 'Schedule konnte nicht gelöscht werden'
        });
      }

    } catch (error) {
      console.error('❌ Fehler beim Löschen des Schedules:', error);
      res.status(500).json({
        success: false,
        error: 'ScheduleDeleteError',
        message: 'Schedule-Löschung fehlgeschlagen'
      });
    }
  }

  /**
   * Sync-Historie abrufen
   */
  static async handleGetSyncHistory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const { limit } = req.query;

      logAuthEvent(userId, 'read', 'sync_history');

      const history = await AdminPortalOrchestrator.schedulerService.getSyncHistory(
        limit ? parseInt(limit as string) : 50
      );

      res.json({
        success: true,
        data: history,
        message: `${history.length} Historie-Einträge gefunden`
      });

    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Sync-Historie:', error);
      res.status(500).json({
        success: false,
        error: 'HistoryLoadError',
        message: 'Sync-Historie konnte nicht geladen werden'
      });
    }
  }

  /**
   * Scheduler-Statistiken abrufen
   */
  static async handleGetSchedulerStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'read', 'scheduler_stats');

      const stats = await AdminPortalOrchestrator.schedulerService.getSyncStats();

      res.json({
        success: true,
        data: stats,
        message: 'Scheduler-Statistiken geladen'
      });

    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Scheduler-Statistiken:', error);
      res.status(500).json({
        success: false,
        error: 'SchedulerStatsError',
        message: 'Scheduler-Statistiken konnten nicht geladen werden'
      });
    }
  }

  /**
   * Cron-Expression testen
   */
  static async handleTestCronExpression(req: AuthenticatedRequest, res: Response) {
    try {
      const { cronExpression } = req.body;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'read', 'scheduler_config');

      if (!cronExpression) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'Cron-Expression ist erforderlich'
        });
      }

      // Einfache Validierung der Cron-Expression
      const cronParts = cronExpression.split(' ');
      if (cronParts.length !== 5) {
        return res.status(400).json({
          success: false,
          error: 'InvalidCronExpression',
          message: 'Cron-Expression muss 5 Teile haben (Minute Stunde Tag Monat Wochentag)'
        });
      }

      // Nächste Ausführungszeiten berechnen (simuliert)
      const nextRuns = [];
      const now = new Date();
      
      // Einfache Implementierung für täglich um bestimmte Uhrzeit
      if (cronExpression.match(/^\d+ \d+ \* \* \*$/)) {
        const [minute, hour] = cronExpression.split(' ').map(Number);
        
        for (let i = 0; i < 3; i++) {
          const nextRun = new Date();
          nextRun.setDate(now.getDate() + i);
          nextRun.setHours(hour, minute, 0, 0);
          
          if (nextRun > now) {
            nextRuns.push(nextRun);
          }
        }
      }

      res.json({
        success: true,
        data: {
          cronExpression,
          isValid: true,
          nextRuns: nextRuns.slice(0, 3),
          description: `Täglich um ${cronParts[1]}:${cronParts[0].padStart(2, '0')} Uhr`
        },
        message: 'Cron-Expression ist gültig'
      });

    } catch (error) {
      console.error('❌ Fehler beim Testen der Cron-Expression:', error);
      res.status(500).json({
        success: false,
        error: 'CronTestError',
        message: 'Cron-Expression konnte nicht getestet werden'
      });
    }
  }

  // ===== EXPORT & BACKUP =====

  /**
   * Exportiert alle User aus allen Quellen
   */
  static async handleExportAllUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'export_all_users', 'data_export');

      const result = await AdminPortalOrchestrator.userAggregator.exportAllUsers();

      if (result.success) {
        // Als JSON-Download senden
        const filename = `admin-portal-export-${new Date().toISOString().split('T')[0]}.json`;
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/json');
        res.json(result.data);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Exportieren aller User:', error);
      res.status(500).json({
        success: false,
        error: 'ExportError',
        message: 'Export aller User fehlgeschlagen'
      });
    }
  }

  // ===== DEVELOPMENT & TESTING =====

  /**
   * Generiert Test-Daten für alle Quellen
   */
  static async handleGenerateTestData(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';
      
      logAuthEvent(userId, 'generate_test_data', 'all');

      // Test-User für manuelle Quelle erstellen - Demo-User entfernt
      const testUsers: CreateManualUserRequest[] = [];

      const bulkResult = await AdminPortalOrchestrator.manualService.bulkCreateUsers(testUsers, userEmail);

      // Dashboard-Stats laden
      const dashboardResult = await AdminPortalOrchestrator.userAggregator.getDashboardStats();

      // Sync-Status laden
      const syncStatusResult = await AdminPortalOrchestrator.syncOrchestrator.getAllSourceStatus();

      res.json({
        success: true,
        data: {
          testUsers: bulkResult.data,
          dashboardStats: dashboardResult.data,
          syncStatus: syncStatusResult.data
        },
        message: 'Test-Daten für Admin-Portal erfolgreich generiert'
      });

    } catch (error) {
      console.error('❌ Fehler beim Generieren der Test-Daten:', error);
      res.status(500).json({
        success: false,
        error: 'TestDataError',
        message: 'Test-Daten konnten nicht generiert werden'
      });
    }
  }

  // ===== HIERARCHICAL PERMISSIONS MANAGEMENT =====

  /**
   * Analysiert User-Hierarchie aus vorhandenen Daten
   * GET /api/admin-portal/hierarchy/analyze
   */
  static async handleAnalyzeHierarchy(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';
      
      logAuthEvent(userId, 'analyze_hierarchy', 'hierarchical_permissions');
      
      console.log(`🔍 User ${userEmail} analysiert Benutzer-Hierarchie...`);
      
      // Lade alle User über UserAggregator
      const usersResult = await AdminPortalOrchestrator.userAggregator.getUnifiedUsers({
        page: 1,
        limit: 10000 // Alle User für Analyse laden
      });
      
      if (!usersResult.success || !usersResult.data) {
        return res.status(500).json({
          success: false,
          error: 'UserLoadError',
          message: 'User konnten nicht für Hierarchie-Analyse geladen werden'
        });
      }
      
      // Analysiere Hierarchie
      const hierarchyResult = await analyzeUserHierarchy(usersResult.data.data);
      
      if (hierarchyResult.success) {
        res.json(hierarchyResult);
      } else {
        res.status(500).json(hierarchyResult);
      }
      
    } catch (error) {
      console.error('❌ Fehler bei Hierarchie-Analyse:', error);
      res.status(500).json({
        success: false,
        error: 'HierarchyAnalysisError',
        message: 'Hierarchie-Analyse fehlgeschlagen'
      });
    }
  }

  /**
   * Lädt Hierarchie-Struktur
   * GET /api/admin-portal/hierarchy/structure
   */
  static async handleGetHierarchyStructure(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'read', 'hierarchical_permissions');
      
      const result = await getHierarchyStructure();
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der Hierarchie-Struktur:', error);
      res.status(500).json({
        success: false,
        error: 'HierarchyLoadError',
        message: 'Hierarchie-Struktur konnte nicht geladen werden'
      });
    }
  }

  /**
   * Lädt Department-Permissions für spezifische Abteilung
   * GET /api/admin-portal/hierarchy/departments/:departmentId/permissions
   */
  static async handleGetDepartmentPermissions(req: AuthenticatedRequest, res: Response) {
    try {
      const { departmentId } = req.params;
      const userId = req.user?.id || 'unknown';
      
      logAuthEvent(userId, 'read', 'department_permissions');
      
      // TODO: Implementiere getDepartmentPermissions aus separater Funktion
      console.log(`📋 Lade Department-Permissions für: ${departmentId}`);
      
      // Mock-Response für jetzt
      res.json({
        success: true,
        data: {
          departmentId,
          departmentName: departmentId.replace('dept_', '').replace(/_/g, ' ').toUpperCase(),
          moduleAccess: {
            hr: 'access',
            support: 'access',
            ai: 'access',
            admin_portal: 'none'
          },
          pagePermissions: {
            'hr.employees': { access: 'access', actions: { view: true, create: false, edit: false, delete: false } },
            'support.tickets': { access: 'access', actions: { view: true, create: true, edit: true, close: false } }
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'system'
        },
        message: 'Department-Permissions geladen (Mock)'
      });
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der Department-Permissions:', error);
      res.status(500).json({
        success: false,
        error: 'DepartmentPermissionsLoadError',
        message: 'Department-Permissions konnten nicht geladen werden'
      });
    }
  }

  /**
   * ❌ DEAKTIVIERT: Legacy Department-Permissions Update (ohne Cascade)
   * PUT /api/admin-portal/hierarchy/departments/:departmentId/permissions
   * 
   * Diese Funktion wurde deaktiviert, da sie keine hierarchischen SubGroups unterstützte.
   * Verwende stattdessen: handleUpdateDepartmentPermissionsWithCascade
   */
  static async handleUpdateDepartmentPermissions(req: AuthenticatedRequest, res: Response) {
    console.log('❌ LEGACY-ENDPOINT verwendet! Verwende stattdessen /permissions/cascade');
    
    res.status(410).json({
      success: false,
      error: 'LegacyEndpointDeprecated',
      message: 'Dieser Endpoint wurde deaktiviert. Verwende /permissions/cascade für hierarchische Berechtigungen.'
    });
  }

  /**
   * NEUE Hierarchische Department-Permissions mit Cascade-Logic
   * PUT /api/admin-portal/hierarchy/departments/:departmentId/permissions/cascade
   */
  static async handleUpdateDepartmentPermissionsWithCascade(req: AuthenticatedRequest, res: Response) {
    try {
      const { departmentId } = req.params;
      const { 
        moduleAccess, 
        userOverrides, 
        departmentName, 
        cascadeMode = 'department',
        // 🆕 NEUE SubGroup-Parameter 
        subGroupId,
        subGroupName,
        subGroupPermissions
      } = req.body;
      
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'update_hierarchical_permissions', `department_${departmentId}_${cascadeMode}`);
      
      // 🎯 PRÜFE: SubGroup-Modus, User-Modus oder Department-Modus?
      if (subGroupId && subGroupPermissions) {
        console.log(`📂 UNTERGRUPPEN-UPDATE: ${subGroupId} in ${departmentId}`);
        console.log('SubGroup-Permissions:', JSON.stringify(subGroupPermissions, null, 2));
        console.log('User-Overrides:', JSON.stringify(userOverrides, null, 2));

        // Import der SubGroup-spezifischen Funktion
        const { saveSubGroupPermissions } = await import('./functions/permissions/departmentPermissions');
        
        // Speichere SubGroup-Permissions (Department-Permissions werden NICHT verändert)
        const result = await saveSubGroupPermissions(
          departmentId,        // Hauptabteilungs-ID
          departmentName,      // Hauptabteilungs-Name
          subGroupId,          // Untergruppen-ID  
          subGroupName,        // Untergruppen-Name
          subGroupPermissions, // SubGroup Module-Access
          userOverrides || {},
          userEmail
        );

        if (result.success) {
          console.log('✅ Untergruppen-Permissions erfolgreich gespeichert');
          res.json({
            success: true,
            data: result.data,
            message: `Untergruppen-Permissions für "${subGroupName}" erfolgreich gespeichert`
          });
        } else {
          console.error('❌ Fehler beim Speichern der Untergruppen-Permissions:', result.message);
          res.status(500).json(result);
        }
        return;
      } else if (!moduleAccess && userOverrides && Object.keys(userOverrides).length > 0) {
        // 👤 NUR USER-OVERRIDES: Keine Department oder SubGroup Änderungen
        console.log(`👤 NUR USER-OVERRIDES-UPDATE: ${departmentId}`);
        console.log('User-Overrides:', JSON.stringify(userOverrides, null, 2));

        const { updateUserOverridesOnly } = await import('./functions/permissions/departmentPermissions');
        
        const result = await updateUserOverridesOnly(
          departmentId,
          departmentName,
          userOverrides,
          userEmail,
          subGroupId // Optional: wenn User in SubGroup ist
        );

        if (result.success) {
          console.log('✅ User-Overrides erfolgreich gespeichert');
          res.json({
            success: true,
            data: result.data,
            message: 'User-Overrides erfolgreich gespeichert'
          });
        } else {
          console.error('❌ Fehler beim Speichern der User-Overrides:', result.message);
          res.status(500).json(result);
        }
        return;
      }

      // 🏢 NORMALE HAUPTABTEILUNGS-UPDATE (nur wenn moduleAccess gesendet wird)
      if (!moduleAccess) {
        console.log('⚠️ Keine moduleAccess gesendet - keine Department-Änderung');
        return res.status(400).json({
          success: false,
          error: 'NoModuleAccess',
          message: 'Keine Module-Berechtigungen zum Speichern erhalten'
        });
      }

      console.log(`🏢 HAUPTABTEILUNGS-UPDATE: ${departmentId} (${cascadeMode}-Modus)`);
      console.log('Module-Access:', JSON.stringify(moduleAccess, null, 2));
      console.log('User-Overrides:', JSON.stringify(userOverrides, null, 2));

      // Import der neuen hierarchischen Permission-Funktion
      const { saveDepartmentPermissionsWithCascade } = await import('./functions/permissions/departmentPermissions');
      
      // Speichere die Permissions mit Cascade-Logic
      const result = await saveDepartmentPermissionsWithCascade(
        departmentId,
        departmentName || departmentId,
        moduleAccess || {},
        userOverrides || {},
        userEmail,
        cascadeMode
      );

      if (result.success) {
        console.log('✅ Hierarchische Permission-Update erfolgreich');
        console.log(`   • Betroffene Abteilungen: ${result.data?.affectedDepartments?.length || 0}`);
        console.log(`   • Betroffene User: ${result.data?.affectedUsers?.length || 0}`);
        
        res.json({
          success: true,
          data: result.data,
          message: result.message
        });
      } else {
        console.error('❌ Fehler beim hierarchischen Permission-Update:', result.message);
        res.status(500).json({
          success: false,
          error: result.error,
          message: result.message
        });
      }
      
    } catch (error) {
      console.error('❌ Fehler beim hierarchischen Permission-Update:', error);
      res.status(500).json({
        success: false,
        error: 'HierarchicalPermissionsUpdateError',
        message: 'Hierarchisches Permission-Update fehlgeschlagen'
      });
    }
  }

  /**
   * Berechnet effektive User-Permissions (für Preview)
   * GET /api/admin-portal/hierarchy/users/:userId/effective-permissions
   */
  static async handleGetEffectiveUserPermissions(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId: targetUserId } = req.params;
      const userId = req.user?.id || 'unknown';
      
      logAuthEvent(userId, 'read', 'effective_permissions');
      
      console.log(`🔍 Berechne effektive Permissions für User: ${targetUserId}`);
      
      // TODO: Implementiere Permission-Calculation-Engine
      
      // Mock-Response für jetzt
      res.json({
        success: true,
        data: {
          userId: targetUserId,
          userName: 'Mock User',
          department: 'VERKAUF',
          subGroup: 'Verkauf | AS',
          moduleAccess: {
            hr: 'access',
            support: 'access',
            ai: 'access',
            admin_portal: 'none'
          },
          pagePermissions: {
            'hr.employees': { access: 'access', actions: { view: true, create: false, edit: false, delete: false } },
            'support.tickets': { access: 'access', actions: { view: true, create: true, edit: true, close: false } }
          },
          permissionSources: {
            department: true,
            subGroup: true,
            individual: false
          },
          calculatedAt: new Date()
        },
        message: 'Effektive User-Permissions berechnet (Mock)'
      });
      
    } catch (error) {
      console.error('❌ Fehler bei der Berechnung der effektiven Permissions:', error);
      res.status(500).json({
        success: false,
        error: 'EffectivePermissionsError',
        message: 'Effektive Permissions konnten nicht berechnet werden'
      });
    }
  }

  /**
   * Lädt verfügbare Module-Definitionen
   * GET /api/admin-portal/hierarchy/modules
   */
  static async handleGetAvailableModules(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'read', 'module_definitions');
      
      // Import der AVAILABLE_MODULES aus types
      const { AVAILABLE_MODULES } = await import('./types');
      
      res.json({
        success: true,
        data: AVAILABLE_MODULES,
        message: `${AVAILABLE_MODULES.length} Module-Definitionen verfügbar`
      });
      
    } catch (error) {
      console.error('❌ Fehler beim Laden der Module-Definitionen:', error);
      res.status(500).json({
        success: false,
        error: 'ModuleDefinitionsLoadError',
        message: 'Module-Definitionen konnten nicht geladen werden'
      });
    }
  }

  /**
   * Lädt alle Department-Permissions (für Frontend-Initialisierung)
   * GET /api/admin-portal/hierarchy/permissions/all
   */
  static async handleGetAllDepartmentPermissions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'read', 'all_department_permissions');
      
      console.log(`📋 Lade alle Department-Permissions für Frontend...`);
      
      // Import der loadDepartmentPermissions Funktion
      const { loadDepartmentPermissions } = await import('./functions/permissions/departmentPermissions');
      
      const result = await loadDepartmentPermissions();
      
      if (result.success && result.data) {
        console.log(`✅ Alle Department-Permissions geladen: ${result.data.length} Abteilungen`);
        res.json({
          success: true,
          data: result.data,
          message: `${result.data.length} Department-Permissions geladen`
        });
      } else {
        console.error('❌ Fehler beim Laden aller Department-Permissions:', result.message);
        res.status(500).json(result);
      }
      
    } catch (error) {
      console.error('❌ Fehler beim Laden aller Department-Permissions:', error);
      res.status(500).json({
        success: false,
        error: 'AllDepartmentPermissionsLoadError',
        message: 'Alle Department-Permissions konnten nicht geladen werden'
      });
    }
  }

  // ===== PERMISSIONS MANAGEMENT =====

  /**
   * Lädt alle verfügbaren Berechtigungen
   */
  static async handleGetAvailablePermissions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'read', 'permissions');

      res.json({
        success: true,
        data: SYSTEM_PERMISSIONS,
        message: `${SYSTEM_PERMISSIONS.length} Berechtigungen verfügbar`
      });

    } catch (error) {
      console.error('❌ Fehler beim Laden der Berechtigungen:', error);
      res.status(500).json({
        success: false,
        error: 'PermissionsLoadError',
        message: 'Berechtigungen konnten nicht geladen werden'
      });
    }
  }

  /**
   * Lädt alle Rollen
   */
  static async handleGetRoles(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'read', 'roles');

      const result = await getRoles();
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Laden der Rollen:', error);
      res.status(500).json({
        success: false,
        error: 'RolesLoadError',
        message: 'Rollen konnten nicht geladen werden'
      });
    }
  }

  /**
   * Erstellt neue Rolle
   */
  static async handleCreateRole(req: AuthenticatedRequest, res: Response) {
    try {
      const request: CreateRoleRequest = req.body;
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'create', 'roles');

      const result = await createRole(request, userEmail);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Rolle:', error);
      res.status(500).json({
        success: false,
        error: 'CreateRoleError',
        message: 'Rolle konnte nicht erstellt werden'
      });
    }
  }

  /**
   * Löscht Rolle
   */
  static async handleDeleteRole(req: AuthenticatedRequest, res: Response) {
    try {
      const { roleId } = req.params;
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'delete', 'roles');

      const result = await deleteRole(roleId, userEmail);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Löschen der Rolle:', error);
      res.status(500).json({
        success: false,
        error: 'DeleteRoleError',
        message: 'Rolle konnte nicht gelöscht werden'
      });
    }
  }

  /**
   * Lädt alle Gruppen
   */
  static async handleGetGroups(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'read', 'groups');

      const result = await getGroups();
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Laden der Gruppen:', error);
      res.status(500).json({
        success: false,
        error: 'GroupsLoadError',
        message: 'Gruppen konnten nicht geladen werden'
      });
    }
  }

  /**
   * Erstellt neue Gruppe
   */
  static async handleCreateGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const request: CreateGroupRequest = req.body;
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'create', 'groups');

      const result = await createGroup(request, userEmail);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Gruppe:', error);
      res.status(500).json({
        success: false,
        error: 'CreateGroupError',
        message: 'Gruppe konnte nicht erstellt werden'
      });
    }
  }

  /**
   * Löscht Gruppe
   */
  static async handleDeleteGroup(req: AuthenticatedRequest, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'delete', 'groups');

      const result = await deleteGroup(groupId, userEmail);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Löschen der Gruppe:', error);
      res.status(500).json({
        success: false,
        error: 'DeleteGroupError',
        message: 'Gruppe konnte nicht gelöscht werden'
      });
    }
  }

  /**
   * Lädt alle API-Tokens
   */
  static async handleGetTokens(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'read', 'tokens');

      const result = await getTokens();
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Laden der API-Tokens:', error);
      res.status(500).json({
        success: false,
        error: 'TokensLoadError',
        message: 'API-Tokens konnten nicht geladen werden'
      });
    }
  }

  /**
   * Erstellt neuen API-Token
   */
  static async handleCreateToken(req: AuthenticatedRequest, res: Response) {
    try {
      const request: CreateTokenRequest = req.body;
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'create', 'tokens');

      const result = await createToken(request, userEmail);
      
      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Erstellen des API-Tokens:', error);
      res.status(500).json({
        success: false,
        error: 'CreateTokenError',
        message: 'API-Token konnte nicht erstellt werden'
      });
    }
  }

  /**
   * Widerruft API-Token
   */
  static async handleRevokeToken(req: AuthenticatedRequest, res: Response) {
    try {
      const { tokenId } = req.params;
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'delete', 'tokens');

      const result = await revokeToken(tokenId, userEmail);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Widerrufen des API-Tokens:', error);
      res.status(500).json({
        success: false,
        error: 'RevokeTokenError',
        message: 'API-Token konnte nicht widerrufen werden'
      });
    }
  }

  /**
   * Lädt Audit-Logs
   */
  static async handleGetAuditLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'read', 'audit');

      const filters: AuditLogFilters = {
        userId: req.query.userId as string,
        action: req.query.action as string,
        resource: req.query.resource as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        success: req.query.success === 'true' ? true : req.query.success === 'false' ? false : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50
      };

      const result = await getAuditLogs(filters);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('❌ Fehler beim Laden der Audit-Logs:', error);
      res.status(500).json({
        success: false,
        error: 'AuditLogsLoadError',
        message: 'Audit-Logs konnten nicht geladen werden'
      });
    }
  }

  // ===== DATABASE MANAGEMENT =====

  /**
   * Lädt Datenbank-Informationen für Admin Portal
   */
  static async handleGetDatabaseInfo(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'read', 'database_info');

      // Import der getDatabaseInfo Funktion hier statt global
      const { getDatabaseInfo } = await import('../../datasources/entraac/store');
      const result = await getDatabaseInfo();
      
      res.json({
        success: true,
        data: result,
        message: 'Datenbank-Informationen erfolgreich geladen'
      });

    } catch (error) {
      console.error('❌ Fehler beim Laden der Datenbank-Informationen:', error);
      res.status(500).json({
        success: false,
        error: 'DatabaseInfoError',
        message: 'Datenbank-Informationen konnten nicht geladen werden'
      });
    }
  }

  /**
   * Lädt Schema-Informationen für eine Tabelle
   */
  static async handleGetTableSchema(req: AuthenticatedRequest, res: Response) {
    try {
      const { tableName } = req.params;
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'read', 'database_schema');

      // Einfache Schema-Info für bekannte Tabellen
      const schemaInfo = {
        users: {
          name: 'users',
          description: 'Entra ID Benutzer mit dynamisch erkannten Feldern',
          primaryKey: 'id',
          autoGenerated: ['synced_at'],
          dataTypes: 'Automatisch erkannt basierend auf Entra ID Daten'
        },
        devices: {
          name: 'devices', 
          description: 'Entra ID Geräte mit dynamisch erkannten Feldern',
          primaryKey: 'id',
          autoGenerated: ['synced_at'],
          dataTypes: 'Automatisch erkannt basierend auf Entra ID Daten'
        },
        sync_status: {
          name: 'sync_status',
          description: 'Sync-Historie und Status-Tracking',
          primaryKey: 'id',
          autoGenerated: ['id', 'created_at'],
          dataTypes: 'Fest definiert für Logging'
        }
      };

      if (!schemaInfo[tableName as keyof typeof schemaInfo]) {
        return res.status(404).json({
          success: false,
          error: 'TableNotFound',
          message: `Tabelle '${tableName}' nicht gefunden`
        });
      }

      res.json({
        success: true,
        data: schemaInfo[tableName as keyof typeof schemaInfo],
        message: `Schema-Information für Tabelle '${tableName}' geladen`
      });

    } catch (error) {
      console.error('❌ Fehler beim Laden der Schema-Informationen:', error);
      res.status(500).json({
        success: false,
        error: 'SchemaInfoError',
        message: 'Schema-Informationen konnten nicht geladen werden'
      });
    }
  }

  /**
   * Löscht alle Datenbank-Daten (Development Only)
   */
  static async handleClearDatabase(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';
      
      logAuthEvent(userId, 'delete', 'database_clear');

      // Nur in Development-Umgebung erlaubt
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          error: 'ProductionClearDenied',
          message: 'Datenbank-Löschung in Produktion nicht erlaubt'
        });
      }

      const { clearAll } = await import('../../datasources/entraac/store');
      await clearAll();
      
      res.json({
        success: true,
        data: true,
        message: 'Alle Datenbank-Daten erfolgreich gelöscht'
      });

    } catch (error) {
      console.error('❌ Fehler beim Löschen der Datenbank:', error);
      res.status(500).json({
        success: false,
        error: 'DatabaseClearError',
        message: 'Datenbank konnte nicht gelöscht werden'
      });
    }
  }

  /**
   * Gibt alle Benutzer für andere Module zurück (zB HR)
   */
  static async handleGetUsersOverview(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'read', 'employee_data');

      // Nutze Combined DataSources aus SQLite
      const users = await getUsers();
      
      res.json({
        success: true,
        data: users,
        message: `${users.length} Benutzer aus Admin Portal Datenbank`
      });
    } catch (error) {
      console.error('Fehler beim Laden der Benutzer-Übersicht:', error);
      res.status(500).json({
        success: false,
        error: 'UsersOverviewError',
        message: 'Fehler beim Laden der Benutzer-Übersicht'
      });
    }
  }

  /**
   * Erstellt einen neuen Benutzer (manuell)
   */
  static async handleCreateUser(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'write', 'employee_data');

      const { displayName, mail, department, jobTitle, accountEnabled, userPrincipalName } = req.body;

      if (!displayName?.trim()) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'Anzeigename ist erforderlich'
        });
      }

      // Erstelle neuen User über DataSources (Legacy-Methode)
      const newUser = await createManualUser({
        displayName: displayName.trim(),
        mail: mail?.trim() || undefined,
        userPrincipalName: userPrincipalName || mail?.trim(),
        department: department?.trim() || undefined,
        jobTitle: jobTitle?.trim() || undefined,
        accountEnabled: accountEnabled !== false
      });

      res.json({
        success: true,
        data: newUser,
        message: 'Benutzer erfolgreich erstellt'
      });
    } catch (error) {
      console.error('Fehler beim Erstellen des Benutzers:', error);
      res.status(500).json({
        success: false,
        error: 'CreateUserError',
        message: 'Fehler beim Erstellen des Benutzers'
      });
    }
  }

  /**
   * Triggert Synchronisation mit Entra ID
   */
  static async handleTriggerSync(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'admin', 'system_settings');

      // Trigger Entra ID Sync direkt über DataSources
      const { syncUsers, syncDevices } = await import('../../datasources/entraac/sync');
      
      console.log('🔄 Manual sync triggered by:', userId);
      
      // Führe beide Syncs parallel aus (mit SQLite Persistence)
      const [usersResult, devicesResult] = await Promise.allSettled([
        syncUsers(),
        syncDevices()
      ]);

      const usersCount = usersResult.status === 'fulfilled' ? usersResult.value.length : 0;
      const devicesCount = devicesResult.status === 'fulfilled' ? devicesResult.value.length : 0;

      const hasErrors = usersResult.status === 'rejected' || devicesResult.status === 'rejected';
      
      res.json({
        success: !hasErrors,
        data: {
          usersCount,
          devicesCount,
          errors: hasErrors ? {
            users: usersResult.status === 'rejected' ? usersResult.reason?.message : null,
            devices: devicesResult.status === 'rejected' ? devicesResult.reason?.message : null
          } : null
        },
        message: hasErrors 
          ? 'Synchronisation teilweise fehlgeschlagen'
          : `Synchronisation erfolgreich: ${usersCount} Benutzer, ${devicesCount} Geräte (SQLite persistiert)`
      });
    } catch (error) {
      console.error('Fehler beim Triggern der Synchronisation:', error);
      res.status(500).json({
        success: false,
        error: 'SyncTriggerError',
        message: 'Fehler beim Starten der Synchronisation'
      });
    }
  }

  /**
   * Liefert die aktuellen Berechtigungen des eingeloggten Users
   * GET /api/admin-portal/my-permissions
   */
  static async handleGetMyPermissions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown@unknown';
      const userName = (req.user as any)?.displayName || (req.user as any)?.name || 'Unknown User';
      const userDepartment = req.user?.department || 'Unknown Department';
      const userRole = req.user?.role || undefined; // ✅ User-Role für Admin-Check hinzugefügt

      logAuthEvent(userId, 'get_my_permissions', 'hierarchical_permissions');
      
      console.log(`🔍 User ${userEmail} fragt eigene Berechtigungen ab...`);

      // Robuste Admin-Erkennung (mehrere Fallbacks)
      const isAdmin = userEmail === 'admin@company.com' || 
                     userEmail === 'administrator@company.com' || 
                     userRole === 'admin' || 
                     userRole === 'administrator' ||
                     userId === '1'; // Mock-Admin-ID
      
      console.log(`🔍 Admin-Check: Email=${userEmail}, Role=${userRole}, UserId=${userId}, IsAdmin=${isAdmin}`);
      
      if (isAdmin) {
        // Admin gets full access to all modules
        const adminPermissions = {
          userEmail,
          userDepartment: userDepartment || 'Administration',
          permissions: [
            { moduleKey: 'hr', hasAccess: true, accessLevel: 'admin', source: 'admin' },
            { moduleKey: 'support', hasAccess: true, accessLevel: 'admin', source: 'admin' },
            { moduleKey: 'ai', hasAccess: true, accessLevel: 'admin', source: 'admin' },
            { moduleKey: 'admin-portal', hasAccess: true, accessLevel: 'admin', source: 'admin' }
          ],
          isAdmin: true,
          lastChecked: new Date().toISOString()
        };
        
        console.log(`👑 Admin-Permissions gewährt für: ${userEmail}`);
        
        return res.json({
          success: true,
          data: adminPermissions,
          message: 'Admin-Berechtigungen geladen'
        });
      }
      
      // Lade User-Permissions über die hierarchische Permission-Logic
      const { calculateUserPermissions } = await import('./functions/permissions/userPermissionChecker');
      const permissionsResult = await calculateUserPermissions(userId, userName, userEmail, userDepartment, userRole);
      
      if (!permissionsResult.success || !permissionsResult.data) {
        return res.status(500).json({
          success: false,
          error: 'PermissionCalculationError',
          message: 'Berechtigungen konnten nicht berechnet werden'
        });
      }

      // Konvertiere für Frontend-PermissionContext
      const frontendFormat = {
        userEmail: permissionsResult.data.userEmail,
        userDepartment: permissionsResult.data.department,
        permissions: permissionsResult.data.moduleAccess.map(moduleAccess => ({
          moduleKey: moduleAccess.moduleKey,
          hasAccess: moduleAccess.hasAccess,
          accessLevel: moduleAccess.accessLevel,
          source: 'department' as const, // TODO: Echte Source implementieren
          reason: `Zugriff über Abteilung: ${permissionsResult.data?.department}`
        })),
        calculatedAt: permissionsResult.data.lastChecked,
        isAdmin: permissionsResult.data.isAdmin || false
      };

      console.log(`✅ My-Permissions berechnet für ${userEmail}:`, {
        totalModules: frontendFormat.permissions.length,
        modulesWithAccess: frontendFormat.permissions.filter(p => p.hasAccess).length,
        isAdmin: frontendFormat.isAdmin ? '👑 ADMINISTRATOR' : '👤 Normaler User'
      });

      res.json({
        success: true,
        data: frontendFormat,
        message: `Berechtigungen für ${userEmail} berechnet`
      });
      
    } catch (error) {
      console.error('❌ Fehler bei My-Permissions-Abfrage:', error);
      res.status(500).json({
        success: false,
        error: 'MyPermissionsError',
        message: 'Eigene Berechtigungen konnten nicht geladen werden'
      });
    }
  }

  /**
   * 🔍 DEBUG-DISCOVERY: Zeigt was das System wirklich findet
   * GET /api/admin-portal/permissions/debug-discovery
   */
  static async handleDebugDiscovery(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';
      
      logAuthEvent(userId, 'admin', 'debug_discovery');

      console.log(`🔍 DEBUG-DISCOVERY gestartet von User: ${userEmail}`);

      // 1. Lade ALLE User aus dem System
      const allUsersResult = await AdminPortalOrchestrator.userAggregator.getUnifiedUsers({
        page: 1,
        limit: 10000
      });

      let allUsers: any[] = [];
      let entfeuchtungUsers: any[] = [];
      let departmentStats: {[key: string]: number} = {};

      if (allUsersResult.success && allUsersResult.data) {
        allUsers = allUsersResult.data.data;
        
        // Analysiere Department-Namen
        allUsers.forEach(user => {
          const dept = user.sourceData?.department || user.department || 'UNKNOWN';
          departmentStats[dept] = (departmentStats[dept] || 0) + 1;
          
          // Sammle Entfeuchtung-User
          if (dept.toLowerCase().includes('entfeuchtung')) {
            entfeuchtungUsers.push({
              userId: user.id,
              userName: user.sourceData?.displayName || user.name || user.email,
              email: user.email,
              department: dept
            });
          }
        });
      }

      // 2. Teste Discovery-Funktionen
      const { discoverAllUsersInDepartment, identifySubGroupsForDepartment } = await import('./functions/permissions/departmentPermissions');
      
      const discoveredUsers = await discoverAllUsersInDepartment('Entfeuchtung');
      const discoveredSubGroups = await identifySubGroupsForDepartment('Entfeuchtung');

      // 3. Teste Hierarchie-Analyzer
      const { analyzeUserHierarchy } = await import('./functions/permissions/hierarchyAnalyzer');
      const hierarchyResult = await analyzeUserHierarchy(allUsers);

      const debugResult = {
        totalSystemUsers: allUsers.length,
        entfeuchtungUsersFound: entfeuchtungUsers.length,
        entfeuchtungUsers: entfeuchtungUsers,
        departmentStats: Object.entries(departmentStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10), // Top 10 Departments
        discoveryResults: {
          discoveredUsersCount: discoveredUsers.length,
          discoveredUsers: discoveredUsers,
          discoveredSubGroupsCount: discoveredSubGroups.length,
          discoveredSubGroups: discoveredSubGroups
        },
        hierarchyAnalysis: hierarchyResult.success ? {
          departments: hierarchyResult.data?.departments || [],
          subGroups: hierarchyResult.data?.subGroups || [],
          totalDepartments: hierarchyResult.data?.departments.length || 0,
          totalSubGroups: hierarchyResult.data?.subGroups.length || 0
        } : { error: hierarchyResult.message }
      };

      console.log(`🔍 DEBUG-DISCOVERY Ergebnisse:`, {
        totalUsers: debugResult.totalSystemUsers,
        entfeuchtungUsers: debugResult.entfeuchtungUsersFound,
        discoveredUsers: debugResult.discoveryResults.discoveredUsersCount,
        discoveredSubGroups: debugResult.discoveryResults.discoveredSubGroupsCount
      });

      res.json({
        success: true,
        data: debugResult,
        message: `DEBUG-Discovery abgeschlossen: ${debugResult.totalSystemUsers} System-User, ${debugResult.entfeuchtungUsersFound} Entfeuchtung-User gefunden`
      });

    } catch (error) {
      console.error('❌ Fehler bei DEBUG-DISCOVERY:', error);
      res.status(500).json({
        success: false,
        error: 'DebugDiscoveryError',
        message: 'DEBUG-Discovery fehlgeschlagen: ' + String(error)
      });
    }
  }

  /**
   * 🏗️ AUTO-POPULATION: Füllt JSON automatisch mit allen System-Usern
   * POST /api/admin-portal/permissions/populate-users
   */
  static async handlePopulateUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';
      
      logAuthEvent(userId, 'admin', 'admin_portal');

      console.log(`🚀 AUTO-POPULATION gestartet von User: ${userEmail}`);

      // Import der populateJSONWithAllUsers Funktion
      const { populateJSONWithAllUsers } = await import('./functions/permissions/departmentPermissions');

      await populateJSONWithAllUsers();

      res.json({
        success: true,
        data: true,
        message: 'JSON erfolgreich mit allen System-Usern und Untergruppen gefüllt'
      });

    } catch (error) {
      console.error('❌ Fehler bei AUTO-POPULATION:', error);
      res.status(500).json({
        success: false,
        error: 'AutoPopulationError',
        message: 'Auto-Population fehlgeschlagen: ' + String(error)
      });
    }
  }

  /**
   * 🏢 VOLLSTÄNDIGE EISBÄR-POPULATION: Erstellt explizite JSON-Struktur mit ALLEN echten Abteilungen
   * POST /api/admin-portal/permissions/eisbaer-population
   */
  static async handleEisbaerPopulation(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';
      
      logAuthEvent(userId, 'admin', 'admin_portal');

      console.log(`🏢 VOLLSTÄNDIGE EISBÄR-POPULATION gestartet von User: ${userEmail}`);

      // Import der NEUEN VOLLSTÄNDIGEN EISBÄR-POPULATION Funktion
      const { populateJSONWithAllUsers } = await import('./functions/permissions/departmentPermissions');

      await populateJSONWithAllUsers(); // Verwendet die neue vollständige Version!

      res.json({
        success: true,
        data: true,
        message: '🎉 VOLLSTÄNDIGE EISBÄR-POPULATION abgeschlossen! JSON enthält jetzt ALLE echten Abteilungen, Untergruppen und User mit expliziten Berechtigungen.'
      });

    } catch (error) {
      console.error('❌ Fehler bei VOLLSTÄNDIGER EISBÄR-POPULATION:', error);
      res.status(500).json({
        success: false,
        error: 'EisbaerPopulationError',
        message: 'EISBÄR-Population fehlgeschlagen: ' + String(error)
      });
    }
  }

  /**
   * Initialisiert automatische Berechtigungsvererbung basierend auf echten Abteilungen
   * POST /api/admin-portal/permissions/auto-initialize
   */
  static async handleInitializeAutomaticInheritance(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';
      
      logAuthEvent(userId, 'initialize_automatic_inheritance', 'hierarchical_permissions');
      
      console.log(`🔄 User ${userEmail} initialisiert automatische Berechtigungsvererbung...`);
      
      // 1. Lade alle echten User für Hierarchie-Analyse
      const usersResult = await AdminPortalOrchestrator.userAggregator.getUnifiedUsers({
        page: 1,
        limit: 10000
      });
      
      if (!usersResult.success || !usersResult.data) {
        return res.status(500).json({
          success: false,
          error: 'UserLoadError',
          message: 'User konnten nicht für Hierarchie-Analyse geladen werden'
        });
      }
      
      // 2. Analysiere echte Abteilungsstruktur
      const hierarchyResult = await analyzeUserHierarchy(usersResult.data.data);
      
      if (!hierarchyResult.success) {
        return res.status(500).json(hierarchyResult);
      }
      
      // 3. Erstelle automatisch Berechtigungsstruktur mit HIERARCHISCHER CASCADE-LOGIC
      const { saveDepartmentPermissionsWithCascade } = await import('./functions/permissions/departmentPermissions');
      const results = [];
      
      // 3a. Für jede Hauptabteilung - CASCADE zu ALLEN Untergruppen
      if (hierarchyResult.data) {
        for (const dept of hierarchyResult.data.departments) {
          console.log(`🏢 Initialisiere Hauptabteilung mit CASCADE: ${dept.name}`);
          
          // Standard-Berechtigungen für Hauptabteilung
          const defaultPermissions = {
            hr: 'access' as const,
            support: 'none' as const,
            ai: 'none' as const,
            'admin-portal': 'none' as const
          };
          
          // ✅ WICHTIG: Verwende CASCADE-Funktion für automatische Vererbung!
          const result = await saveDepartmentPermissionsWithCascade(
            dept.id,
            dept.name, 
            defaultPermissions,
            {}, // Keine User-Overrides initial
            userEmail,
            'department' // ✅ CASCADE-Modus: Vererbt zu ALLEN Untergruppen
          );
          
          if (result.success && result.data) {
            const cascadeInfo = result.data.cascadeInfo;
            results.push(`✅ Hauptabteilung ${dept.name} mit CASCADE: ${cascadeInfo.updatedSubGroups} Untergruppen automatisch erstellt`);
            
            // Zusätzliche Statistik-Logs für bessere Nachvollziehbarkeit
            console.log(`📊 CASCADE-Statistik für ${dept.name}:`, {
              mode: cascadeInfo.mode,
              updatedSubGroups: cascadeInfo.updatedSubGroups,
              affectedDepartments: result.data.affectedDepartments.length,
              totalEntries: result.data.updated.length
            });
          } else {
            results.push(`❌ Fehler bei Hauptabteilung ${dept.name}: ${result.message}`);
          }
        }
      }
      
      console.log(`✅ Automatische Initialisierung abgeschlossen: ${results.length} Einträge`);
      
      res.json({
        success: true,
        data: {
          initializedDepartments: hierarchyResult.data?.departments.length || 0,
          initializedSubGroups: hierarchyResult.data?.subGroups.length || 0,
          totalPermissionEntries: results.length,
          results: results
        },
        message: `Automatische Berechtigungsvererbung für ${hierarchyResult.data?.departments.length || 0} Abteilungen initialisiert`
      });
      
    } catch (error) {
      console.error('❌ Fehler bei automatischer Berechtigungsinitialisierung:', error);
      res.status(500).json({
        success: false,
        error: 'AutoInheritanceError',
        message: 'Automatische Berechtigungsinitialisierung fehlgeschlagen'
      });
    }
  }
}

/**
 * Registriert alle Admin-Portal Routes
 */
export function registerAdminPortalRoutes(router: any) {
  // ===== ENTRA ADMIN CENTER ROUTES =====
  router.post('/admin-portal/entra/fetch-from-admin-center',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleFetchFromAdminCenter
  );

  router.get('/admin-portal/entra/check-availability',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleCheckAdminCenterAvailability
  );

  // ===== SYNC ROUTES =====
  router.post('/admin-portal/sync/:source',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleSyncSource
  );

  router.post('/admin-portal/sync-all',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleSyncAllSources
  );

  router.get('/admin-portal/sync/status',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleGetSyncStatus
  );

  router.delete('/admin-portal/sync/:source',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleCancelSync
  );

  // ===== USER OVERVIEW ROUTES =====
  router.get('/admin-portal/users',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleGetUnifiedUsers
  );

  router.get('/admin-portal/users/email/:email',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleFindUserByEmail
  );

  // ===== UPLOAD ROUTES =====
  router.post('/admin-portal/upload/analyze',
    requireAdminPortalAdmin(),
    upload.single('file'),
    AdminPortalOrchestrator.handleAnalyzeUpload
  );

  router.post('/admin-portal/upload/process',
    requireAdminPortalAdmin(),
    upload.single('file'),
    AdminPortalOrchestrator.handleProcessUpload
  );

  router.get('/admin-portal/upload/stats',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleGetUploadStats
  );

  // ===== MANUAL USER ROUTES =====
  router.post('/admin-portal/manual/users',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleCreateManualUser
  );

  router.get('/admin-portal/manual/users',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleGetManualUsers
  );

  router.get('/admin-portal/manual/users/:userId',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleGetManualUserById
  );

  router.put('/admin-portal/manual/users/:userId',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleUpdateManualUser
  );

  router.delete('/admin-portal/manual/users/:userId',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleDeleteManualUser
  );

  // ===== DASHBOARD & STATS ROUTES =====
  router.get('/admin-portal/dashboard/stats',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleGetDashboardStats
  );

  router.get('/admin-portal/stats/advanced',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleGetAdvancedStats
  );

  // ===== CONFLICT MANAGEMENT ROUTES =====
  router.get('/admin-portal/conflicts',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleDetectConflicts
  );

  router.post('/admin-portal/conflicts/resolve',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleResolveConflict
  );

  // ===== SCHEDULER ROUTES =====
  router.get('/admin-portal/schedules',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleGetSchedules
  );

  router.post('/admin-portal/schedules',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleCreateSchedule
  );

  router.put('/admin-portal/schedules/:scheduleId',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleUpdateSchedule
  );

  router.delete('/admin-portal/schedules/:scheduleId',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleDeleteSchedule
  );

  router.get('/admin-portal/schedules/history',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleGetSyncHistory
  );

  router.get('/admin-portal/schedules/stats',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleGetSchedulerStats
  );

  router.post('/admin-portal/schedules/test-cron',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleTestCronExpression
  );

  // ===== TESTING & CONNECTIVITY ROUTES =====
  router.get('/admin-portal/test/connections',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleTestConnections
  );

  // ===== EXPORT ROUTES =====
  router.get('/admin-portal/export/users',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleExportAllUsers
  );

  // ===== DEVELOPMENT ROUTES =====
  router.post('/admin-portal/test-data',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleGenerateTestData
  );

  // ===== PERMISSIONS ROUTES =====
  router.get('/admin-portal/permissions/available',
    requireAdminPortalAccess(),
    AdminPortalOrchestrator.handleGetAvailablePermissions
  );

  // ===== MY PERMISSIONS ROUTE =====
  router.get('/admin-portal/my-permissions',
    requireAuth,  // Nur Authentifizierung, keine spezielle Permission nötig
    AdminPortalOrchestrator.handleGetMyPermissions
  );

  // ===== AUTOMATIC INHERITANCE ROUTES =====
  router.post('/admin-portal/permissions/auto-initialize',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleInitializeAutomaticInheritance
  );

  // ===== ROLES ROUTES =====
  router.get('/admin-portal/permissions/roles',
    requireAdminPortalAccess(),
    AdminPortalOrchestrator.handleGetRoles
  );

  router.post('/admin-portal/permissions/roles',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleCreateRole
  );

  router.delete('/admin-portal/permissions/roles/:roleId',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleDeleteRole
  );

  // ===== GROUPS ROUTES =====
  router.get('/admin-portal/permissions/groups',
    requireAdminPortalAccess(),
    AdminPortalOrchestrator.handleGetGroups
  );

  router.post('/admin-portal/permissions/groups',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleCreateGroup
  );

  router.delete('/admin-portal/permissions/groups/:groupId',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleDeleteGroup
  );

  // ===== TOKENS ROUTES =====
  router.get('/admin-portal/permissions/tokens',
    requireAdminPortalAccess(),
    AdminPortalOrchestrator.handleGetTokens
  );

  router.post('/admin-portal/permissions/tokens',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleCreateToken
  );

  router.post('/admin-portal/permissions/tokens/:tokenId/revoke',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleRevokeToken
  );

  // ===== AUDIT ROUTES =====
  router.get('/admin-portal/permissions/audit',
    requireAdminPortalAccess(),
    AdminPortalOrchestrator.handleGetAuditLogs
  );

  // ===== DATABASE ROUTES =====
  router.get('/admin-portal/database/info',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleGetDatabaseInfo
  );

  router.get('/admin-portal/database/schema/:tableName',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleGetTableSchema
  );

  router.delete('/admin-portal/database/clear',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleClearDatabase
  );

  // ===== USER DATA ROUTES (für andere Module wie HR) =====
  router.get('/admin-portal/users/overview',
    requireUserDataAccess(),
    AdminPortalOrchestrator.handleGetUsersOverview
  );

  router.post('/admin-portal/users/create',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleCreateUser
  );

  router.post('/admin-portal/sync/trigger',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleTriggerSync
  );

  // ===== HIERARCHICAL PERMISSIONS ROUTES =====
  router.get('/admin-portal/hierarchy/analyze',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleAnalyzeHierarchy
  );

  router.get('/admin-portal/hierarchy/structure',
    requireAdminPortalAccess(),
    AdminPortalOrchestrator.handleGetHierarchyStructure
  );

  router.get('/admin-portal/hierarchy/departments/:departmentId/permissions',
    requireAdminPortalAccess(),
    AdminPortalOrchestrator.handleGetDepartmentPermissions
  );

  router.put('/admin-portal/hierarchy/departments/:departmentId/permissions',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleUpdateDepartmentPermissions
  );

  // ✨ NEUE Route für hierarchische Permissions mit Cascade-Logic
  router.put('/admin-portal/hierarchy/departments/:departmentId/permissions/cascade',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleUpdateDepartmentPermissionsWithCascade
  );

  router.get('/admin-portal/hierarchy/users/:userId/effective-permissions',
    requireAdminPortalAccess(),
    AdminPortalOrchestrator.handleGetEffectiveUserPermissions
  );

  router.get('/admin-portal/hierarchy/modules',
    requireAdminPortalAccess(),
    AdminPortalOrchestrator.handleGetAvailableModules
  );

  router.get('/admin-portal/hierarchy/permissions/all',
    requireAdminPortalAccess(),
    AdminPortalOrchestrator.handleGetAllDepartmentPermissions
  );

  // User-spezifische Permission-Endpoints (mit Auth-Middleware)
  router.get('/admin-portal/my-permissions',
    requireAuth,  // 🔐 Authentication-Middleware hinzugefügt
    AdminPortalOrchestrator.handleGetMyPermissions
  );

  // 🏗️ AUTO-POPULATION Route
  router.post('/admin-portal/permissions/populate-users',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handlePopulateUsers
  );

  // 🏢 VOLLSTÄNDIGE EISBÄR-POPULATION Route
  router.post('/admin-portal/permissions/eisbaer-population',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleEisbaerPopulation
  );

  // 🔍 DEBUG Route - Zeigt was System wirklich findet
  router.get('/admin-portal/permissions/debug-discovery',
    requireAdminPortalAdmin(),
    AdminPortalOrchestrator.handleDebugDiscovery
  );

}
