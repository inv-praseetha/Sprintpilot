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

    prompt = f"""
You are an expert Agile project manager and workload scheduling AI.
Your task is to assign members and schedule tasks for the sprint: "{sprint.milestone}".

Sprint Details:
- Start Date: {sprint.start_date} (inclusive)
- End Date: {sprint.end_date} (inclusive)
- Valid Scheduling Period: {sprint.start_date} to {effective_end_str} (inclusive). Tasks MUST be completed by {effective_end_str} or earlier.
- Sprint/Project Holidays (Non-working days): {holidays_str}

Project Roster (Available Employees & Skills):
{employees_data}

Sprint Task List:
{tasks_data}

Rules & Constraints:
1. Every task must be assigned a `planned_start_date` and `planned_end_date` that fall strictly within the valid scheduling boundaries: {sprint.start_date} to {effective_end_str} (inclusive). Do NOT schedule any tasks on or after {empty_period_start} up to the sprint end date {sprint.end_date}; these last 2 days of the sprint must remain completely empty and unscheduled.
   - Spread and stagger task start dates across the scheduling duration to utilize all pending days. Do NOT group all tasks to start on Day 1. However, ensure that the first task(s) scheduled for each assigned member starts on Day 1 ({sprint.start_date}) so they do not sit idle.
2. Planned start date must be less than or equal to planned end date.
3. Weekend & Holiday Exclusion: Saturdays, Sundays, and the following sprint holidays are non-working days: [{holidays_str}]. Under NO circumstances should `planned_start_date` or `planned_end_date` be set to a Saturday, Sunday, or any of these holiday dates. If a task's duration spans across a weekend or a holiday, you must extend the `planned_end_date` forward to skip those non-working days.
4. Working Days Calculation: Calculate `working_days` as the exact count of weekdays (Monday through Friday) between `planned_start_date` and `planned_end_date` (inclusive), excluding Saturdays, Sundays, and any of the holiday dates listed: [{holidays_str}].
5. Task Assignment: Every single task in the list MUST be assigned to an employee from the roster. Do not leave any task unassigned (do not return null for `assigned_employee_id`). Even if the roster is small or does not have exact skill matches, assign each task to the employee who is relatively the closest fit or has adjacent skills.
   - Multiple tasks CAN be assigned to the same employee.
   - For any single employee, task execution timelines may overlap, but you must prevent workload overhead by scheduling no more than 2 to 3 tasks to run concurrently (overlapping) at any point in time. Stagger the start and end dates of the employee's assigned tasks across the scheduling duration (utilizing the later days of the scheduling window up to the deadline {effective_end_str}) to achieve this balance. Do not accumulate too many parallel tasks on the same days.
6. Timeline Estimations & Difficulty: You must carefully analyze the task's title, description, and complexity (difficulty) alongside the assigned employee's designation, experience level, and skills.
   - If a task has high difficulty/complexity, allocate more working days (e.g., 5-7 working days) by spacing out start and end dates to give them ample time to do the task.
   - If a task has standard difficulty or is highly routine, schedule shorter start and end dates (e.g., 1-3 working days).
   - If an employee has lower experience/skills relative to the task, adjust and increase the working days duration accordingly.
   - Adjust the task's planned start and end dates within the valid scheduling boundaries (up to {effective_end_str}) to match this estimated duration.
7. Return a list of recommendations, one for each task.

Return the response in the specified schema format.
"""
    return generate_schedule_content(prompt, SprintScheduleSuggestions, api_key)