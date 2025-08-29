// AI Module - Web-RAG Integration
// Basierend auf Open WebUI Web-Search und URL-Browsing Features

import axios from 'axios';
import { JSDOM } from 'jsdom';
import type { WebRagRequest, WebRagResult, AIResponse } from '../types';

// Web-RAG Configuration
const WEB_SEARCH_ENABLED = process.env.WEB_SEARCH_ENABLED === 'true' || false;
const WEB_RAG_ALLOWLIST = (process.env.WEB_RAG_ALLOWLIST || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);
const SERPER_API_KEY = process.env.SERPER_API_KEY; // Google Search API
const BING_API_KEY = process.env.BING_API_KEY;     // Bing Search API

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  content?: string;
}

/**
 * Web-Suche durchführen (Google/Bing/DuckDuckGo)
 */
export async function searchWeb(
  query: string, 
  provider: 'google' | 'bing' | 'duckduckgo' = 'google',
  maxResults: number = 5
): Promise<AIResponse<WebRagResult[]>> {
  try {
    if (!WEB_SEARCH_ENABLED) {
      return {
        success: false,
        error: 'WebSearchDisabled',
        message: 'Web-Suche ist nicht aktiviert. Setzen Sie WEB_SEARCH_ENABLED=true in .env'
      };
    }

    let searchResults: SearchResult[] = [];

    switch (provider) {
      case 'google':
        searchResults = await searchGoogle(query, maxResults);
        break;
      case 'bing':
        searchResults = await searchBing(query, maxResults);
        break;
      case 'duckduckgo':
        searchResults = await searchDuckDuckGo(query, maxResults);
        break;
      default:
        throw new Error(`Unbekannter Search Provider: ${provider}`);
    }

    // Inhalte von den URLs scrapen (mit Allowlist-Filter, falls gesetzt)
    const webResults: WebRagResult[] = [];
    for (const result of searchResults) {
      try {
        const urlObj = new URL(result.url);
        const hostname = urlObj.hostname.toLowerCase();
        if (WEB_RAG_ALLOWLIST.length > 0 && !WEB_RAG_ALLOWLIST.some(domain => hostname.endsWith(domain))) {
          // Domain nicht erlaubt → überspringen
          continue;
        }
      } catch {}
      try {
        const content = await scrapeWebContent(result.url);
        webResults.push({
          title: result.title,
          url: result.url,
          content: content.content,
          snippet: result.snippet,
          timestamp: new Date().toISOString()
        });
      } catch (scrapeError) {
        console.warn(`Fehler beim Scrapen von ${result.url}:`, scrapeError);
        // Fallback: Nur Snippet verwenden
        webResults.push({
          title: result.title,
          url: result.url,
          content: result.snippet,
          snippet: result.snippet,
          timestamp: new Date().toISOString()
        });
      }
    }

    return {
      success: true,
      data: webResults,
      message: `${webResults.length} Web-Ergebnisse von ${provider} gefunden`
    };

  } catch (error: any) {
    console.error('Fehler bei Web-Suche:', error);
    return {
      success: false,
      error: 'WebSearchError',
      message: error?.message || 'Web-Suche fehlgeschlagen'
    };
  }
}

/**
 * Google Search über Serper API
 */
async function searchGoogle(query: string, maxResults: number): Promise<SearchResult[]> {
  if (!SERPER_API_KEY) {
    throw new Error('SERPER_API_KEY fehlt für Google-Suche');
  }

  const response = await axios.post('https://google.serper.dev/search', {
    q: query,
    num: maxResults,
    gl: 'de',
    hl: 'de'
  }, {
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json'
    }
  });

  const results = response.data?.organic || [];
  return results.map((r: any) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet || ''
  }));
}

/**
 * Bing Search über Bing Search API
 */
async function searchBing(query: string, maxResults: number): Promise<SearchResult[]> {
  if (!BING_API_KEY) {
    throw new Error('BING_API_KEY fehlt für Bing-Suche');
  }

  const response = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
    params: {
      q: query,
      count: maxResults,
      mkt: 'de-DE'
    },
    headers: {
      'Ocp-Apim-Subscription-Key': BING_API_KEY
    }
  });

  const results = response.data?.webPages?.value || [];
  return results.map((r: any) => ({
    title: r.name,
    url: r.url,
    snippet: r.snippet || ''
  }));
}

/**
 * DuckDuckGo Search (ohne API-Key, HTML-Scraping)
 */
async function searchDuckDuckGo(query: string, maxResults: number): Promise<SearchResult[]> {
  try {
    // DuckDuckGo Instant Answer API (limitiert, aber kostenlos)
    const response = await axios.get('https://api.duckduckgo.com/', {
      params: {
        q: query,
        format: 'json',
        no_redirect: '1',
        no_html: '1',
        skip_disambig: '1'
      }
    });

    const data = response.data;
    const results: SearchResult[] = [];

    // Abstract verwenden falls vorhanden
    if (data.Abstract) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || 'https://duckduckgo.com',
        snippet: data.Abstract
      });
    }

    // Related Topics verwenden
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      for (const topic of data.RelatedTopics.slice(0, maxResults - results.length)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text,
            url: topic.FirstURL,
            snippet: topic.Text
          });
        }
      }
    }

    return results.slice(0, maxResults);

  } catch (error) {
    console.warn('DuckDuckGo API-Fehler, verwende Fallback:', error);
    // Fallback: Einfache Antwort ohne echte Suche
    return [{
      title: `Suche nach "${query}"`,
      url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
      snippet: `Suche nach "${query}" auf DuckDuckGo. API-Integration limitiert.`
    }];
  }
}

