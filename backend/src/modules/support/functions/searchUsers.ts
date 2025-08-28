// Support Module - User Search Functions for Ticket Creation

import { APIResponse } from '../types';
import { AdminPortalOrchestrator } from '../../admin-portal/orchestrator';

// Vereinfachtes User-Interface für Ticket-Erstellung
export interface SupportUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  department?: string;
  location?: string; // Aus sourceData wenn verfügbar
  source: 'entra' | 'ldap' | 'upload' | 'manual';
}

export interface UserSearchRequest {
  query: string; // Name oder E-Mail zum Suchen
  limit?: number; // Max. Anzahl Ergebnisse (default: 10)
}

/**
 * Sucht User für Ticket-Erstellung basierend auf Name oder E-Mail
 */
export async function searchUsersForTickets(request: UserSearchRequest): Promise<APIResponse<SupportUser[]>> {
  try {
    const { query, limit = 10 } = request;

    if (!query || query.trim().length < 2) {
      return {
        success: true,
        data: [],
        message: 'Mindestens 2 Zeichen für die Suche erforderlich'
      };
    }

    console.log(`[searchUsersForTickets] Suche nach: "${query}"`);

    // Verwende die bestehende Admin-Portal User-Aggregator API
    // Diese greift auf alle Datenquellen zu (entra, ldap, upload, manual)
    const searchResult = await AdminPortalOrchestrator.userAggregator.getUnifiedUsers({
      search: query.trim(),
      limit: limit,
      page: 1,
      isActive: true // Nur aktive User für Tickets
    });

    if (!searchResult.success || !searchResult.data) {
      console.log(`[searchUsersForTickets] User-Search fehlgeschlagen: ${searchResult.message}`);
      return {
        success: false,
        error: 'SearchFailed',
        message: searchResult.message || 'User-Suche fehlgeschlagen'
      };
    }

    // Konvertiere zu vereinfachtem SupportUser-Format
    const supportUsers: SupportUser[] = searchResult.data.data.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      department: user.sourceData?.department || user.sourceData?.jobTitle,
      location: extractLocationFromSourceData(user.sourceData),
      source: user.source as 'entra' | 'ldap' | 'upload' | 'manual'
    }));

    console.log(`[searchUsersForTickets] ${supportUsers.length} User gefunden`);

    return {
      success: true,
      data: supportUsers,
      message: `${supportUsers.length} User gefunden`
    };

  } catch (error) {
    console.error('[searchUsersForTickets] Fehler bei User-Suche:', error);
    return {
      success: false,
      error: 'InternalServerError',
      message: 'User-Suche konnte nicht durchgeführt werden'
    };
  }
}

/**
 * Extrahiert Standort-Information aus den Source-Daten
 */
function extractLocationFromSourceData(sourceData: any): string | undefined {
  if (!sourceData) return undefined;

  // Versuche verschiedene Felder für Standort-Informationen
  const locationFields = [
    'physicalDeliveryOfficeName', // Entra ID Office-Feld
    'office',
    'location',
    'officeLocation',
    'streetAddress',
    'city',
    'department' // Als Fallback
  ];

  for (const field of locationFields) {
    if (sourceData[field] && typeof sourceData[field] === 'string') {
      return sourceData[field];
    }
  }

  return undefined;
}
