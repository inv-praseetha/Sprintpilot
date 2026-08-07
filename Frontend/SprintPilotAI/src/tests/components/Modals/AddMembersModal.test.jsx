import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AddMembersModal from '../../../components/Modals/AddMembersModal';

vi.mock('lucide-react', () => ({
  X: () => <div data-testid="close-icon">X</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  AlertCircle: () => <div data-testid="alert-icon">Alert</div>,
  Loader2: () => <div data-testid="loader-icon">Loader</div>
}));

vi.mock('../../../hooks/useValidationLimits', () => ({
  useValidationLimits: () => ({
    general: { search: { maxLength: 50 } }
  })
}));

describe('AddMembersModal Component', () => {
  const employees = [
    {
      id: 1,
      user: { id: 101, full_name: 'Alice Smith' },
      designation: 'Engineer',
      status: 'ACTIVE',
      skills: [{ id: 1, name: 'React' }]
    },
    {
      id: 2,
      user: { id: 102, full_name: 'Bob Jones' },
      designation: 'Designer',
      status: 'ACTIVE',
      skills: [{ id: 2, name: 'UI/UX' }]
    },
    {
      id: 3,
      user: { id: 103, full_name: 'Charlie Brown' },
      designation: 'QA',
      status: 'ACTIVE',
      skills: [{ id: 3, name: 'Testing' }]
    }
  ];

  const project = {
    id: 1,
    team_lead: { id: 101 }, // Alice is team lead (won't show in available)
    members: [
      { user: { id: 102 } } // Bob is already member (won't show in available)
    ],
    team_size: 5,
    skills: []
  };

  const defaultProps = {
    show: true,
    onClose: vi.fn(),
    darkMode: false,
    employees: employees,
    project: project,
    onAddMembers: vi.fn(),
    updatingMembers: false,
    modalError: null,
    setModalError: vi.fn()
  };

  it('renders nothing when show is false', () => {
    const { container } = render(<AddMembersModal {...defaultProps} show={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders available employees', () => {
    render(<AddMembersModal {...defaultProps} />);
    
    // Alice is lead, Bob is member, so only Charlie should be available
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
  });

  it('selects an employee when clicked', () => {
    render(<AddMembersModal {...defaultProps} />);
    
    const charlie = screen.getByText('Charlie Brown');
    fireEvent.click(charlie);
    
    // Check if the "Add 1 member(s)" button updates
    expect(screen.getByText('Add 1 member(s)')).toBeInTheDocument();
  });

  it('submits selected employees', () => {
    render(<AddMembersModal {...defaultProps} />);
    
    const charlie = screen.getByText('Charlie Brown');
    fireEvent.click(charlie);
    
    const submitBtn = screen.getByText('Add 1 member(s)');
    fireEvent.click(submitBtn);
    
    expect(defaultProps.onAddMembers).toHaveBeenCalled();
  });
});
