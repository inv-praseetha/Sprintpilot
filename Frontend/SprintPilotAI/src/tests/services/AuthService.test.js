import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../../api/apiClient';
import AuthService from '../../services/AuthService';

vi.mock('../../api/apiClient', () => ({
  default: {
    post: vi.fn()
  }
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('loginWithGoogle', () => {
    it('sends token and saves access_token, refresh_token, and user in localStorage', async () => {
      const mockBackendResponse = {
        access_token: 'acc123',
        refresh_token: 'ref123',
        employee: { id: 1, name: 'Alice' }
      };
      apiClient.post.mockResolvedValueOnce({ data: mockBackendResponse });

      const result = await AuthService.loginWithGoogle('googleToken123');

      expect(apiClient.post).toHaveBeenCalledWith('auth/google/', { token: 'googleToken123' });
      expect(localStorage.getItem('access_token')).toBe('acc123');
      expect(localStorage.getItem('refresh_token')).toBe('ref123');
      expect(localStorage.getItem('user')).toBe(JSON.stringify({ id: 1, name: 'Alice' }));
      expect(result).toEqual(mockBackendResponse);
    });

    it('handles response missing optional tokens gracefully', async () => {
      apiClient.post.mockResolvedValueOnce({ data: {} });

      const result = await AuthService.loginWithGoogle('token');

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(result).toEqual({});
    });
  });

  describe('refreshToken', () => {
    it('throws error if refresh token is absent from localStorage', async () => {
      await expect(AuthService.refreshToken()).rejects.toThrow('No refresh token found');
    });

    it('posts refresh token and updates tokens in localStorage', async () => {
      localStorage.setItem('refresh_token', 'oldRefresh');
      apiClient.post.mockResolvedValueOnce({
        data: { access_token: 'newAccess', refresh_token: 'newRefresh' }
      });

      const newToken = await AuthService.refreshToken();

      expect(apiClient.post).toHaveBeenCalledWith('auth/refresh/', { refresh: 'oldRefresh' });
      expect(newToken).toBe('newAccess');
      expect(localStorage.getItem('access_token')).toBe('newAccess');
      expect(localStorage.getItem('refresh_token')).toBe('newRefresh');
    });
  });

  describe('logout', () => {
    it('calls logout endpoint if refresh_token present and clears localStorage', async () => {
      localStorage.setItem('access_token', 'acc');
      localStorage.setItem('refresh_token', 'ref');
      localStorage.setItem('user', '{}');
      apiClient.post.mockResolvedValueOnce({});

      await AuthService.logout();

      expect(apiClient.post).toHaveBeenCalledWith('auth/logout/', { refresh: 'ref' });
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });

    it('clears localStorage even if API call throws an error', async () => {
      localStorage.setItem('refresh_token', 'ref');
      apiClient.post.mockRejectedValueOnce(new Error('Logout failed'));

      await AuthService.logout();

      expect(localStorage.getItem('refresh_token')).toBeNull();
    });
  });

  describe('utility getters', () => {
    it('isAuthenticated returns true if access_token exists', () => {
      expect(AuthService.isAuthenticated()).toBe(false);
      localStorage.setItem('access_token', 'token');
      expect(AuthService.isAuthenticated()).toBe(true);
    });

    it('getCurrentUser returns parsed user object', () => {
      const user = { id: 5, role: 'PM' };
      localStorage.setItem('user', JSON.stringify(user));
      expect(AuthService.getCurrentUser()).toEqual(user);
    });

    it('getCurrentUser returns null if user is not in localStorage or invalid JSON', () => {
      expect(AuthService.getCurrentUser()).toBeNull();
      localStorage.setItem('user', 'invalid-json');
      expect(AuthService.getCurrentUser()).toBeNull();
    });

    it('getAccessToken and getRefreshToken return correct tokens', () => {
      localStorage.setItem('access_token', 'a_tok');
      localStorage.setItem('refresh_token', 'r_tok');
      expect(AuthService.getAccessToken()).toBe('a_tok');
      expect(AuthService.getRefreshToken()).toBe('r_tok');
    });
  });
});
