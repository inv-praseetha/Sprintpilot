import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProjectOverviewCard from '../../../components/ProjectDetail/ProjectOverviewCard';

describe('ProjectOverviewCard Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ProjectOverviewCard 
        project={{ id: 1, name: 'Project 1', status: 'ACTIVE' }} 
      />
    );
    expect(container).toBeInTheDocument();
  });
});
