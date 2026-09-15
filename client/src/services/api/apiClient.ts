import axios from 'axios';

const getApiBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim();
  }
  // Production fallback: if running on a real domain or reverse-proxy, default to relative '/api/v1'
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api/v1';
  }
  return 'http://localhost:5000/api/v1';
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token if stored in localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to format errors gracefully
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const customMessage = error.response?.data?.message || 'An unexpected error occurred.';
    const errors = error.response?.data?.errors || [];
    const statusCode = error.response?.status || 500;

    return Promise.reject({
      statusCode,
      message: customMessage,
      errors,
      originalError: error,
    });
  }
);
