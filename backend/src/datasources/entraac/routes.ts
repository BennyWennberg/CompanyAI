// EntraAC Integration - API Routes
// Stellt API-Endpunkte für Entra ID und manuelle Daten zur Verfügung

import { Request, Response } from 'express';
import { AuthenticatedRequest, logAuthEvent } from '../../modules/hr/core/auth';
import { getCombinedUsers, getCombinedDevices, findCombinedUsers, findCombinedDevices, getCombinedStats, getAvailableDataSources, DataSource } from './combined';
import { createManualUser, createManualDevice, updateManualUser, updateManualDevice, deleteManualUser, deleteManualDevice, getManualUserById, getManualDeviceById, CreateManualUserRequest, CreateManualDeviceRequest } from '../manual';
import { manualSync, getEntraSyncStatus } from './sync';

/**
 * GET /api/data/users
 * Gibt Benutzer aus der gewählten Datenquelle zurück
 */
export async function handleGetUsers(req: AuthenticatedRequest, res: Response) {
  try {
    logAuthEvent(req.user?.email || 'unknown', 'read', 'directory-users', req.reqId);

    const source = (req.query.source as DataSource) || 'all';
    const department = req.query.department as string;
    const accountEnabled = req.query.accountEnabled === 'true' ? true : req.query.accountEnabled === 'false' ? false : undefined;
    const search = req.query.search as string;

    const users = await findCombinedUsers({
      source,
      department,
      accountEnabled,
      search
    });

    res.json({
      success: true,
      data: users,
      message: `${users.length} Benutzer gefunden (Quelle: ${source})`
    });

  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Fehler beim Laden der Benutzer'
    });
  }
}

/**
 * GET /api/data/devices
 * Gibt Geräte aus der gewählten Datenquelle zurück
 */
export async function handleGetDevices(req: AuthenticatedRequest, res: Response) {
  try {
    logAuthEvent(req.user?.email || 'unknown', 'read', 'directory-devices', req.reqId);

    const source = (req.query.source as DataSource) || 'all';
    const operatingSystem = req.query.operatingSystem as string;
    const accountEnabled = req.query.accountEnabled === 'true' ? true : req.query.accountEnabled === 'false' ? false : undefined;
    const search = req.query.search as string;

    const devices = await findCombinedDevices({
      source,
      operatingSystem,
      accountEnabled,
      search
    });

    res.json({
      success: true,
      data: devices,
      message: `${devices.length} Geräte gefunden (Quelle: ${source})`
    });

  } catch (error) {
    console.error('Error getting devices:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Fehler beim Laden der Geräte'
    });
  }
}

/**
 * POST /api/data/users
 * Erstellt einen neuen manuellen Benutzer
 */
export async function handleCreateUser(req: AuthenticatedRequest, res: Response) {
  try {
    logAuthEvent(req.user?.email || 'unknown', 'write', 'directory-users', req.reqId);

    const userData: CreateManualUserRequest = req.body;
    const createdBy = req.user?.email;

    const newUser = createManualUser(userData, createdBy);

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'Benutzer erfolgreich erstellt'
    });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: String(error)
    });
  }
}

/**
 * POST /api/data/devices
 * Erstellt ein neues manuelles Gerät
 */
export async function handleCreateDevice(req: AuthenticatedRequest, res: Response) {
  try {
    logAuthEvent(req.user?.email || 'unknown', 'write', 'directory-devices', req.reqId);

    const deviceData: CreateManualDeviceRequest = req.body;
    const createdBy = req.user?.email;

    const newDevice = createManualDevice(deviceData, createdBy);

    res.status(201).json({
      success: true,
      data: newDevice,
      message: 'Gerät erfolgreich erstellt'
    });

  } catch (error) {
    console.error('Error creating device:', error);
    res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: String(error)
    });
  }
}

/**
 * PUT /api/data/users/:id
 * Aktualisiert einen manuellen Benutzer
 */
export async function handleUpdateUser(req: AuthenticatedRequest, res: Response) {
  try {
    logAuthEvent(req.user?.email || 'unknown', 'write', 'directory-users', req.reqId);

    const userId = req.params.id;
    const updates: Partial<CreateManualUserRequest> = req.body;
    const updatedBy = req.user?.email;

    // Prüfen ob User existiert und manuell ist
    const existingUser = getManualUserById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Manueller Benutzer nicht gefunden oder nicht editierbar'
      });
    }

    const updatedUser = updateManualUser(userId, updates, updatedBy);

    res.json({
      success: true,
      data: updatedUser,
      message: 'Benutzer erfolgreich aktualisiert'
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: String(error)
    });
  }
}

