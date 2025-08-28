// Support Module - Comment Management Functions

import { 
  TicketComment,
  CreateCommentRequest,
  APIResponse 
} from '../types';
import { 
  getTicketById,
  getCommentsByTicketId,
  addComment,
  generateCommentId
} from '../core/dataStore';
import { EmailService } from '../services/emailService';

/**
 * Fügt einen neuen Kommentar zu einem Ticket hinzu
 */
export async function addTicketComment(
  ticketId: string,
  request: CreateCommentRequest,
  authorId: string,
  authorName: string
): Promise<APIResponse<TicketComment>> {
  try {
    console.log(`[addTicketComment] Neuer Kommentar für Ticket ${ticketId} von ${authorName}`);

    // Validierung
    const validationErrors = validateCommentRequest(request);
    if (validationErrors.length > 0) {
      console.log('[addTicketComment] Validierungsfehler:', validationErrors);
      return {
        success: false,
        error: 'ValidationError',
        message: validationErrors.join(', ')
      };
    }

    // Prüfe ob Ticket existiert
    const ticket = getTicketById(ticketId);
    if (!ticket) {
      return {
        success: false,
        error: 'TicketNotFound',
        message: `Ticket mit ID ${ticketId} wurde nicht gefunden`
      };
    }

    // Neuen Kommentar erstellen
    const newComment: TicketComment = {
      id: generateCommentId(),
      ticketId,
      authorId,
      authorName,
      content: request.content.trim(),
      type: request.type || 'user_message',
      isInternal: true, // Für internes IT-System immer true
      createdAt: new Date()
    };

    // Kommentar im DataStore speichern
    addComment(newComment);

    console.log(`[addTicketComment] Kommentar erfolgreich erstellt: ${newComment.id}`);

    // E-Mail-Versand für user_message (nicht für internal_note)
    if (newComment.type === 'user_message' && EmailService.isAvailable()) {
      try {
        const emailSent = await EmailService.sendTicketMessage({
          ticket: {
            id: ticket.id,
            title: ticket.title,
            customerName: ticket.customerName,
            customerEmail: ticket.customerEmail,
            status: ticket.status,
            priority: ticket.priority,
            category: ticket.category
          },
          message: newComment,
          isFirstMessage: false
        });

        if (emailSent) {
          console.log(`📧 [addTicketComment] E-Mail gesendet an ${ticket.customerEmail} für Ticket ${ticketId}`);
        } else {
          console.warn(`⚠️ [addTicketComment] E-Mail-Versand fehlgeschlagen für Ticket ${ticketId}`);
        }
      } catch (error) {
        console.error(`❌ [addTicketComment] Fehler beim E-Mail-Versand:`, error);
        // Fehler beim E-Mail-Versand soll den Kommentar nicht blockieren
      }
    } else if (newComment.type === 'user_message') {
      console.log(`📧 [addTicketComment] E-Mail-Service nicht verfügbar - keine E-Mail gesendet`);
    }

    return {
      success: true,
      data: newComment,
      message: 'Kommentar erfolgreich hinzugefügt'
    };

  } catch (error) {
    console.error('[addTicketComment] Fehler beim Hinzufügen des Kommentars:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Fehler beim Hinzufügen des Kommentars'
    };
  }
}

/**
 * Lädt alle Kommentare für ein Ticket
 */
export async function getTicketComments(ticketId: string): Promise<APIResponse<TicketComment[]>> {
  try {
    console.log(`[getTicketComments] Lade Kommentare für Ticket ${ticketId}`);

    // Kommentare aus DataStore holen (bereits sortiert)
    const comments = getCommentsByTicketId(ticketId);

    console.log(`[getTicketComments] ${comments.length} Kommentare gefunden`);

    return {
      success: true,
      data: comments,
      message: `${comments.length} Kommentare geladen`
    };

  } catch (error) {
    console.error('[getTicketComments] Fehler beim Laden der Kommentare:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Fehler beim Laden der Kommentare'
    };
  }
}

/**
 * Erstellt automatisch einen System-Kommentar bei Status-Änderungen
 */
export async function addStatusChangeComment(
  ticketId: string,
  oldStatus: string,
  newStatus: string,
  authorId: string,
  authorName: string
): Promise<APIResponse<TicketComment>> {
  try {
    const statusLabels: Record<string, string> = {
      'open': 'Offen',
      'in_progress': 'In Bearbeitung',
      'waiting_customer': 'Wartet auf Kunde',
      'resolved': 'Gelöst',
      'closed': 'Geschlossen'
    };

    const content = `Status geändert von "${statusLabels[oldStatus] || oldStatus}" zu "${statusLabels[newStatus] || newStatus}"`;

    const comment: TicketComment = {
      id: generateCommentId(),
      ticketId,
      authorId,
      authorName,
      content,
      type: 'status_change',
      isInternal: true,
      metadata: {
        oldStatus: oldStatus as any,
        newStatus: newStatus as any
      },
      createdAt: new Date()
    };

    addComment(comment);

    return {
      success: true,
      data: comment,
      message: 'Status-Kommentar erstellt'
    };

  } catch (error) {
    console.error('[addStatusChangeComment] Fehler:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'Fehler beim Erstellen des Status-Kommentars'
    };
  }
}

/**
 * Validiert Kommentar-Request
 */
function validateCommentRequest(request: CreateCommentRequest): string[] {
  const errors: string[] = [];

  if (!request.content || request.content.trim().length === 0) {
    errors.push('Kommentar-Inhalt ist erforderlich');
  }

  if (request.content && request.content.trim().length > 2000) {
    errors.push('Kommentar zu lang (max. 2000 Zeichen)');
  }

  if (request.type && !['internal_note', 'status_change', 'assignment'].includes(request.type)) {
    errors.push('Ungültiger Kommentar-Typ');
  }

  return errors;
}


