// HR Module - HR Report Generation

import { 
  HRReport, 
  CreateHRReportRequest,
  APIResponse,
  Employee 
} from '../types';

// Import employee data function to get current data
import { fetchEmployeeData } from './fetchEmployeeData';

/**
 * Erstellt einen HR-Report basierend auf den angegebenen Kriterien
 */
export async function createHRReport(
  request: CreateHRReportRequest,
  generatedBy: string = 'system'
): Promise<APIResponse<HRReport>> {
  try {
    const { type, title, dateRange, includeMetrics = [] } = request;

    // Validierung
    const validationErrors = validateReportRequest(request);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: 'Validierungsfehler',
        message: validationErrors.join(', ')
      };
    }

    // Datumsbereiche parsen
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);

    // Mitarbeiterdaten für den Report abrufen
    const employeeDataResponse = await fetchEmployeeData({});
    
    if (!employeeDataResponse.success || !employeeDataResponse.data) {
      return {
        success: false,
        error: 'Daten nicht verfügbar',
        message: 'Mitarbeiterdaten konnten nicht abgerufen werden'
      };
    }

    const allEmployees = employeeDataResponse.data.data;

    // Metriken berechnen
    const metrics = calculateReportMetrics(allEmployees, startDate, endDate);

    // Report-Titel generieren falls nicht angegeben
    const reportTitle = title || generateReportTitle(type, startDate, endDate);

    // Report ID generieren
    const reportId = `hr_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const report: HRReport = {
      id: reportId,
      type,
      title: reportTitle,
      dateRange: {
        start: startDate,
        end: endDate
      },
      metrics,
      generatedAt: new Date(),
      generatedBy
    };

    return {
      success: true,
      data: report,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} HR-Report erfolgreich erstellt`
    };

  } catch (error) {
    console.error('Fehler beim Erstellen des HR-Reports:', error);
    return {
      success: false,
      error: 'Interner Server-Fehler',
      message: 'HR-Report konnte nicht erstellt werden'
    };
  }
}

/**
 * Berechnet Metriken für den HR-Report
 */
function calculateReportMetrics(
  employees: Employee[], 
  startDate: Date, 
  endDate: Date
): HRReport['metrics'] {
  const totalEmployees = employees.length;

  // Neue Mitarbeiter im Zeitraum
  const newHires = employees.filter(emp => {
    const empStartDate = new Date(emp.startDate);
    return empStartDate >= startDate && empStartDate <= endDate;
  }).length;

  // Abgänge im Zeitraum (simuliert basierend auf Status)
  // In einer echten Anwendung würde man hier historische Daten verwenden
  const departures = employees.filter(emp => emp.status === 'inactive').length;

  // Durchschnittliche Onboarding-Zeit (simuliert)
  // In einer echten Anwendung würde man tatsächliche Onboarding-Daten verwenden
  const averageOnboardingTime = calculateAverageOnboardingTime(employees);

  return {
    totalEmployees,
    newHires,
    departures,
    averageOnboardingTime
  };
}

/**
 * Berechnet die durchschnittliche Onboarding-Zeit
 */
function calculateAverageOnboardingTime(employees: Employee[]): number {
  // Simulierte Berechnung basierend auf Abteilung
  const onboardingTimes: Record<string, number> = {
    'IT': 14,
    'Sales': 10,
    'Marketing': 8,
    'HR': 7,
    'default': 10
  };

  if (employees.length === 0) return 0;

  const totalTime = employees.reduce((acc, emp) => {
    const deptTime = onboardingTimes[emp.department] || onboardingTimes['default'];
    return acc + deptTime;
  }, 0);

  return Math.round((totalTime / employees.length) * 100) / 100;
}

/**
 * Generiert einen automatischen Report-Titel
 */
function generateReportTitle(
  type: HRReport['type'], 
  startDate: Date, 
  endDate: Date
): string {
  const startStr = startDate.toLocaleDateString('de-DE');
  const endStr = endDate.toLocaleDateString('de-DE');

  const typeLabels = {
    'monthly': 'Monatlicher',
    'quarterly': 'Quartalsweise',
    'annual': 'Jährlicher',
    'custom': 'Benutzerdefinierter'
  };

  return `${typeLabels[type]} HR-Report (${startStr} - ${endStr})`;
}

/**
 * Validiert Report-Request-Parameter
 */
