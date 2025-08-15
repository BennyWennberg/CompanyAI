// AI Module - Orchestrator (Direct Providers)

import { Response } from 'express';
import axios from 'axios';
import { AuthenticatedRequest, requirePermission } from '../hr/core/auth';
import { buildRagIndex, retrieveContext, addManualDoc, listDocsWithMeta, readDoc } from './functions/rag';
import type { AIChatRequest } from './types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

type ChatMsg = AIChatRequest['messages'][number];

export class AIOrchestrator {
  // Chat-Endpunkt mit Direkt-Providern + optionalem RAG
  static async handleChat(req: AuthenticatedRequest, res: Response) {
    try {
      const { messages, model = 'gpt-4o-mini', temperature = 0.2, provider = 'openai', rag = false, ragTopK = 5 } = (req.body || {}) as AIChatRequest;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, error: 'ValidationError', message: 'messages sind erforderlich' });
      }

      let finalMessages: ChatMsg[] = messages as ChatMsg[];
      let ragSources: Array<{ path: string; chunk: string; preview: string }> = [];
      if (rag) {
        const lastUser = [...messages].reverse().find(m => m.role === 'user')?.content || '';
        const top = await retrieveContext(lastUser, ragTopK || 5);
        ragSources = top.map(c => ({ path: (c.sourcePath || '').split('#')[0], chunk: c.sourcePath, preview: c.content.slice(0, 200) }));
        const context = top.map((c, i) => `#${i + 1} ${c.sourcePath}\n${c.content}`).join('\n\n');
        finalMessages = [
          { role: 'system', content: 'Nutze den bereitgestellten internen Kontext, antworte präzise und in Deutsch.' },
          { role: 'user', content: `Kontext (intern):\n${context}` },
          ...messages as ChatMsg[],
        ];
      }

      const data = await dispatchChat({ provider, model: model || 'gpt-4o-mini', temperature, messages: finalMessages });
      return res.json({ success: true, data, ...(rag ? { meta: { rag: { sources: ragSources } } } : {}) });
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
      const context = topChunks.map((c, i) => `#${i + 1} ${c.sourcePath}\n${c.content}`).join('\n\n');
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

  // Fügt eine manuelle Markdown-Datei zu docs/uploads/ hinzu (optional Reindex)
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
      return res.json({ success: true, data: { created, reindexed: reindex ? indexInfo : undefined } });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: 'RAGManualDocError', message: error?.message || 'Manual Doc konnte nicht hinzugefügt werden' });
    }
  }
}

export function registerAIRoutes(router: any) {
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


