// HR Module - Employee Data Fetching

import { 
  Employee, 
  FetchEmployeeDataRequest,
  APIResponse,
  PaginatedResponse 
} from '../types';

// Mock-Daten für Mitarbeiter
const mockEmployees: Employee[] = [
  {
    id: 'emp_001',
    firstName: 'Max',
    lastName: 'Mustermann',
    email: 'max.mustermann@company.com',
    department: 'IT',
    position: 'Senior Developer',
    startDate: new Date('2022-03-15'),
    status: 'active'
  },
  {
    id: 'emp_002',
    firstName: 'Anna',
    lastName: 'Schmidt',
    email: 'anna.schmidt@company.com',
    department: 'Sales',
    position: 'Sales Manager',
    startDate: new Date('2021-08-01'),
    status: 'active'
  },
  {
    id: 'emp_003',
    firstName: 'Thomas',
    lastName: 'Weber',
    email: 'thomas.weber@company.com',
    department: 'Marketing',
    position: 'Marketing Specialist',
    startDate: new Date('2023-01-10'),
    status: 'active'
  },
  {
    id: 'emp_004',
    firstName: 'Lisa',
    lastName: 'Müller',
    email: 'lisa.mueller@company.com',
    department: 'HR',
    position: 'HR Manager',
    startDate: new Date('2020-05-20'),
    status: 'active'
  },
  {
    id: 'emp_005',
    firstName: 'Peter',
    lastName: 'Neumann',
    email: 'peter.neumann@company.com',
    department: 'IT',
    position: 'Junior Developer',
    startDate: new Date('2023-09-01'),
    status: 'pending'
  },
  {
    id: 'emp_006',
    firstName: 'Sarah',
    lastName: 'Fischer',
    email: 'sarah.fischer@company.com',
    department: 'Sales',
    position: 'Sales Representative',
    startDate: new Date('2019-11-15'),
    status: 'inactive'
  }
];

/**
 * Lädt Mitarbeiterdaten basierend auf den Filterkriterien
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

    let filteredEmployees = [...mockEmployees];

    // Filter anwenden
    if (employeeId) {
      filteredEmployees = filteredEmployees.filter(emp => emp.id === employeeId);
    }

    if (department) {
      filteredEmployees = filteredEmployees.filter(emp => 
        emp.department.toLowerCase() === department.toLowerCase()
      );
    }

    if (status) {
      filteredEmployees = filteredEmployees.filter(emp => emp.status === status);
    }

    // Pagination anwenden
    const total = filteredEmployees.length;
    const page = Math.floor(offset / limit) + 1;
    const paginatedEmployees = filteredEmployees.slice(offset, offset + limit);

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
      message: `${paginatedEmployees.length} Mitarbeiter gefunden`
    };

  } catch (error) {
    console.error('Fehler beim Laden der Mitarbeiterdaten:', error);
    return {
      success: false,
      error: 'Interner Server-Fehler',
      message: 'Mitarbeiterdaten konnten nicht geladen werden'
    };
  }
}

/**
 * Lädt einen einzelnen Mitarbeiter anhand der ID
 */
export async function fetchEmployeeById(employeeId: string): Promise<APIResponse<Employee>> {
  try {
    const employee = mockEmployees.find(emp => emp.id === employeeId);

    if (!employee) {
      return {
        success: false,
        error: 'Mitarbeiter nicht gefunden',
        message: `Kein Mitarbeiter mit ID ${employeeId} gefunden`
      };
    }

    return {
      success: true,
      data: employee,
      message: 'Mitarbeiter erfolgreich geladen'
    };

  } catch (error) {
    console.error('Fehler beim Laden des Mitarbeiters:', error);
    return {
      success: false,
      error: 'Interner Server-Fehler',
      message: 'Mitarbeiter konnte nicht geladen werden'
    };
  }
}

/**
 * Erstellt einen neuen Mitarbeiter
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
        error: 'Validierungsfehler',
        message: validationErrors.join(', ')
      };
    }

    // Neue ID generieren
    const newId = `emp_${String(mockEmployees.length + 1).padStart(3, '0')}`;
    
    const newEmployee: Employee = {
      ...employeeData,
      id: newId
    };

    // In Mock-Daten hinzufügen (in Produktion: Datenbank)
    mockEmployees.push(newEmployee);

    return {
      success: true,
      data: newEmployee,
      message: 'Mitarbeiter erfolgreich erstellt'
    };

  } catch (error) {
    console.error('Fehler beim Erstellen des Mitarbeiters:', error);
    return {
      success: false,
      error: 'Interner Server-Fehler',
      message: 'Mitarbeiter konnte nicht erstellt werden'
    };
  }
}

/**
 * Aktualisiert einen bestehenden Mitarbeiter
 */
export async function updateEmployee(
  employeeId: string,
  updates: Partial<Omit<Employee, 'id'>>
): Promise<APIResponse<Employee>> {
  try {
    const employeeIndex = mockEmployees.findIndex(emp => emp.id === employeeId);

    if (employeeIndex === -1) {
      return {
        success: false,
        error: 'Mitarbeiter nicht gefunden',
        message: `Kein Mitarbeiter mit ID ${employeeId} gefunden`
      };
    }

    // Mitarbeiter aktualisieren
    const updatedEmployee = {
      ...mockEmployees[employeeIndex],
      ...updates
    };

    // Validierung der aktualisierten Daten
    const validationErrors = validateEmployeeData(updatedEmployee);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: 'Validierungsfehler',
        message: validationErrors.join(', ')
      };
    }

    mockEmployees[employeeIndex] = updatedEmployee;

    return {
      success: true,
      data: updatedEmployee,
      message: 'Mitarbeiter erfolgreich aktualisiert'
    };

  } catch (error) {
    console.error('Fehler beim Aktualisieren des Mitarbeiters:', error);
    return {
      success: false,
      error: 'Interner Server-Fehler',
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
 * Gibt Statistiken über Mitarbeiter zurück
 */
export async function getEmployeeStats(): Promise<APIResponse<{
  totalEmployees: number;
  byDepartment: Record<string, number>;
  byStatus: Record<string, number>;
  averageTenure: number;
}>> {
  try {
    const totalEmployees = mockEmployees.length;
    
    // Statistiken nach Abteilung
    const byDepartment = mockEmployees.reduce((acc, emp) => {
      acc[emp.department] = (acc[emp.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Statistiken nach Status
    const byStatus = mockEmployees.reduce((acc, emp) => {
      acc[emp.status] = (acc[emp.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Durchschnittliche Betriebszugehörigkeit in Monaten
    const now = new Date();
    const totalTenureMonths = mockEmployees.reduce((acc, emp) => {
      const tenureMs = now.getTime() - emp.startDate.getTime();
      const tenureMonths = tenureMs / (1000 * 60 * 60 * 24 * 30.44); // Durchschnittliche Tage pro Monat
      return acc + tenureMonths;
    }, 0);
    
    const averageTenure = totalEmployees > 0 ? totalTenureMonths / totalEmployees : 0;

    return {
      success: true,
      data: {
        totalEmployees,
        byDepartment,
        byStatus,
        averageTenure: Math.round(averageTenure * 100) / 100 // Auf 2 Dezimalstellen runden
      },
      message: 'Mitarbeiterstatistiken erfolgreich geladen'
    };

  } catch (error) {
    console.error('Fehler beim Laden der Statistiken:', error);
    return {
      success: false,
      error: 'Interner Server-Fehler',
      message: 'Statistiken konnten nicht geladen werden'
    };
  }
}
