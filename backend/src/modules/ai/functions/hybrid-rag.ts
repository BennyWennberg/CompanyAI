// AI Module - Hybrid RAG Search
// BM25 + Vector Similarity + CrossEncoder Re-Ranking
// Basierend auf Open WebUI Hybrid Search Pipeline

import fs from 'fs';
import type { RagChunk } from './rag';
import { loadRagIndex, embedTexts } from './rag';

// BM25-Konfiguration
const BM25_K1 = 1.2;  // Term frequency saturation parameter
const BM25_B = 0.75;  // Field length normalization parameter

interface ScoredChunk extends RagChunk {
  vectorScore: number;
  bm25Score: number;
  hybridScore: number;
  rerankedScore?: number;
}

interface HybridSearchConfig {
  vectorWeight: number;      // 0.7 - Gewichtung für Vector-Similarity
  bm25Weight: number;       // 0.3 - Gewichtung für BM25-Score
  useReranking: boolean;    // CrossEncoder Re-Ranking verwenden
  expandQuery: boolean;     // Query-Expansion aktivieren
  minHybridScore: number;   // Minimum Hybrid-Score-Threshold
}

// Default-Konfiguration
const DEFAULT_HYBRID_CONFIG: HybridSearchConfig = {
  vectorWeight: 0.7,
  bm25Weight: 0.3,
  useReranking: process.env.HYBRID_RAG_RERANK === 'true',
  expandQuery: false,   // Vorerst deaktiviert
  minHybridScore: 0.1
};

/**
 * Cosine-Similarity zwischen zwei Vektoren
 */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0; 
  let normA = 0; 
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) { 
    dot += a[i] * b[i]; 
    normA += a[i] * a[i]; 
    normB += b[i] * b[i]; 
  }
  
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

/**
 * Text in Tokens aufteilen (einfache Tokenisierung)
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\säöüß]/g, ' ') // Deutsche Umlaute beibehalten
    .split(/\s+/)
    .filter(token => token.length > 2) // Stopwords und kurze Wörter filtern
    .filter(token => !['der', 'die', 'das', 'und', 'oder', 'aber', 'mit', 'für', 'auf', 'von', 'zu', 'in', 'ist', 'sind', 'war', 'waren', 'hat', 'haben', 'wird', 'werden', 'kann', 'könnte', 'soll', 'sollte', 'muss', 'müssen'].includes(token));
}

/**
 * Term-Frequenzen berechnen
 */
function calculateTermFrequencies(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  
  return tf;
}

/**
 * Document-Frequenzen berechnen (für IDF)
 */
function calculateDocumentFrequencies(chunks: RagChunk[]): Map<string, number> {
  const df = new Map<string, number>();
  
  for (const chunk of chunks) {
    const tokens = tokenize(chunk.content);
    const uniqueTokens = new Set(tokens);
    
    for (const token of uniqueTokens) {
      df.set(token, (df.get(token) || 0) + 1);
    }
  }
  
  return df;
}

/**
 * BM25-Score für einen Chunk berechnen
 */
function calculateBM25Score(
  queryTokens: string[], 
  chunk: RagChunk, 
  avgDocLength: number,
  documentFrequencies: Map<string, number>,
  totalDocuments: number
): number {
  const chunkTokens = tokenize(chunk.content);
  const chunkLength = chunkTokens.length;
  const termFreqs = calculateTermFrequencies(chunkTokens);
  
  let score = 0;
  
  for (const queryToken of queryTokens) {
    const tf = termFreqs.get(queryToken) || 0;
    
    if (tf > 0) {
      const df = documentFrequencies.get(queryToken) || 1;
      const idf = Math.log((totalDocuments - df + 0.5) / (df + 0.5));
      
      const numerator = tf * (BM25_K1 + 1);
      const denominator = tf + BM25_K1 * (1 - BM25_B + BM25_B * (chunkLength / avgDocLength));
      
      score += idf * (numerator / denominator);
    }
  }
  
  return Math.max(0, score); // Negative Scores vermeiden
}

/**
 * Query-Expansion (einfache Synonyme und Variationen)
 */
