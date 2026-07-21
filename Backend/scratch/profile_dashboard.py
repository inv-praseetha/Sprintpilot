import os
import django
import time
from django.db import connection, reset_queries

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from project.models import Project
from sprints.models import Sprint
from sprints.serializers import SprintSerializer
from project.serializers import ProjectListSerializer

reset_queries()
start_time = time.time()

# 1. Fetch projects
projects = list(Project.objects.filter(is_deleted=False).select_related(
    "created_by",
    "team_lead"
).prefetch_related(
    "members__employee_profile__user",
    "members__employee_profile__employee_skill_relations__skill",
    "project_stack__skill"
))
active_projects = [p for p in projects if p.status != 'COMPLETED']

print(f"Fetched {len(projects)} projects ({len(active_projects)} active)")
print(f"Projects list SQL queries count: {len(connection.queries)}")
reset_queries()

# 2. Fetch sprints for each active project
for project in active_projects:
    proj_start = time.time()
    sprints = list(Sprint.objects.filter(project=project).select_related('project').prefetch_related(
        'tasks__assigned_employee__user',
        'tasks__assigned_employee__employee_skill_relations__skill',
        'tasks__recommendations'
    ))
    # Serialize
    serializer = SprintSerializer(sprints, many=True)
    data = serializer.data
    print(f"Project '{project.name}': {len(sprints)} sprints, queries: {len(connection.queries)}, time: {time.time() - proj_start:.3f}s")
    
    # Let's profile the detail view for each sprint
    for sprint in sprints:
        reset_queries()
        detail_start = time.time()
        sprint_detail = Sprint.objects.select_related('project').prefetch_related(
            'tasks__assigned_employee__user',
            'tasks__assigned_employee__employee_skill_relations__skill',
            'tasks__recommendations'
        ).get(id=sprint.id)
        detail_serializer = SprintSerializer(sprint_detail)
        detail_data = detail_serializer.data
        print(f"  Sprint Detail '{sprint.milestone}': queries: {len(connection.queries)}, time: {time.time() - detail_start:.3f}s")
    
    reset_queries()

print(f"Total profiling completed in {time.time() - start_time:.3f}s")
