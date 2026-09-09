import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToastProvider, useToast } from '../../context/ToastContext';

// Mock Toast component
vi.mock('../../components/Common/Toast', () => ({
  default: ({ message, type, onClose }) => (
    <div data-testid="mock-toast" data-type={type}>
      <span>{message}</span>
      <button onClick={onClose}>Close</button>
    </div>
  )
}));

const TestComponent = () => {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.success('Success message')}>Success</button>
      <button onClick={() => toast.error('Error message')}>Error</button>
      <button onClick={() => toast.warning('Warning message')}>Warning</button>
      <button onClick={() => toast.info('Info message')}>Info</button>
    </div>
  );
};

describe('ToastContext', () => {
  it('throws error when useToast is used outside ToastProvider', () => {
    const consoleError = console.error;
    console.error = vi.fn();

    expect(() => render(<TestComponent />)).toThrow(
      'useToast must be used within a ToastProvider'
    );

    console.error = consoleError;
  });

  it('adds and removes toasts correctly', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // No toasts initially
    expect(screen.queryAllByTestId('mock-toast')).toHaveLength(0);

    // Trigger success toast
    fireEvent.click(screen.getByText('Success'));
    expect(screen.getAllByTestId('mock-toast')).toHaveLength(1);
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByTestId('mock-toast').getAttribute('data-type')).toBe('success');

    // Trigger error toast
    fireEvent.click(screen.getByText('Error'));
    expect(screen.getAllByTestId('mock-toast')).toHaveLength(2);
    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Close first toast
    const closeBtns = screen.getAllByRole('button', { name: 'Close' });
    fireEvent.click(closeBtns[0]);

    // Toast list length should reduce to 1
    expect(screen.getAllByTestId('mock-toast')).toHaveLength(1);
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });
});
