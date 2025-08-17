import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Externe Ordner-Konfiguration (neue Struktur)
const RAG_EXTERNAL_DOCS_PATH = process.env.RAG_EXTERNAL_DOCS_PATH;
const DOCS_DIR = RAG_EXTERNAL_DOCS_PATH ? path.resolve(RAG_EXTERNAL_DOCS_PATH) : path.resolve(process.cwd(), 'docs');
const MARKDOWNS_DIR = path.resolve(DOCS_DIR, 'markdowns');
const RAG_INDEX_PATH = process.env.RAG_INDEX_PATH || (RAG_EXTERNAL_DOCS_PATH ? path.resolve(RAG_EXTERNAL_DOCS_PATH, 'rag_index.json') : path.resolve(process.cwd(), 'backend', 'rag_index.json'));
const RAG_EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL || 'text-embedding-3-small';
const RAG_EMBEDDING_PROVIDER = (process.env.RAG_EMBEDDING_PROVIDER || 'openai') as 'openai' | 'gemini' | 'ollama';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

export interface RagChunk {
  id: string;
  sourcePath: string;
  content: string;
  embedding: number[];
}

export interface RagIndex {
  model: string;
  createdAt: string;
  chunks: RagChunk[];
}

function ensureUploadsDir() {
  try {
    if (!fs.existsSync(DOCS_DIR)) {
      console.log(`Erstelle externen Dokumenten-Ordner: ${DOCS_DIR}`);
      fs.mkdirSync(DOCS_DIR, { recursive: true });
    }
    if (!fs.existsSync(MARKDOWNS_DIR)) {
      console.log(`Erstelle Markdowns-Ordner: ${MARKDOWNS_DIR}`);
      fs.mkdirSync(MARKDOWNS_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Fehler beim Erstellen der externen Ordner:', error);
    throw new Error(`Externe Ordner konnten nicht erstellt werden: ${error}`);
  }
}

function listMarkdownFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listMarkdownFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

export function listDocsWithMeta(): Array<{ path: string; size: number; updatedAt: string; isExternal: boolean }> {
  if (!fs.existsSync(MARKDOWNS_DIR)) {
    console.warn(`Markdowns-Ordner nicht gefunden: ${MARKDOWNS_DIR}`);
    return [];
  }
  const files = listMarkdownFiles(MARKDOWNS_DIR);
  return files.map(f => ({
    path: path.relative(MARKDOWNS_DIR, f),
    size: fs.statSync(f).size,
    updatedAt: fs.statSync(f).mtime.toISOString(),
    isExternal: !!RAG_EXTERNAL_DOCS_PATH
  }));
}

function chunkText(text: string, maxChars = 1200, overlap = 150): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    const chunk = text.slice(start, end);
    chunks.push(chunk);
    if (end === text.length) break;
    start = end - overlap;
    if (start < 0) start = 0;
  }
  return chunks;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  switch (RAG_EMBEDDING_PROVIDER) {
    case 'openai':
      if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY fehlt');
      {
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` };
        const resp = await axios.post('https://api.openai.com/v1/embeddings', {
          input: texts,
          model: RAG_EMBEDDING_MODEL,
        }, { headers });
        return resp.data.data.map((d: any) => d.embedding);
      }
    case 'gemini':
      if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY fehlt');
      {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(RAG_EMBEDDING_MODEL)}:batchEmbedContents?key=${GEMINI_API_KEY}`;
        const contents = texts.map(t => ({ content: { parts: [{ text: t }] } }));
        const resp = await axios.post(url, { requests: contents }, { headers: { 'Content-Type': 'application/json' } });
        return resp.data?.embeddings?.map((e: any) => e.values) || resp.data?.responses?.map((r: any) => r.embedding?.values) || [];
      }
    case 'ollama':
      {
        const resp = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
          model: RAG_EMBEDDING_MODEL,
          input: texts.join('\n\n---\n\n'),
        }, { headers: { 'Content-Type': 'application/json' } });
        const emb = resp.data?.embedding;
        if (emb && Array.isArray(emb)) {
          return texts.map(() => emb);
        }
        const arr = resp.data?.data?.map((d: any) => d.embedding);
        if (arr) return arr;
        throw new Error('Ollama embeddings response nicht verstanden');
      }
    default:
      throw new Error(`Unbekannter Embedding Provider: ${RAG_EMBEDDING_PROVIDER}`);
  }
}

