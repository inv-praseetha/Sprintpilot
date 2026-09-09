import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Toast from '../../../components/Common/Toast';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CheckCircle2: () => <div data-testid="success-icon">Success Icon</div>,
  AlertCircle: () => <div data-testid="error-icon">Error Icon</div>,
  AlertTriangle: () => <div data-testid="warning-icon">Warning Icon</div>,
  Info: () => <div data-testid="info-icon">Info Icon</div>,
  X: () => <div data-testid="close-icon">Close Icon</div>
}));

describe('Toast Component', () => {
  const defaultProps = {
    message: 'Task completed successfully',
    type: 'success',
    onClose: vi.fn(),
    duration: 3000
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the toast message and corresponding type icon', () => {
    render(<Toast {...defaultProps} />);

    expect(screen.getByText('Task completed successfully')).toBeInTheDocument();
    expect(screen.getByTestId('success-icon')).toBeInTheDocument();
  });

  it('renders correctly with other toast types', () => {
    const { rerender } = render(<Toast {...defaultProps} type="error" />);
    expect(screen.getByTestId('error-icon')).toBeInTheDocument();

    rerender(<Toast {...defaultProps} type="warning" />);
    expect(screen.getByTestId('warning-icon')).toBeInTheDocument();

    rerender(<Toast {...defaultProps} type="info" />);
    expect(screen.getByTestId('info-icon')).toBeInTheDocument();
  });

  it('triggers onClose when close button is clicked', () => {
    render(<Toast {...defaultProps} />);
    
    const closeBtn = screen.getByRole('button', { name: /Close notification/i });
    fireEvent.click(closeBtn);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('automatically triggers onClose after duration timeout', () => {
    render(<Toast {...defaultProps} />);

    expect(defaultProps.onClose).not.toHaveBeenCalled();

    // Fast-forward time by 3000ms
    vi.advanceTimersByTime(3000);

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('clears timeout on unmount', () => {
    const { unmount } = render(<Toast {...defaultProps} />);
    unmount();
    vi.advanceTimersByTime(3000);
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });
});
