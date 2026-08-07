import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TaskUploadModal from '../../../components/Modals/TaskUploadModal';
import ProjectService from '../../../services/ProjectService';
import apiClient from '../../../api/apiClient';

// Mock ProjectService
vi.mock('../../../services/ProjectService', () => ({
  default: {
    downloadTasksTemplate: vi.fn()
  }
}));

// Mock apiClient
vi.mock('../../../api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

// Mock xlsx library to avoid actual file parsing issues in unit tests
vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn()
  }
}));

// Mock CustomDatePicker
vi.mock('../../Common/CustomDatePicker', () => ({
  default: ({ value, onChange }) => (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

describe('TaskUploadModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    darkMode: false,
    activeProject: 'Proj-1',
    projects: [{ id: 'Proj-1', name: 'Project One' }],
    onImportSuccess: vi.fn(),
    projectType: 'AGILE',
    projectJiraId: 'PROJ'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<TaskUploadModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders initial Excel upload UI by default', () => {
    render(<TaskUploadModal {...defaultProps} />);

    expect(screen.getByText(/Get the Excel Template/i)).toBeInTheDocument();
    expect(screen.getByText(/Upload populated sheet/i)).toBeInTheDocument();
    expect(screen.getByText(/Download Template/i)).toBeInTheDocument();
  });

  it('toggles mode to JIRA Connect when tab is clicked', () => {
    render(<TaskUploadModal {...defaultProps} />);

    // Click JIRA tab
    const jiraTab = screen.getByText(/Jira Connect/i);
    fireEvent.click(jiraTab);

    // Should render Jira Form
    expect(screen.getByText(/Connect & Fetch Jira Tasks/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Sprint Name/i)[0]).toBeInTheDocument();
  });

  it('downloads Excel template on button click', () => {
    render(<TaskUploadModal {...defaultProps} />);

    const downloadBtn = screen.getByText('Download Template');
    fireEvent.click(downloadBtn);

    expect(ProjectService.downloadTasksTemplate).toHaveBeenCalledWith('Proj-1');
  });

  it('handles Jira fetch tasks successfully', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        tasks: [
          { jiraId: 'PROJ-1', title: 'Task One', category: 'UI', planned_start_date: '2026-07-01' }
        ],
        message: 'Success'
      }
    });

    render(<TaskUploadModal {...defaultProps} />);

    // Toggle to Jira Mode
    fireEvent.click(screen.getByText('Jira Connect'));

    // Fill Sprint Name
    const sprintInput = screen.getByPlaceholderText(/e.g. Sprint 1/i);
    fireEvent.change(sprintInput, { target: { value: 'Sprint 1' } });

    // Click Fetch
    const fetchBtn = screen.getByText('Fetch');
    fireEvent.click(fetchBtn);

    expect(apiClient.post).toHaveBeenCalledWith('jira/fetch/', {
      project_key: 'PROJ',
      sprint_name: 'Sprint 1'
    });

    await waitFor(() => {
      expect(screen.getByText(/3. Define Milestone Details/i)).toBeInTheDocument();
    });
  });

  it('handles Jira auth required screen and trigger connect Url redirect', async () => {
    apiClient.post.mockRejectedValue({
      response: {
        data: {
          auth_required: true,
          detail: 'Auth token expired'
        }
      }
    });

    apiClient.get.mockResolvedValue({
      data: {
        auth_url: 'http://jira.com/auth'
      }
    });

    // Mock window.location
    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    render(<TaskUploadModal {...defaultProps} />);

    // Switch to Jira Mode
    fireEvent.click(screen.getByText('Jira Connect'));

    // Fill Sprint Name
    const sprintInput = screen.getByPlaceholderText(/e.g. Sprint 1/i);
    fireEvent.change(sprintInput, { target: { value: 'Sprint 1' } });

    // Click Fetch
    fireEvent.click(screen.getByText('Fetch'));

    // Wait for the auth required card to show up
    await waitFor(() => {
      expect(screen.getByText('Authorize with Jira')).toBeInTheDocument();
    });

    // Click Authorize
    fireEvent.click(screen.getByText('Authorize with Jira'));

    expect(apiClient.get).toHaveBeenCalledWith('jira/auth-url/');
    await waitFor(() => {
      expect(window.location.href).toBe('http://jira.com/auth');
    });

    // Restore location
    window.location = originalLocation;
  });

  it('shows error when Excel file has invalid columns', async () => {
    const XLSX = await import('xlsx');
    XLSX.read.mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} }
    });
    // Fewer than 4 rows triggers "invalid template" error
    XLSX.utils.sheet_to_json.mockReturnValue([['Row1'], ['Row2']]);

    // Stub FileReader globally so `new FileReader()` works
    const mockOnload = vi.fn();
    const MockFileReader = vi.fn(function () {
      this.readAsArrayBuffer = vi.fn(function () {
        this.onload({ target: { result: new ArrayBuffer(8) } });
      });
    });
    vi.stubGlobal('FileReader', MockFileReader);

    render(<TaskUploadModal {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['fake'], 'tasks.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Excel template is invalid or missing columns/i)).toBeInTheDocument();
    });

    vi.unstubAllGlobals();
  });
});

