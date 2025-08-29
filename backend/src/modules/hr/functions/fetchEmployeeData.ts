// HR Module - Employee Data Fetching (DataSources Integration)
// Nutzt die Combined DataSources (Entra + Manual) statt eigene Mock-Daten

import { 
  Employee, 
  FetchEmployeeDataRequest,
  APIResponse,
  PaginatedResponse 
} from '../types';

// Import Combined DataSources
import { 
  getCombinedUsers, 
  findCombinedUsers, 
  getCombinedStats,
  createManualUser,
  updateManualUser,
  deleteManualUser,
  CombinedUser,
  DataSource 
} from '../../../datasources';

/**
 * Konvertiert CombinedUser zu Employee Format
 */
function convertToEmployee(user: CombinedUser): Employee {
  const nameParts = user.displayName?.split(' ') || ['', ''];
  const firstName = nameParts[0] || user.givenName || '';
  const lastName = nameParts.slice(1).join(' ') || user.surname || '';
  
  return {
    id: user.id,
    firstName,
    lastName,
    email: user.mail || user.userPrincipalName || '',
    department: user.department || '',
    position: user.jobTitle || '',
    startDate: user.createdDateTime ? new Date(user.createdDateTime) : new Date(),
    status: user.accountEnabled === true ? 'active' : user.accountEnabled === false ? 'inactive' : 'pending'
  };
}

/**
 * Lädt Mitarbeiterdaten basierend auf den Filterkriterien (aus DataSources)
 */
