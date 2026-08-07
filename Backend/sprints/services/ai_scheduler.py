from pydantic import BaseModel, Field
from typing import List, Optional
from project.models import ProjectMember
from sprints.services.gemini_client import generate_schedule_content

class TaskScheduleSuggestion(BaseModel):
    task_id: str = Field(description="The UUID string of the sprint task.")
    assigned_employee_id: Optional[str] = Field(None, description="The UUID string of the recommended EmployeeProfile, or null if unassigned.")
    planned_start_date: str = Field(description="Suggested start date (YYYY-MM-DD), must fall within sprint dates, and cannot be a Saturday, Sunday, or a holiday date.")
    planned_end_date: str = Field(description="Suggested end date (YYYY-MM-DD), must fall within sprint dates, cannot be a Saturday, Sunday, or a holiday date, and must be greater than or equal to planned_start_date.")
    confidence: float = Field(description="A decimal confidence score between 0.00 and 1.00 for the match.")
    matching_score: float = Field(description="A decimal matching score between 0.00 and 1.00 for the task/skills matching.")
    reason: str = Field(description="Clear explanation of why this employee was selected based on their designation, experience, availability, and specific skills.")
    working_days: int = Field(description="The exact count of weekdays (excluding Saturdays, Sundays, and holiday dates) between start and end date (inclusive).")

class SprintScheduleSuggestions(BaseModel):
    suggestions: List[TaskScheduleSuggestion]

def compile_project_roster(project):
    project_members = ProjectMember.objects.filter(project=project).select_related(
        'employee_profile__user'
    ).prefetch_related(
        'employee_profile__employee_skill_relations__skill'
    )

    employees_data = []
    for member in project_members:
        profile = member.employee_profile
        skills = []
        for rel in profile.employee_skill_relations.all():
            skills.append({
                "name": rel.skill.name,
                "proficiency_level": rel.proficiency_level
            })

        employees_data.append({
            "id": str(profile.id),
            "full_name": profile.user.full_name,
            "email": profile.user.email,
            "role": profile.user.role,
            "designation": profile.designation,
            "experience_years": float(profile.experience_years),
            "availability_percentage": profile.availability_percentage,
            "skills": skills
        })
    return employees_data

def compile_sprint_tasks(tasks):
    tasks_data = []
    for task in tasks:
        tasks_data.append({
            "id": str(task.id),
            "title": task.title,
            "description": task.description or "",
            "category": task.category,
            "priority": task.priority,
            "story_points": float(task.story_points) if task.story_points else None,
            "estimated_hours": float(task.estimated_hours) if task.estimated_hours else None
        })
    return tasks_data

