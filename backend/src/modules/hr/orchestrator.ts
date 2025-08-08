// HR Module - Orchestrator
// Steuert die Abläufe im HR-Modul und koordiniert die verschiedenen Funktionen

import { Request, Response } from 'express';
import { 
  CreateOnboardingPlanRequest,
  FetchEmployeeDataRequest,
  CreateHRReportRequest,
  APIResponse 
} from './types';

// Import functions
import { generateOnboardingPlan, updateOnboardingTask, validateOnboardingRequest } from './functions/generateOnboardingPlan';
import { fetchEmployeeData, fetchEmployeeById, createEmployee, updateEmployee, getEmployeeStats } from './functions/fetchEmployeeData';
import { createHRReport, createDetailedHRReport } from './functions/createHRReport';

// Import core functionality
import { AuthenticatedRequest, requirePermission, logAuthEvent } from './core/auth';

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
      logAuthEvent(userId, 'fetch_employee_data', 'employee_data');

      const result = await fetchEmployeeData(request);

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
    requirePermission('read', 'employee_data'),
    HROrchestrator.handleFetchEmployeeData
  );
  
  router.get('/hr/employees/:employeeId',
    requirePermission('read', 'employee_data'),
    HROrchestrator.handleFetchEmployeeById
  );
  
  router.post('/hr/employees',
    requirePermission('write', 'employee_data'),
    HROrchestrator.handleCreateEmployee
  );
  
  router.put('/hr/employees/:employeeId',
    requirePermission('write', 'employee_data'),
    HROrchestrator.handleUpdateEmployee
  );

  // Statistics Routes
  router.get('/hr/stats',
    requirePermission('read', 'reports'),
    HROrchestrator.handleGetEmployeeStats
  );

  // Reports Routes
  router.post('/hr/reports',
    requirePermission('write', 'reports'),
    HROrchestrator.handleCreateHRReport
  );
  
  router.post('/hr/reports/detailed',
    requirePermission('write', 'reports'),
    HROrchestrator.handleCreateDetailedHRReport
  );

  // Development/Test Routes
  router.post('/hr/test-data',
    requirePermission('admin', 'all'),
    HROrchestrator.handleGenerateTestData
  );
}
