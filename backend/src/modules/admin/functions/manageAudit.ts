import { 
  AuditLog, 
  SystemStats,
  GetAuditLogsRequest,
  APIResponse,
  PaginatedResponse
} from '../types';
import { getCombinedUsers } from '../../../datasources';
import { randomUUID } from 'crypto';

// In-Memory Audit Log Store (in Production würde dies eine Datenbank sein)
let auditLogsStore: AuditLog[] = [
  {
    id: randomUUID(),
    userId: 'system',
    userEmail: 'system@company.com',
    action: 'system_start',
    resource: 'system',
    details: { message: 'CompanyAI Backend gestartet' },
    timestamp: new Date(),
    ipAddress: 'localhost',
    userAgent: 'CompanyAI-Backend/1.0'
  }
];

/**
 * Lädt Audit-Logs mit Filtern und Paginierung
 */
export async function fetchAuditLogs(
  request: GetAuditLogsRequest,
  page: number = 1,
  limit: number = 50
): Promise<APIResponse<PaginatedResponse<AuditLog>>> {
  try {
    let filteredLogs = [...auditLogsStore];

    // Filter anwenden
    if (request.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === request.userId);
    }

    if (request.action) {
      filteredLogs = filteredLogs.filter(log => 
        log.action.toLowerCase().includes(request.action!.toLowerCase())
      );
    }

    if (request.resource) {
      filteredLogs = filteredLogs.filter(log => 
        log.resource.toLowerCase().includes(request.resource!.toLowerCase())
      );
    }

    if (request.startDate) {
      const startDate = new Date(request.startDate);
      filteredLogs = filteredLogs.filter(log => log.timestamp >= startDate);
    }

    if (request.endDate) {
      const endDate = new Date(request.endDate);
      filteredLogs = filteredLogs.filter(log => log.timestamp <= endDate);
    }

    // Nach Timestamp sortieren (neueste zuerst)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Paginierung
    const total = filteredLogs.length;
    const offset = (page - 1) * limit;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);

    return {
      success: true,
      data: {
        data: paginatedLogs,
        pagination: {
          total,
          page,
          limit,
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      },
      message: `${paginatedLogs.length} Audit-Logs erfolgreich geladen`
    };

  } catch (error) {
    console.error('Fehler beim Laden der Audit-Logs:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Audit-Logs konnten nicht geladen werden'
    };
  }
}

/**
 * Erstellt einen neuen Audit-Log-Eintrag
 */
