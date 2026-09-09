import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import apiClient from '../../api/apiClient';

describe('apiClient Interceptors', () => {
  let originalLocation;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    originalLocation = window.location;
  });

  afterEach(() => {
    localStorage.clear();
    window.location = originalLocation;
  });

  describe('Request Interceptor', () => {
    const requestFulfilled = apiClient.interceptors.request.handlers[0].fulfilled;
    const requestRejected = apiClient.interceptors.request.handlers[0].rejected;

    it('attaches Authorization header when access_token exists and endpoint is non-auth', () => {
      localStorage.setItem('access_token', 'token_xyz');
      const config = { url: 'projects/1/', headers: {} };
      const res = requestFulfilled(config);

      expect(res.headers['Authorization']).toBe('Bearer token_xyz');
    });

    it('does NOT attach Authorization header when access_token is missing', () => {
      const config = { url: 'projects/1/', headers: {} };
      const res = requestFulfilled(config);

      expect(res.headers['Authorization']).toBeUndefined();
    });

    it('does NOT attach Authorization header for auth endpoints', () => {
      localStorage.setItem('access_token', 'token_xyz');
      const config = { url: 'auth/google/', headers: {} };
      const res = requestFulfilled(config);

      expect(res.headers['Authorization']).toBeUndefined();
    });

    it('handles request rejection', async () => {
      const err = new Error('Request error');
      await expect(requestRejected(err)).rejects.toThrow('Request error');
    });
  });

  describe('Response Interceptor', () => {
    const responseFulfilled = apiClient.interceptors.response.handlers[0].fulfilled;
    const responseRejected = apiClient.interceptors.response.handlers[0].rejected;

    it('passes through successful response unchanged', () => {
      const res = { status: 200, data: { success: true } };
      expect(responseFulfilled(res)).toEqual(res);
    });

    it('rejects non-401 errors directly without retrying', async () => {
      const err = { response: { status: 500 }, config: { url: 'projects/' } };
      await expect(responseRejected(err)).rejects.toEqual(err);
    });

    it('rejects auth endpoint 401 errors directly without retrying', async () => {
      const err = { response: { status: 401 }, config: { url: 'auth/refresh/', _retry: false } };
      await expect(responseRejected(err)).rejects.toEqual(err);
    });

    it('clears session and redirects if 401 occurs and no refresh token is stored', async () => {
      localStorage.setItem('access_token', 'old_acc');
      localStorage.setItem('user', JSON.stringify({ name: 'User' }));

      delete window.location;
      window.location = { href: '', pathname: '/dashboard' };

      const err = {
        response: { status: 401 },
        config: { url: 'sprints/1/', headers: {}, _retry: false }
      };

      await expect(responseRejected(err)).rejects.toThrow('No refresh token found in localStorage');

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
      expect(window.location.href).toBe('/');
    });

    it('handles failed refresh token attempt and clears session', async () => {
      localStorage.setItem('refresh_token', 'invalid_ref');

      delete window.location;
      window.location = { href: '', pathname: '/projects' };

      const err = {
        response: { status: 401 },
        config: { url: 'sprints/1/', headers: {}, _retry: false }
      };

      await expect(responseRejected(err)).rejects.toThrow();

      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
      expect(window.location.href).toBe('/');
    });

    it('queues concurrent 401 requests when refresh is in progress', async () => {
      localStorage.setItem('refresh_token', 'token');

      const err1 = { response: { status: 401 }, config: { url: 'sprints/1/', headers: {}, _retry: false } };
      const err2 = { response: { status: 401 }, config: { url: 'sprints/2/', headers: {}, _retry: false } };

      const p1 = responseRejected(err1);
      const p2 = responseRejected(err2);

      await expect(p1).rejects.toThrow();
      await expect(p2).rejects.toThrow();
    });
  });
});
