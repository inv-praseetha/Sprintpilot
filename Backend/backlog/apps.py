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
            
            # Runs every day at 12:25 PM
            scheduler.add_job(
                sync_backlog_data_daily,
                trigger=CronTrigger(hour=22, minute=35),
                id='daily_backlog_sync',
                max_instances=1,
                replace_existing=True,
            )
            
            scheduler.start()
            logger.info("APScheduler started: Daily Backlog Sync scheduled for 12:25 PM.")
        except Exception as e:
            logger.error(f"Failed to start APScheduler: {e}")

