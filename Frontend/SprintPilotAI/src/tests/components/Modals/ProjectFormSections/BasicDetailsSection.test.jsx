import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import BasicDetailsSection from '../../../../components/Modals/ProjectFormSections/BasicDetailsSection';

vi.mock('../../../../hooks/useValidationLimits', () => ({
  useValidationLimits: () => ({
    project: {
      projectId: { minLength: 3, maxLength: 20, pattern: '.*' },
      jiraId: { maxLength: 10, pattern: '.*' },
      name: { minLength: 3, maxLength: 50 },
      description: { minLength: 10, maxLength: 200 },
      teamSize: { min: 1, max: 20 }
    }
  })
}));

describe('BasicDetailsSection Component', () => {
  const defaultProps = {
    darkMode: false,
    projectId: '',
    setProjectId: vi.fn(),
    editingProjectId: null,
    jiraId: '',
    setJiraId: vi.fn(),
    name: '',
    setName: vi.fn(),
    description: '',
    setDescription: vi.fn(),
    type: 'AGILE',
    setType: vi.fn(),
    status: 'ACTIVE',
    setStatus: vi.fn(),
    teamSize: '5',
    setTeamSize: vi.fn()
  };

  it('renders correctly', () => {
    render(<BasicDetailsSection {...defaultProps} />);
    expect(screen.getByText(/Project ID/i)).toBeInTheDocument();
    expect(screen.getByText(/Project Name/i)).toBeInTheDocument();
  });

  it('calls setters on input change', () => {
    render(<BasicDetailsSection {...defaultProps} />);
    
    const nameInput = screen.getByPlaceholderText('Enter project name...');
    fireEvent.change(nameInput, { target: { value: 'New Project' } });
    expect(defaultProps.setName).toHaveBeenCalledWith('New Project');

    const descInput = screen.getByPlaceholderText(/Brief description/i);
    fireEvent.change(descInput, { target: { value: 'New desc' } });
    expect(defaultProps.setDescription).toHaveBeenCalledWith('New desc');
  });

  it('disables projectId when editing', () => {
    render(<BasicDetailsSection {...defaultProps} editingProjectId={123} projectId="PRJ-1" />);
    const projectIdInput = screen.getByDisplayValue('PRJ-1');
    expect(projectIdInput).toBeDisabled();
  });
});
