import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JiraSyncModal from '../../../components/Modals/JiraSyncModal';
import apiClient from '../../../api/apiClient';

vi.mock('../../../api/apiClient', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  }
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({
    error: vi.fn(),
    success: vi.fn()
  })
}));

vi.mock('lucide-react', () => ({
  UploadCloud: () => <div data-testid="upload-icon">Upload</div>,
  X: () => <div data-testid="close-icon">X</div>,
  Database: () => <div data-testid="database-icon">DB</div>,
  AlertCircle: () => <div data-testid="alert-icon">Alert</div>,
  Loader2: () => <div data-testid="loader-icon">Loader</div>,
  ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
  CheckCircle2: () => <div data-testid="check-circle-icon">Check</div>
}));

vi.mock('../../../components/Common/CustomDatePicker', () => ({
  default: ({ value, onChange }) => (
    <input type="date" value={value || ''} onChange={e => onChange(e.target.value)} />
  )
}));

describe('JiraSyncModal Component', () => {
  const sprint = { id: 1, milestone: 'Sprint 1', start_date: '2026-07-01', end_date: '2026-07-15' };
  const employees = [{ id: 10, user: { full_name: 'John Doe' } }];
  
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    darkMode: false,
    sprint: sprint,
    onSyncSuccess: vi.fn(),
    employees: employees
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue({ data: [] });
  });

  it('renders nothing if not open', () => {
    const { container } = render(<JiraSyncModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('fetches tasks on open', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: {
        sprint_name: 'Sprint 1',
        tasks: [{ title: 'Jira Task 1', jiraId: 'TEST-1' }]
      }
    });

    render(<JiraSyncModal {...defaultProps} />);

    expect(apiClient.post).toHaveBeenCalledWith('jira/sync-sprint/1/', { sprint_name: 'Sprint 1' });
    
    await waitFor(() => {
      expect(screen.getByText('Fetched Tasks (1)')).toBeInTheDocument();
      expect(screen.getByText('Jira Task 1')).toBeInTheDocument();
      expect(screen.getByText('TEST-1')).toBeInTheDocument();
    });
  });

  it('handles empty fetch result', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: { sprint_name: 'Sprint 1', tasks: [], detail: 'No new tasks found' }
    });

    render(<JiraSyncModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No new tasks found')).toBeInTheDocument();
    });
  });

  it('submits selected tasks', async () => {
    apiClient.post.mockResolvedValueOnce({
      data: {
        sprint_name: 'Sprint 1',
        tasks: [{ title: 'Jira Task 1', jiraId: 'TEST-1' }]
      }
    });

    render(<JiraSyncModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Jira Task 1')).toBeInTheDocument();
    });

    // Need to set assignee, startDate, endDate
    const assigneeSelects = screen.getAllByRole('combobox');
    // The first two are status and priority, the 3rd is assignee
    fireEvent.change(assigneeSelects[2], { target: { value: '10' } });

    // The Date pickers are rendered as inputs of type="date"
    const dateInputs = screen.getAllByRole('textbox').filter(i => i.type === 'date' || i.type === 'text');
    // Using testid or fallback. We mocked CustomDatePicker as <input type="date" />
    const datePickers = screen.getAllByDisplayValue('');
    if (datePickers.length >= 2) {
      fireEvent.change(datePickers[0], { target: { value: '2026-07-01' } });
      fireEvent.change(datePickers[1], { target: { value: '2026-07-10' } });
    } else {
      // In case we can't find by empty string, find by type
      const dateTypeInputs = document.querySelectorAll('input[type="date"]');
      if (dateTypeInputs.length >= 2) {
         fireEvent.change(dateTypeInputs[0], { target: { value: '2026-07-01' } });
         fireEvent.change(dateTypeInputs[1], { target: { value: '2026-07-10' } });
      }
    }


    // Mock successful save
    apiClient.post.mockResolvedValueOnce({ data: {} });

    const importBtn = screen.getByText(/Import 1 Tasks/i);
    fireEvent.click(importBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('jira/append-tasks/1/', expect.objectContaining({
        sprint_name: 'Sprint 1'
      }));
      expect(defaultProps.onSyncSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });
});
