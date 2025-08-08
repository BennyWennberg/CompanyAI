// HR Module - Typdefinitionen und Schnittstellen

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  startDate: Date;
  status: 'active' | 'inactive' | 'pending';
}

export interface OnboardingPlan {
  employeeId: string;
  tasks: OnboardingTask[];
  estimatedDuration: number; // in days
  assignedTo: string;
  status: 'draft' | 'active' | 'completed';
  createdAt: Date;
}

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category: 'documentation' | 'training' | 'equipment' | 'meeting';
  dueDate: Date;
  completed: boolean;
  assignedTo?: string;
}

export interface HRReport {
  id: string;
  type: 'monthly' | 'quarterly' | 'annual' | 'custom';
  title: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalEmployees: number;
    newHires: number;
    departures: number;
    averageOnboardingTime: number;
  };
  generatedAt: Date;
  generatedBy: string;
}

// Input-Typen für API-Requests
export interface CreateOnboardingPlanRequest {
  employeeId: string;
  department: string;
  position: string;
  customTasks?: Partial<OnboardingTask>[];
}

export interface FetchEmployeeDataRequest {
  employeeId?: string;
  department?: string;
  status?: Employee['status'];
  limit?: number;
  offset?: number;
}

export interface CreateHRReportRequest {
  type: HRReport['type'];
  title?: string;
  dateRange: {
    start: string; // ISO string
    end: string;   // ISO string
  };
  includeMetrics?: string[];
}

// Response-Typen für API-Responses
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Module-spezifische Konstanten
export const HR_TASK_CATEGORIES = [
  'documentation',
  'training', 
  'equipment',
  'meeting'
] as const;

export const REPORT_TYPES = [
  'monthly',
  'quarterly', 
  'annual',
  'custom'
] as const;
