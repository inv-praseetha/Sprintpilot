import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ErrorAlert from '../../../components/login/ErrorAlert';

// Mock lucide-react icon
vi.mock('lucide-react', () => ({
  AlertCircle: () => <div data-testid="alert-icon">Alert</div>
}));

describe('ErrorAlert Component', () => {
  it('renders nothing when error is not provided', () => {
    const { container } = render(<ErrorAlert error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders error message when provided', () => {
    const errorMessage = 'Invalid credentials';
    render(<ErrorAlert error={errorMessage} />);
    
    expect(screen.getByText('Sign-in Error')).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
  });
});
