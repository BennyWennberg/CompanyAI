// AI Module - Orchestrator (OpenWebUI / OpenAI-kompatibel)

import { Response } from 'express';
import axios from 'axios';
import { AuthenticatedRequest, requirePermission } from '../hr/core/auth';
import { buildRagIndex, retrieveContext } from './functions/rag';

const OPENWEBUI_URL = process.env.OPENWEBUI_URL || 'http://localhost:3001';

export class AIOrchestrator {
  // Einfacher Chat-Endpunkt (Proxy zu OpenWebUI kompatibler /v1/chat/completions)
  static async handleChat(req: AuthenticatedRequest, res: Response) {
    try {
      const { messages, model = 'gpt-4o-mini', temperature = 0.2 } = req.body || {};

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'messages sind erforderlich' });
      }

      const response = await axios.post(`${OPENWEBUI_URL}/v1/chat/completions`, {
        model,
        messages,
        temperature,
      }, {
        headers: { 'Content-Type': 'application/json' },
      });

      return res.json({ success: true, data: response.data });
    } catch (error: any) {
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || 'Chat fehlgeschlagen';
      return res.status(status).json({ success: false, error: 'AIUpstreamError', message });
    }
  }

  // HR Assist Beispielfunktion (System-Prompt + User Prompt)
  static async handleHRAssist(req: AuthenticatedRequest, res: Response) {
    try {
      const { prompt } = req.body || {};
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'prompt ist erforderlich' });
      }

      const topChunks = await retrieveContext(prompt, 5);
      const context = topChunks.map((c, i) => `#${i + 1} ${c.sourcePath}\n${c.content}`).join('\n\n');
      const messages = [
        { role: 'system', content: 'Du bist ein HR-Assistent. Antworte präzise, strukturiert und in deutscher Sprache.' },
        { role: 'user', content: `Kontext (intern, docs):\n${context}\n\nFrage: ${prompt}` },
      ];

      const response = await axios.post(`${OPENWEBUI_URL}/v1/chat/completions`, { model: 'gpt-4o-mini', messages }, { headers: { 'Content-Type': 'application/json' } });
      return res.json({ success: true, data: response.data });
    } catch (error: any) {
      const status = error?.response?.status || 500;
      const message = error?.response?.data?.message || 'HR Assist fehlgeschlagen';
      return res.status(status).json({ success: false, error: 'AIUpstreamError', message });
    }
  }
}

export function registerAIRoutes(router: any) {
  router.post('/ai/chat', requirePermission('read', 'all'), AIOrchestrator.handleChat);
  router.post('/ai/hr-assist', requirePermission('read', 'all'), AIOrchestrator.handleHRAssist);
  router.post('/ai/rag/reindex', requirePermission('admin', 'all'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      const idx = await buildRagIndex();
      res.json({ success: true, data: { chunks: idx.chunks.length, model: idx.model, createdAt: idx.createdAt } });
    } catch (e) {
      res.status(500).json({ success: false, error: 'RAGIndexError', message: 'Re-Index fehlgeschlagen' });
    }
  });
}