export async function buildRagIndex(): Promise<RagIndex> {
  ensureUploadsDir();
  const files = listMarkdownFiles(MARKDOWNS_DIR);
  const allChunks: { sourcePath: string; content: string }[] = [];
  
  console.log(`🔍 RAG Index: Verarbeite ${files.length} Markdown-Dateien...`);
  
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf-8');
    const chunks = chunkText(content);
    
    // Original-Datei-Pfad ableiten (falls vorhanden)
    const markdownFilename = path.basename(f, '.md');
    const originalFile = findOriginalFileForMarkdown(markdownFilename);
    const sourceReference = originalFile || path.relative(MARKDOWNS_DIR, f);
    
    console.log(`📄 ${markdownFilename} → ${originalFile ? '📁 ' + originalFile : '📝 ' + sourceReference}`);
    
    chunks.forEach((c, idx) => allChunks.push({ 
      sourcePath: sourceReference + `#${idx + 1}`, 
      content: c 
    }));
  }

  const embeddings = await embedTexts(allChunks.map(c => c.content));
  const index: RagIndex = {
    model: `${RAG_EMBEDDING_PROVIDER}:${RAG_EMBEDDING_MODEL}`,
    createdAt: new Date().toISOString(),
    chunks: allChunks.map((c, i) => ({
      id: `chunk_${i}`,
      sourcePath: c.sourcePath,
      content: c.content,
      embedding: embeddings[i],
    })),
  };

  fs.writeFileSync(RAG_INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');
  return index;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0; let na = 0; let nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

export function loadRagIndex(): RagIndex | null {
  if (!fs.existsSync(RAG_INDEX_PATH)) return null;
  const raw = fs.readFileSync(RAG_INDEX_PATH, 'utf-8');
  return JSON.parse(raw);
}

export async function retrieveContext(query: string, topK = 5, useHybridSearch = true): Promise<RagChunk[]> {
  // Hybrid RAG Search aktiviert? (Feature-Flag)
  const hybridRagEnabled = process.env.HYBRID_RAG_ENABLED === 'true' || useHybridSearch;
  
  if (hybridRagEnabled) {
    try {
      // Importiere Hybrid-Suche dynamisch
      const { hybridRagSearch } = await import('./hybrid-rag');
      const hybridResults = await hybridRagSearch(query, topK, {
        vectorWeight: 0.7,
        bm25Weight: 0.3,
        useReranking: false, // Vorerst deaktiviert
        expandQuery: false,  // Vorerst deaktiviert
        minHybridScore: 0.05
      });
      
      if (hybridResults.length > 0) {
        console.log(`🔍 Hybrid RAG: ${hybridResults.length} Ergebnisse für "${query}"`);
        return hybridResults;
      }
    } catch (hybridError) {
      console.warn('Hybrid RAG Fehler, fallback auf Vector-Suche:', hybridError);
    }
  }
  
  // Fallback: Standard Vector-Suche
  const index = loadRagIndex();
  if (!index) return [];
  const [queryEmbedding] = await embedTexts([query]);
  const scored = index.chunks.map(c => ({ c, score: cosineSimilarity(queryEmbedding, c.embedding) }));
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, topK).map(s => s.c);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function addManualDoc(title: string, content: string): Promise<{ filePath: string; relativePath: string; isExternal: boolean }> {
  ensureUploadsDir();
  const slug = slugify(title || 'manual-doc');
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${slug}-${ts}.md`;
  const fullPath = path.join(MARKDOWNS_DIR, filename);
  const md = `# ${title}\n\n${content}\n`;
  fs.writeFileSync(fullPath, md, 'utf-8');
  console.log(`Dokument gespeichert in externem Ordner: ${fullPath}`);
  return { 
    filePath: fullPath, 
    relativePath: path.relative(MARKDOWNS_DIR, fullPath),
    isExternal: !!RAG_EXTERNAL_DOCS_PATH
  };
}

/**
 * Original-Datei für Markdown-Filename finden
 */
function findOriginalFileForMarkdown(markdownBasename: string): string | null {
  const ORIGINALS_DIR = path.resolve(DOCS_DIR, 'originals');
  if (!fs.existsSync(ORIGINALS_DIR)) {
    console.log(`⚠️  Original-Ordner existiert nicht: ${ORIGINALS_DIR}`);
    return null;
  }
  
  try {
    const files = fs.readdirSync(ORIGINALS_DIR);
    console.log(`🔍 Suche Original für "${markdownBasename}" in ${files.length} Dateien...`);
    
    // Exakte Suche nach Datei mit gleichem Basename
    let matchingFile = files.find(f => {
      const fileBasename = path.parse(f).name;
      const exactMatch = fileBasename === markdownBasename;
      if (exactMatch) {
        console.log(`   ${f} (${fileBasename}) → ✅ EXAKT MATCH`);
      }
      return exactMatch;
    });
    
    // Wenn keine exakte Übereinstimmung, versuche ähnlichen Namen zu finden
    if (!matchingFile) {
      console.log(`❌ Keine exakte Übereinstimmung. Prüfe ähnliche Namen...`);
      matchingFile = files.find(f => {
        const fileBasename = path.parse(f).name;
        // Prüfe ob der Markdown-Name im Original-Namen enthalten ist oder umgekehrt
        const similarMatch = fileBasename.includes(markdownBasename) || markdownBasename.includes(fileBasename);
        if (similarMatch) {
          console.log(`   ${f} (${fileBasename}) → 🔄 ÄHNLICH MATCH`);
        }
        return similarMatch;
      });
    }
    
    const result = matchingFile ? `originals/${matchingFile}` : null;
    console.log(`🎯 Ergebnis für "${markdownBasename}": ${result || '📝 KEINE ORIGINAL-DATEI (verwende Markdown)'}`);
    return result;
  } catch (error) {
    console.warn('Fehler beim Suchen der Original-Datei:', error);
    return null;
  }
}

export function readDoc(relativePath: string): { path: string; content: string } {
  ensureUploadsDir();
  const normalized = relativePath.replace(/\\/g, '/');
  
  // Prüfen ob es ein Original-Datei-Pfad ist
  if (normalized.startsWith('originals/')) {
    // Original-Datei -> entsprechende Markdown-Datei finden
    const originalFilename = normalized.replace('originals/', '');
    const baseName = path.parse(originalFilename).name;
    const markdownPath = path.resolve(MARKDOWNS_DIR, `${baseName}.md`);
    
    if (fs.existsSync(markdownPath)) {
      const content = fs.readFileSync(markdownPath, 'utf-8');
      return { path: normalized, content };
    } else {
      throw new Error('Zugehörige Markdown-Datei nicht gefunden');
    }
  } else {
    // Standard Markdown-Datei-Pfad
    const fullPath = path.resolve(MARKDOWNS_DIR, normalized);
    if (!fullPath.startsWith(MARKDOWNS_DIR)) {
      throw new Error('Ungültiger Pfad');
    }
    if (!fs.existsSync(fullPath)) {
      throw new Error('Datei nicht gefunden');
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    return { path: normalized, content };
  }
}



