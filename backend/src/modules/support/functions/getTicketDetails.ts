// Support Module - Ticket Detail Functions

import { 
  TicketWithComments, 
  TicketComment,
  APIResponse 
} from '../types';
import { 
  getTicketById, 
  getCommentsByTicketId 
} from '../core/dataStore';

/**
 * Holt ein einzelnes Ticket mit allen Kommentaren
 */
export async function getTicketDetails(ticketId: string): Promise<APIResponse<TicketWithComments>> {
  try {
    console.log(`[getTicketDetails] Suche Ticket mit ID: ${ticketId}`);

    // Ticket aus DataStore holen
    const ticket = getTicketById(ticketId);

    if (!ticket) {
      console.log(`[getTicketDetails] Ticket ${ticketId} nicht gefunden`);
      return {
        success: false,
        error: 'TicketNotFound',
        message: `Ticket mit ID ${ticketId} wurde nicht gefunden`
      };
    }

    // Kommentare für das Ticket holen (bereits sortiert)
    const comments = getCommentsByTicketId(ticketId);

    const ticketWithComments: TicketWithComments = {
      ...ticket,
      comments: comments
    };

    console.log(`[getTicketDetails] Ticket gefunden: ${ticket.title} mit ${comments.length} Kommentaren`);

    return {
      success: true,
      data: ticketWithComments,
      message: `Ticket-Details für ${ticketId} erfolgreich geladen`
    };

  } catch (error) {
    console.error('[getTicketDetails] Fehler beim Laden der Ticket-Details:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Fehler beim Laden der Ticket-Details'
    };
  }
}

/**
 * Validiert Ticket-ID Format
 */
function validateTicketId(ticketId: string): string[] {
  const errors: string[] = [];

  if (!ticketId || ticketId.trim().length === 0) {
    errors.push('Ticket-ID ist erforderlich');
  }

  if (ticketId && ticketId.length < 3) {
    errors.push('Ticket-ID zu kurz (min. 3 Zeichen)');
  }

  if (ticketId && !/^[a-zA-Z0-9_-]+$/.test(ticketId)) {
    errors.push('Ticket-ID enthält ungültige Zeichen');
  }

  return errors;
}
