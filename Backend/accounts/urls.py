from django.urls import path
from accounts.views import GoogleAuthView

urlpatterns = [
    path('auth/google/', GoogleAuthView.as_view(), name='google_auth'),
]
