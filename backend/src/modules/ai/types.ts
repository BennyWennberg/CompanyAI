// AI Module - Types

export interface AIChatRequest {
  model?: string;
  temperature?: number;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}


