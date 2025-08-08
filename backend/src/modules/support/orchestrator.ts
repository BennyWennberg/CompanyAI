// Support Module - Orchestrator

import { Request, Response } from 'express';
import { 
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketSearchRequest 
} from './types';

import { createTicket, searchTickets, updateTicket } from './functions/manageTickets';
import { AuthenticatedRequest } from '../hr/core/auth'; // Wiederverwendung der HR-Auth

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
        error: 'Interner Server-Fehler',
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
        error: 'Interner Server-Fehler',
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
        error: 'Interner Server-Fehler',
        message: 'Ticket konnte nicht aktualisiert werden'
      });
    }
  }
}

/**
 * Registriert Support-Routes
 */
export function registerSupportRoutes(router: any) {
  router.post('/support/tickets', SupportOrchestrator.handleCreateTicket);
  router.get('/support/tickets', SupportOrchestrator.handleSearchTickets);
  router.put('/support/tickets/:ticketId', SupportOrchestrator.handleUpdateTicket);
}