function expandQuery(query: string): string {
  const expansions: Record<string, string[]> = {
    'ki': ['künstliche intelligenz', 'artificial intelligence', 'ai', 'machine learning'],
    'künstliche intelligenz': ['ki', 'ai', 'machine learning'],
    'machine learning': ['maschinelles lernen', 'ki', 'ai'],
    'chatbot': ['chat bot', 'bot', 'assistent', 'assistant'],
    'entwicklung': ['development', 'programmierung', 'coding', 'implementierung'],
    'software': ['programm', 'application', 'app', 'tool'],
    'system': ['systeme', 'plattform', 'framework'],
    'benutzer': ['user', 'nutzer', 'anwender'],
    'daten': ['data', 'informationen', 'information']
  };
  
  let expandedQuery = query.toLowerCase();
  
  for (const [term, synonyms] of Object.entries(expansions)) {
    if (expandedQuery.includes(term)) {
      expandedQuery += ' ' + synonyms.join(' ');
    }
  }
  
  return expandedQuery;
}

/**
 * Hybrid RAG Search - Hauptfunktion
 */
export async function hybridRagSearch(
  query: string, 
  topK: number = 5, 
  config: Partial<HybridSearchConfig> = {}
): Promise<RagChunk[]> {
  try {
    const index = loadRagIndex();
    if (!index || index.chunks.length === 0) {
      console.warn('RAG-Index ist leer oder nicht geladen');
      return [];
    }

    const searchConfig: HybridSearchConfig = { ...DEFAULT_HYBRID_CONFIG, ...config };
    console.log(`🔍 Hybrid RAG Search: "${query}" (${index.chunks.length} Chunks, Vector: ${searchConfig.vectorWeight}, BM25: ${searchConfig.bm25Weight})`);

    // Optional: Prefix-Filter für Quellen (Metadaten-Filter einfacher Art)
    const prefixFilter = process.env.RAG_SOURCE_PREFIX_FILTER || '';
    const chunksToSearch = prefixFilter
      ? index.chunks.filter(c => (c.sourcePath || '').startsWith(prefixFilter))
      : index.chunks;
    if (chunksToSearch.length === 0) {
      console.warn('Prefix-Filter ergab 0 Dokumente');
      return [];
    }

    // Query-Expansion
    const processedQuery = searchConfig.expandQuery ? expandQuery(query) : query;
    const queryTokens = tokenize(processedQuery);
    
    if (queryTokens.length === 0) {
      console.warn('Keine gültigen Query-Tokens gefunden');
      return [];
    }

    // 1. Vector-Similarity-Scores berechnen
    const [queryEmbedding] = await embedTexts([processedQuery]);
    
    // 2. BM25-Vorbereitung
    const documentFrequencies = calculateDocumentFrequencies(chunksToSearch);
    const avgDocLength = chunksToSearch.reduce((sum, chunk) => sum + tokenize(chunk.content).length, 0) / chunksToSearch.length;
    const totalDocuments = chunksToSearch.length;

    // 3. Scores für alle Chunks berechnen
    const scoredChunks: ScoredChunk[] = chunksToSearch.map(chunk => {
      // Vector-Score
      const vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding);
      
      // BM25-Score
      const bm25Score = calculateBM25Score(queryTokens, chunk, avgDocLength, documentFrequencies, totalDocuments);
      
      // Normalisierung der BM25-Scores (0-1 Bereich)
      const maxBM25 = 10; // Empirischer Wert für Normalisierung
      const normalizedBM25 = Math.min(bm25Score / maxBM25, 1);
      
      // Hybrid-Score (gewichtete Kombination)
      const hybridScore = (searchConfig.vectorWeight * vectorScore) + (searchConfig.bm25Weight * normalizedBM25);
      
      return {
        ...chunk,
        vectorScore,
        bm25Score: normalizedBM25,
        hybridScore
      };
    });

    // 4. Nach Hybrid-Score sortieren
    scoredChunks.sort((a, b) => b.hybridScore - a.hybridScore);

    // 5. Minimum-Score-Filter anwenden
    const filteredChunks = scoredChunks.filter(chunk => chunk.hybridScore >= searchConfig.minHybridScore);

    // 6. Top-K auswählen
    const topChunks = filteredChunks.slice(0, topK);

    console.log(`📊 Hybrid Search Ergebnisse:`);
    topChunks.forEach((chunk, i) => {
      console.log(`   ${i + 1}. ${chunk.sourcePath} - Hybrid: ${chunk.hybridScore.toFixed(3)} (Vector: ${chunk.vectorScore.toFixed(3)}, BM25: ${chunk.bm25Score.toFixed(3)})`);
    });

    // 7. Re-Ranking (falls aktiviert) - einfacher lexical overlap Booster
    if (searchConfig.useReranking && topChunks.length > 1) {
      const qTokens = new Set(tokenize(processedQuery));
      const reranked = topChunks.map(chunk => {
        const cTokens = new Set(tokenize(chunk.content));
        let overlap = 0;
        qTokens.forEach(t => { if (cTokens.has(t)) overlap++; });
        const overlapScore = Math.min(1, overlap / Math.max(1, qTokens.size));
        const rerankedScore = (chunk as ScoredChunk).hybridScore + 0.05 * overlapScore;
        return { chunk, rerankedScore };
      }).sort((a, b) => b.rerankedScore - a.rerankedScore)
        .map(x => x.chunk);
      return reranked as RagChunk[];
    }

    return topChunks.map(({ vectorScore, bm25Score, hybridScore, rerankedScore, ...chunk }) => chunk);

  } catch (error) {
    console.error('Hybrid RAG Search Fehler:', error);
    
    // Fallback auf Standard-Vector-Suche
    console.log('🔄 Fallback auf Standard-Vector-Suche');
    const index = loadRagIndex();
    if (!index) return [];
    
    const [queryEmbedding] = await embedTexts([query]);
    const scored = index.chunks.map(c => ({ c, score: cosineSimilarity(queryEmbedding, c.embedding) }));
    scored.sort((x, y) => y.score - x.score);
    return scored.slice(0, topK).map(s => s.c);
  }
}

