import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProjectDetail from '../../../pages/private/projectdetail';
import { AuthContext } from '../../../context/AuthContext';
import apiClient from '../../../api/apiClient';

// Mock dependencies
vi.mock('../../../components/layout/MainLayouut', () => ({
  useTheme: () => ({ darkMode: false })
}));

vi.mock('../../../api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('../../../services/SprintServices', () => ({
  default: {
    getProjectSprints: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'PROJECT_MANAGER', full_name: 'Test Manager' }, logout: vi.fn() })
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() })
}));

vi.mock('../../../context/ConfirmContext', () => ({
  useConfirm: () => vi.fn()
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ projectId: 'p1' })
  };
});

describe('ProjectDetail Component', () => {
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
        <ProjectDetail />
      </MemoryRouter>
    );
  };

  it('renders loading state initially', () => {
    // Return unresolved promises to keep it in loading state
    apiClient.get.mockReturnValue(new Promise(() => {}));
    
    try {
      renderComponent();
      screen.debug();
    } catch (e) {
      console.error("Render Error:", e);
    }
    
    expect(screen.getByText(/Loading project details/i)).toBeInTheDocument();
  });

  it('renders project details correctly', async () => {
    const mockProject = {
      id: 'p1',
      project_id: 'PRJ-001',
      name: 'Project Alpha Details',
      description: 'Detail description',
      status: 'ACTIVE',
      type: 'AGILE',
      number_of_days: 14,
      team_lead: { id: 'l1', full_name: 'Lead User' },
      created_by: mockUser,
      members: [],
      skills: []
    };

    apiClient.get.mockImplementation((url) => {
      if (url.includes('projects/employees/')) return Promise.resolve({ data: [] });
      if (url.includes('projects/p1/')) return Promise.resolve({ data: mockProject });
      return Promise.resolve({ data: {} });
    });

    try {
      renderComponent();
    } catch (e) {
      console.error("Test 2 Render Error:", e);
    }

    await waitFor(() => {
      expect(screen.queryByText(/Loading project details.../i)).not.toBeInTheDocument();
    });
    
    screen.debug();

    expect(screen.getByText('Project Alpha Details')).toBeInTheDocument();
    expect(screen.getByText('Detail description')).toBeInTheDocument();
    expect(screen.getAllByText('ACTIVE')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Lead User')[0]).toBeInTheDocument();
    expect(screen.getByText('14 Days')).toBeInTheDocument();
  });

  it('shows error if project load fails', async () => {
    apiClient.get.mockRejectedValue(new Error('Failed'));
    
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Failed to load Project/i })).toBeInTheDocument();
    });
  });
});
