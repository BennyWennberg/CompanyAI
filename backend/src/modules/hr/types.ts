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

// Schema-basierte Zusatzinformationen
export interface FieldSchema {
  id: string;
  name: string;             // "Gehalt", "Führerschein", etc.
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  category: string;         // "Finanzen", "Personal", etc.
  unit?: string;            // "€", "Tage", "%", etc.
  required: boolean;
  defaultValue?: string;
  selectOptions?: string[]; // Für select-Felder: ["Option1", "Option2"]
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

export interface UserFieldValue {
  employeeId: string;
  schemaId: string;
  value: string;
  updatedAt: Date;
  updatedBy: string;
}

// Kombinierte Ansicht für Frontend
export interface AdditionalInfoField {
  schema: FieldSchema;
  value?: string;
  hasValue: boolean;
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

// Schema Management Requests
export interface CreateFieldSchemaRequest {
  name: string;
  type: FieldSchema['type'];
  category: string;
  unit?: string;
  required: boolean;
  defaultValue?: string;
  selectOptions?: string[];
}

export interface UpdateFieldSchemaRequest {
  name?: string;
  category?: string;
  unit?: string;
  required?: boolean;
  defaultValue?: string;
  selectOptions?: string[];
}

// User Values Requests
export interface UpdateUserFieldValuesRequest {
  values: {
    schemaId: string;
    value: string;
  }[];
}

// Response-Typen für API-Responses
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Document Management Types

export interface HRDocument {
  id: string;
  fileName: string;
  category: string;
  fileType: string;
  fileSize: string;
  uploadDate: Date;
  filePath: string;
  employeeId: string;
}

export interface UploadDocumentRequest {
  employeeId: string;
  fileName: string;
  category: string;
  fileBuffer: Buffer;
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
