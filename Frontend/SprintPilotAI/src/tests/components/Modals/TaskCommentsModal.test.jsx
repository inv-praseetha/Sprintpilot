import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaskCommentsModal from '../../../components/Modals/TaskCommentsModal';

describe('TaskCommentsModal Component', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <TaskCommentsModal 
        show={true} 
        onClose={vi.fn()} 
        task={{ id: 1, title: 'Task 1' }} 
        comments={[]} 
      />
    );
    expect(container).toBeInTheDocument();
  });
});
