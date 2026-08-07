import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import SprintDetail from '../../../pages/private/SprintDetail';
import apiClient from '../../../api/apiClient';
import SprintServices from '../../../services/SprintServices';
import { useToast } from '../../../context/ToastContext';
import { useConfirm } from '../../../context/ConfirmContext';
import { useTheme } from '../../../components/layout/MainLayouut';

// Mock subcomponents
vi.mock('../../../components/Sprint/SprintTasksTable', () => ({
  default: ({ isEditing, handleIndividualDelete }) => (
    <div data-testid="mock-tasks-table">
      <span>Editing Mode: {isEditing ? 'Yes' : 'No'}</span>
      <button onClick={() => handleIndividualDelete(101)}>Delete Task 101</button>
    </div>
  )
}));

vi.mock('../../../components/Sprint/SprintNotesSection', () => ({
  default: () => <div data-testid="mock-notes-section">Notes Section</div>
}));

vi.mock('../../../components/Modals/AddTaskModal', () => ({
  default: ({ show, onClose }) => show ? (
    <div data-testid="mock-add-task-modal">
      <button onClick={onClose}>Close Add Task</button>
    </div>
  ) : null
}));

vi.mock('../../../components/Modals/JiraSyncModal', () => ({
  default: ({ isOpen, onClose }) => isOpen ? (
    <div data-testid="mock-jira-sync-modal">
      <button onClick={onClose}>Close Jira Sync</button>
    </div>
  ) : null
}));

