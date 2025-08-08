// Support Module - Ticket Management

import { 
  Ticket, 
  CreateTicketRequest, 
  UpdateTicketRequest,
  TicketSearchRequest,
  APIResponse,
  PaginatedResponse 
} from '../types';

// Mock-Ticket-Daten
const mockTickets: Ticket[] = [
  {
    id: 'ticket_001',
    title: 'Login-Probleme mit neuer App',
    description: 'Kunde kann sich nicht in die neue Mobile App einloggen',
    category: 'technical',
    priority: 'high',
    status: 'open',
    customerId: 'cust_001',
    customerEmail: 'kunde@example.com',
    assignedTo: 'support@company.com',
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-01')
  },
  {
    id: 'ticket_002',
    title: 'Rechnungsanfrage für Dezember',
    description: 'Kunde benötigt detaillierte Rechnung für Dezember 2023',
    category: 'billing',
    priority: 'medium',
    status: 'resolved',
    customerId: 'cust_002',
    customerEmail: 'billing@kunde.de',
    assignedTo: 'finance@company.com',
    createdAt: new Date('2023-12-05'),
    updatedAt: new Date('2023-12-06'),
    resolvedAt: new Date('2023-12-06')
  }
];

/**
 * Validiert Ticket-Daten
 */
function validateTicketData(ticket: CreateTicketRequest): string[] {
  const errors: string[] = [];

  if (!ticket.title || ticket.title.trim().length === 0) {
    errors.push('Titel ist erforderlich');
  } else if (ticket.title.length > 200) {
    errors.push('Titel darf maximal 200 Zeichen lang sein');
  }

  if (!ticket.description || ticket.description.trim().length === 0) {
    errors.push('Beschreibung ist erforderlich');
  } else if (ticket.description.length > 2000) {
    errors.push('Beschreibung darf maximal 2000 Zeichen lang sein');
  }

  if (!ticket.category || !['technical', 'account', 'billing', 'general'].includes(ticket.category)) {
    errors.push('Ungültige Kategorie');
  }

  if (!ticket.priority || !['low', 'medium', 'high', 'urgent'].includes(ticket.priority)) {
    errors.push('Ungültige Priorität');
  }

  if (!ticket.customerId || ticket.customerId.trim().length === 0) {
    errors.push('Kunden-ID ist erforderlich');
  }

  if (!ticket.customerEmail || ticket.customerEmail.trim().length === 0) {
    errors.push('Kunden-E-Mail ist erforderlich');
  } else if (!isValidEmail(ticket.customerEmail)) {
    errors.push('Ungültige E-Mail-Adresse');
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
 * Erstellt ein neues Support-Ticket
 */
export async function createTicket(request: CreateTicketRequest): Promise<APIResponse<Ticket>> {
  try {
    // Validierung
    const validationErrors = validateTicketData(request);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: 'ValidationError',
        message: validationErrors.join(', ')
      };
    }

    const newTicket: Ticket = {
      id: `ticket_${String(mockTickets.length + 1).padStart(3, '0')}`,
      ...request,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockTickets.push(newTicket);

    return {
      success: true,
      data: newTicket,
      message: 'Ticket erfolgreich erstellt'
    };

  } catch (error) {
    console.error('Fehler beim Erstellen des Tickets:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Ticket konnte nicht erstellt werden'
    };
  }
}

/**
 * Sucht Tickets basierend auf Filterkriterien
 */
export async function searchTickets(request: TicketSearchRequest): Promise<APIResponse<PaginatedResponse<Ticket>>> {
  try {
    const { 
      status, 
      category, 
      priority, 
      assignedTo, 
      customerId, 
      limit = 10, 
      offset = 0 
    } = request;

    let filteredTickets = [...mockTickets];

    // Filter anwenden
    if (status) {
      filteredTickets = filteredTickets.filter(ticket => ticket.status === status);
    }
    if (category) {
      filteredTickets = filteredTickets.filter(ticket => ticket.category === category);
    }
    if (priority) {
      filteredTickets = filteredTickets.filter(ticket => ticket.priority === priority);
    }
    if (assignedTo) {
      filteredTickets = filteredTickets.filter(ticket => ticket.assignedTo === assignedTo);
    }
    if (customerId) {
      filteredTickets = filteredTickets.filter(ticket => ticket.customerId === customerId);
    }

    // Pagination
    const total = filteredTickets.length;
    const page = Math.floor(offset / limit) + 1;
    const paginatedTickets = filteredTickets.slice(offset, offset + limit);

    const response: PaginatedResponse<Ticket> = {
      data: paginatedTickets,
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
      message: `${paginatedTickets.length} Tickets gefunden`
    };

      } catch (error) {
      console.error('Fehler bei der Ticket-Suche:', error);
      return {
        success: false,
        error: 'InternalServerError',
        message: 'Tickets konnten nicht gesucht werden'
      };
    }
}

/**
 * Aktualisiert ein bestehendes Ticket
 */
export async function updateTicket(ticketId: string, updates: UpdateTicketRequest): Promise<APIResponse<Ticket>> {
  try {
    const ticketIndex = mockTickets.findIndex(ticket => ticket.id === ticketId);

    if (ticketIndex === -1) {
      return {
        success: false,
        error: 'NotFound',
        message: `Kein Ticket mit ID ${ticketId} gefunden`
      };
    }

    const updatedTicket = {
      ...mockTickets[ticketIndex],
      ...updates,
      updatedAt: new Date(),
      ...(updates.status === 'resolved' && { resolvedAt: new Date() })
    };

    mockTickets[ticketIndex] = updatedTicket;

    return {
      success: true,
      data: updatedTicket,
      message: 'Ticket erfolgreich aktualisiert'
    };

  } catch (error) {
    console.error('Fehler beim Aktualisieren des Tickets:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Ticket konnte nicht aktualisiert werden'
    };
  }
}
