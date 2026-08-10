from django.urls import path
from project.views import ProjectCreateView, SkillListView, EmployeeProfileListView, ProjectDetailView, DashboardView, ProjectAssignableMembersView

urlpatterns = [
    path('projects/', ProjectCreateView.as_view(), name='project_list_create'),
    # More-specific sub-resource paths must come BEFORE the generic <uuid:pk>/ wildcard
    path('projects/<uuid:pk>/assignable-members/', ProjectAssignableMembersView.as_view(), name='project_assignable_members'),
    path('projects/<uuid:pk>/', ProjectDetailView.as_view(), name='project_detail'),

    path('projects/skills/', SkillListView.as_view(), name='skill_list'),
    path('projects/employees/', EmployeeProfileListView.as_view(), name='employee_profile_list'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
]
