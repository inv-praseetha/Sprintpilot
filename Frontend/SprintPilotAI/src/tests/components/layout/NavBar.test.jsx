import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import NavBar from '../../../components/layout/NavBar';
import { useTheme } from '../../../components/layout/MainLayouut';
import { useAuth } from '../../../context/AuthContext';

// Mock MainLayouut useTheme hook
vi.mock('../../../components/layout/MainLayouut', () => ({
  useTheme: vi.fn()
}));

// Mock AuthContext useAuth hook
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

describe('NavBar Component', () => {
  const mockSetSidebarOpen = vi.fn();
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useTheme.mockReturnValue({
      darkMode: false,
      setSidebarOpen: mockSetSidebarOpen
    });

    useAuth.mockReturnValue({
      user: {
        full_name: 'John Doe',
        role: 'PROJECT_MANAGER'
      },
      logout: mockLogout
    });
  });

  it('renders user name and formatted role', () => {
    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Project Manager')).toBeInTheDocument();
    // Initials "JD" should be displayed
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders fallback for missing/loading user name', () => {
    useAuth.mockReturnValue({
      user: null,
      logout: mockLogout
    });

    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByText('Project Member')).toBeInTheDocument();
    expect(screen.getByText('??')).toBeInTheDocument();
  });

  it('opens dropdown and triggers logout callback', () => {
    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    );

    // Initial dropdown is closed
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();

    // Click profile button to open dropdown
    fireEvent.click(screen.getByText('JD'));
    expect(screen.getByText('Logout')).toBeInTheDocument();

    // Click logout
    fireEvent.click(screen.getByText('Logout'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  it('toggles dropdown closed when clicking overlay', () => {
    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('JD'));
    expect(screen.getByText('Logout')).toBeInTheDocument();

    // Click overlay (it is the sibling background element without role/test id, but we can query it via tag name or get it by querySelector)
    // The overlay is a div with className="fixed inset-0 z-40"
    // Let's add a test-id or find it by style/className
    const overlay = document.querySelector('.fixed.inset-0.z-40');
    fireEvent.click(overlay);

    expect(screen.queryByText('Logout')).not.toBeInTheDocument();
  });

  it('triggers setSidebarOpen on hamburger button click', () => {
    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    );

    // Hamburger button is visible on mobile (lg:hidden)
    // Let's find button with menu icon or first button
    const burgerBtn = screen.getAllByRole('button')[0];
    fireEvent.click(burgerBtn);
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(true);
  });
});
