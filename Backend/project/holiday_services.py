import datetime
from django.db import transaction
from project.models import ProjectHoliday
from sprints.models import Sprint, SprintTask

class HolidayService:
    @staticmethod
    def _shift_working_days(date_str, offset, holidays):
        if not date_str:
            return date_str
        
        # Convert to date object
        if isinstance(date_str, str):
            curr = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
        else:
            curr = date_str
            
        steps = abs(offset)
        direction = 1 if offset > 0 else -1
        
        loop_count = 0
        while steps > 0 and loop_count < 100:
            curr += datetime.timedelta(days=direction)
            if curr.weekday() < 5 and curr not in holidays:
                steps -= 1
            loop_count += 1
            
        return curr

    @staticmethod
    @transaction.atomic
    def shift_project_schedule(project, target_date_str, is_adding):
        """
        Shifts all sprints and tasks in the project that occur on or after the target_date.
        is_adding=True means a holiday was added (shift forward +1).
        is_adding=False means a holiday was removed (shift backward -1).
        """
        target_date = datetime.datetime.strptime(target_date_str, "%Y-%m-%d").date()
        offset = 1 if is_adding else -1
        
        # Get all current holidays for the project
        holidays_qs = ProjectHoliday.objects.filter(project=project).values_list('date', flat=True)
        holidays = set(holidays_qs)
        
        # 1. Shift Sprints
        # Find sprints that end on or after the target_date
        sprints = Sprint.objects.filter(project=project).order_by('start_date')
        for sprint in sprints:
            modified = False
            if is_adding:
                if sprint.end_date >= target_date:
                    sprint.end_date = HolidayService._shift_working_days(sprint.end_date, offset, holidays)
                    modified = True
                if sprint.start_date >= target_date:
                    sprint.start_date = HolidayService._shift_working_days(sprint.start_date, offset, holidays)
                    modified = True
            else:
                if sprint.end_date >= target_date:
                    sprint.end_date = HolidayService._shift_working_days(sprint.end_date, offset, holidays)
                    modified = True
                if sprint.start_date > target_date:
                    sprint.start_date = HolidayService._shift_working_days(sprint.start_date, offset, holidays)
                    modified = True
            
            if modified:
                sprint.save()
                
        # 2. Shift Tasks
        tasks = SprintTask.objects.filter(sprint__project=project)
        for task in tasks:
            if not task.planned_start_date or not task.planned_end_date:
                continue
                
            modified = False
            start = task.planned_start_date
            end = task.planned_end_date
            
            if is_adding:
                if end >= target_date:
                    task.planned_end_date = HolidayService._shift_working_days(end, offset, holidays)
                    modified = True
                if start >= target_date:
                    task.planned_start_date = HolidayService._shift_working_days(start, offset, holidays)
                    modified = True
            else:
                if end >= target_date:
                    task.planned_end_date = HolidayService._shift_working_days(end, offset, holidays)
                    modified = True
                if start > target_date:
                    task.planned_start_date = HolidayService._shift_working_days(start, offset, holidays)
                    modified = True
            
            if modified:
                task.save(update_fields=['planned_start_date', 'planned_end_date'])
