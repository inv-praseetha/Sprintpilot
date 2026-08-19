import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../../api/apiClient';
import SprintServices from '../../services/SprintServices';

vi.mock('../../api/apiClient', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

describe('SprintServices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getProjectSprints makes correct GET request', async () => {
    const mockData = [{ id: 1, name: 'Sprint 1' }];
    apiClient.get.mockResolvedValueOnce({ data: mockData });

    const result = await SprintServices.getProjectSprints('proj123');

    expect(apiClient.get).toHaveBeenCalledWith('projects/proj123/sprints/');
    expect(result).toEqual(mockData);
  });

  it('createSprint makes correct POST request', async () => {
    const sprintData = { name: 'Sprint 1' };
    const mockResponse = { id: 10, ...sprintData };
    apiClient.post.mockResolvedValueOnce({ data: mockResponse });

    const result = await SprintServices.createSprint('proj123', sprintData);

    expect(apiClient.post).toHaveBeenCalledWith('projects/proj123/sprints/', sprintData);
    expect(result).toEqual(mockResponse);
  });

  it('getSprintDetails makes correct GET request', async () => {
    const mockSprint = { id: 5, milestone: 'Sprint A' };
    apiClient.get.mockResolvedValueOnce({ data: mockSprint });

    const result = await SprintServices.getSprintDetails(5);

    expect(apiClient.get).toHaveBeenCalledWith('sprints/5/');
    expect(result).toEqual(mockSprint);
  });

  it('updateSprintTask makes correct PUT request', async () => {
    const taskData = { read_comment_count: 3 };
    const mockResponse = { id: 2, read_comment_count: 3 };
    apiClient.put.mockResolvedValueOnce({ data: mockResponse });

    const result = await SprintServices.updateSprintTask(2, taskData);

    expect(apiClient.put).toHaveBeenCalledWith('sprints/tasks/2/', taskData);
    expect(result).toEqual(mockResponse);
  });

  it('deleteSprintTask makes correct DELETE request', async () => {
    const mockResponse = { detail: 'Deleted' };
    apiClient.delete.mockResolvedValueOnce({ data: mockResponse });

    const result = await SprintServices.deleteSprintTask(42);

    expect(apiClient.delete).toHaveBeenCalledWith('sprints/tasks/42/');
    expect(result).toEqual(mockResponse);
  });

  it('getAISuggestedSchedule makes POST request with empty payload when taskIds not passed', async () => {
    const mockSuggestions = [{ task_id: 1, reason: 'Optimized' }];
    apiClient.post.mockResolvedValueOnce({ data: mockSuggestions });

    const result = await SprintServices.getAISuggestedSchedule(10);

    expect(apiClient.post).toHaveBeenCalledWith('sprints/10/ai-schedule/', {});
    expect(result).toEqual(mockSuggestions);
  });

  it('getAISuggestedSchedule includes task_ids in payload when provided', async () => {
    const mockSuggestions = [{ task_id: 1 }];
    apiClient.post.mockResolvedValueOnce({ data: mockSuggestions });

    const result = await SprintServices.getAISuggestedSchedule(10, [1, 2]);

    expect(apiClient.post).toHaveBeenCalledWith('sprints/10/ai-schedule/', { task_ids: [1, 2] });
    expect(result).toEqual(mockSuggestions);
  });

  it('importSchedule makes correct POST request', async () => {
    const payload = [{ task_id: 1, planned_start_date: '2026-08-01' }];
    const mockResponse = { detail: 'Schedule imported' };
    apiClient.post.mockResolvedValueOnce({ data: mockResponse });

    const result = await SprintServices.importSchedule(10, payload);

    expect(apiClient.post).toHaveBeenCalledWith('sprints/10/import-schedule/', payload);
    expect(result).toEqual(mockResponse);
  });

  it('createSprintTask makes correct POST request', async () => {
    const taskData = { title: 'New Task' };
    const mockResponse = { id: 100, title: 'New Task' };
    apiClient.post.mockResolvedValueOnce({ data: mockResponse });

    const result = await SprintServices.createSprintTask(10, taskData);

    expect(apiClient.post).toHaveBeenCalledWith('sprints/10/tasks/', taskData);
    expect(result).toEqual(mockResponse);
  });

  it('getSprintNotes formats URL query params correctly when limit and offset are provided', async () => {
    const mockNotes = [{ id: 1, content: 'Note 1' }];
    apiClient.get.mockResolvedValueOnce({ data: mockNotes });

    const result = await SprintServices.getSprintNotes(10, 5, 10);

    expect(apiClient.get).toHaveBeenCalledWith('sprints/10/notes/?limit=5&offset=10');
    expect(result).toEqual(mockNotes);
  });

  it('getSprintNotes handles request without limit and offset', async () => {
    const mockNotes = [];
    apiClient.get.mockResolvedValueOnce({ data: mockNotes });

    const result = await SprintServices.getSprintNotes(10);

    expect(apiClient.get).toHaveBeenCalledWith('sprints/10/notes/');
    expect(result).toEqual(mockNotes);
  });

  it('saveSprintNote makes POST request with standard object', async () => {
    const noteData = { content: 'Daily notes' };
    const mockResponse = { id: 1, content: 'Daily notes' };
    apiClient.post.mockResolvedValueOnce({ data: mockResponse });

    const result = await SprintServices.saveSprintNote(10, noteData);

    expect(apiClient.post).toHaveBeenCalledWith('sprints/10/notes/', noteData, {});
    expect(result).toEqual(mockResponse);
  });

  it('saveSprintNote includes multipart/form-data header when noteData is FormData', async () => {
    const formData = new FormData();
    formData.append('content', 'Daily note with file');
    const mockResponse = { id: 1 };
    apiClient.post.mockResolvedValueOnce({ data: mockResponse });

    const result = await SprintServices.saveSprintNote(10, formData);

    expect(apiClient.post).toHaveBeenCalledWith('sprints/10/notes/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    expect(result).toEqual(mockResponse);
  });
});
