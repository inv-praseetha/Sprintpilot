import json
import datetime
from django.db import transaction
from accounts.models import EmployeeProfile
from sprints.models import SprintTask, TaskRecommendation
from sprints.services.ai_scheduler import get_schedule_suggestions

def sanitize_weekday(date_val, is_end_date=False, sprint_start=None, sprint_end=None):
    if not date_val:
        return date_val
    if isinstance(date_val, str):
        try:
            d = datetime.datetime.strptime(date_val, "%Y-%m-%d").date()
        except ValueError:
            return date_val
    elif isinstance(date_val, datetime.date):
        d = date_val
    else:
        return date_val

    # Shift weekend (Saturday=5, Sunday=6) to preceding Friday
    while d.weekday() >= 5:
        d -= datetime.timedelta(days=1)

    if sprint_start:
        if isinstance(sprint_start, str):
            sprint_start_dt = datetime.datetime.strptime(sprint_start, "%Y-%m-%d").date()
        else:
            sprint_start_dt = sprint_start
        if d < sprint_start_dt:
            d = sprint_start_dt
            while d.weekday() >= 5:
                d += datetime.timedelta(days=1)

    if sprint_end:
        if isinstance(sprint_end, str):
            sprint_end_dt = datetime.datetime.strptime(sprint_end, "%Y-%m-%d").date()
        else:
            sprint_end_dt = sprint_end
        if d > sprint_end_dt:
            d = sprint_end_dt
            while d.weekday() >= 5:
                d -= datetime.timedelta(days=1)

    return d.strftime("%Y-%m-%d")

def generate_and_persist_recommendations(sprint, tasks, api_key):
    """
    Calls Gemini API, deletes previous recommendations, writes new recommendations,
    and returns list of serialized suggestions.
    """
    raw_response_text = get_schedule_suggestions(sprint, tasks, api_key)
    
    print("================ AI Response ================")
    print(raw_response_text)
    print("=============================================")
    
    raw_data = json.loads(raw_response_text)
    suggestions = raw_data.get("suggestions", [])
    
    output_suggestions = []
    
    with transaction.atomic():
        TaskRecommendation.objects.filter(task__in=tasks).delete()
        
        holidays = list(sprint.holidays.values_list('date', flat=True)) if sprint else None
        for sug in suggestions:
            t_id = sug.get("task_id")
            emp_id = sug.get("assigned_employee_id")
            start_date = sanitize_weekday(sug.get("planned_start_date"), is_end_date=False, sprint_start=sprint.start_date, sprint_end=sprint.end_date)
            end_date = sanitize_weekday(sug.get("planned_end_date"), is_end_date=True, sprint_start=sprint.start_date, sprint_end=sprint.end_date)
            
            if start_date and end_date:
                try:
                    s_dt = datetime.datetime.strptime(start_date, "%Y-%m-%d").date()
                    e_dt = datetime.datetime.strptime(end_date, "%Y-%m-%d").date()
                    if e_dt < s_dt:
                        end_date = start_date
                except ValueError:
                    pass

            confidence = sug.get("confidence", 1.0)
            matching_score = sug.get("matching_score", 1.0)
            if not emp_id:
                confidence = 0.0
                matching_score = 0.0
            reason = sug.get("reason", "")
            working_days = calculate_working_days(start_date, end_date, holidays=holidays)
            
            try:
                task_obj = SprintTask.objects.get(id=t_id, sprint=sprint)
            except SprintTask.DoesNotExist:
                continue
                
            emp_profile = None
            if emp_id:
                try:
                    emp_profile = EmployeeProfile.objects.get(id=emp_id)
                except EmployeeProfile.DoesNotExist:
                    pass
                    
            TaskRecommendation.objects.create(
                task=task_obj,
                recommended_employee=emp_profile,
                confidence=confidence,
                matching_score=matching_score,
                reason=reason,
                accepted=None
            )
            
            emp_serialized = None
            if emp_profile:
                emp_serialized = {
                    "id": str(emp_profile.id),
                    "user": {
                        "full_name": emp_profile.user.full_name,
                        "email": emp_profile.user.email
                    }
                }
                
            output_suggestions.append({
                "task_id": str(task_obj.id),
                "planned_start_date": start_date,
                "planned_end_date": end_date,
                "working_days": working_days,
                "confidence": float(confidence),
                "matching_score": float(matching_score),
                "reason": reason,
                "assigned_employee": emp_serialized
            })
            
    return output_suggestions

