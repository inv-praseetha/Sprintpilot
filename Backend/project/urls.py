from django.urls import path
from project.views import ProjectCreateView, SkillListView, EmployeeProfileListView, ProjectDetailView, ProjectHolidayToggleView

urlpatterns = [
    path('projects/', ProjectCreateView.as_view(), name='project_list_create'),
    path('projects/<uuid:pk>/', ProjectDetailView.as_view(), name='project_detail'),
    path('projects/<uuid:pk>/holidays/', ProjectHolidayToggleView.as_view(), name='project_holidays_toggle'),
    path('projects/skills/', SkillListView.as_view(), name='skill_list'),
    path('projects/employees/', EmployeeProfileListView.as_view(), name='employee_profile_list'),
]

