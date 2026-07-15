from django.urls import path
from sprints.views import SprintDownloadTemplateView

urlpatterns = [
    path('sprints/download-template/', SprintDownloadTemplateView.as_view(), name='sprint_download_template'),
]
