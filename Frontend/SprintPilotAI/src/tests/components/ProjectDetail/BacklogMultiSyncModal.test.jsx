import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BacklogMultiSyncModal from '../../../components/ProjectDetail/BacklogMultiSyncModal';
import apiClient from '../../../api/apiClient';

vi.mock('../../../api/apiClient', () => ({
  default: {
    post: vi.fn(),
  }
}));

describe('BacklogMultiSyncModal', () => {
  const mockOnComplete = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open and begins sync immediately', async () => {
    apiClient.post.mockResolvedValueOnce({ data: {} });

    const affectedSprints = {
      'sprint-1': ['task-1', 'task-2'],
      'sprint-2': ['task-3']
    };

    render(
      <BacklogMultiSyncModal
        isOpen={true}
        darkMode={false}
        affectedSprints={affectedSprints}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Backlog Sync Progress')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledTimes(2);
      expect(apiClient.post).toHaveBeenCalledWith('sprints/sprint-1/sync-backlog/', { task_ids: ['task-1', 'task-2'] });
      expect(apiClient.post).toHaveBeenCalledWith('sprints/sprint-2/sync-backlog/', { task_ids: ['task-3'] });
    });

    await waitFor(() => {
      expect(screen.getByText('All tasks successfully synced to Backlog!')).toBeInTheDocument();
      expect(screen.getByText('Close & Continue')).toBeInTheDocument();
    });
  });

  it('handles empty affectedSprints gracefully', async () => {
    render(
      <BacklogMultiSyncModal
        isOpen={true}
        darkMode={false}
        affectedSprints={{}}
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No sprints required syncing.')).toBeInTheDocument();
      expect(screen.getByText('Close & Continue')).toBeInTheDocument();
    });
    
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it('handles API errors properly', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Network error'));

    render(
      <BacklogMultiSyncModal
        isOpen={true}
        darkMode={false}
        affectedSprints={{ 'sprint-1': ['task-1'] }}
        onComplete={mockOnComplete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Failed to sync 1 out of 1 sprint/i)).toBeInTheDocument();
    });
  });
});
