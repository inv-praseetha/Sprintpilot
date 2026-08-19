import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SprintsList from '../../../components/ProjectDetail/SprintsList';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

describe('SprintsList Component', () => {
  const defaultSprints = [
    {
      id: 1,
      name: 'Sprint 1',
      milestone: 'Sprint 1 Milestone',
      totalTasks: 5,
      startDate: '2026-08-01',
      endDate: '2026-08-15',
      progressPercentage: 50,
      status: 'IN PROGRESS',
      workspaceUrl: 'https://backlog.com/issue/1'
    },
    {
      id: 2,
      name: 'Sprint 2',
      milestone: 'Sprint 2 Milestone',
      totalTasks: 10,
      startDate: '2026-08-16',
      endDate: '2026-08-30',
      progressPercentage: 100,
      status: 'CLOSED',
      workspaceUrl: null
    }
  ];

  const defaultProps = {
    darkMode: false,
    sprintListDetails: defaultSprints,
    projectId: 'proj123',
    isProjectManager: true,
    handleOpenCloseModal: vi.fn(),
    handleDeleteSprint: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sprint list header and total loaded sprints count', () => {
    render(
      <MemoryRouter>
        <SprintsList {...defaultProps} />
      </MemoryRouter>
    );

    expect(screen.getByText('Project Sprints & Milestones')).toBeInTheDocument();
    expect(screen.getByText('2 Sprints Loaded')).toBeInTheDocument();
  });

  it('toggles expansion when header is clicked', () => {
    render(
      <MemoryRouter>
        <SprintsList {...defaultProps} />
      </MemoryRouter>
    );

    // Initial state: expanded, table visible
    expect(screen.getByText('Sprint 1 Milestone')).toBeInTheDocument();

    // Click header to collapse
    const toggleButton = screen.getByRole('button', { name: /Project Sprints & Milestones/i });
    fireEvent.click(toggleButton);

    // After collapse, table is not rendered
    expect(screen.queryByText('Sprint 1 Milestone')).not.toBeInTheDocument();

    // Click header to re-expand
    fireEvent.click(toggleButton);
    expect(screen.getByText('Sprint 1 Milestone')).toBeInTheDocument();
  });

  it('navigates to sprint detail page when a sprint row is clicked', () => {
    render(
      <MemoryRouter>
        <SprintsList {...defaultProps} />
      </MemoryRouter>
    );

    const sprintRow = screen.getByText('Sprint 1 Milestone').closest('tr');
    fireEvent.click(sprintRow);

    expect(mockNavigate).toHaveBeenCalledWith('/projects/proj123/sprints/1');
  });

  it('renders empty state when sprintListDetails is empty', () => {
    render(
      <MemoryRouter>
        <SprintsList {...defaultProps} sprintListDetails={[]} />
      </MemoryRouter>
    );

    expect(screen.getByText('No Sprints Uploaded Yet')).toBeInTheDocument();
    expect(screen.getByText('0 Sprints Loaded')).toBeInTheDocument();
  });

  it('calls handleOpenCloseModal when Close Milestone button is clicked', () => {
    render(
      <MemoryRouter>
        <SprintsList {...defaultProps} />
      </MemoryRouter>
    );

    // Sprint 1 is IN PROGRESS and isProjectManager is true, so Close Milestone button is present
    const closeButtons = screen.getAllByTitle('Close Milestone');
    expect(closeButtons.length).toBe(1);

    fireEvent.click(closeButtons[0]);
    expect(defaultProps.handleOpenCloseModal).toHaveBeenCalledWith(expect.anything(), 1);
  });

  it('calls handleDeleteSprint when Delete Sprint button is clicked', () => {
    render(
      <MemoryRouter>
        <SprintsList {...defaultProps} />
      </MemoryRouter>
    );

    const deleteButtons = screen.getAllByTitle('Delete Sprint');
    expect(deleteButtons.length).toBe(2);

    fireEvent.click(deleteButtons[0]);
    expect(defaultProps.handleDeleteSprint).toHaveBeenCalledWith(expect.anything(), 1, true);
  });

  it('prevents row navigation when clicking external workspace link', () => {
    render(
      <MemoryRouter>
        <SprintsList {...defaultProps} />
      </MemoryRouter>
    );

    const externalLink = screen.getByTitle('View Milestone Issues in Backlog');
    fireEvent.click(externalLink);

    // Row navigation should not have been called due to e.stopPropagation()
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
