import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from rest_framework_simplejwt.tokens import RefreshToken
from project.models import Project
from accounts.models import Employee

# Get the first project
project = Project.objects.filter(is_deleted=False).first()
print(f"Testing for project: {project.name} (id: {project.id})")

user = Employee.objects.filter(role='PROJECT_MANAGER').first()
print(f"Testing with user: {user.email}")

# Generate JWT for the user
refresh = RefreshToken.for_user(user)
access_token = str(refresh.access_token)

client = Client(SERVER_NAME='localhost')
response = client.get(f'/api/projects/{project.id}/delete-summary/', HTTP_AUTHORIZATION=f'Bearer {access_token}')
print(f"Status Code: {response.status_code}")
print(f"Response Data: {response.json() if response.status_code == 200 else response.content}")
