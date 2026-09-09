import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ReassignTasksModal from '../../../components/ProjectDetail/ReassignTasksModal';

describe('ReassignTasksModal Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <ReassignTasksModal 
        show={true} 
        onClose={vi.fn()} 
        project={{ id: 1 }} 
        memberToRemove={{ id: 1, user: { full_name: 'Test' } }}
      />
    );
    expect(container).toBeInTheDocument();
  });
});
