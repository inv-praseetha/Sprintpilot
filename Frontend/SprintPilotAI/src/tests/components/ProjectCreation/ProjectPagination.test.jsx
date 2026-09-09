import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProjectPagination from '../../../components/ProjectCreation/ProjectPagination';

describe('ProjectPagination Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ProjectPagination 
        currentPage={1} 
        totalPages={5} 
        onPageChange={vi.fn()} 
      />
    );
    expect(container).toBeInTheDocument();
  });
});
