import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '../../api/apiClient';
import ProjectService from '../../services/ProjectService';

vi.mock('../../api/apiClient', () => ({
  default: {
    get: vi.fn()
  }
}));

describe('ProjectService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('downloadTasksTemplate', () => {
    it('triggers Excel template download and cleans up DOM elements', async () => {
      const dummyBlobData = new ArrayBuffer(8);
      apiClient.get.mockResolvedValueOnce({ data: dummyBlobData });

      const fakeUrl = 'blob:http://localhost/fake-uuid';
      const createObjectURLMock = vi.fn().mockReturnValue(fakeUrl);
      const revokeObjectURLMock = vi.fn();
      window.URL.createObjectURL = createObjectURLMock;
      window.URL.revokeObjectURL = revokeObjectURLMock;

      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      const realAnchor = document.createElement('a');
      const clickSpy = vi.spyOn(realAnchor, 'click').mockImplementation(() => {});
      vi.spyOn(document, 'createElement').mockReturnValue(realAnchor);

      await ProjectService.downloadTasksTemplate('Sprint Pilot');

      expect(apiClient.get).toHaveBeenCalledWith('sprints/download-template/', {
        responseType: 'blob'
      });
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalledWith(realAnchor);
      expect(removeChildSpy).toHaveBeenCalledWith(realAnchor);
      expect(revokeObjectURLMock).toHaveBeenCalledWith(fakeUrl);
    });

    it('logs error and throws if template fetch fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Network error');
      apiClient.get.mockRejectedValueOnce(error);

      await expect(ProjectService.downloadTasksTemplate('Test Project')).rejects.toThrow('Network error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to download Excel template:', error);

      consoleErrorSpy.mockRestore();
    });
  });
});
