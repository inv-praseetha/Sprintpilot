import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProjectEmptyState from '../../../components/ProjectCreation/ProjectEmptyState';

describe('ProjectEmptyState Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ProjectEmptyState isSearch={false} onClearFilters={vi.fn()} />
    );
    expect(container).toBeInTheDocument();
  });
});
