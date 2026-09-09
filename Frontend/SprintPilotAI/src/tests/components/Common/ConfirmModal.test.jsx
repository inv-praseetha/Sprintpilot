import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ConfirmModal from '../../../components/Common/ConfirmModal';
import * as layoutModule from '../../../components/layout/MainLayouut';

// Mock useTheme hook
vi.mock('../../../components/layout/MainLayouut', () => ({
  useTheme: vi.fn()
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="warning-icon">Warning Icon</div>,
  AlertCircle: () => <div data-testid="danger-icon">Danger Icon</div>,
  Info: () => <div data-testid="info-icon">Info Icon</div>
}));

describe('ConfirmModal Component', () => {
  const defaultProps = {
    title: 'Confirm Action',
    message: 'Are you sure?',
    confirmText: 'Yes, do it',
    cancelText: 'No, cancel',
    type: 'warning',
    onConfirm: vi.fn(),
    onCancel: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    layoutModule.useTheme.mockReturnValue({ darkMode: false });
  });

  it('renders modal with provided texts and type icon', () => {
    render(<ConfirmModal {...defaultProps} />);

    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('Yes, do it')).toBeInTheDocument();
    expect(screen.getByText('No, cancel')).toBeInTheDocument();
    expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
  });

  it('renders danger icon and correct styles when type is danger', () => {
    render(<ConfirmModal {...defaultProps} type="danger" />);
    expect(screen.getByTestId('danger-icon')).toBeInTheDocument();
    
    const confirmBtn = screen.getByText('Yes, do it');
    expect(confirmBtn.className).toContain('bg-rose-600');
  });

  it('focuses the confirm button on mount', () => {
    render(<ConfirmModal {...defaultProps} />);
    const confirmBtn = screen.getByText('Yes, do it');
    expect(document.activeElement).toBe(confirmBtn);
  });

  it('triggers onConfirm when confirm button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Yes, do it'));
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('triggers onCancel when cancel button is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    fireEvent.click(screen.getByText('No, cancel'));
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('triggers onCancel when background overlay is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    // The main container/overlay has onClick={onCancel}
    // We can query by role or just get the dialog background
    const overlay = screen.getByRole('dialog').parentElement;
    fireEvent.click(overlay);
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('stops propagation when modal content container is clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('triggers onCancel when Escape key is pressed', () => {
    render(<ConfirmModal {...defaultProps} />);
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });
});
