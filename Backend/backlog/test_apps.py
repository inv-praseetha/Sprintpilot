import os
from unittest.mock import patch, MagicMock
from django.test import TestCase
from backlog.apps import BacklogConfig

class BacklogAppsTests(TestCase):
    @patch.dict(os.environ, {'RUN_MAIN': 'false'}, clear=False)
    def test_ready_without_run_main(self):
        
        app_config = BacklogConfig('backlog', __import__('backlog'))
        
        with patch('backlog.apps.logger.info') as mock_logger_info:
            app_config.ready()
            mock_logger_info.assert_not_called()

    @patch.dict(os.environ, {'RUN_MAIN': 'true'}, clear=False)
    @patch('apscheduler.schedulers.background.BackgroundScheduler')
    @patch('backlog.apps.logger.info')
    def test_ready_with_run_main_success(self, mock_logger_info, mock_background_scheduler):
        
        # Mock scheduler instance
        mock_scheduler_instance = MagicMock()
        mock_background_scheduler.return_value = mock_scheduler_instance
        
        app_config = BacklogConfig('backlog', __import__('backlog'))
        app_config.ready()
        
        # Verify scheduler methods were called
        mock_background_scheduler.assert_called_once_with(timezone='Asia/Kolkata')
        mock_scheduler_instance.add_job.assert_called_once()
        mock_scheduler_instance.start.assert_called_once()
        mock_logger_info.assert_called_once()

    @patch.dict(os.environ, {'RUN_MAIN': 'true'}, clear=False)
    @patch('apscheduler.schedulers.background.BackgroundScheduler')
    @patch('backlog.apps.logger.error')
    def test_ready_with_run_main_exception(self, mock_logger_error, mock_background_scheduler):
        
        # Simulate an exception during scheduler setup
        mock_background_scheduler.side_effect = Exception("Test Scheduler Error")
        
        app_config = BacklogConfig('backlog', __import__('backlog'))
        app_config.ready()
        
        # Verify error was logged
        mock_logger_error.assert_called_once_with("Failed to start APScheduler: Test Scheduler Error")
