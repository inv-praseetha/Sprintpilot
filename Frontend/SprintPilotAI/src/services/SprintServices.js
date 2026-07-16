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

  deleteSprint: async (sprintId) => {
    const response = await apiClient.delete(`sprints/${sprintId}/`);
    return response.data;
  },

  getAISuggestedSchedule: async (sprintId) => {
    const response = await apiClient.post(`sprints/${sprintId}/ai-schedule/`);
    return response.data;
  },

  importSchedule: async (sprintId, tasksData) => {
    const response = await apiClient.post(`sprints/${sprintId}/import-schedule/`, tasksData);
    return response.data;
  }
};

export default SprintServices;
