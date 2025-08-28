// API Routes für Enhanced Permission System
// Stellt Endpoints für JSON-basierte User-Permissions bereit

import { Router } from 'express';
import { 
  authenticateWithPermissions, 
  AuthenticatedRequestWithPermissions,
  getUserPermissionsEndpoint,
  invalidateUserPermissionCache,
  getPermissionSystemStatus
} from '../services/auth-with-permissions.service';

const router = Router();

/**
 * GET /api/auth/permissions
 * Gibt User-Permissions und sichtbare Module zurück
 */
router.get('/permissions', authenticateWithPermissions, getUserPermissionsEndpoint);

/**
 * POST /api/auth/permissions/invalidate
 * Invalidiert Permission-Cache für User
 */
router.post('/permissions/invalidate', authenticateWithPermissions, invalidateUserPermissionCache);

/**
 * GET /api/auth/permissions/status
 * Debug-Endpoint: Zeigt Permission-System Status
 */
router.get('/permissions/status', (req, res) => {
  try {
    const status = getPermissionSystemStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'SystemStatusError',
      message: error.message
    });
  }
});

/**
 * GET /api/auth/permissions/debug/:userId
 * Debug-Endpoint: Zeigt Permissions für spezifischen User
 */
router.get('/permissions/debug/:userId', authenticateWithPermissions, async (req, res) => {
  try {
    const { userId } = req.params;
    const { PermissionService } = await import('../services/permission.service');
    
    const permissions = await PermissionService.getUserPermissions(userId);
    const visibleModules = PermissionService.getVisibleModules(permissions);
    
    res.json({
      success: true,
      data: {
        userId,
        permissions,
        visibleModules,
        cacheStats: PermissionService.getCacheStats()
      }
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'DebugError',
      message: error.message
    });
  }
});

export { router as permissionRoutes };
