// AI Module - Chat Session Management
// Basierend auf Open WebUI Chat-History System

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { 
  ChatSession, 
  ChatSessionSummary, 
  ChatMessage,
  CreateSessionRequest,
  UpdateSessionRequest,
  SearchSessionsRequest,
  AIResponse
} from '../types';

// Session Storage Configuration
const RAG_EXTERNAL_DOCS_PATH = process.env.RAG_EXTERNAL_DOCS_PATH;
const SESSIONS_DIR = RAG_EXTERNAL_DOCS_PATH 
  ? path.resolve(RAG_EXTERNAL_DOCS_PATH, 'chat-sessions')
  : path.resolve(process.cwd(), 'backend', 'chat-sessions');

function ensureSessionsDir() {
  try {
    if (!fs.existsSync(SESSIONS_DIR)) {
      console.log(`Erstelle Chat-Sessions-Ordner: ${SESSIONS_DIR}`);
      fs.mkdirSync(SESSIONS_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Fehler beim Erstellen des Sessions-Ordners:', error);
    throw new Error(`Chat-Sessions-Ordner konnte nicht erstellt werden: ${error}`);
  }
}

/**
 * Neue Chat-Session erstellen
 */
export async function createChatSession(
  userId: string, 
  request: CreateSessionRequest
): Promise<AIResponse<ChatSession>> {
  try {
    ensureSessionsDir();
    
    const sessionId = uuidv4();
    const now = new Date().toISOString();
    
    const session: ChatSession = {
      id: sessionId,
      title: request.title.trim(),
      description: request.description?.trim(),
      tags: request.tags || [],
      folder: request.folder?.trim(),
      settings: {
        provider: request.settings.provider,
        model: request.settings.model,
        temperature: request.settings.temperature,
        useRag: request.settings.useRag,
        ragTopK: request.settings.ragTopK,
        useWebRag: request.settings.useWebRag || false,
      },
      messages: [],
      createdAt: now,
      updatedAt: now,
      createdBy: userId
    };

    const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf-8');
    
    console.log(`✅ Chat-Session erstellt: ${sessionId} - "${request.title}"`);
    return { 
      success: true, 
      data: session, 
      message: 'Chat-Session erfolgreich erstellt' 
    };
    
  } catch (error: any) {
    console.error('Fehler beim Erstellen der Chat-Session:', error);
    return { 
      success: false, 
      error: 'SessionCreateError', 
      message: error?.message || 'Chat-Session konnte nicht erstellt werden' 
    };
  }
}

/**
 * Chat-Session laden
 */
export async function getChatSession(sessionId: string): Promise<AIResponse<ChatSession>> {
  try {
    ensureSessionsDir();
    
    const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    
    if (!fs.existsSync(sessionPath)) {
      return { 
        success: false, 
        error: 'SessionNotFound', 
        message: 'Chat-Session nicht gefunden' 
      };
    }

    const sessionData = fs.readFileSync(sessionPath, 'utf-8');
    const session: ChatSession = JSON.parse(sessionData);
    
    return { 
      success: true, 
      data: session, 
      message: 'Chat-Session erfolgreich geladen' 
    };
    
  } catch (error: any) {
    console.error('Fehler beim Laden der Chat-Session:', error);
    return { 
      success: false, 
      error: 'SessionLoadError', 
      message: error?.message || 'Chat-Session konnte nicht geladen werden' 
    };
  }
}

/**
 * Chat-Session aktualisieren
 */
export async function updateChatSession(
  userId: string,
  request: UpdateSessionRequest
): Promise<AIResponse<ChatSession>> {
  try {
    const currentSession = await getChatSession(request.id);
    if (!currentSession.success || !currentSession.data) {
      return currentSession;
    }

    const session = currentSession.data;
    
    // Berechtigung prüfen
    if (session.createdBy !== userId) {
      return { 
        success: false, 
        error: 'Forbidden', 
        message: 'Keine Berechtigung zum Bearbeiten dieser Session' 
      };
    }

    // Session aktualisieren
    if (request.title) session.title = request.title.trim();
    if (request.description !== undefined) session.description = request.description?.trim();
    if (request.tags) session.tags = request.tags;
    if (request.folder !== undefined) session.folder = request.folder?.trim();
    if (request.settings) {
      session.settings = { ...session.settings, ...request.settings };
    }
    session.updatedAt = new Date().toISOString();

    // Speichern
    const sessionPath = path.join(SESSIONS_DIR, `${request.id}.json`);
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf-8');
    
    console.log(`✅ Chat-Session aktualisiert: ${request.id}`);
    return { 
      success: true, 
      data: session, 
      message: 'Chat-Session erfolgreich aktualisiert' 
    };
    
  } catch (error: any) {
    console.error('Fehler beim Aktualisieren der Chat-Session:', error);
    return { 
      success: false, 
      error: 'SessionUpdateError', 
      message: error?.message || 'Chat-Session konnte nicht aktualisiert werden' 
    };
  }
}

/**
 * Nachricht zu Chat-Session hinzufügen
 */
export async function addMessageToSession(
  sessionId: string, 
  message: Omit<ChatMessage, 'id' | 'timestamp'>
): Promise<AIResponse<ChatSession>> {
  try {
    const currentSession = await getChatSession(sessionId);
    if (!currentSession.success || !currentSession.data) {
      return currentSession;
    }

    const session = currentSession.data;
    
    const newMessage: ChatMessage = {
      id: uuidv4(),
      ...message,
      timestamp: new Date().toISOString()
    };

    session.messages.push(newMessage);
    session.updatedAt = new Date().toISOString();

    // Speichern
    const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf-8');
    
    return { 
      success: true, 
      data: session, 
      message: 'Nachricht zur Session hinzugefügt' 
    };
    
  } catch (error: any) {
    console.error('Fehler beim Hinzufügen der Nachricht:', error);
    return { 
      success: false, 
      error: 'MessageAddError', 
      message: error?.message || 'Nachricht konnte nicht hinzugefügt werden' 
    };
  }
}

/**
 * Chat-Sessions durchsuchen
 */
export async function searchChatSessions(
  userId: string,
  request: SearchSessionsRequest
): Promise<AIResponse<ChatSessionSummary[]>> {
  try {
    ensureSessionsDir();
    
    const sessionFiles = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json'));
    
    let sessions: ChatSessionSummary[] = [];
    
    for (const file of sessionFiles) {
      try {
        const sessionPath = path.join(SESSIONS_DIR, file);
        const sessionData = fs.readFileSync(sessionPath, 'utf-8');
        const session: ChatSession = JSON.parse(sessionData);
        
        // Nur eigene Sessions anzeigen
        if (session.createdBy !== userId) continue;
        
        // Filter anwenden
        let matches = true;
        
        // Text-Suche
        if (request.query && request.query.trim()) {
          const query = request.query.toLowerCase();
          const titleMatch = session.title.toLowerCase().includes(query);
          const descMatch = session.description?.toLowerCase().includes(query) || false;
          const messageMatch = session.messages.some(m => 
            m.content.toLowerCase().includes(query)
          );
          matches = matches && (titleMatch || descMatch || messageMatch);
        }
        
        // Tags-Filter
        if (request.tags && request.tags.length > 0) {
          const hasMatchingTag = request.tags.some(tag => 
            session.tags.includes(tag)
          );
          matches = matches && hasMatchingTag;
        }
        
        // Folder-Filter
        if (request.folder) {
          matches = matches && session.folder === request.folder;
        }
        
        // Datum-Filter
        if (request.dateFrom) {
          matches = matches && session.createdAt >= request.dateFrom;
        }
        if (request.dateTo) {
          matches = matches && session.createdAt <= request.dateTo;
        }
        
        if (matches) {
          const summary: ChatSessionSummary = {
            id: session.id,
            title: session.title,
            description: session.description,
            tags: session.tags,
            folder: session.folder,
            messageCount: session.messages.length,
            lastMessage: session.messages.length > 0 
              ? session.messages[session.messages.length - 1].content.slice(0, 100) + '...'
              : undefined,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt
          };
          sessions.push(summary);
        }
        
      } catch (e) {
        console.warn(`Fehler beim Lesen der Session-Datei ${file}:`, e);
      }
    }
    
    // Sortierung nach Aktualisierungsdatum (neueste zuerst)
    sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    // Pagination
    const offset = request.offset || 0;
    const limit = request.limit || 50;
    const paginatedSessions = sessions.slice(offset, offset + limit);
    
    return { 
      success: true, 
      data: paginatedSessions, 
      message: `${paginatedSessions.length} von ${sessions.length} Sessions gefunden` 
    };
    
  } catch (error: any) {
    console.error('Fehler beim Durchsuchen der Chat-Sessions:', error);
    return { 
      success: false, 
      error: 'SessionSearchError', 
      message: error?.message || 'Chat-Sessions konnten nicht durchsucht werden' 
    };
  }
}

/**
 * Chat-Session löschen
 */
export async function deleteChatSession(
  userId: string,
  sessionId: string
): Promise<AIResponse<void>> {
  try {
    const currentSession = await getChatSession(sessionId);
    if (!currentSession.success || !currentSession.data) {
      return currentSession;
    }

    const session = currentSession.data;
    
    // Berechtigung prüfen
    if (session.createdBy !== userId) {
      return { 
        success: false, 
        error: 'Forbidden', 
        message: 'Keine Berechtigung zum Löschen dieser Session' 
      };
    }

    // Session löschen
    const sessionPath = path.join(SESSIONS_DIR, `${sessionId}.json`);
    fs.unlinkSync(sessionPath);
    
    console.log(`🗑️ Chat-Session gelöscht: ${sessionId}`);
    return { 
      success: true, 
      message: 'Chat-Session erfolgreich gelöscht' 
    };
    
  } catch (error: any) {
    console.error('Fehler beim Löschen der Chat-Session:', error);
    return { 
      success: false, 
      error: 'SessionDeleteError', 
      message: error?.message || 'Chat-Session konnte nicht gelöscht werden' 
    };
  }
}

/**
 * Alle verfügbaren Tags auflisten
 */
export async function getAllSessionTags(userId: string): Promise<AIResponse<string[]>> {
  try {
    ensureSessionsDir();
    
    const sessionFiles = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.json'));
    
    const tagSet = new Set<string>();
    
    for (const file of sessionFiles) {
      try {
        const sessionPath = path.join(SESSIONS_DIR, file);
        const sessionData = fs.readFileSync(sessionPath, 'utf-8');
        const session: ChatSession = JSON.parse(sessionData);
        
        // Nur eigene Sessions berücksichtigen
        if (session.createdBy === userId) {
          session.tags.forEach(tag => tagSet.add(tag));
        }
      } catch (e) {
        console.warn(`Fehler beim Lesen der Session-Datei ${file}:`, e);
      }
    }
    
    const tags = Array.from(tagSet).sort();
    
    return { 
      success: true, 
      data: tags, 
      message: `${tags.length} verschiedene Tags gefunden` 
    };
    
  } catch (error: any) {
    console.error('Fehler beim Laden der Tags:', error);
    return { 
      success: false, 
      error: 'TagsLoadError', 
      message: error?.message || 'Tags konnten nicht geladen werden' 
    };
  }
}
