// AI Module - Orchestrator (Direct Providers)

import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { AuthenticatedRequest, requirePermission } from '../hr/core/auth';
import { buildRagIndex, retrieveContext, addManualDoc, listDocsWithMeta, readDoc } from './functions/rag';
import { upload, addOriginalFile, listOriginalFiles, deleteOriginalFile } from './functions/file-upload';
import { 
  createChatSession, 
  getChatSession, 
  updateChatSession, 
  addMessageToSession,
  searchChatSessions,
  deleteChatSession,
  getAllSessionTags 
} from './functions/sessions';
import { performWebRag, formatWebRagContext } from './functions/web-rag';
import { speechToText, textToSpeech, getAudioFile, cleanupVoiceFiles, isValidAudioFormat, getAudioFormat } from './functions/voice';
import type { AIChatRequest, CreateSessionRequest, UpdateSessionRequest, SearchSessionsRequest, VoiceToTextRequest, TextToVoiceRequest } from './types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

type ChatMsg = AIChatRequest['messages'][number];

export class AIOrchestrator {
  // Chat-Endpunkt mit Direkt-Providern + optionalem RAG + Session-Management + Web-RAG
  static async handleChat(req: AuthenticatedRequest, res: Response) {
    try {
      const { 
        messages, 
        model = 'gpt-4o-mini', 
        temperature = 0.2, 
        provider = 'openai', 
        rag = false, 
        ragTopK = 5,
        // NEU: Session & Web-RAG Features
        sessionId,
        saveSession = false,
        sessionTitle,
        tags = [],
        webRag = false,
        webSearchQuery,
        websiteUrl
      } = (req.body || {}) as AIChatRequest;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'messages sind erforderlich' });
      }

      let finalMessages: ChatMsg[] = messages as ChatMsg[];
      let ragSources: Array<{ path: string; chunk: string; preview: string; downloadUrl?: string; isOriginal?: boolean; isWeb?: boolean; webUrl?: string }> = [];
      let contextParts: string[] = [];

      // 1. Standard-RAG (Dokumente)
      if (rag) {
        const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
        const top = await retrieveContext(lastUser, ragTopK || 5);
        ragSources.push(...top.map(c => {
          const sourcePath = (c.sourcePath || '').split('#')[0];
          const isOriginalFile = sourcePath.startsWith('originals/');
          return {
            path: sourcePath,
            chunk: c.sourcePath,
            preview: c.content.slice(0, 200),
            downloadUrl: isOriginalFile ? `/api/ai/rag/download/original/${sourcePath.replace('originals/', '')}` : undefined,
            isOriginal: isOriginalFile,
            isWeb: false
          };
        }));
        
        const docContext = top.map((c, i) => {
          const sourcePath = c.sourcePath.split('#')[0];
          const downloadLink = sourcePath.startsWith('originals/') 
            ? ` ([📁 Original herunterladen](/api/ai/rag/download/original/${sourcePath.replace('originals/', '')}))`
            : '';
          return `#${i + 1} **${sourcePath}**${downloadLink}:\n${c.content}`;
        }).join('\n\n');
        
        if (docContext.trim()) {
          contextParts.push(`Interne Dokumente:\n${docContext}`);
        }
      }

      // 2. Web-RAG (neue Funktion)
      if (webRag && (webSearchQuery || websiteUrl)) {
        try {
          const webRagResponse = await performWebRag({
            query: webSearchQuery || [...messages].reverse().find(m => m.role === 'user')?.content || '',
            url: websiteUrl,
            searchProvider: 'google',
            maxResults: 3
          });

          if (webRagResponse.success && webRagResponse.data?.length) {
            // Web-Quellen zu ragSources hinzufügen
            ragSources.push(...webRagResponse.data.map((result, i) => ({
              path: result.title,
              chunk: `web-${i + 1}`,
              preview: result.snippet,
              isOriginal: false,
              isWeb: true,
              webUrl: result.url
            })));

            const webContext = formatWebRagContext(webRagResponse.data, 2000);
            if (webContext.trim()) {
              contextParts.push(webContext);
            }
          }
        } catch (webError) {
          console.warn('Web-RAG Fehler:', webError);
        }
      }

      // 3. Kontext zusammenfügen und Messages erweitern
      if (contextParts.length > 0) {
        const combinedContext = contextParts.join('\n\n---\n\n');
        finalMessages = [
          { role: 'system', content: 'Nutze den bereitgestellten Kontext (intern und/oder web), antworte präzise und in Deutsch.' },
          { role: 'user', content: `Verfügbarer Kontext:\n${combinedContext}` },
          ...messages as ChatMsg[],
        ];
      }

      // 4. Chat-Request verarbeiten
      const data = await dispatchChat({ provider, model: model || 'gpt-4o-mini', temperature, messages: finalMessages });
      const assistantMessage = data?.choices?.[0]?.message?.content || '[keine Antwort]';

      // 5. Session-Management (neu)
      let sessionInfo: any = null;
      const userId = req.user?.id || 'unknown';

      if (saveSession || sessionId) {
        try {
          let currentSessionId = sessionId;

          // Neue Session erstellen falls nötig
          if (!currentSessionId && saveSession) {
            const createSessionResponse = await createChatSession(userId, {
              title: sessionTitle || `Chat ${new Date().toLocaleDateString('de-DE')}`,
              tags: tags,
              settings: {
                provider: provider,
                model: model || 'gpt-4o-mini',
                temperature: temperature,
                useRag: rag,
                ragTopK: ragTopK,
                useWebRag: webRag
              }
            });

            if (createSessionResponse.success && createSessionResponse.data) {
              currentSessionId = createSessionResponse.data.id;
              sessionInfo = { created: true, sessionId: currentSessionId };
            }
          }

          // Messages zur Session hinzufügen
          if (currentSessionId) {
            // User-Message hinzufügen
            const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
            if (lastUserMessage) {
              await addMessageToSession(currentSessionId, {
                role: lastUserMessage.role,
                content: lastUserMessage.content,
                sources: ragSources.length > 0 ? ragSources : undefined
              });
            }

            // Assistant-Response hinzufügen
            await addMessageToSession(currentSessionId, {
              role: 'assistant',
              content: assistantMessage,
              sources: ragSources.length > 0 ? ragSources : undefined
            });

            sessionInfo = { 
              ...sessionInfo, 
              sessionId: currentSessionId, 
              messagesSaved: true 
            };
          }
        } catch (sessionError) {
          console.warn('Session-Fehler (nicht kritisch):', sessionError);
          sessionInfo = { error: 'Session konnte nicht gespeichert werden' };
        }
      }

      // 6. Response zusammenstellen
      const response: any = { success: true, data };
      
      if (ragSources.length > 0) {
        response.meta = { rag: { sources: ragSources } };
      }
      
      if (sessionInfo) {
        response.session = sessionInfo;
      }

      return res.json(response);
    } catch (error: any) {
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || error?.message || 'Chat fehlgeschlagen';
      return res.status(status).json({ success: false, error: 'AIUpstreamError', message });
    }
  }

  // HR Assist Beispiel über RAG + Direkt-Provider (nutzt default provider/model)
  static async handleHRAssist(req: AuthenticatedRequest, res: Response) {
    try {
      const { prompt, provider = 'openai', model = 'gpt-4o-mini' } = (req.body || {}) as any;
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'prompt ist erforderlich' });
      }

      const topChunks = await retrieveContext(prompt, 5);
      const context = topChunks.map((c, i) => {
        const sourcePath = c.sourcePath.split('#')[0];
        const downloadLink = sourcePath.startsWith('originals/') 
          ? ` ([📁 Original herunterladen](/api/ai/rag/download/original/${sourcePath.replace('originals/', '')}))`
          : '';
        return `#${i + 1} **${sourcePath}**${downloadLink}:\n${c.content}`;
      }).join('\n\n');
      const messages: ChatMsg[] = [
        { role: 'system', content: 'Du bist ein HR-Assistent. Antworte präzise, strukturiert und in deutscher Sprache.' },
        { role: 'user', content: `Kontext (intern, docs):\n${context}\n\nFrage: ${prompt}` },
      ];

      const data = await dispatchChat({ provider, model: model || 'gpt-4o-mini', temperature: 0.2, messages });
      return res.json({ success: true, data });
    } catch (error: any) {
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || error?.message || 'HR Assist fehlgeschlagen';
      return res.status(status).json({ success: false, error: 'AIUpstreamError', message });
    }
  }

  // Fügt eine manuelle Markdown-Datei zum externen Ordner hinzu (optional Reindex)
  static async handleAddManualDoc(req: AuthenticatedRequest, res: Response) {
    try {
      const { title, content, reindex = false } = req.body || {};
      if (!title || typeof title !== 'string' || !content || typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'title und content sind erforderlich' });
      }
      const created = await addManualDoc(title, content);
      let indexInfo: any = null;
      if (reindex) {
        const idx = await buildRagIndex();
        indexInfo = { chunks: idx.chunks.length, model: idx.model, createdAt: idx.createdAt };
      }
      return res.json({ 
        success: true, 
        data: { 
          created, 
          reindexed: reindex ? indexInfo : undefined,
          message: created.isExternal ? 'Dokument wurde in externem Ordner gespeichert' : 'Dokument wurde im Projekt gespeichert'
        } 
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'RAGManualDocError', message: error?.message || 'Manual Doc konnte nicht hinzugefügt werden' });
    }
  }

  // NEU: Original-Datei hochladen (mit automatischer Markdown-Konvertierung)
  static async handleUploadFile(req: AuthenticatedRequest, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'Keine Datei hochgeladen' });
      }

      const { reindex = false } = req.body || {};
      
      // Temporäre Datei lesen
      const originalContent = fs.readFileSync(file.path);
      
      // Original + Markdown speichern
      const result = await addOriginalFile(file.originalname, originalContent);
      
      // Temporäre Datei löschen
      fs.unlinkSync(file.path);
      
      let indexInfo: any = null;
      if (reindex) {
        const idx = await buildRagIndex();
        indexInfo = { chunks: idx.chunks.length, model: idx.model, createdAt: idx.createdAt };
      }

      return res.json({
        success: true,
        data: {
          upload: result,
          reindexed: reindex ? indexInfo : undefined,
          message: `Original-Datei "${file.originalname}" wurde gespeichert (+ Markdown für RAG)`
        }
      });
      
    } catch (error: any) {
      // Temporäre Datei sicherheitshalber löschen
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(500).json({ success: false, error: 'FileUploadError', message: error?.message || 'Upload fehlgeschlagen' });
    }
  }

  // NEU: Original-Dateien auflisten
  static async handleListOriginals(req: AuthenticatedRequest, res: Response) {
    try {
      const files = listOriginalFiles();
      return res.json({ success: true, data: files });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'ListOriginalError', message: error?.message || 'Original-Dateien konnten nicht geladen werden' });
    }
  }

  // NEU: Original-Datei herunterladen
  static async handleDownloadOriginal(req: AuthenticatedRequest, res: Response) {
    try {
      const filename = req.params.filename;
      if (!filename) {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'Dateiname fehlt' });
      }

      const RAG_EXTERNAL_DOCS_PATH = process.env.RAG_EXTERNAL_DOCS_PATH;
      const DOCS_DIR = RAG_EXTERNAL_DOCS_PATH ? path.resolve(RAG_EXTERNAL_DOCS_PATH) : path.resolve(process.cwd(), 'docs');
      const ORIGINALS_DIR = path.resolve(DOCS_DIR, 'originals');
      
      const filePath = path.join(ORIGINALS_DIR, filename);
      
      // Sicherheitscheck: Pfad muss innerhalb ORIGINALS_DIR sein
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(path.resolve(ORIGINALS_DIR))) {
        return res.status(400).json({ success: false, error: 'SecurityError', message: 'Ungültiger Pfad' });
      }
      
      if (!fs.existsSync(resolvedPath)) {
        return res.status(404).json({ success: false, error: 'FileNotFound', message: 'Original-Datei nicht gefunden' });
      }

      // Original-Dateiname für Download wiederherstellen
      const stats = fs.statSync(resolvedPath);
      const originalName = filename.replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/, '');
      
      res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
      res.setHeader('Content-Length', stats.size);
      res.sendFile(resolvedPath);
      
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'DownloadError', message: error?.message || 'Download fehlgeschlagen' });
    }
  }

  // NEU: Original-Datei löschen
  static async handleDeleteOriginal(req: AuthenticatedRequest, res: Response) {
    try {
      const filename = req.params.filename;
      if (!filename) {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'Dateiname fehlt' });
      }

      const deleted = deleteOriginalFile(filename);
      if (deleted) {
        return res.json({ success: true, message: `Datei "${filename}" wurde gelöscht (Original + Markdown)` });
      } else {
        return res.status(404).json({ success: false, error: 'FileNotFound', message: 'Datei nicht gefunden' });
      }
      
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'DeleteError', message: error?.message || 'Löschen fehlgeschlagen' });
    }
  }

  // ===== NEU: Chat-Session Management Handlers =====

  // Chat-Session erstellen
  static async handleCreateSession(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const request = req.body as CreateSessionRequest;
      
      if (!request.title || !request.title.trim()) {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'title ist erforderlich' });
      }

      const result = await createChatSession(userId, request);
      const status = result.success ? 200 : 500;
      return res.status(status).json(result);
      
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'CreateSessionError', message: error?.message || 'Session konnte nicht erstellt werden' });
    }
  }

  // Chat-Session laden
  static async handleGetSession(req: AuthenticatedRequest, res: Response) {
    try {
      const sessionId = req.params.sessionId;
      if (!sessionId) {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'sessionId fehlt' });
      }

      const result = await getChatSession(sessionId);
      const status = result.success ? 200 : (result.error === 'SessionNotFound' ? 404 : 500);
      return res.status(status).json(result);
      
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'GetSessionError', message: error?.message || 'Session konnte nicht geladen werden' });
    }
  }

  // Chat-Session aktualisieren
  static async handleUpdateSession(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const request = req.body as UpdateSessionRequest;
      
      if (!request.id) {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'id ist erforderlich' });
      }

      const result = await updateChatSession(userId, request);
      const status = result.success ? 200 : (result.error === 'SessionNotFound' ? 404 : result.error === 'Forbidden' ? 403 : 500);
      return res.status(status).json(result);
      
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'UpdateSessionError', message: error?.message || 'Session konnte nicht aktualisiert werden' });
    }
  }

  // Chat-Sessions durchsuchen
  static async handleSearchSessions(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const request = req.query as any as SearchSessionsRequest;
      
      // Query-Parameter in richtige Typen konvertieren
      const searchRequest: SearchSessionsRequest = {
        query: request.query,
        tags: request.tags ? (Array.isArray(request.tags) ? request.tags : [request.tags]) : undefined,
        folder: request.folder,
        dateFrom: request.dateFrom,
        dateTo: request.dateTo,
        limit: request.limit ? parseInt(String(request.limit), 10) : undefined,
        offset: request.offset ? parseInt(String(request.offset), 10) : undefined
      };

      const result = await searchChatSessions(userId, searchRequest);
      const status = result.success ? 200 : 500;
      return res.status(status).json(result);
      
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'SearchSessionsError', message: error?.message || 'Sessions konnten nicht durchsucht werden' });
    }
  }

  // Chat-Session löschen
  static async handleDeleteSession(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const sessionId = req.params.sessionId;
      
      if (!sessionId) {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'sessionId fehlt' });
      }

      const result = await deleteChatSession(userId, sessionId);
      const status = result.success ? 200 : (result.error === 'SessionNotFound' ? 404 : result.error === 'Forbidden' ? 403 : 500);
      return res.status(status).json(result);
      
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'DeleteSessionError', message: error?.message || 'Session konnte nicht gelöscht werden' });
    }
  }

  // Alle verfügbaren Tags laden
  static async handleGetAllTags(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || 'unknown';
      const result = await getAllSessionTags(userId);
      const status = result.success ? 200 : 500;
      return res.status(status).json(result);
      
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'GetTagsError', message: error?.message || 'Tags konnten nicht geladen werden' });
    }
  }

  // ===== NEU: Voice Integration Handlers =====

  // Speech-to-Text (Audio zu Text)
  static async handleSpeechToText(req: AuthenticatedRequest, res: Response) {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'Audio-Datei erforderlich' });
      }

      // Audio-Format validieren
      if (!isValidAudioFormat(file.originalname)) {
        return res.status(400).json({ 
          success: false, 
          error: 'ValidationError', 
          message: 'Nicht unterstütztes Audio-Format. Unterstützt: MP3, WAV, OGG, WebM, M4A, FLAC' 
        });
      }

      // Request-Parameter
      const { language } = req.body || {};
      const audioFormat = getAudioFormat(file.originalname);

      const voiceRequest: VoiceToTextRequest = {
        audioFormat,
        language: language || 'de'
      };

      // Audio-Buffer lesen
      const audioBuffer = fs.readFileSync(file.path);
      
      // Speech-to-Text verarbeiten
      const result = await speechToText(audioBuffer, file.originalname, voiceRequest);
      
      // Temporäre Upload-Datei löschen
      try {
        fs.unlinkSync(file.path);
      } catch {}

      const status = result.success ? 200 : 400;
      return res.status(status).json(result);
      
    } catch (error: any) {
      // Cleanup bei Fehler
      if (req.file?.path && fs.existsSync(req.file.path)) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      
      return res.status(500).json({ 
        success: false, 
        error: 'SpeechToTextError', 
        message: error?.message || 'Speech-to-Text fehlgeschlagen' 
      });
    }
  }

  // Text-to-Speech (Text zu Audio)
  static async handleTextToSpeech(req: AuthenticatedRequest, res: Response) {
    try {
      const { text, voice = 'alloy', format = 'mp3', speed = 1.0 } = req.body || {};
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'Text ist erforderlich' });
      }

      const voiceRequest: TextToVoiceRequest = {
        text: text.trim(),
        voice,
        format,
        speed: Math.max(0.25, Math.min(4.0, speed)) // OpenAI TTS Limits
      };

      const result = await textToSpeech(voiceRequest);
      const status = result.success ? 200 : 400;
      return res.status(status).json(result);
      
    } catch (error: any) {
      return res.status(500).json({ 
        success: false, 
        error: 'TextToSpeechError', 
        message: error?.message || 'Text-to-Speech fehlgeschlagen' 
      });
    }
  }

  // Audio-Datei bereitstellen
  static async handleGetAudio(req: AuthenticatedRequest, res: Response) {
    try {
      const filename = req.params.filename;
      if (!filename) {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'Dateiname fehlt' });
      }

      const result = getAudioFile(filename);
      
      if (!result.success || !result.filePath) {
        return res.status(404).json({ success: false, error: 'FileNotFound', message: result.error || 'Audio-Datei nicht gefunden' });
      }

      // Content-Type basierend auf Dateiendung
      const ext = path.extname(filename).toLowerCase();
      const contentType = ext === '.mp3' ? 'audio/mpeg' : 
                         ext === '.wav' ? 'audio/wav' : 
                         ext === '.ogg' ? 'audio/ogg' : 
                         'audio/mpeg';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 Stunde Cache
      res.sendFile(result.filePath);
      
    } catch (error: any) {
      return res.status(500).json({ 
        success: false, 
        error: 'AudioFileError', 
        message: error?.message || 'Audio-Datei konnte nicht geladen werden' 
      });
    }
  }

  // Voice-Cleanup (Wartung)
  static async handleVoiceCleanup(req: AuthenticatedRequest, res: Response) {
    try {
      const result = cleanupVoiceFiles();
      return res.json({ 
        success: true, 
        data: result, 
        message: `${result.removed} alte Audio-Dateien entfernt` 
      });
      
    } catch (error: any) {
      return res.status(500).json({ 
        success: false, 
        error: 'CleanupError', 
        message: error?.message || 'Voice-Cleanup fehlgeschlagen' 
      });
    }
  }

  // ===== NEU: Hybrid RAG Management Handlers =====

  // Hybrid RAG Statistiken
  static async handleHybridRagStats(req: AuthenticatedRequest, res: Response) {
    try {
      const { getHybridSearchStats } = await import('./functions/hybrid-rag');
      const stats = getHybridSearchStats();
      
      return res.json({ 
        success: true, 
        data: stats,
        message: 'Hybrid RAG Statistiken geladen' 
      });
      
    } catch (error: any) {
      return res.status(500).json({ 
        success: false, 
        error: 'HybridRagStatsError', 
        message: error?.message || 'Hybrid RAG Statistiken fehlgeschlagen' 
      });
    }
  }

  // Search-Methods Vergleich
  static async handleSearchComparison(req: AuthenticatedRequest, res: Response) {
    try {
      const { query, topK = 5 } = req.body || {};
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'Query ist erforderlich' });
      }

      const { compareSearchMethods } = await import('./functions/hybrid-rag');
      const comparison = await compareSearchMethods(query.trim(), parseInt(topK, 10));
      
      return res.json({ 
        success: true, 
        data: {
          query: query.trim(),
          comparison,
          summary: {
            vectorOnlyCount: comparison.vectorOnly.chunks.length,
            bm25OnlyCount: comparison.bm25Only.chunks.length,
            hybridCount: comparison.hybrid.chunks.length,
            performance: {
              vectorDuration: comparison.vectorOnly.duration,
              bm25Duration: comparison.bm25Only.duration,
              hybridDuration: comparison.hybrid.duration,
              hybridOverhead: comparison.hybrid.duration - comparison.vectorOnly.duration
            }
          }
        },
        message: `Search-Methods-Vergleich für "${query}" abgeschlossen` 
      });
      
    } catch (error: any) {
      return res.status(500).json({ 
        success: false, 
        error: 'SearchComparisonError', 
        message: error?.message || 'Search-Vergleich fehlgeschlagen' 
      });
    }
  }
}

