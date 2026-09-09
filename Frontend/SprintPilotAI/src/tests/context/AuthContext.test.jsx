import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import AuthService from '../../services/AuthService';

vi.mock('../../services/AuthService', () => ({
  default: {
    getCurrentUser: vi.fn(),
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    refreshToken: vi.fn(),
    logout: vi.fn(),
    loginWithGoogle: vi.fn(),
    isAuthenticated: vi.fn()
  }
}));

const TestComponent = () => {
  const { user, loading, login, logout, isAuthenticated } = useAuth();
  if (loading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="user">{user ? user.name : 'No User'}</div>
      <div data-testid="auth">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <button onClick={() => login('mock-token')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleError = console.error;
    console.error = vi.fn();

    expect(() => render(<TestComponent />)).toThrow('useAuth must be used within an AuthProvider');

    console.error = consoleError;
  });

  it('initializes auth with user and access token present', async () => {
    AuthService.getCurrentUser.mockReturnValue({ name: 'Bob' });
    AuthService.getAccessToken.mockReturnValue('access');
    AuthService.isAuthenticated.mockReturnValue(true);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );



    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(screen.getByTestId('user').textContent).toBe('Bob');
    expect(screen.getByTestId('auth').textContent).toBe('Authenticated');
  });

  it('attempts to refresh token when refresh token is present but access token is missing', async () => {
    AuthService.getCurrentUser.mockReturnValue({ name: 'Bob' });
    AuthService.getAccessToken.mockReturnValue(null);
    AuthService.getRefreshToken.mockReturnValue('refresh');
    AuthService.refreshToken.mockResolvedValue('new-access');
    AuthService.isAuthenticated.mockReturnValue(true);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(AuthService.refreshToken).toHaveBeenCalled();
    expect(screen.getByTestId('user').textContent).toBe('Bob');
  });

  it('logs out on failed token refresh', async () => {
    AuthService.getCurrentUser.mockReturnValue({ name: 'Bob' });
    AuthService.getAccessToken.mockReturnValue(null);
    AuthService.getRefreshToken.mockReturnValue('refresh');
    AuthService.refreshToken.mockRejectedValue(new Error('Refresh failed'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    expect(AuthService.logout).toHaveBeenCalled();
    expect(screen.getByTestId('user').textContent).toBe('No User');
  });

  it('logs in user via loginWithGoogle', async () => {
    AuthService.getCurrentUser.mockReturnValue(null);
    AuthService.getAccessToken.mockReturnValue(null);
    AuthService.loginWithGoogle.mockResolvedValue({
      employee: { name: 'Alice' }
    });
    AuthService.isAuthenticated.mockReturnValue(true);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const loginBtn = screen.getByText('Login');
    await act(async () => {
      fireEvent.click(loginBtn);
    });

    expect(AuthService.loginWithGoogle).toHaveBeenCalledWith('mock-token');
    expect(screen.getByTestId('user').textContent).toBe('Alice');
  });

  it('logs out user and resets state on logout call', async () => {
    AuthService.getCurrentUser.mockReturnValue({ name: 'Bob' });
    AuthService.getAccessToken.mockReturnValue('access');

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const logoutBtn = screen.getByText('Logout');
    fireEvent.click(logoutBtn);

    expect(AuthService.logout).toHaveBeenCalled();
    expect(screen.getByTestId('user').textContent).toBe('No User');
  });
});