export async function fetchEmployeeData(
  request: FetchEmployeeDataRequest
): Promise<APIResponse<PaginatedResponse<Employee>>> {
  try {
    const { 
      employeeId, 
      department, 
      status, 
      limit = 10, 
      offset = 0 
    } = request;

    // Nutze Combined DataSources statt Mock-Daten
    console.log(`🔍 HR fetchEmployeeData: Loading users with filter - department: ${department}, status: ${status}, limit: ${limit}, offset: ${offset}`);
    
    let filteredUsers = await findCombinedUsers({
      source: 'all',
      department,
      accountEnabled: status === 'active' ? true : status === 'inactive' ? false : undefined
    });
    
    console.log(`📊 HR fetchEmployeeData: Found ${filteredUsers.length} users from DataSources`);
    if (filteredUsers.length > 0) {
      console.log(`👤 HR fetchEmployeeData: First user sample: ${filteredUsers[0].displayName} (${filteredUsers[0].source})`);
      
      // Debug: Zeige Quellen-Verteilung
      const sourceStats = filteredUsers.reduce((acc: Record<string, number>, user) => {
        acc[user.source] = (acc[user.source] || 0) + 1;
        return acc;
      }, {});
      console.log(`📈 HR fetchEmployeeData: Source distribution:`, sourceStats);
      
      // Debug: Zeige Department-Verteilung (nur die ersten 5)
      const deptStats = filteredUsers.reduce((acc: Record<string, number>, user) => {
        const dept = user.department || 'Unbekannt';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {});
      const topDepts = Object.entries(deptStats).slice(0, 5).map(([dept, count]) => `${dept}(${count})`);
      console.log(`🏢 HR fetchEmployeeData: Top departments: ${topDepts.join(', ')}`);
    } else {
      console.log(`⚠️  HR fetchEmployeeData: No users found in DataSources - checking sources individually...`);
      
      // Debug: Prüfe einzelne Quellen
      const entraUsers = await findCombinedUsers({ source: 'entra' });
      const manualUsers = await findCombinedUsers({ source: 'manual' });
      const ldapUsers = await findCombinedUsers({ source: 'ldap' });
      const uploadUsers = await findCombinedUsers({ source: 'upload' });
      console.log(`   📋 Source breakdown: Entra(${entraUsers.length}), Manual(${manualUsers.length}), LDAP(${ldapUsers.length}), Upload(${uploadUsers.length})`);
    }

    // Filter nach employeeId
    if (employeeId) {
      filteredUsers = filteredUsers.filter((user: CombinedUser) => user.id === employeeId);
      console.log(`🔍 HR fetchEmployeeData: Filtered by employeeId ${employeeId}: ${filteredUsers.length} users`);
    }

    // Konvertiere zu Employee Format aber behalte CombinedUser Felder
    const employees = filteredUsers.map(user => ({
      id: user.id,
      firstName: user.givenName || user.displayName.split(' ')[0] || '',
      lastName: user.surname || user.displayName.split(' ').slice(1).join(' ') || '',
      email: user.mail || user.userPrincipalName || '',
      department: user.department || '',
      position: user.jobTitle || '',
      startDate: user.createdDateTime || new Date().toISOString(),
      status: user.accountEnabled === true ? 'active' : user.accountEnabled === false ? 'inactive' : 'pending' as const,
      // Behalte CombinedUser Felder für Frontend-Kompatibilität
      displayName: user.displayName,
      userPrincipalName: user.userPrincipalName,
      mail: user.mail,
      jobTitle: user.jobTitle,
      accountEnabled: user.accountEnabled,
      source: user.source,
      createdDateTime: user.createdDateTime,
      givenName: user.givenName,
      surname: user.surname,
      officeLocation: user.officeLocation,
      mobilePhone: user.mobilePhone,
      businessPhones: user.businessPhones,
      companyName: user.companyName,
      employeeId: user.employeeId,
      costCenter: user.costCenter,
      division: user.division,
      manager: user.manager
    }));
    console.log(`✅ HR fetchEmployeeData: Converted ${employees.length} users to hybrid Employee+CombinedUser format`);

    // Pagination anwenden
    const total = employees.length;
    const page = Math.floor(offset / limit) + 1;
    const paginatedEmployees = employees.slice(offset, offset + limit);

    const response: PaginatedResponse<Employee> = {
      data: paginatedEmployees,
      pagination: {
        total,
        page,
        limit,
        hasNext: offset + limit < total,
        hasPrev: offset > 0
      }
    };

    return {
      success: true,
      data: response,
      message: `${paginatedEmployees.length} Mitarbeiter gefunden (aus DataSources)`
    };

  } catch (error) {
    console.error('Fehler beim Laden der Mitarbeiterdaten:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Mitarbeiterdaten konnten nicht geladen werden'
    };
  }
}

/**
 * Lädt einen einzelnen Mitarbeiter anhand der ID (aus DataSources)
 */
export async function fetchEmployeeById(employeeId: string): Promise<APIResponse<Employee>> {
  try {
    const users = await getCombinedUsers('all');
    const user = users.find((u: CombinedUser) => u.id === employeeId);

    if (!user) {
      return {
        success: false,
        error: 'NotFound',
        message: `Kein Mitarbeiter mit ID ${employeeId} gefunden`
      };
    }

    const employee = convertToEmployee(user);

    return {
      success: true,
      data: employee,
      message: 'Mitarbeiter erfolgreich geladen'
    };

  } catch (error) {
    console.error('Fehler beim Laden des Mitarbeiters:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Mitarbeiter konnte nicht geladen werden'
    };
  }
}

/**
 * Erstellt einen neuen Mitarbeiter (in manueller DataSource)
 */
export async function createEmployee(
  employeeData: Omit<Employee, 'id'>
): Promise<APIResponse<Employee>> {
  try {
    // Validierung
    const validationErrors = validateEmployeeData(employeeData);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: 'ValidationError',
        message: validationErrors.join(', ')
      };
    }

    // Konvertiere Employee zu CreateManualUserRequest
    const userData = {
      displayName: `${employeeData.firstName} ${employeeData.lastName}`,
      mail: employeeData.email,
      userPrincipalName: employeeData.email,
      department: employeeData.department,
      jobTitle: employeeData.position,
      accountEnabled: employeeData.status === 'active'
    };

    // Erstelle in manueller DataSource
    const newUser = createManualUser(userData, 'hr-module');
    const newEmployee = convertToEmployee(newUser);

    return {
      success: true,
      data: newEmployee,
      message: 'Mitarbeiter erfolgreich erstellt (in manueller DataSource)'
    };

  } catch (error) {
    console.error('Fehler beim Erstellen des Mitarbeiters:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Mitarbeiter konnte nicht erstellt werden'
    };
  }
}

/**
 * Aktualisiert einen bestehenden Mitarbeiter (nur manuelle DataSource)
 */
