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


