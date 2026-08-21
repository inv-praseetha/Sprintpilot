import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CloseSprintModal from '../../../components/ProjectDetail/CloseSprintModal';

describe('CloseSprintModal Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <CloseSprintModal 
        show={true} 
        onClose={vi.fn()} 
        sprint={{ id: 1, name: 'Sprint 1' }}
      />
    );
    expect(container).toBeInTheDocument();
  });
});
