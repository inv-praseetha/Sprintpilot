from django.urls import path
from backlog.views import SprintSyncBacklogView, BacklogCategoriesView, BacklogIssueCommentsView, SprintSyncCommentsView

urlpatterns = [
    path('categories/', BacklogCategoriesView.as_view(), name='backlog_categories'),
    path('sprints/<uuid:sprint_id>/sync-backlog/', SprintSyncBacklogView.as_view(), name='sprint_sync_backlog'),
    path('sprints/<uuid:sprint_id>/sync-comments/', SprintSyncCommentsView.as_view(), name='sprint_sync_comments'),
    path('issues/<str:backlog_task_id>/comments/', BacklogIssueCommentsView.as_view(), name='backlog_issue_comments'),
]
