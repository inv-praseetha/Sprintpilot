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
import { useAuth } from '../../../context/AuthContext';

// Mock subcomponents
vi.mock('../../../components/Sprint/SprintTasksTable', () => ({
  default: ({ isEditing, handleIndividualDelete, setSelectedTaskIds, setModifiedTaskIds, setTasks }) => (
    <div data-testid="mock-tasks-table">
      <span>Editing Mode: {isEditing ? 'Yes' : 'No'}</span>
      <button onClick={() => handleIndividualDelete(101)}>Delete Task 101</button>
      <button onClick={() => setSelectedTaskIds(new Set([101]))}>Select Task 101</button>
      <button onClick={() => {
        setTasks(prev => prev.map(t => t.id === 101 ? { ...t, planned_start_date: '2026-07-03' } : t));
        setModifiedTaskIds(new Set([101]));
      }}>Modify Task 101</button>
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
    getAISuggestedSchedule: vi.fn(),
    deleteSprintTask: vi.fn(),
    importSchedule: vi.fn()
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

// Mock Auth Context
vi.mock('../../../context/AuthContext', () => ({
  useAuth: vi.fn()
}));

describe('SprintDetail Page Component', () => {
  const toastMock = { success: vi.fn(), error: vi.fn() };
  const confirmMock = vi.fn();

  const mockSprintData = {
    id: 42,
    project: 1,
    project_name: 'SprintPilot AI',
    milestone: 'Sprint 2026-A',
    status: 'ACTIVE',
    project_status: 'ACTIVE',
    start_date: '2026-07-01',
    end_date: '2026-07-15',
    holidays: [{ date: '2026-07-04', description: 'Independence Day' }],
    tasks: [
      {
        id: 101,
        title: 'Build auth logic',
        category: 'Backend',
        status: 'OPEN',
        planned_start_date: '2026-07-01',
        planned_end_date: '2026-07-05',
        estimated_hours: 8,
        synced_at: null,
        updated_at: '2026-07-02T10:00:00Z'
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
    useAuth.mockReturnValue({ user: { role: 'PROJECT_MANAGER' } });

    SprintServices.getSprintDetails.mockResolvedValue(mockSprintData);
    apiClient.get.mockResolvedValue({ data: mockEmployees });
    SprintServices.getSprintNotes.mockResolvedValue([]);
  });

  const renderComponent = () =>
    render(
      <MemoryRouter initialEntries={['/projects/1/sprints/42']}>
        <Routes>
          <Route path="/projects/:projectId/sprints/:sprintId" element={<SprintDetail />} />
        </Routes>
      </MemoryRouter>
    );

  it('loads and renders sprint detail fields and mocked subcomponents', async () => {
    renderComponent();

    expect(screen.getByText(/Loading Sprint Details.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/Loading Sprint Details.../i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('Sprint 2026-A')).toBeInTheDocument();
    expect(screen.getByTestId('mock-tasks-table')).toBeInTheDocument();
    expect(screen.getByTestId('mock-notes-section')).toBeInTheDocument();
  });

  it('renders fallback when sprint data returns null', async () => {
    SprintServices.getSprintDetails.mockResolvedValue(null);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Sprint details could not be found.')).toBeInTheDocument();
    });
  });

  it('triggers manual edit mode, modifies task, and saves to backend', async () => {
    SprintServices.importSchedule.mockResolvedValue({});

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('Editing Mode: No')).toBeInTheDocument();

    // Click Update
    const editBtn = screen.getByRole('button', { name: /Update/i });
    fireEvent.click(editBtn);

    expect(screen.getByText('Editing Mode: Yes')).toBeInTheDocument();

    // Modify task via mocked table button
    fireEvent.click(screen.getByText('Modify Task 101'));

    // Click Save
    const saveBtn = screen.getByRole('button', { name: /Save/i });
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(SprintServices.importSchedule).toHaveBeenCalledWith('42', [
      expect.objectContaining({ task_id: 101, planned_start_date: '2026-07-03' })
    ]);
  });

  it('calls delete API and triggers toast when deleting a task', async () => {
    confirmMock.mockResolvedValue(true);
    SprintServices.deleteSprintTask.mockResolvedValue({});

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const deleteBtn = screen.getByText('Delete Task 101');
    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    expect(confirmMock).toHaveBeenCalled();
    expect(SprintServices.deleteSprintTask).toHaveBeenCalledWith(101);
    expect(toastMock.success).toHaveBeenCalledWith('Task deleted successfully.');
  });

  it('handles bulk delete tasks flow', async () => {
    confirmMock.mockResolvedValue(true);
    apiClient.post.mockResolvedValue({});

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    // Select task via mock table callback
    fireEvent.click(screen.getByText('Select Task 101'));

    const bulkDeleteBtn = screen.getByRole('button', { name: /Delete Selected/i });
    await act(async () => {
      fireEvent.click(bulkDeleteBtn);
    });

    expect(confirmMock).toHaveBeenCalled();
    expect(apiClient.post).toHaveBeenCalledWith('sprints/tasks/bulk-delete/', { task_ids: [101] });
    expect(toastMock.success).toHaveBeenCalledWith('Selected tasks deleted successfully.');
  });

  it('handles error when bulk delete fails', async () => {
    confirmMock.mockResolvedValue(true);
    apiClient.post.mockRejectedValue(new Error('Bulk delete failed'));

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Select Task 101'));

    const bulkDeleteBtn = screen.getByRole('button', { name: /Delete Selected/i });
    await act(async () => {
      fireEvent.click(bulkDeleteBtn);
    });

    expect(toastMock.error).toHaveBeenCalledWith('Delete failed: Bulk delete failed');
  });

  it('handles error when deleting individual task fails', async () => {
    confirmMock.mockResolvedValue(true);
    SprintServices.deleteSprintTask.mockRejectedValue(new Error('Delete error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const deleteBtn = screen.getByText('Delete Task 101');
    await act(async () => {
      fireEvent.click(deleteBtn);
    });

    expect(toastMock.error).toHaveBeenCalledWith('Delete failed: Delete error');
  });

  it('opens Add Task and Jira Sync modals on button clicks', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    expect(screen.queryByTestId('mock-add-task-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mock-jira-sync-modal')).not.toBeInTheDocument();

    const addTaskBtn = screen.getByRole('button', { name: /Add Task/i });
    await act(async () => {
      fireEvent.click(addTaskBtn);
    });
    expect(screen.getByTestId('mock-add-task-modal')).toBeInTheDocument();

    const jiraBtn = screen.getByRole('button', { name: /Fetch from Jira/i });
    await act(async () => {
      fireEvent.click(jiraBtn);
    });
    expect(screen.getByTestId('mock-jira-sync-modal')).toBeInTheDocument();
  });

  it('renders "Sprint Completed" and "Project Completed" badges', async () => {
    SprintServices.getSprintDetails.mockResolvedValue({
      ...mockSprintData,
      status: 'COMPLETED',
      project_status: 'COMPLETED'
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('Sprint Completed')).toBeInTheDocument();
    expect(screen.getByText('Project Completed')).toBeInTheDocument();
  });

  it('shows AI scheduling panel when sprint has no scheduled tasks and generates schedule', async () => {
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

    SprintServices.getAISuggestedSchedule.mockResolvedValue([
      {
        task_id: 101,
        planned_start_date: '2026-07-02',
        planned_end_date: '2026-07-04',
        assigned_employee: { id: 9 },
        reason: 'Optimal workload'
      }
    ]);

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/Loading Sprint Details.../i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('AI Scheduling Suggestions')).toBeInTheDocument();

    const genBtn = screen.getByRole('button', { name: /Generate AI Schedule/i });
    await act(async () => {
      fireEvent.click(genBtn);
    });

    expect(SprintServices.getAISuggestedSchedule).toHaveBeenCalledWith('42', []);
  });

  it('handles sync to backlog modal confirmation and success', async () => {
    apiClient.post.mockResolvedValue({ data: { detail: 'Synced 1 tasks' } });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const syncBtn = screen.getByRole('button', { name: /Sync to Backlog/i });
    fireEvent.click(syncBtn);

    expect(screen.getByText('Confirm Sync to Backlog')).toBeInTheDocument();

    const confirmSyncBtn = screen.getByRole('button', { name: /Confirm Sync/i });
    await act(async () => {
      fireEvent.click(confirmSyncBtn);
    });

    expect(apiClient.post).toHaveBeenCalledWith('sprints/42/sync-backlog/', {});
    expect(toastMock.success).toHaveBeenCalledWith('Success: Synced 1 tasks');
  });

  it('handles schedule excel download and error handling', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.includes('download-schedule')) {
        return Promise.reject(new Error('Network download error'));
      }
      return Promise.resolve({ data: mockEmployees });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const downloadBtn = screen.getByRole('button', { name: /Download/i });
    await act(async () => {
      fireEvent.click(downloadBtn);
    });

    expect(toastMock.error).toHaveBeenCalledWith('Failed to download schedule. Please try again.');
  });

  it('collapses and expands the Gantt schedule header', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    });

    const toggleBtn = screen.getByText('AI Optimised Gantt Schedule').closest('button');
    fireEvent.click(toggleBtn);

    // Section controls hidden
    expect(screen.queryByRole('button', { name: /Download/i })).not.toBeInTheDocument();

    // Click again to expand
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
  });
});
