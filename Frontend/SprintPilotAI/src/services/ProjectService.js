import apiClient from '../api/apiClient';

/**
 * ProjectService provides helper methods for project-related operations,
 * including downloading templates and fetching project details.
 */
export const ProjectService = {
  /**
   * Downloads the styled Excel template file from the backend and triggers the browser download.
   * @param {string} projectName - The name of the project to name the downloaded file
   */
  downloadTasksTemplate: async (projectName) => {
    try {
      const response = await apiClient.get('sprints/download-template/', {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}_tasks_template.xlsx`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download Excel template:', error);
      throw error;
    }
  }
};

export default ProjectService;
