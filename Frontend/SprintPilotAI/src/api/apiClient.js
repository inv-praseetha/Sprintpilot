import axios from 'axios';
const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/';

const apiClient = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dedicated instance for refreshing tokens (no interceptors attached)
const refreshClient = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Request Interceptor: Attach Access Token to every outgoing request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for Token Refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Skip refresh logic for specific auth endpoints
    const authEndpoints = ['auth/google/', 'auth/refresh/', 'login/', 'register/', 'forgot-password/', 'reset-password/'];
    const isAuthEndpoint = authEndpoints.some(endpoint => originalRequest.url && originalRequest.url.includes(endpoint));

    // If the error is 401 (Unauthorized), we haven't retried yet, and it's NOT an auth endpoint
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // Lock immediately
      isRefreshing = true;
      console.log('401 Unauthorized detected. Attempting to refresh token...');

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token found in localStorage');
        }

        // Use the dedicated refreshClient to avoid recursive interceptor loops
        const response = await refreshClient.post('auth/refresh/', { refresh: refreshToken });
        const { access_token, refresh_token: new_refresh_token } = response.data;
        
        // Save new token credentials
        localStorage.setItem('access_token', access_token);
        if (new_refresh_token) {
          localStorage.setItem('refresh_token', new_refresh_token);
        }
        
        console.log('Token refresh successful. Processing queue...');
        processQueue(null, access_token);
        
        // Update authorization header for the failed request and retry
        originalRequest.headers['Authorization'] = `Bearer ${access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed (Refresh token expired or blocked):', refreshError);
        processQueue(refreshError, null);
        
        // Clear session and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

