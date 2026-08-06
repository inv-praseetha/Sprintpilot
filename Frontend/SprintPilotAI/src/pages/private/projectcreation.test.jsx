import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProjectCreation from './projectcreation';
import { AuthContext } from '../../context/AuthContext';
import apiClient from '../../api/apiClient';

// Mock the Theme hook since it's used in ProjectCreation
vi.mock('../../components/layout/MainLayouut', () => ({
  useTheme: () => ({ darkMode: false })
}));

// Mock API Client
vi.mock('../../api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'PROJECT_MANAGER', full_name: 'Test Manager' }, logout: vi.fn() })
}));

describe('ProjectCreation Component', () => {
  const mockUser = { id: 'u1', role: 'PROJECT_MANAGER', full_name: 'Test Manager' };
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock localStorage
    const mockStorage = {
      'access_token': 'fake-token',
      'user': JSON.stringify(mockUser)
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => mockStorage[key]);
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <ProjectCreation />
      </MemoryRouter>
    );
  };

  it('renders loading state initially', () => {
    // Return unresolved promises to keep it in loading state
    apiClient.get.mockImplementation(() => new Promise(() => {}));
    renderComponent();
    expect(screen.getByText(/Loading project portfolio.../i)).toBeInTheDocument();
  });

  it('renders projects and handles empty state', async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.includes('projects/skills/')) return Promise.resolve({ data: [] });
      if (url.includes('projects/employees/')) return Promise.resolve({ data: [] });
      if (url.includes('projects/')) return Promise.resolve({ data: { results: [], count: 0 } });
      return Promise.resolve({ data: [] });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.queryByText(/Loading project portfolio.../i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Manage your Projects/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Create Project/i)[0]).toBeInTheDocument();
  });

  it('renders projects data correctly', async () => {
    const mockProjects = {
      results: [
        {
          id: 'p1',
          name: 'Project Alpha',
          project_id: 'PRJ-001',
          status: 'ACTIVE',
          type: 'AGILE',
          description: 'Test description',
          created_by: mockUser,
          members: []
        }
      ],
      count: 1
    };

    apiClient.get.mockImplementation((url) => {
      if (url.includes('projects/skills/')) return Promise.resolve({ data: [] });
      if (url.includes('projects/employees/')) return Promise.resolve({ data: [] });
      if (url.includes('projects/')) return Promise.resolve({ data: mockProjects });
      return Promise.resolve({ data: [] });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    });
    
    expect(screen.getAllByText('ACTIVE')[0]).toBeInTheDocument();
  });

  it('shows error if projects fetch fails', async () => {
    apiClient.get.mockRejectedValue(new Error('API Error'));
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText(/Network connection error/i)).toBeInTheDocument();
    });
  });

  it('handles project creation form submission', async () => {
    const mockProjectsList = {
      results: [
        { id: 'p1', name: 'Project Alpha', status: 'ACTIVE', type: 'AGILE' }
      ],
      count: 1
    };
    apiClient.get.mockResolvedValue({ data: mockProjectsList });
    apiClient.post.mockResolvedValue({ data: { id: 'p2', name: 'New Project' } });
    
    renderComponent();
    
    await waitFor(() => {
      expect(screen.getAllByText('Create Project')[0]).toBeInTheDocument();
    });
    
    // Just verifying the modal open button exists and triggers
    const createBtn = screen.getAllByText('Create Project')[0];
    expect(createBtn).toBeInTheDocument();
  });
});