/**
 * Hybrid Search Statistiken
 */
export function getHybridSearchStats(): { 
  chunksTotal: number; 
  avgChunkLength: number; 
  uniqueTokens: number;
  topTokens: Array<{ token: string; frequency: number }>; 
} {
  try {
    const index = loadRagIndex();
    if (!index) {
      return { chunksTotal: 0, avgChunkLength: 0, uniqueTokens: 0, topTokens: [] };
    }

    let totalLength = 0;
    const tokenFreqs = new Map<string, number>();

    for (const chunk of index.chunks) {
      const tokens = tokenize(chunk.content);
      totalLength += tokens.length;
      
      for (const token of tokens) {
        tokenFreqs.set(token, (tokenFreqs.get(token) || 0) + 1);
      }
    }

    const avgChunkLength = totalLength / index.chunks.length;
    const uniqueTokens = tokenFreqs.size;
    
    // Top-Tokens (häufigste Begriffe)
    const topTokens = Array.from(tokenFreqs.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([token, frequency]) => ({ token, frequency }));

    return {
      chunksTotal: index.chunks.length,
      avgChunkLength: Math.round(avgChunkLength),
      uniqueTokens,
      topTokens
    };

  } catch (error) {
    console.error('Hybrid Search Stats Fehler:', error);
    return { chunksTotal: 0, avgChunkLength: 0, uniqueTokens: 0, topTokens: [] };
  }
}

/**
 * Search-Performance-Vergleich
 */
export async function compareSearchMethods(query: string, topK: number = 5): Promise<{
  vectorOnly: { chunks: RagChunk[]; duration: number };
  bm25Only: { chunks: RagChunk[]; duration: number };
  hybrid: { chunks: RagChunk[]; duration: number };
}> {
  const index = loadRagIndex();
  if (!index) {
    throw new Error('RAG-Index nicht verfügbar');
  }

  // 1. Vector-Only Search
  const vectorStart = Date.now();
  const [queryEmbedding] = await embedTexts([query]);
  const vectorScored = index.chunks.map(c => ({ c, score: cosineSimilarity(queryEmbedding, c.embedding) }));
  vectorScored.sort((x, y) => y.score - x.score);
  const vectorChunks = vectorScored.slice(0, topK).map(s => s.c);
  const vectorDuration = Date.now() - vectorStart;

  // 2. BM25-Only Search
  const bm25Start = Date.now();
  const queryTokens = tokenize(query);
  const documentFrequencies = calculateDocumentFrequencies(index.chunks);
  const avgDocLength = index.chunks.reduce((sum, chunk) => sum + tokenize(chunk.content).length, 0) / index.chunks.length;
  
  const bm25Scored = index.chunks.map(chunk => ({
    chunk,
    score: calculateBM25Score(queryTokens, chunk, avgDocLength, documentFrequencies, index.chunks.length)
  }));
  bm25Scored.sort((a, b) => b.score - a.score);
  const bm25Chunks = bm25Scored.slice(0, topK).map(s => s.chunk);
  const bm25Duration = Date.now() - bm25Start;

  // 3. Hybrid Search
  const hybridStart = Date.now();
  const hybridChunks = await hybridRagSearch(query, topK);
  const hybridDuration = Date.now() - hybridStart;

  return {
    vectorOnly: { chunks: vectorChunks, duration: vectorDuration },
    bm25Only: { chunks: bm25Chunks, duration: bm25Duration },
    hybrid: { chunks: hybridChunks, duration: hybridDuration }
  };
}
