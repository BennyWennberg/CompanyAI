// Support Module - Orchestrator

import { Request, Response } from 'express';
import { 
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketSearchRequest,
  CreateCommentRequest
} from './types';

import { createTicket, searchTickets, updateTicket } from './functions/manageTickets';
import { getTicketDetails } from './functions/getTicketDetails';
import { addTicketComment, getTicketComments, addStatusChangeComment } from './functions/manageComments';
import { searchUsersForTickets, UserSearchRequest } from './functions/searchUsers';
import { AuthenticatedRequest, requirePermission, logAuthEvent } from '../hr/core/auth'; // Wiederverwendung der HR-Auth
import { requireSupportAccess, requireSupportAdmin } from '../../middleware/permission.middleware';

/**
 * Support-Orchestrator - Koordiniert Support-Funktionen
 */
export class SupportOrchestrator {
  
  /**
   * Erstellt ein neues Support-Ticket
   */
  static async handleCreateTicket(req: AuthenticatedRequest, res: Response) {
    try {
      const request: CreateTicketRequest = req.body;
      const userId = req.user?.id || 'unknown';

      // Log the action
      logAuthEvent(userId, 'create_ticket', 'tickets');

      const result = await createTicket(request);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Erstellen des Tickets:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Ticket konnte nicht erstellt werden'
      });
    }
  }

  /**
   * Sucht Tickets
   */
  static async handleSearchTickets(req: AuthenticatedRequest, res: Response) {
    try {
      const request: TicketSearchRequest = {
        status: req.query.status as any,
        category: req.query.category as any,
        priority: req.query.priority as any,
        assignedTo: req.query.assignedTo as string,
        customerId: req.query.customerId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      };

      const userId = req.user?.id || 'unknown';
      logAuthEvent(userId, 'search_tickets', 'tickets');

      const result = await searchTickets(request);

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Fehler bei der Ticket-Suche:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Tickets konnten nicht gesucht werden'
      });
    }
  }

  /**
   * Aktualisiert ein Ticket
   */
  static async handleUpdateTicket(req: AuthenticatedRequest, res: Response) {
    try {
      const { ticketId } = req.params;
      const updates: UpdateTicketRequest = req.body;
      const userId = req.user?.id || 'unknown';
      const userName = req.user?.email || 'IT-Support';

      logAuthEvent(userId, 'update_ticket', 'tickets');

      // Prüfe ob Status geändert wird für automatischen Kommentar
      if (updates.status) {
        // Hole aktuellen Status (vereinfachte Mock-Implementierung)
        const currentTicket = await getTicketDetails(ticketId);
        if (currentTicket.success && currentTicket.data && currentTicket.data.status !== updates.status) {
          await addStatusChangeComment(ticketId, currentTicket.data.status, updates.status, userId, userName);
        }
      }

      const result = await updateTicket(ticketId, updates);

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Aktualisieren des Tickets:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Ticket konnte nicht aktualisiert werden'
      });
    }
  }

  /**
   * Holt Details eines einzelnen Tickets mit Kommentaren
   */
  static async handleGetTicketDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'view_ticket_details', 'tickets');

      const result = await getTicketDetails(ticketId);

      if (result.success) {
        res.json(result);
      } else {
        const status = result.error === 'TicketNotFound' ? 404 : 500;
        res.status(status).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Laden der Ticket-Details:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Ticket-Details konnten nicht geladen werden'
      });
    }
  }

  /**
   * Fügt einen Kommentar zu einem Ticket hinzu
   */
  static async handleAddComment(req: AuthenticatedRequest, res: Response) {
    try {
      const { ticketId } = req.params;
      const request: CreateCommentRequest = req.body;
      const userId = req.user?.id || 'unknown';
      const userName = req.user?.email || 'IT-Support';

      logAuthEvent(userId, 'add_comment', 'tickets');

      const result = await addTicketComment(ticketId, request, userId, userName);

      if (result.success) {
        res.status(201).json(result);
      } else {
        const status = result.error === 'TicketNotFound' ? 404 : 400;
        res.status(status).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Hinzufügen des Kommentars:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Kommentar konnte nicht hinzugefügt werden'
      });
    }
  }

  /**
   * Lädt alle Kommentare eines Tickets
   */
  static async handleGetComments(req: AuthenticatedRequest, res: Response) {
    try {
      const { ticketId } = req.params;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'view_comments', 'tickets');

      const result = await getTicketComments(ticketId);

      if (result.success) {
        res.json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      console.error('Fehler beim Laden der Kommentare:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'Kommentare konnten nicht geladen werden'
      });
    }
  }

  /**
   * Sucht User für Ticket-Erstellung (Autocomplete)
   */
  static async handleSearchUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const query = req.query.q as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const userId = req.user?.id || 'unknown';

      logAuthEvent(userId, 'search_users', 'tickets');

      const searchRequest: UserSearchRequest = { query, limit };
      const result = await searchUsersForTickets(searchRequest);

      if (result.success) {
        res.json(result);
      } else {
        const status = result.error === 'SearchFailed' ? 400 : 500;
        res.status(status).json(result);
      }

    } catch (error) {
      console.error('Fehler bei der User-Suche:', error);
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'User-Suche konnte nicht durchgeführt werden'
      });
    }
  }
}

/**
 * Registriert Support-Routes mit Authentifizierung und Autorisierung
 */
export function registerSupportRoutes(router: any) {
  // Ticket-Management (Enhanced Permission System)
  router.post('/support/tickets', 
    requireSupportAccess(),
    SupportOrchestrator.handleCreateTicket
  );
  
  router.get('/support/tickets', 
    requireSupportAccess(),
    SupportOrchestrator.handleSearchTickets
  );
  
  router.put('/support/tickets/:ticketId', 
    requireSupportAccess(),
    SupportOrchestrator.handleUpdateTicket
  );

  // Neue Endpunkte für Ticket-Details und Kommentare
  router.get('/support/tickets/:ticketId/details', 
    requireSupportAccess(),
    SupportOrchestrator.handleGetTicketDetails
  );

  router.get('/support/tickets/:ticketId/comments', 
    requireSupportAccess(),
    SupportOrchestrator.handleGetComments
  );

  router.post('/support/tickets/:ticketId/comments', 
    requireSupportAccess(),
    SupportOrchestrator.handleAddComment
  );

  // User-Suche für Ticket-Erstellung (Autocomplete)
  router.get('/support/users/search', 
    requireSupportAccess(),
    SupportOrchestrator.handleSearchUsers
  );
}
