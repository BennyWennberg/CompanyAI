// Support Module - Typdefinitionen

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: 'hardware' | 'software' | 'network' | 'access' | 'phone' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  customerId: string;
  customerEmail: string;
  customerName?: string;
  assignedTo?: string;
  location?: string; // Arbeitsplatz/Büro für interne IT-Tickets
  deviceInfo?: string; // Hardware-Informationen
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
  customerName?: string;
  location?: string;
  deviceInfo?: string;
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

// Ticket-Chat-System für interne IT-Kommunikation
export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  content: string;
  type: 'user_message' | 'internal_note' | 'status_change' | 'assignment' | 'system_message';
  isInternal: boolean; // Immer true für interne IT-Tickets
  metadata?: {
    oldStatus?: Ticket['status'];
    newStatus?: Ticket['status'];
    oldAssignedTo?: string;
    newAssignedTo?: string;
    messageFormat?: 'text' | 'markdown'; // Für zukünftige Erweiterungen
  };
  createdAt: Date;
  updatedAt?: Date;
}

// Chat-spezifische Interfaces
export interface ChatMessage extends TicketComment {
  // Erweiterte Chat-Eigenschaften
  isEdited?: boolean;
  editedAt?: Date;
  replyToId?: string; // Für Antworten auf spezifische Nachrichten (zukünftig)
}

export interface TicketChatHistory {
  ticketId: string;
  messages: ChatMessage[];
  lastActivity: Date;
  messageCount: number;
}

// Ticket mit Kommentaren für Detail-View
export interface TicketWithComments extends Ticket {
  comments: TicketComment[];
}

// Request-Types für Kommentar-System
export interface CreateCommentRequest {
  content: string;
  type?: TicketComment['type'];
}

export interface TicketDetailRequest {
  ticketId: string;
}
