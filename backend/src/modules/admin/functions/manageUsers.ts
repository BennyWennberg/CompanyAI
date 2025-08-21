import { 
  AdminUser, 
  CreateAdminUserRequest, 
  UpdateAdminUserRequest,
  BulkUserActionRequest,
  APIResponse,
  PaginatedResponse,
  DEFAULT_ROLE_PERMISSIONS
} from '../types';
import { getCombinedUsers, createManualUser, updateManualUser, deleteManualUser } from '../../../datasources';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';

/**
 * Lädt alle Admin-User mit Paginierung und Filtern
 */
export async function fetchAdminUsers(
  page: number = 1,
  limit: number = 10,
  role?: string,
  status?: string
): Promise<APIResponse<PaginatedResponse<AdminUser>>> {
  try {
    // Kombinierte User aus DataSources laden
    const combinedUsersResult = await getCombinedUsers();
    
    if (!combinedUsersResult.success || !combinedUsersResult.data) {
      return {
        success: false,
        error: 'DataSourceError',
        message: 'Fehler beim Laden der User-Daten'
      };
    }

    // User zu Admin-Format konvertieren
    let adminUsers: AdminUser[] = combinedUsersResult.data.map(user => ({
      id: user.id,
      firstName: user.displayName?.split(' ')[0] || user.firstName || '',
      lastName: user.displayName?.split(' ').slice(1).join(' ') || user.lastName || '',
      email: user.mail || user.userPrincipalName || user.email || '',
      role: (user as any).role || 'user',
      permissions: (user as any).permissions || DEFAULT_ROLE_PERMISSIONS.user,
      status: user.accountEnabled === false ? 'inactive' : 'active',
      lastLogin: (user as any).lastLogin,
      createdAt: user.createdDateTime || new Date(),
      updatedAt: new Date(),
      createdBy: user.createdBy || 'system'
    }));

    // Filter anwenden
    if (role) {
      adminUsers = adminUsers.filter(user => user.role === role);
    }
    if (status) {
      adminUsers = adminUsers.filter(user => user.status === status);
    }

    // Paginierung
    const total = adminUsers.length;
    const offset = (page - 1) * limit;
    const paginatedUsers = adminUsers.slice(offset, offset + limit);

    return {
      success: true,
      data: {
        data: paginatedUsers,
        pagination: {
          total,
          page,
          limit,
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      },
      message: `${paginatedUsers.length} Admin-User erfolgreich geladen`
    };

  } catch (error) {
    console.error('Fehler beim Laden der Admin-User:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Admin-User konnten nicht geladen werden'
    };
  }
}

/**
 * Lädt einen einzelnen Admin-User by ID
 */
export async function fetchAdminUserById(userId: string): Promise<APIResponse<AdminUser>> {
  try {
    const usersResult = await fetchAdminUsers(1, 1000);
    
    if (!usersResult.success || !usersResult.data) {
      return {
        success: false,
        error: 'DataSourceError',
        message: 'Fehler beim Laden der User-Daten'
      };
    }

    const user = usersResult.data.data.find(u => u.id === userId);
    
    if (!user) {
      return {
        success: false,
        error: 'NotFound',
        message: 'Admin-User nicht gefunden'
      };
    }

    return {
      success: true,
      data: user,
      message: 'Admin-User erfolgreich geladen'
    };

  } catch (error) {
    console.error('Fehler beim Laden des Admin-Users:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Admin-User konnte nicht geladen werden'
    };
  }
}

/**
 * Erstellt einen neuen Admin-User
 */
export async function createAdminUser(
  request: CreateAdminUserRequest,
  createdBy: string
): Promise<APIResponse<AdminUser>> {
  try {
    // Validierung
    const validationErrors = validateCreateUserRequest(request);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: 'ValidationError',
        message: validationErrors.join(', ')
      };
    }

    // Passwort hashen (falls bereitgestellt)
    let hashedPassword: string | undefined;
    if (request.initialPassword) {
      hashedPassword = await bcrypt.hash(request.initialPassword, 10);
    }

    // Standardberechtigungen für die Rolle setzen
    const defaultPermissions = DEFAULT_ROLE_PERMISSIONS[request.role] || DEFAULT_ROLE_PERMISSIONS.user;

    // User in manueller DataSource erstellen
    const newUser = {
      id: randomUUID(),
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email,
      displayName: `${request.firstName} ${request.lastName}`,
      role: request.role,
      permissions: request.permissions || defaultPermissions,
      password: hashedPassword,
      accountEnabled: true,
      createdBy,
      createdDateTime: new Date(),
      userType: 'manual' as const
    };

    const createResult = await createManualUser(newUser);
    
    if (!createResult.success) {
      return {
        success: false,
        error: 'CreateError',
        message: createResult.message || 'Fehler beim Erstellen des Admin-Users'
      };
    }

    // Admin-User-Format zurückgeben
    const adminUser: AdminUser = {
      id: newUser.id,
      firstName: request.firstName,
      lastName: request.lastName,
      email: request.email,
      role: request.role,
      permissions: defaultPermissions,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy
    };

    return {
      success: true,
      data: adminUser,
      message: 'Admin-User erfolgreich erstellt'
    };

  } catch (error) {
    console.error('Fehler beim Erstellen des Admin-Users:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Admin-User konnte nicht erstellt werden'
    };
  }
}

