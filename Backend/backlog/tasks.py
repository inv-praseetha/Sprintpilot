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
        return summary
    except Exception as e:
        logger.exception(f"Task: sync_backlog_data_daily failed unexpectedly: {e}")
        return {"status": "error", "message": str(e)}
