import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import GoogleButtonSkeleton from '../../../components/login/GoogleButtonSkeleton';

describe('GoogleButtonSkeleton Component', () => {
  it('renders correctly', () => {
    const { container } = render(<GoogleButtonSkeleton />);
    expect(container).toBeInTheDocument();
  });

  it('displays correct text', () => {
    render(<GoogleButtonSkeleton />);
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(<GoogleButtonSkeleton onClick={handleClick} />);
    
    const button = screen.getByRole('button', { name: /continue with google/i });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
