// Support Module - Typdefinitionen

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: 'technical' | 'account' | 'billing' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  customerId: string;
  customerEmail: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  category: Ticket['category'];
  priority: Ticket['priority'];
  customerId: string;
  customerEmail: string;
}

export interface UpdateTicketRequest {
  title?: string;
  description?: string;
  priority?: Ticket['priority'];
  status?: Ticket['status'];
  assignedTo?: string;
}

export interface TicketSearchRequest {
  status?: Ticket['status'];
  category?: Ticket['category'];
  priority?: Ticket['priority'];
  assignedTo?: string;
  customerId?: string;
  limit?: number;
  offset?: number;
}

// Support-spezifische API-Response-Typen
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