/**
 * PUT /api/data/devices/:id
 * Aktualisiert ein manuelles Gerät
 */
export async function handleUpdateDevice(req: AuthenticatedRequest, res: Response) {
  try {
    logAuthEvent(req.user?.email || 'unknown', 'write', 'directory-devices', req.reqId);

    const deviceId = req.params.id;
    const updates: Partial<CreateManualDeviceRequest> = req.body;
    const updatedBy = req.user?.email;

    // Prüfen ob Device existiert und manuell ist
    const existingDevice = getManualDeviceById(deviceId);
    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Manuelles Gerät nicht gefunden oder nicht editierbar'
      });
    }

    const updatedDevice = updateManualDevice(deviceId, updates, updatedBy);

    res.json({
      success: true,
      data: updatedDevice,
      message: 'Gerät erfolgreich aktualisiert'
    });

  } catch (error) {
    console.error('Error updating device:', error);
    res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: String(error)
    });
  }
}

/**
 * DELETE /api/data/users/:id
 * Löscht einen manuellen Benutzer
 */
export async function handleDeleteUser(req: AuthenticatedRequest, res: Response) {
  try {
    logAuthEvent(req.user?.email || 'unknown', 'delete', 'directory-users', req.reqId);

    const userId = req.params.id;
    const deleted = deleteManualUser(userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Manueller Benutzer nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Benutzer erfolgreich gelöscht'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Fehler beim Löschen des Benutzers'
    });
  }
}

/**
 * DELETE /api/data/devices/:id
 * Löscht ein manuelles Gerät
 */
export async function handleDeleteDevice(req: AuthenticatedRequest, res: Response) {
  try {
    logAuthEvent(req.user?.email || 'unknown', 'delete', 'directory-devices', req.reqId);

    const deviceId = req.params.id;
    const deleted = deleteManualDevice(deviceId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: 'Manuelles Gerät nicht gefunden'
      });
    }

    res.json({
      success: true,
      message: 'Gerät erfolgreich gelöscht'
    });

  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Fehler beim Löschen des Geräts'
    });
  }
}

/**
 * GET /api/data/stats
 * Gibt kombinierte Statistiken zurück
 */
export async function handleGetStats(req: AuthenticatedRequest, res: Response) {
  try {
    logAuthEvent(req.user?.email || 'unknown', 'read', 'directory-stats', req.reqId);

    const stats = await getCombinedStats();

    res.json({
      success: true,
      data: stats,
      message: 'Statistiken erfolgreich geladen'
    });

  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Fehler beim Laden der Statistiken'
    });
  }
}

/**
 * GET /api/data/sources
 * Gibt verfügbare Datenquellen zurück
 */
export async function handleGetSources(req: AuthenticatedRequest, res: Response) {
  try {
    logAuthEvent(req.user?.email || 'unknown', 'read', 'directory-sources', req.reqId);

    const sources = await getAvailableDataSources();

    res.json({
      success: true,
      data: sources,
      message: 'Datenquellen erfolgreich geladen'
    });

  } catch (error) {
    console.error('Error getting sources:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Fehler beim Laden der Datenquellen'
    });
  }
}

/**
 * POST /api/data/sync
 * Führt manuelle Entra ID Synchronisation durch
 */
export async function handleManualSync(req: AuthenticatedRequest, res: Response) {
  try {
    logAuthEvent(req.user?.email || 'unknown', 'write', 'directory-sync', req.reqId);

    const result = await manualSync();

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'SyncError',
        message: result.message
      });
    }

  } catch (error) {
    console.error('Error in manual sync:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Fehler bei manueller Synchronisation'
    });
  }
}

/**
 * GET /api/data/sync/status
 * Gibt Sync-Status zurück
 */
export async function handleGetSyncStatus(req: AuthenticatedRequest, res: Response) {
  try {
    logAuthEvent(req.user?.email || 'unknown', 'read', 'directory-sync-status', req.reqId);

    const status = getEntraSyncStatus();

    res.json({
      success: true,
      data: status,
      message: 'Sync-Status erfolgreich geladen'
    });

  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Fehler beim Laden des Sync-Status'
    });
  }
}
