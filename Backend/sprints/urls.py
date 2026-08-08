from django.urls import path
from sprints.views import (
    SprintDownloadTemplateView,
    SprintDownloadScheduleView,
    SprintListCreateView,
    SprintDetailView,
    SprintTaskUpdateView,
    SprintTaskBulkDeleteView,
    SprintAISuggestScheduleView,
    SprintImportScheduleView,
    SprintTaskCreateView,
    SprintNoteListView,
    SprintTaskStatusView,
    SprintCloseView,
    SprintClosureSummaryView
)


urlpatterns = [
    path('sprints/download-template/', SprintDownloadTemplateView.as_view(), name='sprint_download_template'),
    path('sprints/<uuid:sprint_id>/download-schedule/', SprintDownloadScheduleView.as_view(), name='sprint_download_schedule'),
    path('projects/<uuid:project_id>/sprints/', SprintListCreateView.as_view(), name='sprint_list_create'),
    path('sprints/<uuid:pk>/', SprintDetailView.as_view(), name='sprint_detail'),
    path('sprints/tasks/bulk-delete/', SprintTaskBulkDeleteView.as_view(), name='sprint_task_bulk_delete'),
    path('sprints/tasks/status/', SprintTaskStatusView.as_view(), name='sprint_tasks_status'),
    path('sprints/tasks/<uuid:pk>/', SprintTaskUpdateView.as_view(), name='sprint_task_update'),
    path('sprints/<uuid:sprint_id>/tasks/', SprintTaskCreateView.as_view(), name='sprint_task_create'),
    path('sprints/<uuid:sprint_id>/ai-schedule/', SprintAISuggestScheduleView.as_view(), name='sprint_ai_schedule'),
    path('sprints/<uuid:sprint_id>/import-schedule/', SprintImportScheduleView.as_view(), name='sprint_import_schedule'),
    path('sprints/<uuid:sprint_id>/notes/', SprintNoteListView.as_view(), name='sprint_note_list'),
    path('sprints/<uuid:pk>/closure-summary/', SprintClosureSummaryView.as_view(), name='sprint_closure_summary'),
    path('sprints/<uuid:pk>/close/', SprintCloseView.as_view(), name='sprint_close'),
]

