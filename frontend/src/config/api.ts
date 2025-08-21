// API Configuration
// Zentrale API-Konfiguration für alle Frontend-Komponenten

// Environment Variable laden
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5005';

// API Endpoints konfigurieren
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: {
    // Health & System
    HEALTH: `${API_BASE_URL}/api/health`,
    HELLO: `${API_BASE_URL}/api/hello`,
    
    // HR Module
    HR_STATS: `${API_BASE_URL}/api/hr/stats`,
    HR_EMPLOYEES: `${API_BASE_URL}/api/hr/employees`,
    
    // Data Module (Azure + Manual)
    DATA_USERS: `${API_BASE_URL}/api/data/users`,
    DATA_SYNC: `${API_BASE_URL}/api/data/sync`,
    
    // Support Module
    SUPPORT_TICKETS: `${API_BASE_URL}/api/support/tickets`,
    
    // AI Module
    AI_CHAT: `${API_BASE_URL}/api/ai/chat`,
    AI_RAG: `${API_BASE_URL}/api/ai/rag`,
    AI_SESSIONS: `${API_BASE_URL}/api/ai/sessions`,
    AI_VOICE: `${API_BASE_URL}/api/ai/voice`,
    
    // Admin Module
    ADMIN_AUTH: `${API_BASE_URL}/admin/auth`,
    ADMIN_USERS: `${API_BASE_URL}/admin/users`,
    ADMIN_ANALYTICS: `${API_BASE_URL}/admin/analytics`
  }
};

// Helper-Funktion für API-Aufrufe mit Auth
export const apiCall = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('authToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };
  
  return fetch(url, {
    ...options,
    headers
  });
};

// Helper für GET-Requests
export const apiGet = async (url: string): Promise<any> => {
  const response = await apiCall(url, { method: 'GET' });
  return response.json();
};

// Helper für POST-Requests
export const apiPost = async (url: string, data: any): Promise<any> => {
  const response = await apiCall(url, {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return response.json();
};

// Helper für PUT-Requests
export const apiPut = async (url: string, data: any): Promise<any> => {
  const response = await apiCall(url, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
  return response.json();
};

// Debug: API-Konfiguration ausgeben
console.log('🔗 API Configuration loaded:', {
  BASE_URL: API_BASE_URL,
  ENV_VAR: import.meta.env.VITE_API_BASE_URL,
  ENDPOINTS: Object.keys(API_CONFIG.ENDPOINTS).length
});

export default API_CONFIG;