export function registerAIRoutes(router: any) {
  // Bestehende RAG Endpoints
  router.post('/ai/chat', requirePermission('read', 'all'), AIOrchestrator.handleChat);
  router.post('/ai/hr-assist', requirePermission('read', 'all'), AIOrchestrator.handleHRAssist);
  router.post('/ai/rag/reindex', requirePermission('admin', 'all'), async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const idx = await buildRagIndex();
      res.json({ success: true, data: { chunks: idx.chunks.length, model: idx.model, createdAt: idx.createdAt } });
    } catch (e) {
      res.status(500).json({ success: false, error: 'RAGIndexError', message: 'Re-Index fehlgeschlagen' });
    }
  });
  router.get('/ai/rag/docs', requirePermission('read', 'all'), (_req: AuthenticatedRequest, res: Response) => {
    try {
      const list = listDocsWithMeta();
      res.json({ success: true, data: list });
    } catch (e: any) {
      res.status(500).json({ success: false, error: 'RAGListError', message: e?.message || 'Dokumente konnten nicht geladen werden' });
    }
  });
  router.get('/ai/rag/doc', requirePermission('read', 'all'), (req: AuthenticatedRequest, res: Response) => {
    try {
      const p = String((req.query as any)?.path || '');
      const doc = readDoc(p);
      res.json({ success: true, data: doc });
    } catch (e: any) {
      res.status(400).json({ success: false, error: 'RAGReadDocError', message: e?.message || 'Dokument konnte nicht geladen werden' });
    }
  });
  router.get('/ai/rag/doc-raw', requirePermission('read', 'all'), (req: AuthenticatedRequest, res: Response) => {
    try {
      const p = String((req.query as any)?.path || '');
      const doc = readDoc(p);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.send(doc.content);
    } catch (e: any) {
      res.status(400).send(e?.message || 'Dokument konnte nicht geladen werden');
    }
  });
  router.post('/ai/rag/manual-doc', requirePermission('admin', 'all'), AIOrchestrator.handleAddManualDoc);

  // NEU: Original-Dateien Endpoints
  router.post('/ai/rag/upload-file', requirePermission('admin', 'all'), upload.single('file'), AIOrchestrator.handleUploadFile);
  router.get('/ai/rag/originals', requirePermission('read', 'all'), AIOrchestrator.handleListOriginals);
  router.get('/ai/rag/download/original/:filename', requirePermission('read', 'all'), AIOrchestrator.handleDownloadOriginal);
  router.delete('/ai/rag/originals/:filename', requirePermission('admin', 'all'), AIOrchestrator.handleDeleteOriginal);

  // NEU: Chat-Session Management Endpoints
  router.post('/ai/sessions', requirePermission('read', 'all'), AIOrchestrator.handleCreateSession);
  router.get('/ai/sessions/search', requirePermission('read', 'all'), AIOrchestrator.handleSearchSessions);
  router.get('/ai/sessions/tags', requirePermission('read', 'all'), AIOrchestrator.handleGetAllTags);
  router.get('/ai/sessions/:sessionId', requirePermission('read', 'all'), AIOrchestrator.handleGetSession);
  router.put('/ai/sessions/:sessionId', requirePermission('read', 'all'), AIOrchestrator.handleUpdateSession);
  router.delete('/ai/sessions/:sessionId', requirePermission('read', 'all'), AIOrchestrator.handleDeleteSession);

  // NEU: Voice Integration Endpoints
  router.post('/ai/voice/speech-to-text', requirePermission('read', 'all'), upload.single('audio'), AIOrchestrator.handleSpeechToText);
  router.post('/ai/voice/text-to-speech', requirePermission('read', 'all'), AIOrchestrator.handleTextToSpeech);
  router.get('/ai/voice/audio/:filename', requirePermission('read', 'all'), AIOrchestrator.handleGetAudio);
  router.post('/ai/voice/cleanup', requirePermission('admin', 'all'), AIOrchestrator.handleVoiceCleanup);

  // NEU: Hybrid RAG Analytics Endpoints
  router.get('/ai/rag/hybrid/stats', requirePermission('read', 'all'), AIOrchestrator.handleHybridRagStats);
  router.post('/ai/rag/hybrid/compare', requirePermission('read', 'all'), AIOrchestrator.handleSearchComparison);
}

