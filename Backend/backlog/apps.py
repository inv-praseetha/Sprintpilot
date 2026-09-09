import logging
import os
from django.apps import AppConfig

logger = logging.getLogger(__name__)

class BacklogConfig(AppConfig):
    name = 'backlog'

    def ready(self):
        # RUN_MAIN is set by Django's autoreloader when the actual worker process starts.
        # This prevents the scheduler from starting twice (once in the watcher, once in the worker).
        if os.environ.get('RUN_MAIN', None) != 'true':
            return
            
        try:
            from apscheduler.schedulers.background import BackgroundScheduler
            from apscheduler.triggers.cron import CronTrigger
            from backlog.tasks import sync_backlog_data_daily

            scheduler = BackgroundScheduler(timezone='Asia/Kolkata')
            
            # Runs twice a day: Early Morning (8:00 AM) and Afternoon (3:00 PM)
            scheduler.add_job(
                sync_backlog_data_daily,
                trigger=CronTrigger(hour='8,16', minute=52),
                id='daily_backlog_sync',
                max_instances=1,
                replace_existing=True,
            )
            
            scheduler.start()
            logger.info("APScheduler started: Backlog Sync scheduled to run twice a day (8:00 AM and 3:00 PM).")
        except Exception as e:
            logger.error(f"Failed to start APScheduler: {e}")

