import apiClient from '../api/apiClient';

/**
 * AuthService provides helper methods for managing user authentication
 * and interacting with auth-related API endpoints.
 */
export const AuthService = {
  /**
   * Authenticate google user by sending Google ID token to backend
   * @param {string} idToken - The Google Sign-In credentials ID token
   * @returns {Promise<object>} The authenticated user and token details
   */
  loginWithGoogle: async (idToken) => {
    const response = await apiClient.post('auth/google/', { token: idToken });
    const data = response.data;
    
    // Save authentication details in localStorage
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token);
    }
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    if (data.employee) {
      localStorage.setItem('user', JSON.stringify(data.employee));
    }
    return data;
  },

  /**
   * Refresh access token using stored refresh token
   * @returns {Promise<string>} The new access token
   */
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token found');
    }
    const response = await apiClient.post('auth/refresh/', { refresh: refreshToken });
    const { access_token, refresh_token: new_refresh_token } = response.data;
    if (access_token) {
      localStorage.setItem('access_token', access_token);
    }
    if (new_refresh_token) {
      localStorage.setItem('refresh_token', new_refresh_token);
    }
    return access_token;
  },

  /**
   * Clears tokens and redirects user to login page
   */
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        // Send a request to the backend to blacklist the token
        await apiClient.post('auth/logout/', { refresh: refreshToken });
      }
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
  },

  /**
   * Checks if user is authenticated (checks access token presence)
   * @returns {boolean} True if authenticated
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },

  /**
   * Get current authenticated user details
   * @returns {object|null} The parsed user object or null
   */
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      console.error('Error parsing user from localStorage', e);
      return null;
    }
  },

  /**
   * Get access token
   * @returns {string|null}
   */
  getAccessToken: () => {
    return localStorage.getItem('access_token');
  },

  /**
   * Get refresh token
   * @returns {string|null}
   */
  getRefreshToken: () => {
    return localStorage.getItem('refresh_token');
  }
};

export default AuthService;
