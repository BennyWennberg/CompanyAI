import fs from 'fs';
import path from 'path';
import axios from 'axios';

const DOCS_DIR = path.resolve(process.cwd(), 'docs');
const RAG_INDEX_PATH = process.env.RAG_INDEX_PATH || path.resolve(process.cwd(), 'backend', 'rag_index.json');
const OPENWEBUI_URL = process.env.OPENWEBUI_URL || 'http://localhost:3001';
const EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL || 'text-embedding-3-small';

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
  const res = await axios.post(`${OPENWEBUI_URL}/v1/embeddings`, {
    model: EMBEDDING_MODEL,
    input: texts,
  }, { headers: { 'Content-Type': 'application/json' } });
  const vectors: number[][] = res.data.data.map((d: any) => d.embedding);
  return vectors;
}

export async function buildRagIndex(): Promise<RagIndex> {
  const files = listMarkdownFiles(DOCS_DIR);
  const allChunks: { sourcePath: string; content: string }[] = [];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf-8');
    const chunks = chunkText(content);
    chunks.forEach((c, idx) => allChunks.push({ sourcePath: path.relative(DOCS_DIR, f) + `#${idx + 1}`, content: c }));
  }

  const embeddings = await embedTexts(allChunks.map(c => c.content));
  const index: RagIndex = {
    model: EMBEDDING_MODEL,
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

export async function retrieveContext(query: string, topK = 5): Promise<RagChunk[]> {
  const index = loadRagIndex();
  if (!index) return [];
  const [queryEmbedding] = await embedTexts([query]);
  const scored = index.chunks.map(c => ({ c, score: cosineSimilarity(queryEmbedding, c.embedding) }));
  scored.sort((x, y) => y.score - x.score);
  return scored.slice(0, topK).map(s => s.c);
}



