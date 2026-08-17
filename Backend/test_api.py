import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Sprintpilot.settings')
django.setup()

from project.models import Project

projects = Project.objects.filter(is_deleted=False).select_related(
    "created_by",
    "team_lead"
).prefetch_related(
    "members__employee_profile__user",
    "members__employee_profile__employee_skill_relations__skill",
    "project_stack__skill"
)
print("Total Projects:", projects.count())
for p in projects:
    print(p.name, p.status)
