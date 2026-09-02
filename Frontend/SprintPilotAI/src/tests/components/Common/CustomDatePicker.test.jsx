import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CustomDatePicker from '../../../components/Common/CustomDatePicker';

describe('CustomDatePicker Component', () => {
  const defaultProps = {
    value: '2026-07-15',
    onChange: vi.fn(),
    minDate: '2026-07-01',
    maxDate: '2026-07-31',
    darkMode: false,
    onOpen: vi.fn(),
    onClose: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial formatted date value', () => {
    render(<CustomDatePicker {...defaultProps} />);
    // "2026-07-15" should format to "Jul 15, 2026"
    expect(screen.getByText('Jul 15, 2026')).toBeInTheDocument();
  });

  it('opens the calendar popover when clicking the button', () => {
    render(<CustomDatePicker {...defaultProps} />);
    const btn = screen.getByRole('button');
    fireEvent.click(btn);

    expect(defaultProps.onOpen).toHaveBeenCalledTimes(1);
    // Popover is in the portal, we should see the calendar header (e.g. July 2026)
    expect(screen.getByText(/July\s+2026/)).toBeInTheDocument();
  });

  it('selects a valid date and triggers onChange', () => {
    render(<CustomDatePicker {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    // Let's click day 17 (a Friday in July 2026)
    // 2026-07-17 is Friday, 2026-07-15 is Wednesday, 2026-07-17 is valid
    const day17 = screen.getByText('17');
    fireEvent.click(day17);

    expect(defaultProps.onChange).toHaveBeenCalledWith('2026-07-17');
  });

  it('disables weekends and does not select them', () => {
    render(<CustomDatePicker {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    // July 18, 2026 is a Saturday. It should be disabled.
    const day18 = screen.getByText('18');
    fireEvent.click(day18);

    expect(defaultProps.onChange).not.toHaveBeenCalled();
  });

  it('disables dates outside of [minDate, maxDate]', () => {
    render(<CustomDatePicker {...defaultProps} minDate="2026-07-10" maxDate="2026-07-20" />);
    fireEvent.click(screen.getByRole('button'));

    // Day 8 should be disabled (before minDate 2026-07-10)
    const day8 = screen.getByText('8');
    fireEvent.click(day8);
    expect(defaultProps.onChange).not.toHaveBeenCalled();

    // Day 22 should be disabled (after maxDate 2026-07-20)
    const day22 = screen.getByText('22');
    fireEvent.click(day22);
    expect(defaultProps.onChange).not.toHaveBeenCalled();
  });

  it('navigates to next and previous months', () => {
    render(<CustomDatePicker {...defaultProps} />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText(/July\s+2026/)).toBeInTheDocument();

    // We can also click the chevron right wrapper button by querying button tags inside popover
    // ChevronLeft and ChevronRight are in the header buttons. Let's find button elements containing them.
    // Or just find them via test id or SVG class or index
    const headerBtns = screen.getAllByRole('button');
    const nextMonthButton = headerBtns[2];
    fireEvent.click(nextMonthButton);
    expect(screen.getByText(/August\s+2026/)).toBeInTheDocument();

    const prevMonthButton = headerBtns[1];
    fireEvent.click(prevMonthButton);
    expect(screen.getByText(/July\s+2026/)).toBeInTheDocument();
  });

  it('closes calendar when clicking outside', () => {
    render(
      <div>
        <div data-testid="outside">Outside Element</div>
        <CustomDatePicker {...defaultProps} />
      </div>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText(/July\s+2026/)).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText(/July\s+2026/)).not.toBeInTheDocument();
  });
});
