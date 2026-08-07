import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ConfirmProvider, useConfirm } from '../../context/ConfirmContext';

// Mock ConfirmModal
vi.mock('../../components/Common/ConfirmModal', () => ({
  default: ({ title, message, confirmText, cancelText, onConfirm, onCancel }) => (
    <div data-testid="confirm-modal">
      <h1>{title}</h1>
      <p>{message}</p>
      <button onClick={onConfirm}>{confirmText}</button>
      <button onClick={onCancel}>{cancelText}</button>
    </div>
  )
}));

const TestComponent = ({ onResult }) => {
  const confirm = useConfirm();
  const handleClick = async () => {
    const res = await confirm({
      title: 'Sure?',
      message: 'Are you sure about this?',
      confirmText: 'Yes',
      cancelText: 'No',
      type: 'danger'
    });
    onResult(res);
  };

  return <button onClick={handleClick}>Trigger Confirm</button>;
};

describe('ConfirmContext', () => {
  it('throws error when useConfirm is used outside ConfirmProvider', () => {
    const consoleError = console.error;
    console.error = vi.fn();

    expect(() => render(<TestComponent onResult={vi.fn()} />)).toThrow(
      'useConfirm must be used within a ConfirmProvider'
    );

    console.error = consoleError;
  });

  it('opens confirmation modal and resolves true on confirm action', async () => {
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <TestComponent onResult={onResult} />
      </ConfirmProvider>
    );

    // Modal is not in the document initially
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();

    // Trigger confirmation modal open
    fireEvent.click(screen.getByText('Trigger Confirm'));

    // Modal is open
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(screen.getByText('Sure?')).toBeInTheDocument();
    expect(screen.getByText('Are you sure about this?')).toBeInTheDocument();

    // Click confirm button
    await act(async () => {
      fireEvent.click(screen.getByText('Yes'));
    });

    // Modal is closed
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    expect(onResult).toHaveBeenCalledWith(true);
  });

  it('opens confirmation modal and resolves false on cancel action', async () => {
    const onResult = vi.fn();
    render(
      <ConfirmProvider>
        <TestComponent onResult={onResult} />
      </ConfirmProvider>
    );

    // Trigger confirm
    fireEvent.click(screen.getByText('Trigger Confirm'));

    // Click cancel button
    await act(async () => {
      fireEvent.click(screen.getByText('No'));
    });

    // Modal is closed
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    expect(onResult).toHaveBeenCalledWith(false);
  });
});
