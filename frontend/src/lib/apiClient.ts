import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = config.headers || {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    // Nur Metadaten loggen, keine sensiblen Payloads
    console.error('API Error', {
      url: error?.config?.url,
      method: error?.config?.method,
      status: error?.response?.status,
    });
    return Promise.reject(error);
  }
);

export default apiClient;

// Download-Funktion für Original-Dateien
export const downloadOriginalFile = async (filename: string, originalName?: string): Promise<boolean> => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('Kein Auth-Token für Download verfügbar');
      return false;
    }

    console.log(`📁 Starte Download: ${filename}`);
    
    const response = await fetch(`/api/ai/rag/download/original/${filename}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      console.error(`Download failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return false;
    }
    
    // Dateiname aus Response-Headers lesen
    const contentDisposition = response.headers.get('content-disposition');
    let downloadFilename = originalName || filename;
    
    // Dateiname aus Content-Disposition extrahieren falls vorhanden
    if (contentDisposition) {
      const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
      if (matches != null && matches[1]) {
        downloadFilename = matches[1].replace(/['"]/g, '');
      }
    }
    
    // Datei als Blob herunterladen
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // Download-Link erstellen und automatisch klicken
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFilename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    console.log(`✅ Download erfolgreich: ${downloadFilename}`);
    return true;
  } catch (error) {
    console.error('Download fehler:', error);
    return false;
  }
};