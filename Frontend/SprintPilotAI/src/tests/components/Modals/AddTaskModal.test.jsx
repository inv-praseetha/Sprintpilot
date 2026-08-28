import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddTaskModal from '../../../components/Modals/AddTaskModal';
import SprintServices from '../../../services/SprintServices';

vi.mock('../../../services/SprintServices', () => ({
  default: {
    createSprintTask: vi.fn()
  }
}));

vi.mock('../../../components/Common/CustomDatePicker', () => ({
  default: ({ value, onChange }) => (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

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

  it('handles category dropdown toggle and checkbox selections', () => {
    render(<AddTaskModal {...defaultProps} />);

    const categoryBtn = screen.getByText('UI');
    fireEvent.click(categoryBtn);

    expect(screen.getByText('Backend Development')).toBeInTheDocument();
    expect(screen.getByText('QA Development')).toBeInTheDocument();

    const backendCheckbox = screen.getByText('Backend Development').parentElement.querySelector('input');
    fireEvent.click(backendCheckbox);

    expect(screen.getByText('UI, Backend')).toBeInTheDocument();

    // Deselect UI
    const uiCheckbox = screen.getByText('UI Development').parentElement.querySelector('input');
    fireEvent.click(uiCheckbox);
    expect(screen.getByText('Backend')).toBeInTheDocument();
  });

  it('resets end date if start date is set after end date', () => {
    const { container } = render(<AddTaskModal {...defaultProps} />);

    const dateInputs = container.querySelectorAll('input[type="date"]');
    const startDateInput = dateInputs[0];
    const endDateInput = dateInputs[1];

    fireEvent.change(endDateInput, { target: { value: '2026-07-05' } });
    expect(endDateInput.value).toBe('2026-07-05');

    fireEvent.change(startDateInput, { target: { value: '2026-07-10' } });
    expect(endDateInput.value).toBe('');
  });

  it('resets start date if end date is set before start date', () => {
    const { container } = render(<AddTaskModal {...defaultProps} />);

    const dateInputs = container.querySelectorAll('input[type="date"]');
    const startDateInput = dateInputs[0];
    const endDateInput = dateInputs[1];

    fireEvent.change(startDateInput, { target: { value: '2026-07-10' } });
    expect(startDateInput.value).toBe('2026-07-10');

    fireEvent.change(endDateInput, { target: { value: '2026-07-05' } });
    expect(startDateInput.value).toBe('');
  });

  it('validates required field errors on submit', async () => {
    const { container } = render(<AddTaskModal {...defaultProps} />);
    const form = container.querySelector('form');

    // 1. Missing title
    fireEvent.submit(form);
    expect(await screen.findByText('Task Title is required.')).toBeInTheDocument();

    // Fill title
    fireEvent.change(screen.getByPlaceholderText(/e.g. Implement User Authentication Flow/i), {
      target: { value: 'New Task' }
    });

    // Missing assignee
    fireEvent.submit(form);
    expect(await screen.findByText('Assignee is required.')).toBeInTheDocument();

    // Fill assignee
    fireEvent.change(container.querySelector('select[name="assigned_employee_id"]'), {
      target: { value: '1' }
    });

    // Missing start date
    fireEvent.submit(form);
    expect(await screen.findByText('Planned Start Date is required.')).toBeInTheDocument();

    // Fill start date
    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-07-05' } });

    // Missing end date
    fireEvent.submit(form);
    expect(await screen.findByText('Planned End Date is required.')).toBeInTheDocument();

    // Fill end date
    fireEvent.change(dateInputs[1], { target: { value: '2026-07-06' } });

    // Missing estimated hours
    fireEvent.submit(form);
    expect(await screen.findByText('Estimated hours are required and must be greater than 0.')).toBeInTheDocument();

    // Fill estimated hours
    fireEvent.change(screen.getByPlaceholderText(/e.g. 12/i), { target: { value: '8' } });

    // Missing description
    fireEvent.submit(form);
    expect(await screen.findByText('Description is required.')).toBeInTheDocument();
  });

  it('validates invalid or zero estimated hours error', async () => {
    const { container } = render(<AddTaskModal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText(/e.g. Implement User Authentication Flow/i), { target: { value: 'Task' } });
    fireEvent.change(container.querySelector('select[name="assigned_employee_id"]'), { target: { value: '1' } });
    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-07-05' } });
    fireEvent.change(dateInputs[1], { target: { value: '2026-07-06' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter task detailed description.../i), { target: { value: 'Desc' } });
    fireEvent.change(screen.getByPlaceholderText(/e.g. 12/i), { target: { value: '-5' } });

    fireEvent.submit(container.querySelector('form'));
    expect(await screen.findByText('Estimated hours are required and must be greater than 0.')).toBeInTheDocument();
  });

  it('handles API error when createSprintTask fails', async () => {
    SprintServices.createSprintTask.mockRejectedValue({
      response: { data: { detail: 'Server Error: Invalid sprint task' } }
    });

    const { container } = render(<AddTaskModal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText(/e.g. Implement User Authentication Flow/i), { target: { value: 'Task' } });
    fireEvent.change(container.querySelector('select[name="assigned_employee_id"]'), { target: { value: '1' } });
    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-07-01' } });
    fireEvent.change(dateInputs[1], { target: { value: '2026-07-02' } });
    fireEvent.change(screen.getByPlaceholderText(/e.g. 12/i), { target: { value: '8' } });
    fireEvent.change(screen.getByPlaceholderText(/Enter task detailed description.../i), { target: { value: 'Desc' } });

    fireEvent.submit(container.querySelector('form'));

    expect(await screen.findByText('Server Error: Invalid sprint task')).toBeInTheDocument();
  });

  it('submits valid form data to SprintServices.createSprintTask', async () => {
    const createdTask = { id: 99, title: 'New Test Task' };
    SprintServices.createSprintTask.mockResolvedValue(createdTask);

    const { container } = render(<AddTaskModal {...defaultProps} />);

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

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-07-01' } });
    fireEvent.change(dateInputs[1], { target: { value: '2026-07-02' } });

    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => {
      expect(SprintServices.createSprintTask).toHaveBeenCalled();
      expect(defaultProps.onTaskCreated).toHaveBeenCalledWith(createdTask);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});
