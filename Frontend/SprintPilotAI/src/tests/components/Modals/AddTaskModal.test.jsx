import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddTaskModal from '../../../components/Modals/AddTaskModal';
import SprintServices from '../../../services/SprintServices';

// Mock SprintServices
vi.mock('../../../services/SprintServices', () => ({
  default: {
    createSprintTask: vi.fn()
  }
}));

// Mock CustomDatePicker with a standard input to simplify testing
vi.mock('../../../components/Common/CustomDatePicker', () => ({
  default: ({ value, onChange }) => (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

// Mock Lucide Icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="close-icon">X</div>,
  Loader2: () => <div data-testid="spinner">Spinner</div>,
  Sparkles: () => <div data-testid="sparkles">Sparkles</div>,
  ChevronDown: () => <div data-testid="chevron-down">Chevron</div>
}));

describe('AddTaskModal Component', () => {
  const employees = [
    {
      id: 1,
      user: { full_name: 'Alice Smith' }
    },
    {
      id: 2,
      user: { full_name: 'Bob Jones' }
    }
  ];

  const defaultProps = {
    show: true,
    onClose: vi.fn(),
    sprintId: 10,
    sprintStartDate: '2026-07-01',
    sprintEndDate: '2026-07-15',
    employees: employees,
    darkMode: false,
    onTaskCreated: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when show is false', () => {
    const { container } = render(<AddTaskModal {...defaultProps} show={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all form inputs and header details', () => {
    render(<AddTaskModal {...defaultProps} />);

    expect(screen.getByText('Add New Sprint Task')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. Implement User Authentication Flow/i)).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('handles field changes and displays selections', () => {
    const { container } = render(<AddTaskModal {...defaultProps} />);

    const titleInput = screen.getByPlaceholderText(/e.g. Implement User Authentication Flow/i);
    fireEvent.change(titleInput, { target: { value: 'New Test Task' } });
    expect(titleInput.value).toBe('New Test Task');

    const prioritySelect = container.querySelector('select[name="priority"]');
    fireEvent.change(prioritySelect, { target: { value: 'High' } });
    expect(prioritySelect.value).toBe('High');
  });

  it('validates estimated hours capacity constraints', async () => {
    const { container } = render(<AddTaskModal {...defaultProps} />);

    // Fill form title, assignee, description
    fireEvent.change(screen.getByPlaceholderText(/e.g. Implement User Authentication Flow/i), {
      target: { value: 'New Test Task' }
    });
    fireEvent.change(container.querySelector('select[name="assigned_employee_id"]'), {
      target: { value: '1' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter task detailed description.../i), {
      target: { value: 'Task details here' }
    });

    // Enter 20 estimated hours
    fireEvent.change(screen.getByPlaceholderText(/e.g. 12/i), {
      target: { value: '20' }
    });

    // 20 hours at 8 hours/day capacity requires Math.ceil(20 / 8) = 3 working days.
    // Let's set start and end dates to cover only 2 working days:
    // Wednesday 2026-07-01 to Thursday 2026-07-02
    const startDateInput = screen.getByText(/Planned Start Date/i).parentElement.querySelector('input');
    const endDateInput = screen.getByText(/Planned End Date/i).parentElement.querySelector('input');

    fireEvent.change(startDateInput, { target: { value: '2026-07-01' } });
    fireEvent.change(endDateInput, { target: { value: '2026-07-02' } });

    // Click submit
    fireEvent.click(screen.getByText('Create Task'));

    // Verify error message is shown
    expect(
      await screen.findByText(/Estimated hours \(20h\) require at least 3 working day\(s\)/i)
    ).toBeInTheDocument();
    expect(SprintServices.createSprintTask).not.toHaveBeenCalled();
  });

  it('submits valid form data to SprintServices.createSprintTask', async () => {
    const createdTask = { id: 99, title: 'New Test Task' };
    SprintServices.createSprintTask.mockResolvedValue(createdTask);

    const { container } = render(<AddTaskModal {...defaultProps} />);

    // Fill details
    fireEvent.change(screen.getByPlaceholderText(/e.g. Implement User Authentication Flow/i), {
      target: { value: 'New Test Task' }
    });
    fireEvent.change(container.querySelector('select[name="assigned_employee_id"]'), {
      target: { value: '1' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter task detailed description.../i), {
      target: { value: 'Task details here' }
    });
    fireEvent.change(screen.getByPlaceholderText(/e.g. 12/i), {
      target: { value: '8' }
    });

    // 8 hours needs 1 day. Start 2026-07-01, end 2026-07-02 (2 working days - Wednesday to Thursday)
    const startDateInput = screen.getByText(/Planned Start Date/i).parentElement.querySelector('input');
    const endDateInput = screen.getByText(/Planned End Date/i).parentElement.querySelector('input');

    fireEvent.change(startDateInput, { target: { value: '2026-07-01' } });
    fireEvent.change(endDateInput, { target: { value: '2026-07-02' } });

    // Submit
    fireEvent.click(screen.getByText('Create Task'));

    await waitFor(() => {
      expect(SprintServices.createSprintTask).toHaveBeenCalledWith(10, {
        title: 'New Test Task',
        jira_id: null,
        description: 'Task details here',
        priority: 'Normal',
        category: 'UI',
        status: 'OPEN',
        assigned_employee_id: '1',
        planned_start_date: '2026-07-01',
        planned_end_date: '2026-07-02',
        estimated_hours: 8
      });
    });

    await waitFor(() => {
      expect(defaultProps.onTaskCreated).toHaveBeenCalledWith(createdTask);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});
