import pytest
from unittest.mock import patch, MagicMock
from backlog.tasks import sync_backlog_data_daily
from backlog.services.backlog_sync_service import BacklogSyncService

@pytest.fixture
def mock_backlog_service():
    with patch('backlog.services.backlog_sync_service.BacklogService') as MockService:
        mock_instance = MockService.return_value
        yield mock_instance

@pytest.fixture
def sync_service(mock_backlog_service):
    return BacklogSyncService()

@pytest.mark.django_db
class TestBacklogSyncService:
    def test_sync_daily_updates_success(self, sync_service, mock_backlog_service):
        mock_backlog_service.fetch_updated_issues.return_value = [
            {
                "issueKey": "TEST-1",
                "summary": "Updated Task",
                "status": {"id": 2}, # In Progress
                "priority": {"id": 2} # High
            }
        ]
        
        # Test the sync process with mocked API response
        summary = sync_service.sync_daily_updates()
        
        assert summary["status"] == "success"
        assert summary["fetched"] == 1
        # It should skip since no SprintTask is created in this DB
        assert summary["skipped"] == 1 

    def test_sync_daily_updates_api_failure(self, sync_service, mock_backlog_service):
        mock_backlog_service.fetch_updated_issues.side_effect = Exception("API Error")
        
        summary = sync_service.sync_daily_updates()
        
        assert summary["status"] == "error"
        assert "API Error" in summary["message"]

@pytest.mark.django_db
class TestBacklogCeleryTasks:
    @patch('backlog.tasks.BacklogSyncService')
    def test_sync_backlog_data_daily(self, mock_service_class):
        mock_instance = mock_service_class.return_value
        mock_instance.sync_daily_updates.return_value = {"status": "success", "fetched": 5}
        
        result = sync_backlog_data_daily()
        
        assert result["status"] == "success"
        assert result["fetched"] == 5
