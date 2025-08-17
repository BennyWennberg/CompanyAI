// AI Module - Types

export interface AIChatRequest {
  model?: string;
  temperature?: number;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  provider?: 'openai' | 'gemini' | 'ollama';
  rag?: boolean;
  ragTopK?: number;
  // NEU: Chat-History Features
  sessionId?: string;
  saveSession?: boolean;
  sessionTitle?: string;
  tags?: string[];
  // NEU: Web-RAG Features
  webRag?: boolean;
  webSearchQuery?: string;
  websiteUrl?: string;
}

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// NEU: Chat-Session Management
export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{
    path: string;
    chunk: string;
    preview: string;
    downloadUrl?: string;
    isOriginal?: boolean;
    isWeb?: boolean;
    webUrl?: string;
  }>;
}

export interface ChatSession {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  folder?: string;
  settings: {
    provider: 'openai' | 'gemini' | 'ollama';
    model: string;
    temperature: number;
    useRag: boolean;
    ragTopK: number;
    useWebRag: boolean;
  };
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  folder?: string;
  messageCount: number;
  lastMessage?: string;
  createdAt: string;
  updatedAt: string;
}

// NEU: Web-RAG Types
export interface WebRagRequest {
  query: string;
  url?: string;
  searchProvider?: 'google' | 'bing' | 'duckduckgo';
  maxResults?: number;
}

export interface WebRagResult {
  title: string;
  url: string;
  content: string;
  snippet: string;
  timestamp: string;
}

// Session-Management Requests
export interface CreateSessionRequest {
  title: string;
  description?: string;
  tags?: string[];
  folder?: string;
  settings: ChatSession['settings'];
}

export interface UpdateSessionRequest {
  id: string;
  title?: string;
  description?: string;
  tags?: string[];
  folder?: string;
  settings?: Partial<ChatSession['settings']>;
}

export interface SearchSessionsRequest {
  query?: string;
  tags?: string[];
  folder?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
}

// NEU: Voice Integration Types
export interface VoiceToTextRequest {
  audioFormat: 'mp3' | 'wav' | 'ogg' | 'webm';
  language?: string;
}

export interface TextToVoiceRequest {
  text: string;
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  format?: 'mp3' | 'opus' | 'aac' | 'flac';
  speed?: number;
}

export interface VoiceResponse {
  success: boolean;
  data?: {
    text?: string;        // STT Response  
    audioUrl?: string;    // TTS Response
    duration?: number;    // Audio duration in seconds
  };
  error?: string;
  message?: string;
}


