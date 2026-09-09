import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ProjectTable from '../../../components/ProjectCreation/ProjectTable';

describe('ProjectTable Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <BrowserRouter>
        <ProjectTable filteredProjects={[]} loading={false} />
      </BrowserRouter>
    );
    expect(container).toBeInTheDocument();
  });
});