def get_schedule_suggestions(sprint, tasks, api_key):
    import datetime
    from datetime import timedelta
    
    employees_data = compile_project_roster(sprint.project)
    tasks_data = compile_sprint_tasks(tasks)
    
    holidays = [h.date.strftime("%Y-%m-%d") for h in sprint.holidays.all()] if sprint else []
    holidays_str = ", ".join(holidays) if holidays else "None"

    if isinstance(sprint.end_date, str):
        sprint_end_dt = datetime.datetime.strptime(sprint.end_date, "%Y-%m-%d").date()
    else:
        sprint_end_dt = sprint.end_date
    effective_end_date = sprint_end_dt - timedelta(days=2)
    effective_end_str = effective_end_date.strftime("%Y-%m-%d")
    empty_period_start = (effective_end_date + timedelta(days=1)).strftime("%Y-%m-%d")

    # Generate list of valid working days (excluding weekends and holidays)
    valid_working_days = []
    if isinstance(sprint.start_date, str):
        start_dt = datetime.datetime.strptime(sprint.start_date, "%Y-%m-%d").date()
    else:
        start_dt = sprint.start_date
        
    curr = start_dt
    while curr <= effective_end_date:
        if curr.weekday() < 5:  # Monday to Friday
            curr_str = curr.strftime("%Y-%m-%d")
            if curr_str not in holidays:
                valid_working_days.append(curr_str)
        curr += timedelta(days=1)
        
    valid_working_days_str = "\n".join([f"- {d}" for d in valid_working_days])

    prompt = f"""
You are an expert Agile project manager and workload scheduling AI.
Your task is to assign members and schedule tasks for the sprint: "{sprint.milestone}".

Sprint Details:
- Start Date: {sprint.start_date} (inclusive)
- End Date: {sprint.end_date} (inclusive)
- Valid Scheduling Period: {sprint.start_date} to {effective_end_str} (inclusive). Tasks MUST be completed by {effective_end_str} or earlier.
- Sprint/Project Holidays (Non-working days): {holidays_str}

Valid Working Days (in chronological order):
{valid_working_days_str}

Project Roster (Available Employees & Skills):
{employees_data}

Sprint Task List:
{tasks_data}

Rules & Constraints:
1. Every task must be assigned a `planned_start_date` and `planned_end_date` chosen STRICTLY from the list of Valid Working Days. Under NO circumstances should a task be scheduled on any other date (such as a weekend, holiday, or day after {effective_end_str}).
   - For each assigned employee, schedule their first task to start on the first available date in the Valid Working Days list so they do not sit idle.
2. Planned start date must be less than or equal to planned end date.
3. Weekend & Holiday Exclusion: You MUST NOT assign any task start/end dates on weekends or holidays. The list of Valid Working Days has already excluded weekends and holidays. Therefore, you are strictly prohibited from using any dates NOT listed under Valid Working Days.
4. Working Days Calculation: Calculate `working_days` as the exact count of days from the Valid Working Days list between `planned_start_date` and `planned_end_date` (inclusive).
5. Task Assignment: Every single task in the list MUST be assigned to an employee from the roster. Do not leave any task unassigned (do not return null for `assigned_employee_id`). Even if the roster is small or does not have exact skill matches, assign each task to the employee who is relatively the closest fit or has adjacent skills.
   - Multiple tasks CAN be assigned to the same employee.
6. Capacity-Based Sequential Scheduling & Overlaps Algorithm:
   - Day allocation must be done strictly based on `estimated_hours` (8 hours = 1 day). Do NOT estimate the duration based on title, description, or difficulty.
   - If a task's `estimated_hours` is missing or null, default to 8.0 hours (1.0 working day).
   - An employee's maximum capacity is exactly 8.0 working hours per day.
   - For each employee, you MUST schedule their assigned tasks sequentially using the following exact date/capacity simulation:
     a. Order the employee's assigned tasks (e.g. by priority or logical dependency).
     b. Start at the first date in the Valid Working Days list. Set the leftover capacity for this date to 8.0 hours.
     c. For each task in sequence:
        - Let the task's required hours be H.
        - The task will start on the current date.
        - Whenever you advance the current date to the next date in the Valid Working Days list, you MUST immediately reset the leftover capacity for that new date to 8.0 hours.
        - If H <= leftover capacity of the current date:
          - Set task's planned_start_date = current date, and planned_end_date = current date.
          - Subtract H from the current date's leftover capacity: leftover = leftover - H.
          - If leftover == 0, advance current date to the next date in the Valid Working Days list, and reset leftover capacity to 8.0 hours.
        - If H > leftover capacity of the current date:
          - Set task's planned_start_date = current date.
          - The task consumes all of the leftover capacity of the current date.
          - Subtract the consumed capacity from H: H = H - leftover.
          - While H > 0:
            - Advance current date to the next date in the Valid Working Days list (which resets the leftover capacity for this new date to 8.0 hours).
            - If H <= 8.0:
              - Set the task's planned_end_date = current date.
              - The task consumes H hours of the current date.
              - Set the leftover capacity of the current date to: leftover = 8.0 - H.
              - If leftover == 0, advance current date to the next date in the Valid Working Days list, and reset leftover capacity to 8.0 hours.
              - Set H = 0 (loop terminates).
            - If H > 8.0:
              - The task consumes 8.0 hours of the current date.
              - H = H - 8.0.
     d. Transition/Overlap Days: If a task ends on a date with leftover capacity > 0, the next task in the sequence MUST start on that exact same date to consume the remaining capacity (resulting in an overlap where Task A's planned_end_date matches Task B's planned_start_date).
     e. Strict Daily Cap: For any single employee and any given date, the sum of hours allocated to all tasks scheduled on that day MUST NOT exceed 8.0 hours under any circumstances. If a task requires 8 hours, and the employee only has 4 hours capacity left on a day, you MUST start the task on that day (using the 4 hours) and end it on the next working day in the Valid Working Days list (using the remaining 4 hours).
    - The planned_end_date field in the JSON MUST match the final date of this allocation sequence exactly.
7. Return a list of recommendations, one for each task.

Return the response in the specified schema format.
"""
    return generate_schedule_content(prompt, SprintScheduleSuggestions, api_key)