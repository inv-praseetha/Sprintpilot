from django.urls import path
from backlog.views import SprintSyncBacklogView

urlpatterns = [
    path('sprints/<uuid:sprint_id>/sync-backlog/', SprintSyncBacklogView.as_view(), name='sprint_sync_backlog'),
]