function validateReportRequest(request: CreateHRReportRequest): string[] {
  const errors: string[] = [];

  if (!request.type) {
    errors.push('Report-Typ ist erforderlich');
  } else if (!['monthly', 'quarterly', 'annual', 'custom'].includes(request.type)) {
    errors.push('Ungültiger Report-Typ');
  }

  if (!request.dateRange) {
    errors.push('Datumsbereich ist erforderlich');
  } else {
    if (!request.dateRange.start) {
      errors.push('Start-Datum ist erforderlich');
    } else if (isNaN(Date.parse(request.dateRange.start))) {
      errors.push('Ungültiges Start-Datum');
    }

    if (!request.dateRange.end) {
      errors.push('End-Datum ist erforderlich');
    } else if (isNaN(Date.parse(request.dateRange.end))) {
      errors.push('Ungültiges End-Datum');
    }

    // Prüfe ob Start vor End liegt
    if (request.dateRange.start && request.dateRange.end) {
      const start = new Date(request.dateRange.start);
      const end = new Date(request.dateRange.end);
      if (start >= end) {
        errors.push('Start-Datum muss vor End-Datum liegen');
      }
    }
  }

  return errors;
}

/**
 * Erstellt einen detaillierten Report mit zusätzlichen Analysen
 */
export async function createDetailedHRReport(
  request: CreateHRReportRequest,
  generatedBy: string = 'system'
): Promise<APIResponse<HRReport & { additionalAnalytics: any }>> {
  try {
    // Basis-Report erstellen
    const baseReportResponse = await createHRReport(request, generatedBy);
    
    if (!baseReportResponse.success || !baseReportResponse.data) {
      return baseReportResponse as any;
    }

    const baseReport = baseReportResponse.data;

    // Zusätzliche Analysen
    const employeeDataResponse = await fetchEmployeeData({});
    const allEmployees = employeeDataResponse.data?.data || [];

    const additionalAnalytics = {
      departmentBreakdown: calculateDepartmentBreakdown(allEmployees),
      statusDistribution: calculateStatusDistribution(allEmployees),
      tenureAnalysis: calculateTenureAnalysis(allEmployees),
      growthTrends: calculateGrowthTrends(allEmployees, new Date(request.dateRange.start), new Date(request.dateRange.end))
    };

    const detailedReport = {
      ...baseReport,
      additionalAnalytics
    };

    return {
      success: true,
      data: detailedReport,
      message: 'Detaillierter HR-Report erfolgreich erstellt'
    };

  } catch (error) {
    console.error('Fehler beim Erstellen des detaillierten HR-Reports:', error);
    return {
      success: false,
      error: 'Interner Server-Fehler',
      message: 'Detaillierter HR-Report konnte nicht erstellt werden'
    };
  }
}

/**
 * Berechnet Abteilungsaufschlüsselung
 */
function calculateDepartmentBreakdown(employees: Employee[]) {
  const breakdown = employees.reduce((acc, emp) => {
    acc[emp.department] = (acc[emp.department] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(breakdown).map(([department, count]) => ({
    department,
    count,
    percentage: Math.round((count / employees.length) * 100 * 100) / 100
  }));
}

/**
 * Berechnet Status-Verteilung
 */
function calculateStatusDistribution(employees: Employee[]) {
  const distribution = employees.reduce((acc, emp) => {
    acc[emp.status] = (acc[emp.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(distribution).map(([status, count]) => ({
    status,
    count,
    percentage: Math.round((count / employees.length) * 100 * 100) / 100
  }));
}

/**
 * Berechnet Betriebszugehörigkeits-Analyse
 */
function calculateTenureAnalysis(employees: Employee[]) {
  const now = new Date();
  const tenures = employees.map(emp => {
    const tenureMs = now.getTime() - new Date(emp.startDate).getTime();
    return tenureMs / (1000 * 60 * 60 * 24 * 365.25); // Jahre
  });

  const sortedTenures = tenures.sort((a, b) => a - b);
  const totalTenure = tenures.reduce((acc, tenure) => acc + tenure, 0);

  return {
    averageTenure: Math.round((totalTenure / tenures.length) * 100) / 100,
    medianTenure: sortedTenures.length > 0 ? 
      Math.round(sortedTenures[Math.floor(sortedTenures.length / 2)] * 100) / 100 : 0,
    minTenure: sortedTenures.length > 0 ? Math.round(sortedTenures[0] * 100) / 100 : 0,
    maxTenure: sortedTenures.length > 0 ? 
      Math.round(sortedTenures[sortedTenures.length - 1] * 100) / 100 : 0
  };
}

/**
 * Berechnet Wachstumstrends
 */
function calculateGrowthTrends(employees: Employee[], startDate: Date, endDate: Date) {
  const hiresByMonth: Record<string, number> = {};
  
  employees.forEach(emp => {
    const empStartDate = new Date(emp.startDate);
    if (empStartDate >= startDate && empStartDate <= endDate) {
      const monthKey = `${empStartDate.getFullYear()}-${String(empStartDate.getMonth() + 1).padStart(2, '0')}`;
      hiresByMonth[monthKey] = (hiresByMonth[monthKey] || 0) + 1;
    }
  });

  return Object.entries(hiresByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, hires]) => ({ month, hires }));
}
