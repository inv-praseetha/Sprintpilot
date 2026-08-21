import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TeamSelectionSection from '../../../../components/Modals/ProjectFormSections/TeamSelectionSection';

vi.mock('../../../../hooks/useValidationLimits', () => ({
  useValidationLimits: () => ({
    general: { search: { maxLength: 50 } }
  })
}));

vi.mock('../../../../context/ToastContext', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn()
  })
}));

vi.mock('lucide-react', () => ({
  Code: () => <div data-testid="code-icon">Code</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  AlertCircle: () => <div data-testid="alert-icon">Alert</div>,
  X: () => <div data-testid="x-icon">X</div>
}));

describe('TeamSelectionSection Component', () => {
  const mockTeamLeads = [
    { user: { id: 1, full_name: 'Lead One', email: 'lead1@test.com' } }
  ];
  
  const mockSkills = [
    { id: 10, name: 'React', parent: null },
    { id: 11, name: 'Node.js', parent: null }
  ];

  const mockEmployees = [
    { id: 100, user: { full_name: 'Dev One', email: 'dev1@test.com' }, designation: 'Developer', status: 'ACTIVE' }
  ];

  const defaultProps = {
    darkMode: false,
    editingProjectId: null,
    teamLead: '',
    setTeamLead: vi.fn(),
    teamLeads: mockTeamLeads,
    skillCategoryFilter: 'ALL',
    setSkillCategoryFilter: vi.fn(),
    filteredSkills: mockSkills,
    selectedSkills: [],
    toggleSkillSelection: vi.fn(),
    filteredEmployeesForSelection: mockEmployees,
    employees: mockEmployees,
    selectedMembers: [],
    toggleMemberSelection: vi.fn(),
    teamSize: '5'
  };

  it('renders team lead select', () => {
    render(<TeamSelectionSection {...defaultProps} />);
    expect(screen.getAllByText(/Team Lead/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Select Team Lead\.\.\./i)).toBeInTheDocument();
    expect(screen.getByText('Lead One (lead1@test.com)')).toBeInTheDocument();
  });

  it('renders technical stack options when not editing', () => {
    render(<TeamSelectionSection {...defaultProps} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('React'));
    expect(defaultProps.toggleSkillSelection).toHaveBeenCalledWith(10);
  });
});
