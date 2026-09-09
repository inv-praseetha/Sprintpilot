from datetime import datetime, date
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import SprintTask

@receiver(post_save, sender=SprintTask)
@receiver(post_delete, sender=SprintTask)
def trigger_monthly_performance_recalculation(sender, instance, **kwargs):
    """
    Automatically triggers recalculation of monthly performance metrics
    whenever a SprintTask is created, updated, or deleted.
    Handles date objects, string formatted dates, and fallback creation dates safely.
    """
    task_date = instance.planned_end_date or instance.planned_start_date
    month, year = None, None

    if task_date:
        if isinstance(task_date, (date, datetime)):
            month = task_date.month
            year = task_date.year
        elif isinstance(task_date, str):
            try:
                dt = datetime.strptime(task_date, "%Y-%m-%d")
                month = dt.month
                year = dt.year
            except ValueError:
                pass

    if not month or not year:
        created = instance.created_at
        if created:
            if isinstance(created, (date, datetime)):
                month = created.month
                year = created.year
            elif isinstance(created, str):
                try:
                    dt = datetime.strptime(created[:10], "%Y-%m-%d")
                    month = dt.month
                    year = dt.year
                except ValueError:
                    pass

    from .services.sprint_service import SprintService
    SprintService.recalculate_monthly_performance(month=month, year=year)