/**
 * Aktualisiert einen bestehenden Admin-User
 */
export async function updateAdminUser(
  userId: string,
  updates: UpdateAdminUserRequest,
  updatedBy: string
): Promise<APIResponse<AdminUser>> {
  try {
    // Existierenden User laden
    const existingUserResult = await fetchAdminUserById(userId);
    if (!existingUserResult.success || !existingUserResult.data) {
      return {
        success: false,
        error: 'NotFound',
        message: 'Admin-User nicht gefunden'
      };
    }

    // Berechtigungen aktualisieren wenn Rolle geändert wird
    let updatedPermissions = existingUserResult.data.permissions;
    if (updates.role && updates.role !== existingUserResult.data.role) {
      updatedPermissions = DEFAULT_ROLE_PERMISSIONS[updates.role] || DEFAULT_ROLE_PERMISSIONS.user;
    }
    if (updates.permissions) {
      updatedPermissions = updates.permissions as any;
    }

    // Update-Daten vorbereiten
    const updateData = {
      firstName: updates.firstName || existingUserResult.data.firstName,
      lastName: updates.lastName || existingUserResult.data.lastName,
      email: updates.email || existingUserResult.data.email,
      displayName: `${updates.firstName || existingUserResult.data.firstName} ${updates.lastName || existingUserResult.data.lastName}`,
      role: updates.role || existingUserResult.data.role,
      permissions: updatedPermissions,
      accountEnabled: updates.status !== 'inactive',
      updatedBy,
      updatedDateTime: new Date()
    };

    // User in manueller DataSource aktualisieren
    const updateResult = await updateManualUser(userId, updateData);
    
    if (!updateResult.success) {
      return {
        success: false,
        error: 'UpdateError',
        message: updateResult.message || 'Fehler beim Aktualisieren des Admin-Users'
      };
    }

    // Aktualisierter Admin-User
    const adminUser: AdminUser = {
      ...existingUserResult.data,
      firstName: updateData.firstName,
      lastName: updateData.lastName,
      email: updateData.email,
      role: updateData.role as any,
      permissions: updatedPermissions,
      status: updates.status || existingUserResult.data.status,
      updatedAt: new Date()
    };

    return {
      success: true,
      data: adminUser,
      message: 'Admin-User erfolgreich aktualisiert'
    };

  } catch (error) {
    console.error('Fehler beim Aktualisieren des Admin-Users:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Admin-User konnte nicht aktualisiert werden'
    };
  }
}

/**
 * Löscht einen Admin-User
 */
export async function deleteAdminUser(
  userId: string,
  deletedBy: string
): Promise<APIResponse<boolean>> {
  try {
    // Existierenden User prüfen
    const existingUserResult = await fetchAdminUserById(userId);
    if (!existingUserResult.success) {
      return {
        success: false,
        error: 'NotFound',
        message: 'Admin-User nicht gefunden'
      };
    }

    // User aus manueller DataSource löschen
    const deleteResult = await deleteManualUser(userId);
    
    if (!deleteResult.success) {
      return {
        success: false,
        error: 'DeleteError',
        message: deleteResult.message || 'Fehler beim Löschen des Admin-Users'
      };
    }

    return {
      success: true,
      data: true,
      message: 'Admin-User erfolgreich gelöscht'
    };

  } catch (error) {
    console.error('Fehler beim Löschen des Admin-Users:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Admin-User konnte nicht gelöscht werden'
    };
  }
}

/**
 * Bulk-Aktionen für mehrere User
 */
export async function bulkUserAction(
  request: BulkUserActionRequest,
  actionBy: string
): Promise<APIResponse<{ processed: number; failed: string[] }>> {
  try {
    const results = {
      processed: 0,
      failed: [] as string[]
    };

    for (const userId of request.userIds) {
      try {
        switch (request.action) {
          case 'activate':
            await updateAdminUser(userId, { status: 'active' }, actionBy);
            break;
          case 'deactivate':
            await updateAdminUser(userId, { status: 'inactive' }, actionBy);
            break;
          case 'suspend':
            await updateAdminUser(userId, { status: 'suspended' }, actionBy);
            break;
          case 'delete':
            await deleteAdminUser(userId, actionBy);
            break;
        }
        results.processed++;
      } catch (error) {
        results.failed.push(userId);
      }
    }

    return {
      success: true,
      data: results,
      message: `Bulk-Aktion abgeschlossen: ${results.processed} erfolgreich, ${results.failed.length} fehlgeschlagen`
    };

  } catch (error) {
    console.error('Fehler bei Bulk-User-Aktion:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Bulk-Aktion konnte nicht ausgeführt werden'
    };
  }
}

/**
 * Validiert CreateAdminUserRequest
 */
function validateCreateUserRequest(request: CreateAdminUserRequest): string[] {
  const errors: string[] = [];

  if (!request.firstName?.trim()) {
    errors.push('Vorname ist erforderlich');
  }

  if (!request.lastName?.trim()) {
    errors.push('Nachname ist erforderlich');
  }

  if (!request.email?.trim()) {
    errors.push('E-Mail ist erforderlich');
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) {
    errors.push('Ungültige E-Mail-Adresse');
  }

  if (!request.role) {
    errors.push('Rolle ist erforderlich');
  }

  return errors;
}
