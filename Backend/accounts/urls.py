from django.urls import path
from accounts.views import GoogleAuthView, EmployeeTokenRefreshView

urlpatterns = [
    path('auth/google/', GoogleAuthView.as_view(), name='google_auth'),
    path('auth/refresh/', EmployeeTokenRefreshView.as_view(), name='token_refresh'),
]

