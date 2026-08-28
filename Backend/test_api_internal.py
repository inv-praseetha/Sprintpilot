from django.test import RequestFactory
from project.views import ProjectDeleteSummaryView
from project.models import Project
from accounts.models import Employee

# Get a valid project ID
project = Project.objects.filter(is_deleted=False).first()
print(f"Testing for project: {project.name} (id: {project.id})")

user = Employee.objects.filter(role='PROJECT_MANAGER').first()

factory = RequestFactory()
request = factory.get(f'/api/projects/{project.id}/delete-summary/')
request.user = user

view = ProjectDeleteSummaryView.as_view()
response = view(request, pk=project.id)

print(f"Status Code: {response.status_code}")
print(f"Response Data: {response.data}")