export async function updateEmployee(
  employeeId: string,
  updates: Partial<Omit<Employee, 'id'>>
): Promise<APIResponse<Employee>> {
  try {
    // Konvertiere Employee Updates zu ManualUser Updates
    const userUpdates: any = {};
    
    if (updates.firstName || updates.lastName) {
      const firstName = updates.firstName || '';
      const lastName = updates.lastName || '';
      userUpdates.displayName = `${firstName} ${lastName}`.trim();
    }
    
    if (updates.email) {
      userUpdates.mail = updates.email;
      userUpdates.userPrincipalName = updates.email;
    }
    
    if (updates.department) {
      userUpdates.department = updates.department;
    }
    
    if (updates.position) {
      userUpdates.jobTitle = updates.position;
    }
    
    if (updates.status) {
      userUpdates.accountEnabled = updates.status === 'active';
    }

    // Aktualisiere in manueller DataSource
    const updatedUser = updateManualUser(employeeId, userUpdates, 'hr-module');
    const updatedEmployee = convertToEmployee(updatedUser);

    return {
      success: true,
      data: updatedEmployee,
      message: 'Mitarbeiter erfolgreich aktualisiert'
    };

  } catch (error) {
    console.error('Fehler beim Aktualisieren des Mitarbeiters:', error);
    
    if (error instanceof Error && error.message.includes('nicht gefunden')) {
      return {
        success: false,
        error: 'NotFound',
        message: `Kein manueller Mitarbeiter mit ID ${employeeId} gefunden`
      };
    }
    
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Mitarbeiter konnte nicht aktualisiert werden'
    };
  }
}

/**
 * Validiert Mitarbeiterdaten
 */
function validateEmployeeData(employee: Omit<Employee, 'id'>): string[] {
  const errors: string[] = [];

  if (!employee.firstName || employee.firstName.trim().length === 0) {
    errors.push('Vorname ist erforderlich');
  }

  if (!employee.lastName || employee.lastName.trim().length === 0) {
    errors.push('Nachname ist erforderlich');
  }

  if (!employee.email || employee.email.trim().length === 0) {
    errors.push('E-Mail ist erforderlich');
  } else if (!isValidEmail(employee.email)) {
    errors.push('Ungültige E-Mail-Adresse');
  }

  if (!employee.department || employee.department.trim().length === 0) {
    errors.push('Abteilung ist erforderlich');
  }

  if (!employee.position || employee.position.trim().length === 0) {
    errors.push('Position ist erforderlich');
  }

  if (!employee.startDate) {
    errors.push('Startdatum ist erforderlich');
  }

  if (!['active', 'inactive', 'pending'].includes(employee.status)) {
    errors.push('Ungültiger Status');
  }

  return errors;
}

/**
 * Hilfsfunktion zur E-Mail-Validierung
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Gibt Statistiken über Mitarbeiter zurück (aus Combined DataSources)
 */
export async function getEmployeeStats(): Promise<APIResponse<{
  totalEmployees: number;
  byDepartment: Record<string, number>;
  byStatus: Record<string, number>;
  averageTenure: number;
}>> {
  try {
    // Nutze Combined DataSources Stats
    const combinedStats = await getCombinedStats();
    const allUsers = await getCombinedUsers('all');
    
    // Konvertiere zu Employee-kompatiblen Statistiken
    const totalEmployees = allUsers.length;
    
    // Statistiken nach Abteilung (ohne "Unbekannt"/"Unknown")
    const byDepartment = allUsers.reduce((acc: Record<string, number>, user: CombinedUser) => {
      const deptRaw = (user.department || '').trim();
      if (!deptRaw) return acc;
      const deptLower = deptRaw.toLowerCase();
      if (deptLower === 'unbekannt' || deptLower === 'unknown') return acc;
      acc[deptRaw] = (acc[deptRaw] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Statistiken nach Status (basierend auf accountEnabled)
    const byStatus = allUsers.reduce((acc: Record<string, number>, user: CombinedUser) => {
      const status = user.accountEnabled === true ? 'active' : 
                    user.accountEnabled === false ? 'inactive' : 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Placeholder für durchschnittliche Betriebszugehörigkeit
    const averageTenure = 12; // Monate - könnte aus createdAt berechnet werden

    return {
      success: true,
      data: {
        totalEmployees,
        byDepartment,
        byStatus,
        averageTenure
      },
      message: 'Mitarbeiterstatistiken erfolgreich geladen (aus DataSources)'
    };

  } catch (error) {
    console.error('Fehler beim Laden der Statistiken:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Statistiken konnten nicht geladen werden'
    };
  }
}