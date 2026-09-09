from django.urls import path
from .views import JiraFetchTasksView, JiraAuthUrlView, JiraTokenExchangeView, JiraSprintSyncView, JiraSprintAppendView

urlpatterns = [
    path('auth-url/', JiraAuthUrlView.as_view(), name='jira_auth_url'),
    path('token/', JiraTokenExchangeView.as_view(), name='jira_token_exchange'),
    path('fetch/', JiraFetchTasksView.as_view(), name='jira_fetch_tasks'),
    path('sync-sprint/<uuid:sprint_id>/', JiraSprintSyncView.as_view(), name='jira_sync_sprint'),
    path('append-tasks/<uuid:sprint_id>/', JiraSprintAppendView.as_view(), name='jira_append_tasks'),
]
