from pydantic import BaseModel, Field
from typing import List, Optional
from project.models import ProjectMember
from sprints.services.gemini_client import generate_schedule_content

class TaskScheduleSuggestion(BaseModel):
    task_id: str = Field(description="The UUID string of the sprint task.")
    assigned_employee_id: Optional[str] = Field(None, description="The UUID string of the recommended EmployeeProfile, or null if unassigned.")
    planned_start_date: str = Field(description="Suggested start date (YYYY-MM-DD), must fall within sprint dates, and cannot be a Saturday or Sunday.")
    planned_end_date: str = Field(description="Suggested end date (YYYY-MM-DD), must fall within sprint dates, cannot be a Saturday or Sunday, and must be greater than or equal to planned_start_date.")
    confidence: float = Field(description="A decimal confidence score between 0.00 and 1.00 for the match.")
    matching_score: float = Field(description="A decimal matching score between 0.00 and 1.00 for the task/skills matching.")
    reason: str = Field(description="Clear explanation of why this employee was selected based on their designation, experience, availability, and specific skills.")
    working_days: int = Field(description="The exact count of weekdays (excluding Saturdays and Sundays) between start and end date (inclusive).")

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
    employees_data = compile_project_roster(sprint.project)
    tasks_data = compile_sprint_tasks(tasks)
    
    prompt = f"""
You are an expert Agile project manager and workload scheduling AI.
Your task is to assign members and schedule tasks for the sprint: "{sprint.name}".

Sprint Details:
- Start Date: {sprint.start_date} (inclusive)
- End Date: {sprint.end_date} (inclusive)

Project Roster (Available Employees & Skills):
{employees_data}

Sprint Task List:
{tasks_data}

Rules & Constraints:
1. Every task must be assigned a `planned_start_date` and `planned_end_date` that fall strictly within the sprint boundaries: {sprint.start_date} to {sprint.end_date}.
   - Spread and stagger task start dates across the entire sprint duration to utilize all pending days. Do NOT group all tasks to start on Day 1. However, ensure that the first task(s) scheduled for each assigned member starts on Day 1 ({sprint.start_date}) so they do not sit idle.
2. Planned start date must be less than or equal to planned end date.
3. Weekend Exclusion & Timeline Skipping: Saturdays and Sundays are non-working days. Under NO circumstances should `planned_start_date` or `planned_end_date` be set to a Saturday or Sunday. If a task's duration spans across a weekend, you must extend the `planned_end_date` forward to skip Saturday and Sunday. For example, if a task requires 3 working days of effort and starts on Friday, the `planned_end_date` must be set to the following Tuesday (Friday is day 1, Monday is day 2, Tuesday is day 3), completely skipping Saturday and Sunday.
4. Working Days Calculation: Calculate `working_days` as the exact count of weekdays (Monday through Friday) between `planned_start_date` and `planned_end_date` (inclusive). Do not include Saturdays or Sundays in the `working_days` count.
5. Task Assignment: Every single task in the list MUST be assigned to an employee from the roster. Do not leave any task unassigned (do not return null for `assigned_employee_id`). Even if the roster is small or does not have exact skill matches, assign each task to the employee who is relatively the closest fit or has adjacent skills.
   - Multiple tasks CAN be assigned to the same employee.
   - For any single employee, task execution timelines may overlap, but you must prevent workload overhead by scheduling no more than 2 to 3 tasks to run concurrently (overlapping) at any point in time. Stagger the start and end dates of the employee's assigned tasks across the sprint (utilizing the later days of the sprint up to the end date) to achieve this balance. Do not accumulate too many parallel tasks on the same days.
6. Timeline Estimations & Difficulty: You must carefully analyze the task's title, description, and complexity (difficulty) alongside the assigned employee's designation, experience level, and skills.
   - If a task has high difficulty/complexity, allocate more working days (e.g., 5-7 working days) by spacing out start and end dates to give them ample time to do the task.
   - If a task has standard difficulty or is highly routine, schedule shorter start and end dates (e.g., 1-3 working days).
   - If an employee has lower experience/skills relative to the task, adjust and increase the working days duration accordingly.
   - Adjust the task's planned start and end dates within the sprint boundaries to match this estimated duration.
7. Return a list of recommendations, one for each task.

Return the response in the specified schema format.
"""
    return generate_schedule_content(prompt, SprintScheduleSuggestions, api_key)
