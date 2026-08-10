from unittest.mock import patch, MagicMock
from django.test import TestCase
from backlog.tasks import sync_backlog_data_daily

class BacklogTasksTests(TestCase):
    
    @patch('backlog.tasks.BacklogSyncService')
    @patch('django.utils.timezone.localtime')
    @patch('mail_service.services.OverdueEmailService.send_overdue_tasks_emails')
    def test_sync_backlog_data_daily_morning_success(self, mock_send_overdue, mock_localtime_func, mock_sync_service):
        # Mock timezone to 8 AM
        mock_localtime = MagicMock()
        mock_localtime.hour = 8
        mock_localtime_func.return_value = mock_localtime
        
        # Mock sync service
        mock_service_instance = MagicMock()
        mock_service_instance.sync_daily_updates.return_value = {"status": "success"}
        mock_sync_service.return_value = mock_service_instance
        
        result = sync_backlog_data_daily()
        
        self.assertEqual(result, {"status": "success"})
        mock_service_instance.sync_daily_updates.assert_called_once()
        mock_send_overdue.assert_called_once()

    @patch('backlog.tasks.BacklogSyncService')
    @patch('django.utils.timezone.localtime')
    @patch('mail_service.services.OverdueEmailService.send_overdue_tasks_emails')
    @patch('backlog.tasks.logger.error')
    def test_sync_backlog_data_daily_morning_email_failure(self, mock_logger_error, mock_send_overdue, mock_localtime_func, mock_sync_service):
        mock_localtime = MagicMock()
        mock_localtime.hour = 8
        mock_localtime_func.return_value = mock_localtime
        
        mock_service_instance = MagicMock()
        mock_service_instance.sync_daily_updates.return_value = {"status": "success"}
        mock_sync_service.return_value = mock_service_instance
        
        mock_send_overdue.side_effect = Exception("Email Failed")
        
        result = sync_backlog_data_daily()
        
        self.assertEqual(result, {"status": "success"})
        mock_logger_error.assert_called_once_with("Failed to send overdue emails: Email Failed")

    @patch('backlog.tasks.BacklogSyncService')
    @patch('django.utils.timezone.localtime')
    @patch('mail_service.services.DueTodayEmailService.send_due_today_emails')
    def test_sync_backlog_data_daily_afternoon_success(self, mock_send_due_today, mock_localtime_func, mock_sync_service):
        mock_localtime = MagicMock()
        mock_localtime.hour = 14
        mock_localtime_func.return_value = mock_localtime
        
        mock_service_instance = MagicMock()
        mock_service_instance.sync_daily_updates.return_value = {"status": "success"}
        mock_sync_service.return_value = mock_service_instance
        
        result = sync_backlog_data_daily()
        
        self.assertEqual(result, {"status": "success"})
        mock_send_due_today.assert_called_once()

    @patch('backlog.tasks.BacklogSyncService')
    @patch('django.utils.timezone.localtime')
    @patch('mail_service.services.DueTodayEmailService.send_due_today_emails')
    @patch('backlog.tasks.logger.error')
    def test_sync_backlog_data_daily_afternoon_email_failure(self, mock_logger_error, mock_send_due_today, mock_localtime_func, mock_sync_service):
        mock_localtime = MagicMock()
        mock_localtime.hour = 14
        mock_localtime_func.return_value = mock_localtime
        
        mock_service_instance = MagicMock()
        mock_service_instance.sync_daily_updates.return_value = {"status": "success"}
        mock_sync_service.return_value = mock_service_instance
        
        mock_send_due_today.side_effect = Exception("Email Failed")
        
        result = sync_backlog_data_daily()
        
        self.assertEqual(result, {"status": "success"})
        mock_logger_error.assert_called_once_with("Failed to send due today emails: Email Failed")

    @patch('backlog.tasks.BacklogSyncService')
    @patch('django.utils.timezone.localtime')
    def test_sync_backlog_data_daily_other_hour(self, mock_localtime_func, mock_sync_service):
        mock_localtime = MagicMock()
        mock_localtime.hour = 10
        mock_localtime_func.return_value = mock_localtime
        
        mock_service_instance = MagicMock()
        mock_service_instance.sync_daily_updates.return_value = {"status": "success"}
        mock_sync_service.return_value = mock_service_instance
        
        with patch('mail_service.services.OverdueEmailService.send_overdue_tasks_emails') as mock_overdue:
            with patch('mail_service.services.DueTodayEmailService.send_due_today_emails') as mock_due_today:
                result = sync_backlog_data_daily()
                
                self.assertEqual(result, {"status": "success"})
                mock_overdue.assert_not_called()
                mock_due_today.assert_not_called()

    @patch('backlog.tasks.BacklogSyncService')
    @patch('backlog.tasks.logger.exception')
    def test_sync_backlog_data_daily_sync_failure(self, mock_logger_exception, mock_sync_service):
        mock_service_instance = MagicMock()
        mock_service_instance.sync_daily_updates.side_effect = Exception("Sync Failed")
        mock_sync_service.return_value = mock_service_instance
        
        result = sync_backlog_data_daily()
        
        self.assertEqual(result, {"status": "error", "message": "Sync Failed"})
        mock_logger_exception.assert_called_once_with("Task: sync_backlog_data_daily failed unexpectedly: Sync Failed")
