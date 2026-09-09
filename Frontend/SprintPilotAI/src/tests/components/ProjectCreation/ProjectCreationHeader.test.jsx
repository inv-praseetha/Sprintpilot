import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ProjectCreationHeader from '../../../components/ProjectCreation/ProjectCreationHeader';

describe('ProjectCreationHeader Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ProjectCreationHeader onOpenCreateModal={vi.fn()} />
    );
    expect(container).toBeInTheDocument();
  });
});
