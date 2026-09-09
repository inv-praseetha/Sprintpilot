import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '../../../pages/private/dashboard';
import apiClient from '../../../api/apiClient';
import SprintServices from '../../../services/SprintServices';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../components/layout/MainLayouut';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock apiClient
vi.mock('../../../api/apiClient', () => ({
  default: {
    get: vi.fn()
  }
}));

// Mock SprintServices
vi.mock('../../../services/SprintServices', () => ({
  default: {
    getProjectSprints: vi.fn()
  }
}));

// Mock useAuth
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock useTheme
vi.mock('../../../components/layout/MainLayouut', () => ({
  useTheme: vi.fn()
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { full_name: 'Alice Manager' } });
    useTheme.mockReturnValue({ darkMode: false });
  });

  it('renders loading indicator initially', () => {
    // Mock get to return unresolved promise to preserve loading state
    apiClient.get.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading dashboard.../i)).toBeInTheDocument();
  });

  it('renders dashboard metrics and projects lists successfully', async () => {
    apiClient.get.mockImplementation(async (url) => {
      if (url.includes('sprints/team-performance')) {
        return {
          data: {
            results: [
              { id: 'EMP001', raw_id: 1, name: 'Praseetha KU', role: 'Developer', total_tasks: 5, completed_tasks: 4, on_time_rate: '80%', points: 10, rank: 1 }
            ],
            has_more: false
          }
        };
      }
      return {
        data: [
          { id: 1, name: 'Cloud Sync Platform', status: 'ACTIVE' },
          { id: 2, name: 'AI Analytics Hub', status: 'ACTIVE' }
        ]
      };
    });

    SprintServices.getProjectSprints.mockImplementation(async (projectId) => {
      if (projectId === 1) {
        return [
          {
            id: 10,
            milestone: 'Sprint 1',
            status: 'ACTIVE',
            start_date: '2026-07-01',
            end_date: '2026-07-15',
            tasks: [
              { id: 101, status: 'CLOSED', planned_end_date: '2026-07-10' },
              { id: 102, status: 'IN_PROGRESS', planned_end_date: '2026-07-12' }
            ]
          }
        ];
      }
      return [];
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // Wait for loading to disappear
    await waitFor(() => {
      expect(screen.queryByText(/Loading dashboard.../i)).not.toBeInTheDocument();
    });

    // Check project rendering
    expect(screen.getAllByText('Cloud Sync Platform')[0]).toBeInTheDocument();
    expect(screen.getAllByText('AI Analytics Hub')[0]).toBeInTheDocument();

    // Check Metrics values
    expect(screen.getByText('2')).toBeInTheDocument(); // Active projects count
    expect(screen.getByText('1')).toBeInTheDocument(); // Active tasks count

    // Check user header
    expect(screen.getByText(/Alice Manager/i)).toBeInTheDocument();
  });

  it('filters team members by search query', async () => {
    apiClient.get.mockImplementation(async (url) => {
      if (url.includes('sprints/team-performance')) {
        const isPraseethaSearch = url.includes('search=Praseetha');
        const results = isPraseethaSearch
          ? [{ id: 'EMP001', raw_id: 1, name: 'Praseetha KU', role: 'Developer', total_tasks: 5, completed_tasks: 4, on_time_rate: '80%', points: 10, rank: 1 }]
          : [
              { id: 'EMP001', raw_id: 1, name: 'Praseetha KU', role: 'Developer', total_tasks: 5, completed_tasks: 4, on_time_rate: '80%', points: 10, rank: 1 },
              { id: 'EMP002', raw_id: 2, name: 'Abhiram S', role: 'Tester', total_tasks: 3, completed_tasks: 2, on_time_rate: '66%', points: 5, rank: 2 }
            ];
        return { data: { results, has_more: false } };
      }
      return {
        data: [
          { id: 1, name: 'Cloud Sync Platform', status: 'ACTIVE' },
          { id: 2, name: 'AI Analytics Hub', status: 'ACTIVE' }
        ]
      };
    });
    SprintServices.getProjectSprints.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading dashboard.../i)).not.toBeInTheDocument();
    });

    // Search bar is visible
    const searchInput = screen.getByPlaceholderText(/Search team members/i);
    fireEvent.change(searchInput, { target: { value: 'Praseetha' } });

    await waitFor(() => {
      expect(screen.getByText('Praseetha KU')).toBeInTheDocument();
      expect(screen.queryByText('Abhiram S')).not.toBeInTheDocument();
    });
  });
});
