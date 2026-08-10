from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from accounts.models import Employee, BlacklistedEmployeeToken
from accounts.services import AuthenticationService

class AuthViewsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.employee = Employee.objects.create(
            email="views_test@example.com",
            role=Employee.Role.PROJECT_MANAGER,
            is_active=True
        )
        self.inactive_employee = Employee.objects.create(
            email="views_test_inactive@example.com",
            role=Employee.Role.PROJECT_MANAGER,
            is_active=False
        )
        self.dev_employee = Employee.objects.create(
            email="views_test_dev@example.com",
            role=Employee.Role.ENGINEER,
            is_active=True
        )
        
        # Generate tokens
        self.tokens = AuthenticationService.generate_tokens_for_employee(self.employee)
        self.refresh_token = self.tokens["refresh_token"]

        self.inactive_tokens = AuthenticationService.generate_tokens_for_employee(self.inactive_employee)
        self.inactive_refresh = self.inactive_tokens["refresh_token"]

        self.dev_tokens = AuthenticationService.generate_tokens_for_employee(self.dev_employee)
        self.dev_refresh = self.dev_tokens["refresh_token"]

        self.refresh_url = reverse("token_refresh")
        self.logout_url = reverse("token_logout")

    # Tests for EmployeeTokenRefreshView
    def test_refresh_token_success(self):
        response = self.client.post(self.refresh_url, {"refresh": self.refresh_token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.data)
        self.assertIn("refresh_token", response.data)

    def test_refresh_token_missing(self):
        response = self.client.post(self.refresh_url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "bad_request")

    def test_refresh_token_invalid(self):
        response = self.client.post(self.refresh_url, {"refresh": "invalid_token"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "invalid_token")

    def test_refresh_token_blacklisted(self):
        BlacklistedEmployeeToken.objects.create(token=self.refresh_token)
        response = self.client.post(self.refresh_url, {"refresh": self.refresh_token})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "token_not_valid")

    def test_refresh_token_missing_employee_id(self):
        # Create a token manually and delete the id claim
        token = RefreshToken()
        token.payload.pop("user_id", None)
        token.payload.pop("id", None)
        response = self.client.post(self.refresh_url, {"refresh": str(token)})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "token_not_valid")

    def test_refresh_token_employee_not_found(self):
        # Create a token manually for a non-existent employee
        token = RefreshToken()
        token["id"] = "00000000-0000-0000-0000-000000000000"
        response = self.client.post(self.refresh_url, {"refresh": str(token)})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "employee_not_found")

    def test_refresh_token_employee_inactive(self):
        response = self.client.post(self.refresh_url, {"refresh": self.inactive_refresh})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "employee_inactive")

    def test_refresh_token_unauthorized_role(self):
        response = self.client.post(self.refresh_url, {"refresh": self.dev_refresh})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "unauthorized_employee")

    # Tests for EmployeeLogoutView
    def test_logout_success(self):
        response = self.client.post(self.logout_url, {"refresh": self.refresh_token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Successfully logged out.")
        
        # Verify token is blacklisted
        self.assertTrue(BlacklistedEmployeeToken.objects.filter(token=self.refresh_token).exists())

    def test_logout_missing_token(self):
        response = self.client.post(self.logout_url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "bad_request")

    def test_logout_invalid_token(self):
        response = self.client.post(self.logout_url, {"refresh": "invalid_token"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "invalid_token")
