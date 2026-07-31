from django.urls import path
from .views import JiraFetchTasksView, JiraAuthUrlView, JiraTokenExchangeView

urlpatterns = [
    path('auth-url/', JiraAuthUrlView.as_view(), name='jira_auth_url'),
    path('token/', JiraTokenExchangeView.as_view(), name='jira_token_exchange'),
    path('fetch/', JiraFetchTasksView.as_view(), name='jira_fetch_tasks'),
]
