// Admin Module - Orchestrator
// Steuert die Abläufe im Admin-Modul und koordiniert die verschiedenen Funktionen

import { Request, Response } from 'express';
import { 
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  UpdateSystemSettingRequest,
  GetAuditLogsRequest,
  BulkUserActionRequest,
  APIResponse 
} from './types';

// Import functions
import { 
  fetchAdminUsers,
  fetchAdminUserById,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  bulkUserAction
} from './functions/manageUsers';

import {
  fetchSystemSettings,
  fetchSystemSettingByKey,
  updateSystemSetting,
  deleteSystemSetting,
  fetchSettingsByCategory,
  exportSettings,
  importSettings
} from './functions/manageSettings';

import {
  fetchAuditLogs,
  createAuditLog,
  fetchSystemStats,
  fetchAuditStats,
  cleanupOldAuditLogs,
  exportAuditLogs
} from './functions/manageAudit';

// Import core functionality
import { AuthenticatedRequest, requirePermission, logAuthEvent } from '../hr/core/auth';

/**
 * Admin-Orchestrator Klasse - Koordiniert alle Admin-Module-Funktionen
 */
export class AdminOrchestrator {
  
  // ===== USER MANAGEMENT =====
  
  /**
   * Lädt alle Admin-User mit Filtern und Paginierung
   */
  static async handleFetchAdminUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const role = req.query.role as string;
      const status = req.query.status as string;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'fetch_admin_users', 'admin_users');

      const result = await fetchAdminUsers(page, limit, role, status);

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Laden der Admin-User:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Admin-User konnten nicht geladen werden'
      });
    }
  }

  /**
   * Lädt einen einzelnen Admin-User by ID
   */
  static async handleFetchAdminUserById(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id || 'unknown';

      logAuthEvent(currentUserId, 'fetch_admin_user_by_id', 'admin_users');

      const result = await fetchAdminUserById(userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Laden des Admin-Users:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Admin-User konnte nicht geladen werden'
      });
    }
  }

  /**
   * Erstellt einen neuen Admin-User
   */
  static async handleCreateAdminUser(req: AuthenticatedRequest, res: Response) {
    try {
      const request: CreateAdminUserRequest = req.body;
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'create_admin_user', 'admin_users');

      const result = await createAdminUser(request, userEmail);

      if (result.success) {
        // Audit-Log für User-Erstellung
        await createAuditLog(
          userId,
          userEmail,
          'create_admin_user',
          'admin_users',
          { newUserId: result.data?.id, role: request.role },
          req.ip,
          req.get('User-Agent')
        );

        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Erstellen des Admin-Users:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Admin-User konnte nicht erstellt werden'
      });
    }
  }

  /**
   * Aktualisiert einen bestehenden Admin-User
   */
  static async handleUpdateAdminUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const updates: UpdateAdminUserRequest = req.body;
      const currentUserId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(currentUserId, 'update_admin_user', 'admin_users');

      const result = await updateAdminUser(userId, updates, userEmail);

      if (result.success) {
        // Audit-Log für User-Update
        await createAuditLog(
          currentUserId,
          userEmail,
          'update_admin_user',
          'admin_users',
          { targetUserId: userId, updates },
          req.ip,
          req.get('User-Agent')
        );

        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Aktualisieren des Admin-Users:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Admin-User konnte nicht aktualisiert werden'
      });
    }
  }

  /**
   * Löscht einen Admin-User
   */
  static async handleDeleteAdminUser(req: AuthenticatedRequest, res: Response) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      // Selbstlöschung verhindern
      if (userId === currentUserId) {
        return res.status(400).json({
          success: false,
          error: 'SelfDeletionNotAllowed',
          message: 'Sie können sich nicht selbst löschen'
        });
      }

      logAuthEvent(currentUserId, 'delete_admin_user', 'admin_users');

      const result = await deleteAdminUser(userId, userEmail);

      if (result.success) {
        // Audit-Log für User-Löschung
        await createAuditLog(
          currentUserId,
          userEmail,
          'delete_admin_user',
          'admin_users',
          { deletedUserId: userId },
          req.ip,
          req.get('User-Agent')
        );

        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Löschen des Admin-Users:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Admin-User konnte nicht gelöscht werden'
      });
    }
  }

  /**
   * Bulk-Aktionen für mehrere User
   */
  static async handleBulkUserAction(req: AuthenticatedRequest, res: Response) {
    try {
      const request: BulkUserActionRequest = req.body;
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'bulk_user_action', 'admin_users');

      const result = await bulkUserAction(request, userEmail);

      if (result.success) {
        // Audit-Log für Bulk-Aktion
        await createAuditLog(
          userId,
          userEmail,
          'bulk_user_action',
          'admin_users',
          { action: request.action, userIds: request.userIds, result: result.data },
          req.ip,
          req.get('User-Agent')
        );

        res.json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('Fehler bei Bulk-User-Aktion:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Bulk-User-Aktion konnte nicht ausgeführt werden'
      });
    }
  }

  // ===== SYSTEM SETTINGS =====

  /**
   * Lädt System-Settings
   */
  static async handleFetchSystemSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const category = req.query.category as string;
      const includeSecrets = req.query.includeSecrets === 'true';
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'fetch_system_settings', 'system_settings');

      const result = await fetchSystemSettings(category, includeSecrets);

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Laden der System-Settings:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'System-Settings konnten nicht geladen werden'
      });
    }
  }

  /**
   * Lädt ein einzelnes System-Setting
   */
  static async handleFetchSystemSettingByKey(req: AuthenticatedRequest, res: Response) {
    try {
      const { key } = req.params;
      const includeSecret = req.query.includeSecret === 'true';
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'fetch_system_setting_by_key', 'system_settings');

      const result = await fetchSystemSettingByKey(key, includeSecret);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Laden des System-Settings:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'System-Setting konnte nicht geladen werden'
      });
    }
  }

  /**
   * Aktualisiert oder erstellt ein System-Setting
   */
  static async handleUpdateSystemSetting(req: AuthenticatedRequest, res: Response) {
    try {
      const request: UpdateSystemSettingRequest = req.body;
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'update_system_setting', 'system_settings');

      const result = await updateSystemSetting(request, userEmail);

      if (result.success) {
        // Audit-Log für Setting-Update
        await createAuditLog(
          userId,
          userEmail,
          'update_system_setting',
          'system_settings',
          { key: request.key, category: request.category },
          req.ip,
          req.get('User-Agent')
        );

        res.json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Aktualisieren des System-Settings:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'System-Setting konnte nicht aktualisiert werden'
      });
    }
  }

  /**
   * Löscht ein System-Setting
   */
  static async handleDeleteSystemSetting(req: AuthenticatedRequest, res: Response) {
    try {
      const { key } = req.params;
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      logAuthEvent(userId, 'delete_system_setting', 'system_settings');

      const result = await deleteSystemSetting(key, userEmail);

      if (result.success) {
        // Audit-Log für Setting-Löschung
        await createAuditLog(
          userId,
          userEmail,
          'delete_system_setting',
          'system_settings',
          { key },
          req.ip,
          req.get('User-Agent')
        );

        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Löschen des System-Settings:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'System-Setting konnte nicht gelöscht werden'
      });
    }
  }

  /**
   * Lädt Settings nach Kategorien gruppiert
   */
  static async handleFetchSettingsByCategory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'fetch_settings_by_category', 'system_settings');

      const result = await fetchSettingsByCategory();

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Gruppieren der Settings:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Settings konnten nicht gruppiert werden'
      });
    }
  }

  // ===== AUDIT & LOGGING =====

  /**
   * Lädt Audit-Logs mit Filtern
   */
  static async handleFetchAuditLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const userId = req.user?.id || 'unknown';

      const request: GetAuditLogsRequest = {
        userId: req.query.userId as string,
        action: req.query.action as string,
        resource: req.query.resource as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      logAuthEvent(userId, 'fetch_audit_logs', 'audit_logs');

      const result = await fetchAuditLogs(request, page, limit);

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Laden der Audit-Logs:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Audit-Logs konnten nicht geladen werden'
      });
    }
  }

  /**
   * Lädt System-Statistiken
   */
  static async handleFetchSystemStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'fetch_system_stats', 'system_stats');

      const result = await fetchSystemStats();

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Laden der System-Statistiken:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'System-Statistiken konnten nicht geladen werden'
      });
    }
  }

  /**
   * Lädt Audit-Statistiken
   */
  static async handleFetchAuditStats(req: AuthenticatedRequest, res: Response) {
    try {
      const timeRange = req.query.timeRange as 'hour' | 'day' | 'week' | 'month' || 'day';
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'fetch_audit_stats', 'audit_stats');

      const result = await fetchAuditStats(timeRange);

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Laden der Audit-Statistiken:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Audit-Statistiken konnten nicht geladen werden'
      });
    }
  }

  /**
   * Bereinigt alte Audit-Logs
   */
  static async handleCleanupAuditLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const olderThanDays = parseInt(req.body.olderThanDays) || 30;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'cleanup_audit_logs', 'audit_logs');

      const result = await cleanupOldAuditLogs(olderThanDays, userId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Fehler bei der Audit-Log-Bereinigung:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Audit-Log-Bereinigung fehlgeschlagen'
      });
    }
  }

  // ===== IMPORT/EXPORT =====

  /**
   * Exportiert System-Settings
   */
  static async handleExportSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'export_settings', 'system_settings');

      const result = await exportSettings();

      if (result.success) {
        // Als JSON-Datei senden
        res.setHeader('Content-Disposition', 'attachment; filename=settings-export.json');
        res.setHeader('Content-Type', 'application/json');
        res.json(result.data);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Exportieren der Settings:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Settings konnten nicht exportiert werden'
      });
    }
  }

  /**
   * Importiert System-Settings
   */
  static async handleImportSettings(req: AuthenticatedRequest, res: Response) {
    try {
      const settings = req.body.settings;
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';

      if (!Array.isArray(settings)) {
        return res.status(400).json({
          success: false,
          error: 'ValidationError',
          message: 'Settings-Array ist erforderlich'
        });
      }

      logAuthEvent(userId, 'import_settings', 'system_settings');

      const result = await importSettings(settings, userEmail);

      if (result.success) {
        // Audit-Log für Settings-Import
        await createAuditLog(
          userId,
          userEmail,
          'import_settings',
          'system_settings',
          { result: result.data },
          req.ip,
          req.get('User-Agent')
        );

        res.json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Importieren der Settings:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Settings konnten nicht importiert werden'
      });
    }
  }

  /**
   * Exportiert Audit-Logs
   */
  static async handleExportAuditLogs(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';

      const request: GetAuditLogsRequest = {
        userId: req.query.userId as string,
        action: req.query.action as string,
        resource: req.query.resource as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      logAuthEvent(userId, 'export_audit_logs', 'audit_logs');

      const result = await exportAuditLogs(request);

      if (result.success) {
        // Als JSON-Datei senden
        const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Type', 'application/json');
        res.json(result.data);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Exportieren der Audit-Logs:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Audit-Logs konnten nicht exportiert werden'
      });
    }
  }

  /**
   * Generiert Test-Daten für Entwicklung und Demo
   */
  static async handleGenerateTestData(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const userEmail = req.user?.email || 'unknown';
      
      logAuthEvent(userId, 'generate_test_data', 'all');

      // Test-User erstellen
      const testUserResult = await createAdminUser({
        firstName: 'Test',
        lastName: 'Administrator',
        email: 'test.admin@company.com',
        role: 'admin'
      }, userEmail);

      // Test-Setting erstellen
      const testSettingResult = await updateSystemSetting({
        key: 'TEST_SETTING',
        value: 'Test-Wert für Entwicklung',
        category: 'general',
        description: 'Beispiel-Setting für Tests'
      }, userEmail);

      // System-Stats laden
      const statsResult = await fetchSystemStats();

      // Audit-Stats laden
      const auditStatsResult = await fetchAuditStats('day');

      res.json({
        success: true,
        data: {
          testUser: testUserResult.data,
          testSetting: testSettingResult.data,
          systemStats: statsResult.data,
          auditStats: auditStatsResult.data
        },
        message: 'Test-Daten für Admin-Modul erfolgreich generiert'
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
}

/**
 * Hilfsfunktion zur Registrierung der Admin-Module-Routes
 */
export function registerAdminRoutes(router: any) {
  // User Management Routes
  router.get('/admin/users',
    requirePermission('admin', 'admin_users'),
    AdminOrchestrator.handleFetchAdminUsers
  );
  
  router.get('/admin/users/:userId',
    requirePermission('admin', 'admin_users'),
    AdminOrchestrator.handleFetchAdminUserById
  );
  
  router.post('/admin/users',
    requirePermission('admin', 'admin_users'),
    AdminOrchestrator.handleCreateAdminUser
  );
  
  router.put('/admin/users/:userId',
    requirePermission('admin', 'admin_users'),
    AdminOrchestrator.handleUpdateAdminUser
  );
  
  router.delete('/admin/users/:userId',
    requirePermission('admin', 'admin_users'),
    AdminOrchestrator.handleDeleteAdminUser
  );

  router.post('/admin/users/bulk-action',
    requirePermission('admin', 'admin_users'),
    AdminOrchestrator.handleBulkUserAction
  );

  // System Settings Routes
  router.get('/admin/settings',
    requirePermission('admin', 'system_settings'),
    AdminOrchestrator.handleFetchSystemSettings
  );
  
  router.get('/admin/settings/:key',
    requirePermission('admin', 'system_settings'),
    AdminOrchestrator.handleFetchSystemSettingByKey
  );
  
  router.post('/admin/settings',
    requirePermission('admin', 'system_settings'),
    AdminOrchestrator.handleUpdateSystemSetting
  );
  
  router.delete('/admin/settings/:key',
    requirePermission('admin', 'system_settings'),
    AdminOrchestrator.handleDeleteSystemSetting
  );

  router.get('/admin/settings-by-category',
    requirePermission('admin', 'system_settings'),
    AdminOrchestrator.handleFetchSettingsByCategory
  );

  // Audit & Logging Routes
  router.get('/admin/audit-logs',
    requirePermission('admin', 'audit_logs'),
    AdminOrchestrator.handleFetchAuditLogs
  );

  router.get('/admin/system-stats',
    requirePermission('admin', 'system_stats'),
    AdminOrchestrator.handleFetchSystemStats
  );

  router.get('/admin/audit-stats',
    requirePermission('admin', 'audit_stats'),
    AdminOrchestrator.handleFetchAuditStats
  );

  router.post('/admin/audit-logs/cleanup',
    requirePermission('admin', 'audit_logs'),
    AdminOrchestrator.handleCleanupAuditLogs
  );

  // Import/Export Routes
  router.get('/admin/export/settings',
    requirePermission('admin', 'system_settings'),
    AdminOrchestrator.handleExportSettings
  );

  router.post('/admin/import/settings',
    requirePermission('admin', 'system_settings'),
    AdminOrchestrator.handleImportSettings
  );

  router.get('/admin/export/audit-logs',
    requirePermission('admin', 'audit_logs'),
    AdminOrchestrator.handleExportAuditLogs
  );

  // Development/Test Routes
  router.post('/admin/test-data',
    requirePermission('admin', 'all'),
    AdminOrchestrator.handleGenerateTestData
  );
}
