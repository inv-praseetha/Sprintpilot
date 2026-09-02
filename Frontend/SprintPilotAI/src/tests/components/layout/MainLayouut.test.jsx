import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MainLayouut, { useTheme } from '../../../components/layout/MainLayouut';

// Mock SideBar and NavBar to isolate MainLayouut
vi.mock('../../../components/layout/SideBar', () => ({
  default: () => <div data-testid="sidebar">Sidebar Mock</div>
}));

vi.mock('../../../components/layout/NavBar', () => ({
  default: () => <div data-testid="navbar">Navbar Mock</div>
}));

// Helper component to consume context and toggle theme / tab
const ThemeConsumer = () => {
  const { darkMode, setDarkMode, activeTab, setActiveTab, sidebarOpen, setSidebarOpen } = useTheme();
  return (
    <div>
      <span data-testid="theme-status">{darkMode ? 'dark' : 'light'}</span>
      <span data-testid="active-tab">{activeTab}</span>
      <span data-testid="sidebar-status">{sidebarOpen ? 'open' : 'closed'}</span>
      <button data-testid="toggle-theme-btn" onClick={() => setDarkMode(!darkMode)}>Toggle Theme</button>
      <button data-testid="set-tab-btn" onClick={() => setActiveTab('Sprints')}>Set Tab</button>
      <button data-testid="toggle-sidebar-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>Toggle Sidebar</button>
    </div>
  );
};

describe('MainLayouut Component', () => {
  it('renders Sidebar, Navbar, and children', () => {
    render(
      <MemoryRouter>
        <MainLayouut>
          <div data-testid="children-content">Children Content</div>
        </MainLayouut>
      </MemoryRouter>
    );

    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('children-content')).toBeInTheDocument();
  });

  it('renders Outlet when no direct children are passed', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<MainLayouut />}>
            <Route index element={<div data-testid="outlet-content">Outlet Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
  });

  it('provides ThemeContext and propagates values/state changes', () => {
    render(
      <MemoryRouter>
        <MainLayouut>
          <ThemeConsumer />
        </MainLayouut>
      </MemoryRouter>
    );

    // Initial state
    expect(screen.getByTestId('theme-status').textContent).toBe('light');
    expect(screen.getByTestId('active-tab').textContent).toBe('Dashboard');
    expect(screen.getByTestId('sidebar-status').textContent).toBe('closed');

    // Toggle theme
    fireEvent.click(screen.getByTestId('toggle-theme-btn'));
    expect(screen.getByTestId('theme-status').textContent).toBe('dark');

    // Toggle active tab
    fireEvent.click(screen.getByTestId('set-tab-btn'));
    expect(screen.getByTestId('active-tab').textContent).toBe('Sprints');

    // Toggle sidebar
    fireEvent.click(screen.getByTestId('toggle-sidebar-btn'));
    expect(screen.getByTestId('sidebar-status').textContent).toBe('open');
  });

  it('applies dark class on wrapper when darkMode is true', () => {
    render(
      <MemoryRouter>
        <MainLayouut>
          <ThemeConsumer />
        </MainLayouut>
      </MemoryRouter>
    );

    const wrapper = screen.getByTestId('sidebar').parentElement;
    expect(wrapper.className).not.toContain('dark');

    // Turn on dark mode
    fireEvent.click(screen.getByTestId('toggle-theme-btn'));
    expect(wrapper.className).toContain('dark');
  });
});