def calculate_working_days(start_date_str, end_date_str, holidays=None):
    """
    Computes working weekdays (Monday to Friday) between start and end date,
    excluding any holiday dates.
    """
    if not start_date_str or not end_date_str:
        return 0
    try:
        start = datetime.datetime.strptime(start_date_str, "%Y-%m-%d").date()
        end = datetime.datetime.strptime(end_date_str, "%Y-%m-%d").date()
        if end < start:
            return 0

        holiday_dates = set()
        if holidays:
            for h in holidays:
                if isinstance(h, str):
                    holiday_dates.add(datetime.datetime.strptime(h, "%Y-%m-%d").date())
                elif isinstance(h, datetime.date):
                    holiday_dates.add(h)
                elif hasattr(h, 'date'):
                    holiday_dates.add(h.date)

        daygenerator = (start + datetime.timedelta(x + 1) for x in range((end - start).days))
        days = 1 if (start.weekday() < 5 and start not in holiday_dates) else 0
        days += sum(1 for day in daygenerator if (day.weekday() < 5 and day not in holiday_dates))
        return days
    except Exception:
        return 1

def import_schedule(sprint, payload):
    """
    Performs atomic updates to assign employees, update start/end dates,
    compute story points and estimated hours, and mark recommendation accepted states.
    """
    if not isinstance(payload, list):
        raise ValueError("Payload must be a list of task schedules.")
        
    with transaction.atomic():
        holidays = list(sprint.holidays.values_list('date', flat=True)) if sprint else None
        for item in payload:
            task_id = item.get('task_id') or item.get('id')
            if not task_id:
                continue
                
            try:
                task = SprintTask.objects.get(id=task_id, sprint=sprint)
            except SprintTask.DoesNotExist:
                continue
                
            has_assignee = 'assigned_employee_id' in item or 'assignedTo' in item
            has_start = 'planned_start_date' in item or 'startDate' in item
            has_end = 'planned_end_date' in item or 'endDate' in item
 
            if has_assignee:
                emp_id = item.get('assigned_employee_id') or item.get('assignedTo')
                if emp_id and isinstance(emp_id, dict):
                    emp_id = emp_id.get('id')
                
                emp_profile = None
                if emp_id and emp_id != 'unassigned' and emp_id != '':
                    try:
                        emp_profile = EmployeeProfile.objects.get(id=emp_id)
                    except EmployeeProfile.DoesNotExist:
                        pass
                
                task.assigned_employee = emp_profile
                
                # Update recommendation accepted status
                TaskRecommendation.objects.filter(task=task, recommended_employee=emp_profile).update(accepted=True)
                TaskRecommendation.objects.filter(task=task).exclude(recommended_employee=emp_profile).update(accepted=False)
 
            if has_start:
                start_date = item.get('planned_start_date') or item.get('startDate')
                if start_date:
                    start_date = sanitize_weekday(start_date, is_end_date=False, sprint_start=sprint.start_date, sprint_end=sprint.end_date)
                task.planned_start_date = start_date or None

            if has_end:
                end_date = item.get('planned_end_date') or item.get('endDate')
                if end_date:
                    end_date = sanitize_weekday(end_date, is_end_date=True, sprint_start=sprint.start_date, sprint_end=sprint.end_date)
                task.planned_end_date = end_date or None
            
            if task.planned_start_date and task.planned_end_date:
                try:
                    s_d = datetime.datetime.strptime(str(task.planned_start_date), "%Y-%m-%d").date()
                    e_d = datetime.datetime.strptime(str(task.planned_end_date), "%Y-%m-%d").date()
                    if e_d < s_d:
                        task.planned_end_date = task.planned_start_date
                except ValueError:
                    pass

            # Recalculate story points and hours based on final resolved dates
            if task.planned_start_date and task.planned_end_date:
                wd = calculate_working_days(str(task.planned_start_date), str(task.planned_end_date), holidays=holidays)
                
                has_est = 'estimated_hours' in item or 'estimatedHours' in item
                has_sp = 'story_points' in item or 'storyPoints' in item
                
                if has_est:
                    val = item.get('estimated_hours') or item.get('estimatedHours')
                    task.estimated_hours = val if val is not None else (wd * 8)
                elif task.estimated_hours is None:
                    task.estimated_hours = wd * 8
                    
                if has_sp:
                    val = item.get('story_points') or item.get('storyPoints')
                    task.story_points = val if val is not None else (wd * 2)
                elif task.story_points is None:
                    task.story_points = wd * 2
                
            task.save()
