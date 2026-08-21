import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import BrandHeader from '../../../components/login/BrandHeader';

describe('BrandHeader Component', () => {
  it('renders correctly', () => {
    const { container } = render(<BrandHeader />);
    expect(container).toBeInTheDocument();
  });

  it('displays brand name and domain', () => {
    render(<BrandHeader />);
    expect(screen.getByText('SprintPilotAI')).toBeInTheDocument();
    expect(screen.getByText('sprintpilotaiinnovaturelabs.com')).toBeInTheDocument();
  });

  it('displays the logo symbol', () => {
    render(<BrandHeader />);
    expect(screen.getByText('✳')).toBeInTheDocument();
  });
});
