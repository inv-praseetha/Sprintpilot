import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ScheduleSection from '../../../../components/Modals/ProjectFormSections/ScheduleSection';

vi.mock('../../../../hooks/useValidationLimits', () => ({
  useValidationLimits: () => ({
    project: {
      numberOfDays: { min: 1, max: 100 }
    }
  })
}));

vi.mock('../../../../components/Common/CustomDatePicker', () => {
  return {
    default: ({ value, onChange, placeholder }) => (
      <input 
        data-testid="mock-datepicker" 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={placeholder}
      />
    )
  }
});

describe('ScheduleSection Component', () => {
  const defaultProps = {
    type: 'AGILE',
    darkMode: false,
    editingProjectId: null,
    startDate: '',
    setStartDate: vi.fn(),
    endDate: '',
    setEndDate: vi.fn(),
    numberOfDays: '10',
    setNumberOfDays: vi.fn(),
    calculateEndDate: vi.fn().mockReturnValue('2024-01-15')
  };

  it('renders AGILE fields correctly', () => {
    render(<ScheduleSection {...defaultProps} type="AGILE" />);
    expect(screen.getByText(/Start Date/i)).toBeInTheDocument();
    expect(screen.getByText(/Duration \(Days\)/i)).toBeInTheDocument();
    
    const durationInput = screen.getByPlaceholderText('10');
    fireEvent.change(durationInput, { target: { value: '15' } });
    expect(defaultProps.setNumberOfDays).toHaveBeenCalledWith('15');
  });

  it('renders WATERFALL fields correctly', () => {
    render(<ScheduleSection {...defaultProps} type="WATERFALL" />);
    expect(screen.getByText(/Start Date/i)).toBeInTheDocument();
    expect(screen.getByText(/End Date/i)).toBeInTheDocument();
    
    const pickers = screen.getAllByTestId('mock-datepicker');
    expect(pickers.length).toBe(2);
  });
});