// --- Provider Helpers ---
async function dispatchChat(params: Pick<AIChatRequest, 'provider' | 'model' | 'temperature' | 'messages'>) {
  const { provider = 'openai', model = 'gpt-4o-mini', temperature = 0.2, messages } = params;
  switch (provider) {
    case 'gemini':
      return callGemini(model || 'gemini-1.5-flash', temperature, messages);
    case 'ollama':
      return callOllama(model || 'llama3', temperature, messages);
    case 'openai':
    default:
      return callOpenAI(model || 'gpt-4o-mini', temperature, messages);
  }
}

async function callOpenAI(model: string, temperature: number, messages: ChatMsg[]) {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY fehlt');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` };
  const resp = await axios.post('https://api.openai.com/v1/chat/completions', { model, messages, temperature }, { headers });
  return resp.data;
}

async function callGemini(model: string, temperature: number, messages: ChatMsg[]) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY fehlt');
  const system = messages.find(m => m.role === 'system')?.content;
  const contents = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  const body: any = { contents, generationConfig: { temperature } };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${GEMINI_API_KEY}`;
  const resp = await axios.post(url, body, { headers: { 'Content-Type': 'application/json' } });
  const text = resp.data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';
  return { choices: [{ message: { role: 'assistant', content: text } }] };
}

async function callOllama(model: string, temperature: number, messages: ChatMsg[]) {
  const payload = { model, messages, options: { temperature } };
  const resp = await axios.post(`${OLLAMA_URL}/api/chat`, payload, { headers: { 'Content-Type': 'application/json' } });
  const msg = resp.data?.message?.content || resp.data?.choices?.[0]?.message?.content || '';
  return { choices: [{ message: { role: 'assistant', content: msg } }] };
}