export async function createAuditLog(
  userId: string,
  userEmail: string,
  action: string,
  resource: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<APIResponse<AuditLog>> {
  try {
    const auditLog: AuditLog = {
      id: randomUUID(),
      userId,
      userEmail,
      action,
      resource,
      details,
      timestamp: new Date(),
      ipAddress,
      userAgent
    };

    auditLogsStore.push(auditLog);

    // Store-Größe begrenzen (nur die letzten 10.000 Logs behalten)
    if (auditLogsStore.length > 10000) {
      auditLogsStore = auditLogsStore.slice(-10000);
    }

    return {
      success: true,
      data: auditLog,
      message: 'Audit-Log erfolgreich erstellt'
    };

  } catch (error) {
    console.error('Fehler beim Erstellen des Audit-Logs:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Audit-Log konnte nicht erstellt werden'
    };
  }
}

/**
 * Lädt System-Statistiken
 */
export async function fetchSystemStats(): Promise<APIResponse<SystemStats>> {
  try {
    // User-Statistiken laden
    const usersResult = await getCombinedUsers();
    let totalUsers = 0;
    let activeUsers = 0;

    if (usersResult.success && usersResult.data) {
      totalUsers = usersResult.data.length;
      activeUsers = usersResult.data.filter(user => 
        user.accountEnabled !== false
      ).length;
    }

    // System-Health bewerten
    let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    // Memory Usage simulieren (in Production: echte Metriken)
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    
    if (memoryUsagePercent > 90) {
      systemHealth = 'critical';
    } else if (memoryUsagePercent > 70) {
      systemHealth = 'warning';
    }

    // Uptime berechnen
    const uptimeSeconds = process.uptime();

    const stats: SystemStats = {
      totalUsers,
      activeUsers,
      totalModules: 4, // hr, support, ai, admin
      systemHealth,
      lastSync: new Date(Date.now() - Math.random() * 3600000), // Simuliert
      uptime: uptimeSeconds,
      memoryUsage: Math.round(memoryUsagePercent),
      diskUsage: Math.round(Math.random() * 50) // Simuliert
    };

    return {
      success: true,
      data: stats,
      message: 'System-Statistiken erfolgreich geladen'
    };

  } catch (error) {
    console.error('Fehler beim Laden der System-Statistiken:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'System-Statistiken konnten nicht geladen werden'
    };
  }
}

/**
 * Lädt Audit-Log-Statistiken
 */
export async function fetchAuditStats(
  timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'
): Promise<APIResponse<{
  totalEvents: number;
  uniqueUsers: number;
  topActions: Array<{action: string; count: number}>;
  topResources: Array<{resource: string; count: number}>;
  eventTimeline: Array<{timestamp: Date; count: number}>;
}>> {
  try {
    // Zeitraum berechnen
    const now = new Date();
    let startTime: Date;
    
    switch (timeRange) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Logs im Zeitraum filtern
    const filteredLogs = auditLogsStore.filter(log => log.timestamp >= startTime);

    // Statistiken berechnen
    const totalEvents = filteredLogs.length;
    const uniqueUsers = new Set(filteredLogs.map(log => log.userId)).size;

    // Top Actions
    const actionCounts: {[action: string]: number} = {};
    filteredLogs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    });
    const topActions = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top Resources
    const resourceCounts: {[resource: string]: number} = {};
    filteredLogs.forEach(log => {
      resourceCounts[log.resource] = (resourceCounts[log.resource] || 0) + 1;
    });
    const topResources = Object.entries(resourceCounts)
      .map(([resource, count]) => ({ resource, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Event Timeline (Buckets je nach Zeitraum)
    const bucketSize = timeRange === 'hour' ? 5 * 60 * 1000 : // 5 Minuten
                      timeRange === 'day' ? 60 * 60 * 1000 : // 1 Stunde  
                      timeRange === 'week' ? 24 * 60 * 60 * 1000 : // 1 Tag
                      7 * 24 * 60 * 60 * 1000; // 1 Woche

    const buckets: {[key: number]: number} = {};
    filteredLogs.forEach(log => {
      const bucketKey = Math.floor(log.timestamp.getTime() / bucketSize) * bucketSize;
      buckets[bucketKey] = (buckets[bucketKey] || 0) + 1;
    });

    const eventTimeline = Object.entries(buckets)
      .map(([timestamp, count]) => ({ 
        timestamp: new Date(parseInt(timestamp)), 
        count 
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return {
      success: true,
      data: {
        totalEvents,
        uniqueUsers,
        topActions,
        topResources,
        eventTimeline
      },
      message: `Audit-Statistiken für ${timeRange} erfolgreich geladen`
    };

  } catch (error) {
    console.error('Fehler beim Laden der Audit-Statistiken:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Audit-Statistiken konnten nicht geladen werden'
    };
  }
}

/**
 * Bereinigt alte Audit-Logs
 */
export async function cleanupOldAuditLogs(
  olderThanDays: number = 30,
  cleanupBy: string
): Promise<APIResponse<{deleted: number; remaining: number}>> {
  try {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialCount = auditLogsStore.length;
    
    // Alte Logs entfernen
    auditLogsStore = auditLogsStore.filter(log => log.timestamp >= cutoffDate);
    
    const deleted = initialCount - auditLogsStore.length;
    const remaining = auditLogsStore.length;

    // Cleanup-Aktion loggen
    await createAuditLog(
      cleanupBy,
      'admin@company.com',
      'cleanup_audit_logs',
      'audit_logs',
      { deleted, remaining, olderThanDays }
    );

    return {
      success: true,
      data: { deleted, remaining },
      message: `Audit-Log-Bereinigung abgeschlossen: ${deleted} alte Logs gelöscht, ${remaining} verbleiben`
    };

  } catch (error) {
    console.error('Fehler bei der Audit-Log-Bereinigung:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Audit-Log-Bereinigung fehlgeschlagen'
    };
  }
}

/**
 * Exportiert Audit-Logs für Compliance/Backup
 */
export async function exportAuditLogs(
  request: GetAuditLogsRequest
): Promise<APIResponse<AuditLog[]>> {
  try {
    const logsResult = await fetchAuditLogs(request, 1, 100000); // Alle Logs
    
    if (!logsResult.success || !logsResult.data) {
      return {
        success: false,
        error: 'LoadError',
        message: 'Fehler beim Laden der Logs für Export'
      };
    }

    return {
      success: true,
      data: logsResult.data.data,
      message: `${logsResult.data.data.length} Audit-Logs erfolgreich exportiert`
    };

  } catch (error) {
    console.error('Fehler beim Exportieren der Audit-Logs:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Audit-Logs konnten nicht exportiert werden'
    };
  }
}
