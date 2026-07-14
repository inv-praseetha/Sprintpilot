import axios from 'axios';
const BACKEND_URL = import.meta.env.VITE_API_URL;

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

// Response Interceptor for Token Refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Skip refresh logic for specific auth endpoints
    const authEndpoints = ['login/', 'register/', 'refresh/', 'forgot-password/', 'reset-password/'];
    const isAuthEndpoint = authEndpoints.some(endpoint => originalRequest.url.includes(endpoint));

    // If the error is 401 (Unauthorized), we haven't retried yet, and it's NOT an auth endpoint
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      // If a refresh is already in progress, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      // Lock immediately
      isRefreshing = true;
      console.log('401 Unauthorized detected. Attempting to refresh token...');

      try {
        // Use the dedicated refreshClient to avoid recursive interceptor loops
        // And avoid custom headers that cause CORS issues
        await refreshClient.post('refresh/', {});
        
        console.log('Token refresh successful. Processing queue...');
        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('Token refresh failed (Refresh token expired or blocked):', refreshError);
        processQueue(refreshError, null);
        
        // Clear session and redirect to login
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
