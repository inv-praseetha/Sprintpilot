from django.urls import path
from accounts.views import GoogleAuthView, EmployeeTokenRefreshView, EmployeeLogoutView

urlpatterns = [
    path('auth/google/', GoogleAuthView.as_view(), name='google_auth'),
    path('auth/refresh/', EmployeeTokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', EmployeeLogoutView.as_view(), name='token_logout'),
]

