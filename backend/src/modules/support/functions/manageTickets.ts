// Support Module - Ticket Management

import { 
  Ticket, 
  CreateTicketRequest, 
  UpdateTicketRequest,
  TicketSearchRequest,
  APIResponse,
  PaginatedResponse 
} from '../types';

import { 
  getAllTickets, 
  addTicket, 
  updateTicket as updateTicketInStore,
  generateTicketId 
} from '../core/dataStore';

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

  if (!ticket.category || !['hardware', 'software', 'network', 'access', 'phone', 'other'].includes(ticket.category)) {
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
      id: generateTicketId(),
      ...request,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    addTicket(newTicket);

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

    let filteredTickets = getAllTickets();

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
    const resolvedAt = updates.status === 'resolved' ? new Date() : undefined;
    const updatedTicket = updateTicketInStore(ticketId, {
      ...updates,
      ...(resolvedAt && { resolvedAt })
    });

    if (!updatedTicket) {
      return {
        success: false,
        error: 'NotFound',
        message: `Kein Ticket mit ID ${ticketId} gefunden`
      };
    }

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
