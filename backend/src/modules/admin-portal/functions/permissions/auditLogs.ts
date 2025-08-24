import { 
  AuditLogFilters, 
  AuditLogEntry,
  APIResponse,
  PaginatedResponse
} from '../../types';

/**
 * Lädt Audit-Logs mit Filteroptionen
 */
export async function getAuditLogs(
  filters: AuditLogFilters
): Promise<APIResponse<PaginatedResponse<AuditLogEntry>>> {
  try {
    // Mock-Daten für sofortige Frontend-Integration
    const mockAuditLogs: AuditLogEntry[] = [
      {
        id: `audit_${Date.now()}_1`,
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        userId: 'user_admin_123',
        userName: 'Admin User',
        action: 'create',
        resource: 'users',
        details: {
          email: 'new.user@company.com',
          source: 'manual'
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        success: true
      },
      {
        id: `audit_${Date.now()}_2`,
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        userId: 'user_support_456',
        userName: 'Support Agent',
        action: 'delete',
        resource: 'users',
        details: {
          email: 'old.user@company.com'
        },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        success: false,
        errorMessage: 'Berechtigung verweigert - nur Admin kann User löschen'
      },
      {
        id: `audit_${Date.now()}_3`,
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
        userId: 'user_admin_123',
        userName: 'Admin User',
        action: 'login',
        resource: 'auth',
        details: {
          loginMethod: 'manual',
          sessionId: 'session_abc123'
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        success: true
      },
      {
        id: `audit_${Date.now()}_4`,
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
        userId: 'user_hacker_789',
        userName: 'Unknown User',
        action: 'login',
        resource: 'auth',
        details: {
          loginMethod: 'bruteforce_attempt',
          failedAttempts: 5
        },
        ipAddress: '203.0.113.42',
        userAgent: 'python-requests/2.28.1',
        success: false,
        errorMessage: 'Ungültige Anmeldedaten - zu viele Fehlversuche'
      }
    ];

    // Filter anwenden
    let filteredLogs = mockAuditLogs;

    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => 
        log.userId.includes(filters.userId!)
      );
    }

    if (filters.action) {
      filteredLogs = filteredLogs.filter(log => 
        log.action === filters.action
      );
    }

    if (filters.resource) {
      filteredLogs = filteredLogs.filter(log => 
        log.resource === filters.resource
      );
    }

    if (filters.success !== undefined) {
      filteredLogs = filteredLogs.filter(log => 
        log.success === filters.success
      );
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) >= fromDate
      );
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      filteredLogs = filteredLogs.filter(log => 
        new Date(log.timestamp) <= toDate
      );
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    const paginatedResponse: PaginatedResponse<AuditLogEntry> = {
      data: paginatedLogs,
      pagination: {
        total: filteredLogs.length,
        page: page,
        limit: limit,
        hasNext: endIndex < filteredLogs.length,
        hasPrev: page > 1
      }
    };

    return {
      success: true,
      data: paginatedResponse,
      message: `${paginatedLogs.length} von ${filteredLogs.length} Audit-Log-Einträgen geladen`
    };

  } catch (error) {
    console.error('❌ Fehler beim Laden der Audit-Logs:', error);
    return {
      success: false,
      error: 'AuditLogsLoadError',
      message: 'Audit-Logs konnten nicht geladen werden'
    };
  }
}

/**
 * Erstellt einen neuen Audit-Log-Eintrag
 */
export async function createAuditLog(
  userId: string,
  userName: string,
  action: string,
  resource: string,
  details: any,
  ipAddress: string,
  userAgent: string,
  success: boolean,
  errorMessage?: string
): Promise<APIResponse<AuditLogEntry>> {
  try {
    const auditEntry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userId,
      userName,
      action,
      resource,
      details,
      ipAddress,
      userAgent,
      success,
      errorMessage
    };

    // TODO: In Datenbank speichern
    // await saveAuditLogToDatabase(auditEntry);

    return {
      success: true,
      data: auditEntry,
      message: 'Audit-Log-Eintrag erstellt'
    };

  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Audit-Log-Eintrags:', error);
    return {
      success: false,
      error: 'AuditLogCreationError',
      message: 'Audit-Log-Eintrag konnte nicht erstellt werden'
    };
  }
}

/**
 * Hilfsfunktion: Audit-Event loggen
 */
export function logPermissionEvent(
  userId: string,
  userName: string,
  action: string,
  resource: string,
  details: any,
  req: any
): void {
  const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';

  // Asynchron loggen ohne zu warten
  createAuditLog(
    userId,
    userName,
    action,
    resource,
    details,
    ipAddress,
    userAgent,
    true
  ).catch(error => {
    console.error('❌ Fehler beim Audit-Logging:', error);
  });
}
