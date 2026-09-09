import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SideBar from '../../../components/layout/SideBar';
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

describe('SideBar Component', () => {
  const mockSetDarkMode = vi.fn();
  const mockSetSidebarOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    useTheme.mockReturnValue({
      darkMode: false,
      setDarkMode: mockSetDarkMode,
      sidebarOpen: false,
      setSidebarOpen: mockSetSidebarOpen
    });

    useAuth.mockReturnValue({
      user: {
        email: 'user@example.com'
      }
    });
  });

  it('renders menu items and user email', () => {
    render(
      <MemoryRouter>
        <SideBar />
      </MemoryRouter>
    );

    expect(screen.getByText('Sprint Pilot AI')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
  });

  it('toggles dark mode when clicking the toggle button', () => {
    render(
      <MemoryRouter>
        <SideBar />
      </MemoryRouter>
    );

    // The dark mode toggle button is the toggle button after "Dark Mode"
    const toggleBtn = screen.getByText('Dark Mode').parentElement.nextElementSibling;
    fireEvent.click(toggleBtn);

    expect(mockSetDarkMode).toHaveBeenCalledWith(true); // false -> true
  });

  it('highlights the active link based on current location', () => {
    render(
      <MemoryRouter initialEntries={['/projects']}>
        <SideBar />
      </MemoryRouter>
    );

    // The Projects link should have active styles (bg-orange-500/[0.08])
    const projectsLink = screen.getByText('Projects').closest('a');
    expect(projectsLink.className).toContain('text-orange-600');

    // Dashboard link should NOT have active styles
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink.className).not.toContain('text-orange-600');
  });

  it('opens backdrop and handles close when sidebarOpen is true', () => {
    useTheme.mockReturnValue({
      darkMode: false,
      setDarkMode: mockSetDarkMode,
      sidebarOpen: true,
      setSidebarOpen: mockSetSidebarOpen
    });

    const { container } = render(
      <MemoryRouter>
        <SideBar />
      </MemoryRouter>
    );

    // Close button (X) is rendered for mobile view when sidebar is open
    // Let's find it and click
    const closeBtn = container.querySelector('.lucide-x').closest('button');
    fireEvent.click(closeBtn);
    expect(mockSetSidebarOpen).toHaveBeenCalledWith(false);
  });
});