// Mock apiClient
vi.mock('../../../api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock SprintServices
vi.mock('../../../services/SprintServices', () => ({
  default: {
    getSprintDetails: vi.fn(),
    getSprintNotes: vi.fn(),
    getAISuggestedSchedule: vi.fn()
  }
}));

// Mock Toast & Confirm Contexts
vi.mock('../../../context/ToastContext', () => ({
  useToast: vi.fn()
}));

vi.mock('../../../context/ConfirmContext', () => ({
  useConfirm: vi.fn()
}));

// Mock Theme context
vi.mock('../../../components/layout/MainLayouut', () => ({
  useTheme: vi.fn()
}));

describe('SprintDetail Page Component', () => {
  const toastMock = { success: vi.fn(), error: vi.fn() };
  const confirmMock = vi.fn();

  const mockSprintData = {
    id: 42,
    project: 1,
    milestone: 'Sprint 2026-A',
    status: 'ACTIVE',
    start_date: '2026-07-01',
    end_date: '2026-07-15',
    tasks: [
      {
        id: 101,
        title: 'Build auth logic',
        category: 'Backend',
        status: 'OPEN',
        planned_start_date: '2026-07-01',
        planned_end_date: '2026-07-05',
        estimated_hours: 8
      }
    ]
  };

  const mockEmployees = [
    { id: 9, user: { full_name: 'Developer Joe' } }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    useToast.mockReturnValue(toastMock);
    useConfirm.mockReturnValue(confirmMock);
    useTheme.mockReturnValue({ darkMode: false });

    SprintServices.getSprintDetails.mockResolvedValue(mockSprintData);
    apiClient.get.mockResolvedValue({ data: { members: mockEmployees } });
    SprintServices.getSprintNotes.mockResolvedValue([]);
  });

  it('loads and renders sprint detail fields and mocked subcomponents', async () => {
    render(
      <MemoryRouter initialEntries={['/projects/1/sprints/42']}>
        <Routes>
          <Route path="/projects/:projectId/sprints/:sprintId" element={<SprintDetail />} />
        </Routes>
      </MemoryRouter>
    );

    // Initial page loading indicator
    expect(screen.getByText(/Loading sprint/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Loading sprint/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('Sprint 2026-A')).toBeInTheDocument();
    expect(screen.getByTestId('mock-tasks-table')).toBeInTheDocument();
    expect(screen.getByTestId('mock-notes-section')).toBeInTheDocument();
  });

  it('triggers manual edit mode when Update is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/projects/1/sprints/42']}>
        <Routes>
          <Route path="/projects/:projectId/sprints/:sprintId" element={<SprintDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('Editing Mode: No')).toBeInTheDocument();

    // Click Update
    const editBtn = screen.getByRole('button', { name: /Update/i });
    fireEvent.click(editBtn);

    expect(screen.getByText('Editing Mode: Yes')).toBeInTheDocument();
  });

  it('calls delete API and triggers toast when deleting a task', async () => {
    confirmMock.mockResolvedValue(true);
    apiClient.delete.mockResolvedValue({});

    render(
      <MemoryRouter initialEntries={['/projects/1/sprints/42']}>
        <Routes>
          <Route path="/projects/:projectId/sprints/:sprintId" element={<SprintDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Click mock delete button inside tasks table
    const deleteBtn = screen.getByText('Delete Task 101');
    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    expect(confirmMock).toHaveBeenCalled();
    expect(apiClient.delete).toHaveBeenCalledWith('sprints/tasks/101/');
    expect(toastMock.success).toHaveBeenCalledWith('Task deleted successfully.');
  });

  it('opens Add Task and Jira Sync modals on button clicks', async () => {
    render(
      <MemoryRouter initialEntries={['/projects/1/sprints/42']}>
        <Routes>
          <Route path="/projects/:projectId/sprints/:sprintId" element={<SprintDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Modals are not open initially
    expect(screen.queryByTestId('mock-add-task-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-jira-sync-modal')).not.toBeInTheDocument();

    // Click Add Task button
    const addTaskBtn = screen.getByRole('button', { name: /Add Task/i });
    await act(async () => {
      fireEvent.click(addTaskBtn);
    });
    expect(screen.getByTestId('mock-add-task-modal')).toBeInTheDocument();

    // Click Fetch from Jira button
    const jiraBtn = screen.getByRole('button', { name: /Fetch from Jira/i });
    await act(async () => {
      fireEvent.click(jiraBtn);
    });
    expect(screen.getByTestId('mock-jira-sync-modal')).toBeInTheDocument();
  });

  it('renders "Sprint Completed" badge when sprint status is COMPLETED', async () => {
    SprintServices.getSprintDetails.mockResolvedValue({
      ...mockSprintData,
      status: 'COMPLETED'
    });

    render(
      <MemoryRouter initialEntries={['/projects/1/sprints/42']}>
        <Routes>
          <Route path="/projects/:projectId/sprints/:sprintId" element={<SprintDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('Sprint Completed')).toBeInTheDocument();
  });

  it('renders "Project Completed" badge when project_status is COMPLETED', async () => {
    SprintServices.getSprintDetails.mockResolvedValue({
      ...mockSprintData,
      project_status: 'COMPLETED',
      status: 'ACTIVE'
    });

    render(
      <MemoryRouter initialEntries={['/projects/1/sprints/42']}>
        <Routes>
          <Route path="/projects/:projectId/sprints/:sprintId" element={<SprintDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading sprint/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Project Completed')).toBeInTheDocument();
  });

  it('shows AI scheduling panel when sprint has no scheduled tasks', async () => {
    SprintServices.getSprintDetails.mockResolvedValue({
      ...mockSprintData,
      tasks: [
        {
          id: 101,
          title: 'Unscheduled task',
          category: 'Backend',
          status: 'OPEN',
          planned_start_date: null,
          planned_end_date: null,
          estimated_hours: 8
        }
      ]
    });

    render(
      <MemoryRouter initialEntries={['/projects/1/sprints/42']}>
        <Routes>
          <Route path="/projects/:projectId/sprints/:sprintId" element={<SprintDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading sprint/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('AI Scheduling Suggestions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate AI Schedule/i })).toBeInTheDocument();
  });

  it('renders Back to Project Details button', async () => {

    render(
      <MemoryRouter initialEntries={['/projects/1/sprints/42']}>
        <Routes>
          <Route path="/projects/:projectId/sprints/:sprintId" element={<SprintDetail />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(/Loading sprint/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });

    const backBtn = screen.getByRole('button', { name: /Back to Project Details/i });
    expect(backBtn).toBeInTheDocument();
  });
});
