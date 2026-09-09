import apiClient from '../api/apiClient';

export const SprintServices = {
  getProjectSprints: async (projectId) => {
    const response = await apiClient.get(`projects/${projectId}/sprints/`);
    return response.data;
  },

  createSprint: async (projectId, sprintData) => {
    const response = await apiClient.post(`projects/${projectId}/sprints/`, sprintData);
    return response.data;
  },

  getSprintDetails: async (sprintId) => {
    const response = await apiClient.get(`sprints/${sprintId}/`);
    return response.data;
  },

  updateSprintTask: async (taskId, taskData) => {
    const response = await apiClient.put(`sprints/tasks/${taskId}/`, taskData);
    return response.data;
  },

  deleteSprintTask: async (taskId) => {
    const response = await apiClient.delete(`sprints/tasks/${taskId}/`);
    return response.data;
  },

  getAISuggestedSchedule: async (sprintId, taskIds = []) => {
    const payload = taskIds && taskIds.length > 0 ? { task_ids: taskIds } : {};
    const response = await apiClient.post(`sprints/${sprintId}/ai-schedule/`, payload);
    return response.data;
  },

  importSchedule: async (sprintId, tasksData) => {
    const response = await apiClient.post(`sprints/${sprintId}/import-schedule/`, tasksData);
    return response.data;
  },

  createSprintTask: async (sprintId, taskData) => {
    const response = await apiClient.post(`sprints/${sprintId}/tasks/`, taskData);
    return response.data;
  },

  getSprintNotes: async (sprintId, limit = null, offset = null) => {
    let url = `sprints/${sprintId}/notes/`;
    const params = [];
    if (limit !== null) params.push(`limit=${limit}`);
    if (offset !== null) params.push(`offset=${offset}`);
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    const response = await apiClient.get(url);
    return response.data;
  },

  saveSprintNote: async (sprintId, noteData) => {
    const config = {};
    if (noteData instanceof FormData) {
      config.headers = {
        'Content-Type': 'multipart/form-data'
      };
    }
    const response = await apiClient.post(`sprints/${sprintId}/notes/`, noteData, config);
    return response.data;
  }
};

export default SprintServices;

