import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SprintTasksTable from '../../../components/Sprint/SprintTasksTable';
import apiClient from '../../../api/apiClient';

// Mock CustomDatePicker
vi.mock('../../../components/Common/CustomDatePicker', () => ({
  default: ({ value, onChange, minDate, maxDate }) => (
    <input
      data-testid="mock-date-picker"
      type="date"
      value={value || ''}
      min={minDate}
      max={maxDate}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

// Mock TaskCommentsModal
vi.mock('../../../components/Modals/TaskCommentsModal', () => ({
  default: () => <div data-testid="mock-task-comments-modal" />
}));

// Mock ToastContext
vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn()
  })
}));

// Mock apiClient
vi.mock('../../../api/apiClient', () => ({
  default: {
    post: vi.fn(),
    put: vi.fn()
  }
}));

describe('SprintTasksTable Component', () => {
  const employees = [
    { id: 1, user: { full_name: 'Alice Smith' } },
    { id: 2, user: { full_name: 'Bob Jones' } }
  ];

  const timelineDaysList = [
    { dateStr: '2026-07-01', dayNum: 1, dayName: 'M', isWeekend: false, isHoliday: false },
    { dateStr: '2026-07-02', dayNum: 2, dayName: 'T', isWeekend: false, isHoliday: false },
    { dateStr: '2026-07-03', dayNum: 3, dayName: 'W', isWeekend: false, isHoliday: false }
  ];

  const tasks = [
    {
      id: 101,
      title: 'Task A',
      category: 'UI',
      status: 'OPEN',
      planned_start_date: '2026-07-01',
      planned_end_date: '2026-07-02',
      estimated_hours: 8,
      assigned_employee: { id: 1, user: { full_name: 'Alice Smith' } }
    },
    {
      id: 102,
      title: 'Task B',
      category: 'Backend',
      status: 'CLOSED',
      planned_start_date: '2026-07-02',
      planned_end_date: '2026-07-03',
      estimated_hours: 12,
      assigned_employee: { id: 2, user: { full_name: 'Bob Jones' } }
    }
  ];

  const defaultProps = {
    tasks,
    setTasks: vi.fn(),
    setModifiedTaskIds: vi.fn(),
    selectedTaskIds: new Set(),
    setSelectedTaskIds: vi.fn(),
    timelineDaysList,
    employees,
    darkMode: false,
    sprint: { id: 1, start_date: '2026-07-01', end_date: '2026-07-15', status: 'ACTIVE' },
    isEditing: false,
    isSyncing: false,
    handleIndividualDelete: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    apiClient.post.mockResolvedValue({ data: { updated_counts: {} } });
    apiClient.put.mockResolvedValue({ data: {} });
  });

  it('renders task table structure and categories correctly', () => {
    render(<SprintTasksTable {...defaultProps} />);

    expect(screen.getByText('Task Specifications')).toBeInTheDocument();
    expect(screen.getByText('Task A')).toBeInTheDocument();
    expect(screen.getByText('Task B')).toBeInTheDocument();
    expect(screen.getByText('UI Development')).toBeInTheDocument();
    expect(screen.getByText('Backend Development')).toBeInTheDocument();
  });

  it('renders static text fields when isEditing is false', () => {
    render(<SprintTasksTable {...defaultProps} />);

    // Assignee should be rendered as static text, not select
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders select inputs for assignee and date pickers when isEditing is true', () => {
    render(<SprintTasksTable {...defaultProps} isEditing={true} />);

    // Task A is OPEN (editable), so its assignee field is a select input
    const selectElements = screen.getAllByRole('combobox');
    expect(selectElements.length).toBeGreaterThan(0);
    // Option 'Alice Smith' is in the dropdown
    expect(screen.getByRole('option', { name: 'Alice Smith' })).toBeInTheDocument();

    // Date pickers are rendered for start and end dates
    const pickers = screen.getAllByTestId('mock-date-picker');
    expect(pickers.length).toBeGreaterThan(0);
  });

  it('maintains read-only display for CLOSED tasks even when isEditing is true', () => {
    render(<SprintTasksTable {...defaultProps} isEditing={true} />);

    // Task B has status = CLOSED. So even if isEditing is true, its assignee should be static span
    expect(screen.getByText('Bob Jones', { selector: 'span' })).toBeInTheDocument();
    // It shouldn't render a select dropdown with Bob Jones selected as the select's value since CLOSED status locks it
    // Wait, the select dropdown for Task A has option 'Alice Smith' and is value = 1.
    const selects = screen.getAllByRole('combobox');
    // Task A is UI (editable), Task B is Backend (CLOSED, not editable)
    // So there should only be 1 select input for assignee
    expect(selects.length).toBe(1);
  });

  it('calls handleIndividualDelete when trash action is clicked', () => {
    render(<SprintTasksTable {...defaultProps} />);

    // Task A has delete trash button active
    const deleteBtns = screen.getAllByTitle('Delete task');
    fireEvent.click(deleteBtns[0]);

    expect(defaultProps.handleIndividualDelete).toHaveBeenCalledWith(101);
  });

  it('disables delete button for CLOSED tasks', () => {
    render(<SprintTasksTable {...defaultProps} />);

    // Task B has status CLOSED, so its delete button should be disabled
    const disabledBtn = screen.getByTitle('Cannot delete this task as it is already closed/completed');
    expect(disabledBtn).toBeDisabled();
  });

  it('toggles task selection when row checkbox is clicked', () => {
    const setSelectedTaskIds = vi.fn();
    render(<SprintTasksTable {...defaultProps} setSelectedTaskIds={setSelectedTaskIds} />);

    // Click the first checkbox (for Task A, which is OPEN)
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(setSelectedTaskIds).toHaveBeenCalled();
  });

  it('updates assignee when dropdown changes while editing', () => {
    const setTasks = vi.fn();
    const setModifiedTaskIds = vi.fn();

    render(
      <SprintTasksTable
        {...defaultProps}
        isEditing={true}
        setTasks={setTasks}
        setModifiedTaskIds={setModifiedTaskIds}
      />
    );

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '2' } });

    expect(setTasks).toHaveBeenCalled();
    expect(setModifiedTaskIds).toHaveBeenCalled();
  });

  it('renders chat icon when there are unread comments and handles click', async () => {
    const tasksWithComments = [
      {
        id: 101,
        title: 'Task A',
        category: 'UI',
        status: 'OPEN',
        backlog_task_id: 'TEST-1',
        backlog_task_url: 'http://backlog/TEST-1',
        comment_count: 5,
        read_comment_count: 2,
        first_unread_comment_id: '333'
      }
    ];
    
    const setTasks = vi.fn((updateFn) => {
      // Simulate state update
      const updatedTasks = updateFn(tasksWithComments);
      expect(updatedTasks[0].read_comment_count).toBe(5);
    });

    render(
      <SprintTasksTable
        {...defaultProps}
        tasks={tasksWithComments}
        setTasks={setTasks}
      />
    );

    // Chat icon should be rendered with unread count 3
    const chatIcon = screen.getByTitle('3 new comment(s).');
    expect(chatIcon).toBeInTheDocument();
    expect(chatIcon).toHaveAttribute('href', 'http://backlog/TEST-1#comment-333');

    // Click chat icon
    fireEvent.click(chatIcon);

    expect(apiClient.put).toHaveBeenCalledWith('sprints/tasks/101/', {
      read_comment_count: 5
    });

    // Wait for the setTimeout in handleChatIconClick
    await waitFor(() => {
      expect(setTasks).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('fetches comment counts on mount and updates tasks', async () => {
    const tasksData = [
      {
        id: 101,
        title: 'Task A',
        category: 'UI',
        status: 'OPEN',
        comment_count: 0
      }
    ];
    
    const setTasks = vi.fn();
    
    apiClient.post.mockResolvedValueOnce({
      data: {
        updated_counts: {
          '101': { count: 3, first_unread_id: '123' }
        }
      }
    });

    render(
      <SprintTasksTable
        {...defaultProps}
        tasks={tasksData}
        setTasks={setTasks}
      />
    );

    expect(apiClient.post).toHaveBeenCalledWith('sprints/1/sync-comments/');
    
    await waitFor(() => {
      expect(setTasks).toHaveBeenCalled();
    });
  });
});

