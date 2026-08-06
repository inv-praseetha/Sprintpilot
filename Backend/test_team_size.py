import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from project.models import Project, ProjectMember
from accounts.models import EmployeeProfile
from django.contrib.auth import get_user_model

# Check if any project has more members than team_size
for p in Project.objects.all():
    member_count = p.members.count()
    if p.team_size < member_count:
        print(f"Project {p.name} has team_size {p.team_size} but {member_count} members!")
