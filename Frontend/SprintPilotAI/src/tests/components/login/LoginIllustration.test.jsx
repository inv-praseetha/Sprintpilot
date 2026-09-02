import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoginIllustration from '../../../components/login/LoginIllustration';

describe('LoginIllustration Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<LoginIllustration />);
    expect(container).toBeInTheDocument();
  });

  it('renders key text elements', () => {
    render(<LoginIllustration />);
    
    expect(screen.getByText('150 projects synced')).toBeInTheDocument();
    expect(screen.getByText('Sprint Schedule & Status')).toBeInTheDocument();
    expect(screen.getByText('Track timelines, status, and task load for project sprints')).toBeInTheDocument();
  });

  it('renders legend items', () => {
    render(<LoginIllustration />);
    
    expect(screen.getByText('Cloud Sync')).toBeInTheDocument();
    expect(screen.getByText('AI Analytics')).toBeInTheDocument();
    expect(screen.getByText('Dev Portal')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('renders sprint markers', () => {
    render(<LoginIllustration />);
    
    expect(screen.getByText('Sprint 1')).toBeInTheDocument();
    expect(screen.getByText('Sprint 2')).toBeInTheDocument();
    expect(screen.getByText('Sprint 3')).toBeInTheDocument();
    expect(screen.getByText('Sprint 4')).toBeInTheDocument();
    expect(screen.getByText('Sprint 5')).toBeInTheDocument();
  });
});
