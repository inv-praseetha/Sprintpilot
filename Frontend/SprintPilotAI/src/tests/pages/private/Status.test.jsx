import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Status from '../../../pages/private/Status';
import apiClient from '../../../api/apiClient';
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

// Mock useAuth
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

// Mock useTheme
vi.mock('../../../components/layout/MainLayouut', () => ({
  useTheme: vi.fn()
}));

describe('Status Page Component', () => {
  const mockStatusData = {
    overdue: {
      tasks: [
        {
          id: 201,
          title: 'Fix critical production bug',
          category: 'Backend',
          projectName: 'Cloud Sync Platform',
          sprintName: 'Sprint A',
          planned_end_date: '2026-07-01',
          projectId: 1,
          sprintId: 42,
          assigned_employee: { user: { full_name: 'John Doe' } }
        }
      ],
      has_more: false,
      total_count: 1
    },
    today: {
      tasks: [],
      has_more: false,
      total_count: 0
    },
    tomorrow: {
      tasks: [
        {
          id: 203,
          title: 'Write API documentation',
          category: 'INFRA',
          projectName: 'AI Analytics Hub',
          sprintName: 'Sprint B',
          planned_end_date: '2026-07-15',
          projectId: 2,
          sprintId: 43,
          assigned_employee: null
        }
      ],
      has_more: false,
      total_count: 1
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { full_name: 'John Doe' } });
    useTheme.mockReturnValue({ darkMode: false });
  });

  it('renders loading indicator initially', () => {
    apiClient.get.mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <Status />
      </MemoryRouter>
    );

    expect(screen.getByText(/Loading task status dashboard/i)).toBeInTheDocument();
  });

  it('renders status columns, task counts, task cards, and empty states', async () => {
    apiClient.get.mockResolvedValue({ data: mockStatusData });

    render(
      <MemoryRouter>
        <Status />
      </MemoryRouter>
    );

    // Wait for loading to clear
    await waitFor(() => {
      expect(screen.queryByText(/Loading task status dashboard/i)).not.toBeInTheDocument();
    });

    // Verify headers
    expect(screen.getByText('Task Urgency Status 🎯')).toBeInTheDocument();

    // Verify task list content
    expect(screen.getByText('Fix critical production bug')).toBeInTheDocument();
    expect(screen.getByText('Write API documentation')).toBeInTheDocument();

    // Verify column counts
    expect(screen.getAllByText('1', { selector: 'span.bg-red-600' })[0]).toBeInTheDocument();
    expect(screen.getByText('0', { selector: 'span.bg-orange-600' })).toBeInTheDocument();
    expect(screen.getAllByText('1', { selector: 'span.bg-blue-600' })[0]).toBeInTheDocument();

    // Verify empty state is displayed for Today's column
    expect(screen.getByText(/No tasks due today/i)).toBeInTheDocument();
  });

  it('navigates to sprint detail page when task card is clicked', async () => {
    apiClient.get.mockResolvedValue({ data: mockStatusData });

    render(
      <MemoryRouter>
        <Status />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Click on the card
    const cardTitle = screen.getByText('Fix critical production bug');
    fireEvent.click(cardTitle);

    expect(mockNavigate).toHaveBeenCalledWith('/projects/1/sprints/42');
  });

});
