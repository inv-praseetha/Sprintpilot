import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import ProtectedRoute from '../../../components/Auth/ProtectedRoute';
import { useAuth } from '../../../context/AuthContext';

// Mock useAuth
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock lucide-react to avoid layout issues
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader">Spinner</div>
}));

describe('ProtectedRoute Component', () => {
  it('renders loading spinner when loading is true', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.getByText(/Verifying authorization.../i)).toBeInTheDocument();
    expect(screen.queryByText(/Protected Content/i)).not.toBeInTheDocument();
  });

  it('redirects to "/" when isAuthenticated is false', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/" element={<div>Login Page</div>} />
          <Route
            path="/protected"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Login Page/i)).toBeInTheDocument();
    expect(screen.queryByText(/Protected Content/i)).not.toBeInTheDocument();
  });

  it('renders children when isAuthenticated is true', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false
    });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText(/Protected Content/i)).toBeInTheDocument();
  });

  it('renders Outlet when no children are provided and isAuthenticated is true', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false
    });

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/protected" element={<div>Nested Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Nested Protected Content/i)).toBeInTheDocument();
  });
});
