import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TaskUploadModal from '../../../components/Modals/TaskUploadModal';
import ProjectService from '../../../services/ProjectService';
import apiClient from '../../../api/apiClient';
import * as XLSX from 'xlsx';

vi.mock('../../../services/ProjectService', () => ({
  default: {
    downloadTasksTemplate: vi.fn()
  }
}));

vi.mock('../../../api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

vi.mock('xlsx', () => ({
  read: vi.fn(),
  utils: {
    sheet_to_json: vi.fn()
  }
}));

vi.mock('../../../components/Common/CustomDatePicker', () => ({
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
    projects: { 'Proj-1': { id: 'P-101', name: 'Project One' } },
    onImportSuccess: vi.fn(),
    projectType: 'AGILE',
    projectJiraId: 'PROJ'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue({
      data: { categories: ['UI', 'BACKEND', 'INFRA', 'QA', 'SECURITY'] }
    });
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

  it('closes modal when X button or Cancel button is clicked', () => {
    render(<TaskUploadModal {...defaultProps} />);

    const closeBtn = screen.getByRole('button', { name: '' }) || document.querySelector('button');
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();

    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(2);
  });

  it('toggles mode to JIRA Connect when tab is clicked', () => {
    render(<TaskUploadModal {...defaultProps} />);

    const jiraTab = screen.getByText(/Jira Connect/i);
    fireEvent.click(jiraTab);

    expect(screen.getByText(/Connect & Fetch Jira Tasks/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Sprint Name/i)[0]).toBeInTheDocument();
  });

  it('downloads Excel template on button click', () => {
    render(<TaskUploadModal {...defaultProps} />);

    const downloadBtn = screen.getByText('Download Template');
    fireEvent.click(downloadBtn);

    expect(ProjectService.downloadTasksTemplate).toHaveBeenCalledWith('Proj-1');
  });

  it('handles error during Excel template download', async () => {
    ProjectService.downloadTasksTemplate.mockRejectedValue(new Error('Download failed'));

    render(<TaskUploadModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Download Template'));

    expect(await screen.findByText('Failed to download Excel template. Please try again.')).toBeInTheDocument();
  });

  it('handles Jira fetch tasks validation & error cases', async () => {
    render(<TaskUploadModal {...defaultProps} projectJiraId="" />);

    fireEvent.click(screen.getByText('Jira Connect'));
    fireEvent.click(screen.getByText('Fetch'));

    expect(await screen.findByText('Please enter a Jira Project Key.')).toBeInTheDocument();

    const projKeyInput = screen.getByPlaceholderText('e.g. SP');
    fireEvent.change(projKeyInput, { target: { value: 'SP' } });
    fireEvent.click(screen.getByText('Fetch'));

    expect(await screen.findByText('Please enter the exact Jira Sprint Name to fetch tasks.')).toBeInTheDocument();
  });

  it('handles Jira fetch tasks returning empty results', async () => {
    apiClient.post.mockResolvedValue({
      data: { tasks: [], message: 'No tasks found for this sprint.' }
    });

    render(<TaskUploadModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Jira Connect'));

    const sprintInput = screen.getByPlaceholderText(/e.g. Sprint 1/i);
    fireEvent.change(sprintInput, { target: { value: 'Sprint 1' } });

    fireEvent.click(screen.getByText('Fetch'));

    expect(await screen.findByText('No tasks found for this sprint.')).toBeInTheDocument();
  });

  it('handles Jira fetch tasks successfully and task selection toggles', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        tasks: [
          { jiraId: 'PROJ-1', title: 'Task One', desc: 'Desc 1', category: 'UI', estimated_hours: 8, selected: true }
        ],
        message: 'Success'
      }
    });

    render(<TaskUploadModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Jira Connect'));

    const sprintInput = screen.getByPlaceholderText(/e.g. Sprint 1/i);
    fireEvent.change(sprintInput, { target: { value: 'Sprint 1' } });

    fireEvent.click(screen.getByText('Fetch'));

    const unselectAllBtn = await screen.findByText('Unselect All');
    expect(screen.getByText('Task One')).toBeInTheDocument();

    // Toggle unselect all
    fireEvent.click(unselectAllBtn);
    expect(screen.getByText('0 of 1 selected')).toBeInTheDocument();

    const selectAllBtn = screen.getByText('Select All');
    fireEvent.click(selectAllBtn);
    expect(screen.getByText('1 of 1 selected')).toBeInTheDocument();

    // Toggle row item
    const rowItem = screen.getByText('Task One').closest('tr');
    fireEvent.click(rowItem);
    expect(screen.getByText('0 of 1 selected')).toBeInTheDocument();
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

    const originalLocation = window.location;
    delete window.location;
    window.location = { href: '' };

    render(<TaskUploadModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Jira Connect'));

    const sprintInput = screen.getByPlaceholderText(/e.g. Sprint 1/i);
    fireEvent.change(sprintInput, { target: { value: 'Sprint 1' } });

    fireEvent.click(screen.getByText('Fetch'));

    await waitFor(() => {
      expect(screen.getByText('Authorize with Jira')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Authorize with Jira'));

    expect(apiClient.get).toHaveBeenCalledWith('jira/auth-url/');
    await waitFor(() => {
      expect(window.location.href).toBe('http://jira.com/auth');
    });

    window.location = originalLocation;
  });

  it('handles Jira connect URL generation failure', async () => {
    apiClient.post.mockRejectedValue({
      response: {
        data: {
          auth_required: true,
          detail: 'Auth token expired'
        }
      }
    });
    apiClient.get.mockRejectedValue(new Error('Auth URL error'));

    render(<TaskUploadModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Jira Connect'));
    fireEvent.change(screen.getByPlaceholderText(/e.g. Sprint 1/i), { target: { value: 'Sprint 1' } });
    fireEvent.click(screen.getByText('Fetch'));

    await waitFor(() => {
      expect(screen.getByText('Authorize with Jira')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Authorize with Jira'));

    expect(await screen.findByText('Failed to generate Jira login URL. Please check backend config.')).toBeInTheDocument();
  });

  it('parses valid Excel sheet with tasks, holidays, and project info', async () => {
    XLSX.read.mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} }
    });

    const mockRows = [
      ['Title Banner'],
      ['Project ID:', 'P-101', 'Project Name:', 'Project One'],
      ['Notes Banner', '', '', '', '', 'Holidays'],
      ['Task Title', 'Description', 'Category', 'Jira ID', 'Estimated Hours', 'Holiday Date'],
      ['Implement Login (https://jira.com/SP-1)', 'User auth flow', 'UI', 'SP-1', 12, new Date('2026-07-04')],
      ['API Endpoint', 'Create endpoints', 'Backend', 'SP-2', 46200, '05/07/2026'],
      ['   ', 'Empty title row', 'QA']
    ];

    XLSX.utils.sheet_to_json.mockReturnValue(mockRows);

    const MockFileReader = vi.fn(function () {
      this.readAsArrayBuffer = vi.fn(function () {
        this.onload({ target: { result: new ArrayBuffer(8) } });
      });
    });
    vi.stubGlobal('FileReader', MockFileReader);

    const { container } = render(<TaskUploadModal {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['fake'], 'Sprint_Tasks.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Implement Login')).toBeInTheDocument();
      expect(screen.getByText('API Endpoint')).toBeInTheDocument();
    });

    // Interact with CategoryDropdown in table
    const dropdownBtns = screen.getAllByRole('button', { name: /UI|Backend/i });
    if (dropdownBtns.length > 0) {
      fireEvent.click(dropdownBtns[0]);
      const qaCheckbox = screen.getByText('QA').parentElement.querySelector('input');
      fireEvent.click(qaCheckbox);
    }

    const confirmBtn = screen.getByText('Confirm Import');
    const nameInput = screen.getByPlaceholderText(/e.g. Sprint 7 Launch/i);

    // Clear Milestone name to test missing milestone error
    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.click(confirmBtn);

    expect(await screen.findByText('Please specify a Milestone/Sprint name.')).toBeInTheDocument();

    // Fill Milestone name
    fireEvent.change(nameInput, { target: { value: 'Sprint 7' } });

    // Confirm upload validation for missing start date
    fireEvent.click(confirmBtn);
    expect(await screen.findByText('Please specify the Start Date.')).toBeInTheDocument();

    // Fill Start date
    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-07-01' } });

    // Click Confirm Import
    fireEvent.click(confirmBtn);

    expect(defaultProps.onImportSuccess).toHaveBeenCalledWith(
      expect.objectContaining({
        milestoneName: 'Sprint 7',
        sprintStartDate: '2026-07-01',
        targetProjectKey: 'Proj-1'
      })
    );

    vi.unstubAllGlobals();
  });

  it('validates WATERFALL project type end date constraints', async () => {
    XLSX.read.mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} }
    });

    const mockRows = [
      ['Title Banner'],
      ['Project ID:', 'P-101'],
      ['Notes'],
      ['Task Title', 'Description', 'Category'],
      ['Task A', 'Desc A', 'QA']
    ];

    XLSX.utils.sheet_to_json.mockReturnValue(mockRows);

    const MockFileReader = vi.fn(function () {
      this.readAsArrayBuffer = vi.fn(function () {
        this.onload({ target: { result: new ArrayBuffer(8) } });
      });
    });
    vi.stubGlobal('FileReader', MockFileReader);

    const { container } = render(<TaskUploadModal {...defaultProps} projectType="WATERFALL" />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['fake'], 'waterfall.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Task A')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/e.g. Sprint 7 Launch/i);
    fireEvent.change(nameInput, { target: { value: 'Waterfall Phase 1' } });

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-07-10' } });

    const confirmBtn = screen.getByText('Confirm Import');
    fireEvent.click(confirmBtn);

    expect(await screen.findByText('Please specify the End Date.')).toBeInTheDocument();

    fireEvent.change(dateInputs[1], { target: { value: '2026-07-05' } });

    fireEvent.click(confirmBtn);
    expect(await screen.findByText('Start Date must be before or equal to End Date.')).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it('validates selected tasks negative estimated hours or missing category', async () => {
    XLSX.read.mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: { Sheet1: {} }
    });

    const mockRows = [
      ['Title Banner'],
      ['Project ID:', 'P-101'],
      ['Notes'],
      ['Task Title', 'Description', 'Category', 'Estimated Hours'],
      ['Task Bad', 'Desc Bad', 'UI', -10]
    ];

    XLSX.utils.sheet_to_json.mockReturnValue(mockRows);

    const MockFileReader = vi.fn(function () {
      this.readAsArrayBuffer = vi.fn(function () {
        this.onload({ target: { result: new ArrayBuffer(8) } });
      });
    });
    vi.stubGlobal('FileReader', MockFileReader);

    const { container } = render(<TaskUploadModal {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]');
    const file = new File(['fake'], 'bad.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Task Bad')).toBeInTheDocument();
    });

    const nameInput = screen.getByPlaceholderText(/e.g. Sprint 7 Launch/i);
    fireEvent.change(nameInput, { target: { value: 'Sprint 1' } });

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-07-01' } });

    fireEvent.click(screen.getByText('Confirm Import'));
    expect(await screen.findByText('Task "Task Bad" cannot have negative estimated hours.')).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it('validates selected task with missing title or missing category', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        tasks: [
          { jiraId: 'PROJ-1', title: '   ', desc: 'Desc 1', category: 'UI', estimated_hours: 8, selected: true }
        ],
        message: 'Success'
      }
    });

    const { container } = render(<TaskUploadModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Jira Connect'));
    fireEvent.change(screen.getByPlaceholderText(/e.g. Sprint 1/i), { target: { value: 'Sprint 1' } });
    fireEvent.click(screen.getByText('Fetch'));

    await waitFor(() => {
      expect(screen.getByText(/3. Define Milestone Details/i)).toBeInTheDocument();
    });

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-07-01' } });

    fireEvent.click(screen.getByText('Confirm Import'));
    expect(await screen.findByText('All selected tasks must have a title.')).toBeInTheDocument();
  });

  it('validates selected task with empty category error', async () => {
    apiClient.post.mockResolvedValue({
      data: {
        tasks: [
          { jiraId: 'PROJ-1', title: 'Valid Task Title', desc: 'Desc 1', category: '', estimated_hours: 8, selected: true }
        ],
        message: 'Success'
      }
    });

    const { container } = render(<TaskUploadModal {...defaultProps} />);

    fireEvent.click(screen.getByText('Jira Connect'));
    fireEvent.change(screen.getByPlaceholderText(/e.g. Sprint 1/i), { target: { value: 'Sprint 1' } });
    fireEvent.click(screen.getByText('Fetch'));

    await waitFor(() => {
      expect(screen.getByText(/3. Define Milestone Details/i)).toBeInTheDocument();
    });

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-07-01' } });

    fireEvent.click(screen.getByText('Confirm Import'));
    expect(await screen.findByText('Task "Valid Task Title" must have a category.')).toBeInTheDocument();
  });
});
