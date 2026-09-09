import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProjectCreationFilters from '../../../components/ProjectCreation/ProjectCreationFilters';

describe('ProjectCreationFilters Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ProjectCreationFilters 
        searchTerm="" 
        onSearchChange={vi.fn()} 
        filterStatus="ALL" 
        onFilterStatusChange={vi.fn()}
      />
    );
    expect(container).toBeInTheDocument();
  });
});
