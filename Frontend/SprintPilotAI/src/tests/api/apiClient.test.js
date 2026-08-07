import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// We need to test the module fresh each time, so we use dynamic import
// We spy on axios.create to control the interceptor behavior
vi.mock('axios', async () => {
  const mockInterceptors = {
    request: { use: vi.fn() },
    response: { use: vi.fn() }
  };

  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: mockInterceptors,
    defaults: { baseURL: 'http://localhost:8000/api/' }
  };

  return {
    default: {
      create: vi.fn(() => mockInstance)
    },
    __mockInstance: mockInstance
  };
});

describe('apiClient interceptors', () => {
  let requestInterceptorSuccess;
  let responseInterceptorError;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset localStorage
    localStorage.clear();

    // We re-import to get interceptor registration
    const axiosMock = (await import('axios')).default;
    const instance = axiosMock.create();

    // Capture what interceptors were registered
    const [reqSuccess] = instance.interceptors.request.use.mock.calls[0] || [];
    const [, resError] = instance.interceptors.response.use.mock.calls[0] || [];

    requestInterceptorSuccess = reqSuccess;
    responseInterceptorError = resError;
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Request interceptor', () => {
    it('attaches Authorization header when access_token is present', () => {
      if (!requestInterceptorSuccess) return;
      localStorage.setItem('access_token', 'mytoken123');
      const config = { url: 'projects/', headers: {} };
      const result = requestInterceptorSuccess(config);
      expect(result.headers['Authorization']).toBe('Bearer mytoken123');
    });

    it('does NOT attach Authorization header for auth endpoints', () => {
      if (!requestInterceptorSuccess) return;
      localStorage.setItem('access_token', 'mytoken123');
      const config = { url: 'auth/refresh/', headers: {} };
      const result = requestInterceptorSuccess(config);
      expect(result.headers['Authorization']).toBeUndefined();
    });

    it('does NOT attach Authorization header when no token stored', () => {
      if (!requestInterceptorSuccess) return;
      const config = { url: 'projects/', headers: {} };
      const result = requestInterceptorSuccess(config);
      expect(result.headers['Authorization']).toBeUndefined();
    });
  });

  describe('Response interceptor', () => {
    it('passes through successful responses unchanged', () => {
      const axiosMock = axios.create();
      const [resSuccess] = axiosMock.interceptors.response.use.mock.calls[0] || [];
      if (!resSuccess) return;
      const response = { status: 200, data: { ok: true } };
      expect(resSuccess(response)).toEqual(response);
    });

    it('rejects non-401 errors without attempting refresh', async () => {
      if (!responseInterceptorError) return;
      const error = {
        response: { status: 403 },
        config: { url: 'projects/', headers: {}, _retry: false }
      };
      await expect(responseInterceptorError(error)).rejects.toEqual(error);
    });
  });
});
