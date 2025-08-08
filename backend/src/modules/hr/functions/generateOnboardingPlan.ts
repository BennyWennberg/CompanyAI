// HR Module - Onboarding Plan Generation

import { 
  OnboardingPlan, 
  OnboardingTask, 
  Employee, 
  CreateOnboardingPlanRequest,
  APIResponse 
} from '../types';

/**
 * Standardaufgaben für verschiedene Abteilungen
 */
const DEPARTMENT_TEMPLATES: Record<string, Partial<OnboardingTask>[]> = {
  'IT': [
    {
      title: 'Laptop und Zugangsdaten einrichten',
      description: 'Hardware bereitstellen und IT-Accounts erstellen',
      category: 'equipment',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // 1 Tag
    },
    {
      title: 'Entwicklungsumgebung einrichten',
      description: 'IDE, Git-Zugang und Entwicklungstools konfigurieren',
      category: 'equipment',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 Tage
    },
    {
      title: 'Code-Review-Prozess Training',
      description: 'Einführung in die Entwicklungsprozesse und Standards',
      category: 'training',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 Tage
    }
  ],
  'Sales': [
    {
      title: 'CRM-System Schulung',
      description: 'Einführung in das Customer Relationship Management System',
      category: 'training',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 Tage
    },
    {
      title: 'Produktschulung',
      description: 'Detaillierte Einführung in das Produktportfolio',
      category: 'training',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 Tage
    },
    {
      title: 'Verkaufstechniken Workshop',
      description: 'Training zu Verkaufsstrategien und Kundenbetreuung',
      category: 'training',
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 Tage
    }
  ],
  'Marketing': [
    {
      title: 'Brand Guidelines Einführung',
      description: 'Einführung in Corporate Design und Markenrichtlinien',
      category: 'documentation',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 Tage
    },
    {
      title: 'Marketing-Tools Setup',
      description: 'Zugang zu Marketing-Software und Analytics-Tools',
      category: 'equipment',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 Tage
    }
  ],
  'default': [
    {
      title: 'Willkommenspaket bereitstellen',
      description: 'Arbeitsplatz vorbereiten und Willkommensmaterialien bereitstellen',
      category: 'equipment',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // 1 Tag
    },
    {
      title: 'Unternehmenseinführung',
      description: 'Präsentation der Unternehmensgeschichte, Werte und Ziele',
      category: 'meeting',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) // 1 Tag
    },
    {
      title: 'Arbeitsschutz-Belehrung',
      description: 'Sicherheitsrichtlinien und Notfallprozeduren erklären',
      category: 'documentation',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 Tage
    },
    {
      title: 'Team-Vorstellung',
      description: 'Treffen mit direkten Kollegen und wichtigen Ansprechpartnern',
      category: 'meeting',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 Tage
    }
  ]
};

/**
 * Generiert einen eindeutigen Task-ID
 */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generiert einen Onboarding-Plan für einen neuen Mitarbeiter
 */
export async function generateOnboardingPlan(
  request: CreateOnboardingPlanRequest
): Promise<APIResponse<OnboardingPlan>> {
  try {
    const { employeeId, department, position, customTasks = [] } = request;

    // Template-Aufgaben basierend auf Abteilung abrufen
    const departmentTasks = DEPARTMENT_TEMPLATES[department] || DEPARTMENT_TEMPLATES['default'];
    
    // Standard-Tasks erstellen
    const standardTasks: OnboardingTask[] = departmentTasks.map(template => ({
      id: generateTaskId(),
      title: template.title || '',
      description: template.description || '',
      category: template.category || 'documentation',
      dueDate: template.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      completed: false,
      assignedTo: undefined
    }));

    // Custom Tasks hinzufügen
    const additionalTasks: OnboardingTask[] = customTasks.map(custom => ({
      id: generateTaskId(),
      title: custom.title || 'Benutzerdefinierte Aufgabe',
      description: custom.description || '',
      category: custom.category || 'documentation',
      dueDate: custom.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      completed: custom.completed || false,
      assignedTo: custom.assignedTo
    }));

    // Alle Tasks kombinieren
    const allTasks = [...standardTasks, ...additionalTasks];

    // Geschätzte Dauer berechnen (basierend auf Anzahl der Tasks)
    const estimatedDuration = Math.max(7, allTasks.length * 2); // Minimum 7 Tage

    // Onboarding Plan erstellen
    const onboardingPlan: OnboardingPlan = {
      employeeId,
      tasks: allTasks,
      estimatedDuration,
      assignedTo: 'hr@company.com', // Default HR Verantwortlicher
      status: 'draft',
      createdAt: new Date()
    };

    return {
      success: true,
      data: onboardingPlan,
      message: `Onboarding-Plan für ${department} erfolgreich erstellt`
    };

  } catch (error) {
    console.error('Fehler beim Generieren des Onboarding-Plans:', error);
    return {
      success: false,
      error: 'Interner Server-Fehler',
      message: 'Onboarding-Plan konnte nicht erstellt werden'
    };
  }
}

/**
 * Aktualisiert den Status einer Onboarding-Aufgabe
 */
export async function updateOnboardingTask(
  planId: string,
  taskId: string,
  updates: Partial<OnboardingTask>
): Promise<APIResponse<OnboardingTask>> {
  try {
    // Mock-Implementierung - in der Produktion würde hier die Datenbank aktualisiert
    console.log(`Updating task ${taskId} in plan ${planId}:`, updates);
    
    // Simuliere erfolgreiches Update
    const updatedTask: OnboardingTask = {
      id: taskId,
      title: updates.title || 'Updated Task',
      description: updates.description || 'Task wurde aktualisiert',
      category: updates.category || 'documentation',
      dueDate: updates.dueDate || new Date(),
      completed: updates.completed || false,
      assignedTo: updates.assignedTo
    };

    return {
      success: true,
      data: updatedTask,
      message: 'Aufgabe erfolgreich aktualisiert'
    };

  } catch (error) {
    console.error('Fehler beim Aktualisieren der Aufgabe:', error);
    return {
      success: false,
      error: 'Interner Server-Fehler',
      message: 'Aufgabe konnte nicht aktualisiert werden'
    };
  }
}

/**
 * Hilfsfunktion zur Validierung von Onboarding-Requests
 */
export function validateOnboardingRequest(request: CreateOnboardingPlanRequest): string[] {
  const errors: string[] = [];

  if (!request.employeeId || request.employeeId.trim().length === 0) {
    errors.push('Employee ID ist erforderlich');
  }

  if (!request.department || request.department.trim().length === 0) {
    errors.push('Abteilung ist erforderlich');
  }

  if (!request.position || request.position.trim().length === 0) {
    errors.push('Position ist erforderlich');
  }

  // Validiere Custom Tasks falls vorhanden
  if (request.customTasks) {
    request.customTasks.forEach((task, index) => {
      if (task.title && task.title.trim().length === 0) {
        errors.push(`Custom Task ${index + 1}: Titel darf nicht leer sein`);
      }
    });
  }

  return errors;
}
