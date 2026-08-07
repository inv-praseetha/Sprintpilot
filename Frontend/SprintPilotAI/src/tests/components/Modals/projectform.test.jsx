import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProjectForm from '../../../components/Modals/projectform';

vi.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="alert-icon">Alert</div>,
  Code: () => <div data-testid="code-icon">Code</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  Loader2: () => <div data-testid="loader-icon">Loader</div>,
  X: () => <div data-testid="close-icon">X</div>,
  Info: () => <div data-testid="info-icon">Info</div>
}));

vi.mock('../../../hooks/useValidationLimits', () => ({
  useValidationLimits: () => ({
    general: { search: { maxLength: 50 } },
    project: {
      projectId: { minLength: 3, maxLength: 20, pattern: '.*' },
      jiraId: { maxLength: 10, pattern: '.*' },
      name: { minLength: 3, maxLength: 100 },
      description: { minLength: 0, maxLength: 500 },
      teamSize: { min: 1, max: 100 },
      numberOfDays: { min: 1, max: 100 }
    }
  })
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn()
  })
}));

vi.mock('../../../components/Common/CustomDatePicker', () => ({
  default: ({ value, onChange }) => (
    <input type="date" value={value || ''} onChange={e => onChange(e.target.value)} />
  )
}));

describe('ProjectForm Component', () => {
  const defaultProps = {
    handleSubmit: vi.fn(e => e.preventDefault()),
    formError: null,
    calculateEndDate: vi.fn(),
    darkMode: false,
    projectId: 'PRJ-1',
    setProjectId: vi.fn(),
    jiraId: 'SP',
    setJiraId: vi.fn(),
    name: 'Test Project',
    setName: vi.fn(),
    description: 'Test Desc',
    setDescription: vi.fn(),
    type: 'AGILE',
    setType: vi.fn(),
    status: 'ACTIVE',
    setStatus: vi.fn(),
    teamSize: '5',
    setTeamSize: vi.fn(),
    startDate: '2026-07-01',
    setStartDate: vi.fn(),
    endDate: '2026-07-15',
    setEndDate: vi.fn(),
    numberOfDays: '10',
    setNumberOfDays: vi.fn(),
    teamLead: '101',
    setTeamLead: vi.fn(),
    teamLeads: [{ user: { id: 101, full_name: 'Lead Alice', email: 'alice@test.com' } }],
    skillCategoryFilter: 'ALL',
    setSkillCategoryFilter: vi.fn(),
    filteredSkills: [{ id: 1, name: 'React', parent: null }],
    selectedSkills: [],
    toggleSkillSelection: vi.fn(),
    filteredEmployeesForSelection: [{ id: 1, user: { full_name: 'Bob' }, designation: 'Dev' }],
    employees: [{ id: 1, user: { full_name: 'Bob' } }],
    selectedMembers: [],
    toggleMemberSelection: vi.fn(),
    onClose: vi.fn(),
    submitting: false,
    editingProjectId: null
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all fields correctly', () => {
    render(<ProjectForm {...defaultProps} />);
    
    expect(screen.getByDisplayValue('PRJ-1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
    expect(screen.getByText('AGILE')).toBeInTheDocument();
    expect(screen.getByText('WATERFALL')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Lead Alice (alice@test.com)')).toBeInTheDocument();
  });

  it('handles field changes', () => {
    render(<ProjectForm {...defaultProps} />);
    
    const nameInput = screen.getByDisplayValue('Test Project');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect(defaultProps.setName).toHaveBeenCalledWith('New Name');
  });

  it('calls handleSubmit on submit', () => {
    render(<ProjectForm {...defaultProps} />);
    
    const submitBtn = screen.getByText('Create Project');
    fireEvent.click(submitBtn);
    
    expect(defaultProps.handleSubmit).toHaveBeenCalled();
  });

  it('displays form error when present', () => {
    render(<ProjectForm {...defaultProps} formError="Test Error" />);
    
    expect(screen.getByText('Test Error')).toBeInTheDocument();
  });
});
