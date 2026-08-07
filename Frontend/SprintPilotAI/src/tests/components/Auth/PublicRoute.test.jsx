import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import PublicRoute from '../../../components/Auth/PublicRoute';
import { useAuth } from '../../../context/AuthContext';

// Mock useAuth
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock lucide-react to avoid layout issues
vi.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader">Spinner</div>
}));

describe('PublicRoute Component', () => {
  it('renders loading spinner when loading is true', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: true
    });

    render(
      <MemoryRouter>
        <PublicRoute>
          <div>Public Content</div>
        </PublicRoute>
      </MemoryRouter>
    );

    expect(screen.getByTestId('loader')).toBeInTheDocument();
    expect(screen.getByText(/Verifying authorization.../i)).toBeInTheDocument();
    expect(screen.queryByText(/Public Content/i)).not.toBeInTheDocument();
  });

  it('redirects to "/dashboard" when isAuthenticated is true', () => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      loading: false
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <div>Public Content</div>
              </PublicRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Dashboard Page/i)).toBeInTheDocument();
    expect(screen.queryByText(/Public Content/i)).not.toBeInTheDocument();
  });

  it('renders children when isAuthenticated is false', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false
    });

    render(
      <MemoryRouter>
        <PublicRoute>
          <div>Public Content</div>
        </PublicRoute>
      </MemoryRouter>
    );

    expect(screen.getByText(/Public Content/i)).toBeInTheDocument();
  });

  it('renders Outlet when no children are provided and isAuthenticated is false', () => {
    useAuth.mockReturnValue({
      isAuthenticated: false,
      loading: false
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<div>Nested Public Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText(/Nested Public Content/i)).toBeInTheDocument();
  });
});
