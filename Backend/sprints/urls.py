from django.urls import path
from sprints.views import (
    SprintDownloadTemplateView,
    SprintDownloadScheduleView,
    SprintListCreateView,
    SprintDetailView,
    SprintTaskUpdateView,
    SprintAISuggestScheduleView,
    SprintImportScheduleView
)

urlpatterns = [
    path('sprints/download-template/', SprintDownloadTemplateView.as_view(), name='sprint_download_template'),
    path('sprints/<uuid:sprint_id>/download-schedule/', SprintDownloadScheduleView.as_view(), name='sprint_download_schedule'),
    path('projects/<uuid:project_id>/sprints/', SprintListCreateView.as_view(), name='sprint_list_create'),
    path('sprints/<uuid:pk>/', SprintDetailView.as_view(), name='sprint_detail'),
    path('sprints/tasks/<uuid:pk>/', SprintTaskUpdateView.as_view(), name='sprint_task_update'),
    path('sprints/<uuid:sprint_id>/ai-schedule/', SprintAISuggestScheduleView.as_view(), name='sprint_ai_schedule'),
    path('sprints/<uuid:sprint_id>/import-schedule/', SprintImportScheduleView.as_view(), name='sprint_import_schedule'),
]
