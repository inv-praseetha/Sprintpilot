from django.urls import path
from sprints.views import (
    SprintDownloadTemplateView,
    SprintListCreateView,
    SprintDetailView,
    SprintTaskUpdateView
)

urlpatterns = [
    path('sprints/download-template/', SprintDownloadTemplateView.as_view(), name='sprint_download_template'),
    path('projects/<uuid:project_id>/sprints/', SprintListCreateView.as_view(), name='sprint_list_create'),
    path('sprints/<uuid:pk>/', SprintDetailView.as_view(), name='sprint_detail'),
    path('sprints/tasks/<uuid:pk>/', SprintTaskUpdateView.as_view(), name='sprint_task_update'),
]
