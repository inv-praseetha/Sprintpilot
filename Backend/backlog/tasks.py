import logging
from backlog.services.backlog_sync_service import BacklogSyncService

logger = logging.getLogger(__name__)

def sync_backlog_data_daily():
    """
    APScheduler task to run the daily synchronization between Backlog and SprintPilot.
    """
    logger.info("Task: sync_backlog_data_daily initiated.")
    
    try:
        service = BacklogSyncService()
        summary = service.sync_daily_updates()
        
        logger.info(f"Task: sync_backlog_data_daily completed. Summary: {summary}")

        # Trigger overdue emails if it's the morning batch run (hour 8)
        from django.utils import timezone
        local_hour = timezone.localtime().hour
        if local_hour == 8:
            logger.info("Morning batch sync completed. Triggering overdue task emails...")
            try:
                from mail_service.services import OverdueEmailService
                OverdueEmailService.send_overdue_tasks_emails()
            except Exception as mail_err:
                logger.error(f"Failed to send overdue emails: {mail_err}")
        elif local_hour == 14:
            logger.info("Afternoon batch sync completed. Triggering due today task emails...")
            try:
                from mail_service.services import DueTodayEmailService
                DueTodayEmailService.send_due_today_emails()
            except Exception as mail_err:
                logger.error(f"Failed to send due today emails: {mail_err}")

        return summary
    except Exception as e:
        logger.exception(f"Task: sync_backlog_data_daily failed unexpectedly: {e}")
        return {"status": "error", "message": str(e)}