/**
 * Website-Inhalt scrapen
 */
export async function scrapeWebContent(url: string): Promise<{ content: string; title?: string }> {
  try {
    // Basis-URL-Validierung
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Nur HTTP/HTTPS URLs sind erlaubt');
    }

    // Allowlist-Check
    const hostname = urlObj.hostname.toLowerCase();
    if (WEB_RAG_ALLOWLIST.length > 0 && !WEB_RAG_ALLOWLIST.some(domain => hostname.endsWith(domain))) {
      throw new Error(`Domain nicht erlaubt: ${hostname}`);
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de,en;q=0.5',
      },
      timeout: 10000,
      maxContentLength: 1024 * 1024 // 1MB Limit
    });

    if (!response.headers['content-type']?.includes('text/html')) {
      throw new Error('Content-Type ist nicht HTML');
    }

    // HTML parsen
    const dom = new JSDOM(response.data);
    const document = dom.window.document;

    // Störende Elemente entfernen
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer', 
      '.advertisement', '.ads', '.sidebar', '.menu'
    ];
    unwantedSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => el.remove());
    });

    // Titel extrahieren
    const title = document.querySelector('title')?.textContent?.trim() || 
                  document.querySelector('h1')?.textContent?.trim();

    // Haupt-Inhalt extrahieren (bevorzugt main, article, oder body)
    let mainContent = 
      document.querySelector('main')?.textContent ||
      document.querySelector('article')?.textContent ||
      document.querySelector('.content')?.textContent ||
      document.querySelector('#content')?.textContent ||
      document.body?.textContent || 
      '';

    // Text bereinigen
    const content = mainContent
      .replace(/\s+/g, ' ')           // Mehrfache Whitespaces
      .replace(/\n\s*\n/g, '\n')      // Mehrfache Newlines
      .trim();

    // Längenbegrenzung
    const maxLength = 5000;
    const truncatedContent = content.length > maxLength 
      ? content.substring(0, maxLength) + '...'
      : content;

    return {
      content: truncatedContent,
      title
    };

  } catch (error: any) {
    console.error(`Fehler beim Scrapen von ${url}:`, error);
    throw new Error(`Website-Scraping fehlgeschlagen: ${error.message}`);
  }
}

/**
 * Web-RAG: Kombination aus Suche und direkter URL
 */
export async function performWebRag(request: WebRagRequest): Promise<AIResponse<WebRagResult[]>> {
  try {
    let results: WebRagResult[] = [];

    // Direkte URL scrapen falls angegeben
    if (request.url) {
      try {
        const scrapedContent = await scrapeWebContent(request.url);
        results.push({
          title: scrapedContent.title || request.url,
          url: request.url,
          content: scrapedContent.content,
          snippet: scrapedContent.content.substring(0, 200) + '...',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn(`Direktes URL-Scraping fehlgeschlagen: ${error}`);
      }
    }

    // Web-Suche durchführen
    if (request.query && request.query.trim()) {
      const searchResponse = await searchWeb(
        request.query,
        request.searchProvider || 'google',
        request.maxResults || 3
      );
      
      if (searchResponse.success && searchResponse.data) {
        results.push(...searchResponse.data);
      }
    }

    // Duplikate entfernen (gleiche URLs)
    const uniqueResults = results.filter((result, index, self) => 
      index === self.findIndex(r => r.url === result.url)
    );

    return {
      success: true,
      data: uniqueResults,
      message: `${uniqueResults.length} Web-RAG-Quellen gefunden`
    };

  } catch (error: any) {
    console.error('Fehler bei Web-RAG:', error);
    return {
      success: false,
      error: 'WebRagError',
      message: error?.message || 'Web-RAG-Abfrage fehlgeschlagen'
    };
  }
}

/**
 * Web-RAG-Kontext für Chat-Antworten formatieren
 */
export function formatWebRagContext(webResults: WebRagResult[], maxLength: number = 3000): string {
  if (!webResults.length) return '';

  let context = 'Web-Kontext (aktuelle Informationen):\n\n';
  let currentLength = context.length;

  for (let i = 0; i < webResults.length; i++) {
    const result = webResults[i];
    const resultText = `[${i + 1}] **${result.title}** (${result.url}):\n${result.content}\n\n`;
    
    if (currentLength + resultText.length > maxLength) {
      // Abschneiden wenn zu lang
      const remainingSpace = maxLength - currentLength - 50; // Platz für "..."
      if (remainingSpace > 100) {
        context += `[${i + 1}] **${result.title}** (${result.url}):\n${result.content.substring(0, remainingSpace)}...\n\n`;
      }
      break;
    }
    
    context += resultText;
    currentLength += resultText.length;
  }

  return context;
}
