import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SprintTasksTable from '../../../components/Sprint/SprintTasksTable';
import apiClient from '../../../api/apiClient';

// Mock CustomDatePicker
vi.mock('../../../components/Common/CustomDatePicker', () => ({
  default: ({ value, onChange, minDate, maxDate, onOpen, onClose }) => (
    <div data-testid="mock-date-picker-wrapper">
      <input
        data-testid="mock-date-picker"
        type="date"
        value={value || ''}
        min={minDate}
        max={maxDate}
        onFocus={onOpen}
        onBlur={onClose}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}));

// Mock TaskCommentsModal
vi.mock('../../../components/Modals/TaskCommentsModal', () => ({
  default: () => <div data-testid="mock-task-comments-modal" />
}));

// Mock ToastContext
const mockToast = { error: vi.fn(), success: vi.fn() };
vi.mock('../../../context/ToastContext', () => ({
  useToast: () => mockToast
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
    { dateStr: '2026-07-01', dayNum: 1, dayName: 'W', isWeekend: false, isHoliday: false },
    { dateStr: '2026-07-02', dayNum: 2, dayName: 'T', isWeekend: false, isHoliday: false },
    { dateStr: '2026-07-03', dayNum: 3, dayName: 'F', isWeekend: false, isHoliday: false },
    { dateStr: '2026-07-04', dayNum: 4, dayName: 'S', isWeekend: true, isHoliday: false },
    { dateStr: '2026-07-05', dayNum: 5, dayName: 'S', isWeekend: true, isHoliday: true, holidayDescription: 'July 5 Holiday' }
  ];

  const tasks = [
    {
      id: 101,
      title: 'Task A',
      category: 'UI',
      status: 'OPEN',
      planned_start_date: '2026-07-01',
      planned_end_date: '2026-07-03',
      estimated_hours: 32,
      assigned_employee: { id: 1, user: { full_name: 'Alice Smith' } },
      recommendation_reason: 'Skill match',
      backlog_task_url: 'http://backlog/101'
    },
    {
      id: 102,
      title: 'Task B',
      category: 'Backend',
      status: 'CLOSED',
      planned_start_date: '2026-07-02',
      planned_end_date: '2026-07-03',
      estimated_hours: 8,
      assigned_employee: { id: 2, user: { full_name: 'Bob Jones' } }
    },
    {
      id: 103,
      title: 'Task C',
      category: 'INFRA',
      status: 'IN_PROGRESS',
      planned_start_date: null,
      planned_end_date: null,
      estimated_hours: null
    },
    {
      id: 104,
      title: 'Task D',
      category: 'QA',
      status: 'IN_REVIEW',
      planned_start_date: '2026-07-01',
      planned_end_date: '2026-07-02',
      estimated_hours: 8
    },
    {
      id: 105,
      title: 'Task E',
      category: 'CustomCategory',
      status: 'BLOCKED',
      planned_start_date: '2026-07-01',
      planned_end_date: '2026-07-02',
      estimated_hours: 8
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
    expect(screen.getByText('System Design & Infra')).toBeInTheDocument();
    expect(screen.getByText('Quality Assurance')).toBeInTheDocument();
    expect(screen.getByText('CustomCategory')).toBeInTheDocument();
  });

  it('renders static text fields when isEditing is false', () => {
    render(<SprintTasksTable {...defaultProps} />);

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders select inputs for assignee and date pickers when isEditing is true', () => {
    render(<SprintTasksTable {...defaultProps} isEditing={true} />);

    const selectElements = screen.getAllByRole('combobox');
    expect(selectElements.length).toBeGreaterThan(0);
    expect(screen.getAllByRole('option', { name: 'Alice Smith' })[0]).toBeInTheDocument();

    const pickers = screen.getAllByTestId('mock-date-picker');
    expect(pickers.length).toBeGreaterThan(0);
  });

  it('maintains read-only display for CLOSED tasks even when isEditing is true', () => {
    render(<SprintTasksTable {...defaultProps} isEditing={true} />);

    expect(screen.getByText('Bob Jones', { selector: 'span' })).toBeInTheDocument();
  });

  it('calls handleIndividualDelete when trash action is clicked', () => {
    render(<SprintTasksTable {...defaultProps} />);

    const deleteBtns = screen.getAllByTitle('Delete task');
    fireEvent.click(deleteBtns[0]);

    expect(defaultProps.handleIndividualDelete).toHaveBeenCalledWith(101);
  });

  it('disables delete button for CLOSED tasks', () => {
    render(<SprintTasksTable {...defaultProps} />);

    const disabledBtn = screen.getByTitle('Cannot delete this task as it is already closed/completed');
    expect(disabledBtn).toBeDisabled();
  });

  it('toggles task selection when row checkbox is clicked', () => {
    const setSelectedTaskIds = vi.fn();
    render(<SprintTasksTable {...defaultProps} setSelectedTaskIds={setSelectedTaskIds} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);

    expect(setSelectedTaskIds).toHaveBeenCalled();
  });

  it('toggles select all active tasks via header checkbox', () => {
    const setSelectedTaskIds = vi.fn();
    render(<SprintTasksTable {...defaultProps} setSelectedTaskIds={setSelectedTaskIds} />);

    const headerCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(headerCheckbox);

    expect(setSelectedTaskIds).toHaveBeenCalled();
  });

  it('unselects all active tasks when header checkbox clicked while all selected', () => {
    const setSelectedTaskIds = vi.fn((updateFn) => {
      const prev = new Set([101, 103, 104, 105]);
      const next = updateFn(prev);
      expect(next.size).toBe(0);
    });

    render(
      <SprintTasksTable
        {...defaultProps}
        selectedTaskIds={new Set([101, 103, 104, 105])}
        setSelectedTaskIds={setSelectedTaskIds}
      />
    );

    const headerCheckbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(headerCheckbox);

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

  it('validates start date changes while editing', () => {
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

    const pickers = screen.getAllByTestId('mock-date-picker');

    // 1. Invalid boundary start date
    fireEvent.change(pickers[0], { target: { value: '2026-06-01' } });
    expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('within the sprint boundaries'));

    // 2. Weekend start date
    fireEvent.change(pickers[0], { target: { value: '2026-07-04' } });
    expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Saturdays and Sundays cannot be selected'));

    // 3. Start date after end date (using a weekday: Tuesday July 7, 2026)
    fireEvent.change(pickers[0], { target: { value: '2026-07-07' } });
    expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('start date cannot be after the planned end date'));

    // 4. Insufficient working days for estimated hours
    fireEvent.change(pickers[0], { target: { value: '2026-07-03' } });
    expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('require at least'));

    // 5. Clear start date
    fireEvent.change(pickers[0], { target: { value: '' } });
    expect(setTasks).toHaveBeenCalled();

    // 6. Valid start date update
    fireEvent.change(pickers[0], { target: { value: '2026-07-01' } });
    expect(setTasks).toHaveBeenCalled();
  });

  it('validates end date changes while editing', () => {
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

    const pickers = screen.getAllByTestId('mock-date-picker');
    // Task A end date is index 1

    // 1. End date outside boundary
    fireEvent.change(pickers[1], { target: { value: '2026-07-20' } });
    expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('within the sprint boundaries'));

    // 2. Weekend end date
    fireEvent.change(pickers[1], { target: { value: '2026-07-04' } });
    expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Saturdays and Sundays cannot be selected'));

    // 3. Insufficient working days for estimated hours
    fireEvent.change(pickers[1], { target: { value: '2026-07-02' } });
    expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('require at least'));

    // 4. Clear end date
    fireEvent.change(pickers[1], { target: { value: '' } });
    expect(setTasks).toHaveBeenCalled();

    // 5. Valid end date
    fireEvent.change(pickers[1], { target: { value: '2026-07-03' } });
    expect(setTasks).toHaveBeenCalled();
  });

  it('triggers onFocus and onBlur on date pickers to handle active date picker z-index', () => {
    render(<SprintTasksTable {...defaultProps} isEditing={true} />);

    const pickers = screen.getAllByTestId('mock-date-picker');
    fireEvent.focus(pickers[0]);
    fireEvent.blur(pickers[0]);
  });

  it('handles row hover state changes', () => {
    render(<SprintTasksTable {...defaultProps} />);

    const taskRow = screen.getByText('Task A').closest('tr');
    fireEvent.mouseEnter(taskRow);
    fireEvent.mouseLeave(taskRow);
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

    const chatIcon = screen.getByTitle('3 new comment(s).');
    expect(chatIcon).toBeInTheDocument();
    expect(chatIcon).toHaveAttribute('href', 'http://backlog/TEST-1#comment-333');

    fireEvent.click(chatIcon);

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
