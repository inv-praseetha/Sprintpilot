from unittest.mock import patch
from django.urls import reverse
from django.core.cache import cache
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from accounts.models import Employee


@override_settings(GOOGLE_CLIENT_ID="test_google_client_id")
class GoogleAuthTests(APITestCase):

    def setUp(self):
        # Clear cache before each test to ensure rate limits/throttling start clean
        cache.clear()
        
        # Create a pre-authorized employee
        self.employee = Employee.objects.create(
            email="authorized@example.com",
            full_name="John Doe",
            role="PROJECT_MANAGER",
            is_active=True
        )
        
        # Create a pre-authorized inactive employee
        self.inactive_employee = Employee.objects.create(
            email="inactive@example.com",
            full_name="Jane Doe",
            role="TEAM_LEAD",
            is_active=False
        )
        
        # Create an employee that already logged in once
        self.linked_employee = Employee.objects.create(
            email="linked@example.com",
            full_name="Bob Smith",
            role="TEAM_LEAD",
            is_active=True,
            google_id="existing_google_sub_123"
        )
        
        self.url = reverse("google_auth")

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_first_login_success(self, mock_verify):
        """
        Verify that a pre-authorized employee can log in for the first time.
        Their google_id should be saved on successful authentication, and 
        JWT access/refresh tokens should be returned with custom claims.
        """
        mock_verify.return_value = {
            "sub": "new_google_sub_999",
            "email": "authorized@example.com",
            "name": "John Doe",
            "email_verified": True,
            "iss": "https://accounts.google.com"
        }

        response = self.client.post(self.url, {"token": "valid_token_string"})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.data)
        self.assertIn("refresh_token", response.data)
        self.assertEqual(response.data["email"], "authorized@example.com")
        self.assertEqual(response.data["role"], "PROJECT_MANAGER")
        self.assertEqual(response.data["full_name"], "John Doe")
        self.assertEqual(response.data["id"], str(self.employee.id))
        
        # Verify employee in DB now has the google_id populated
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.google_id, "new_google_sub_999")

        # Verify JWT Token claims
        access_token_str = response.data["access_token"]
        access_token = AccessToken(access_token_str)
        self.assertEqual(access_token["user_id"], str(self.employee.id))
        self.assertEqual(access_token["id"], str(self.employee.id))
        self.assertEqual(access_token["email"], "authorized@example.com")
        self.assertEqual(access_token["role"], "PROJECT_MANAGER")

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_subsequent_login_success(self, mock_verify):
        """
        Verify that an employee who already has a linked google_id can log in
        successfully when the google sub matches.
        """
        mock_verify.return_value = {
            "sub": "existing_google_sub_123",
            "email": "linked@example.com",
            "name": "Bob Smith",
            "email_verified": True,
            "iss": "https://accounts.google.com"
        }

        response = self.client.post(self.url, {"token": "valid_token_string"})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "linked@example.com")
        self.assertEqual(response.data["id"], str(self.linked_employee.id))

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_unregistered_email_rejected(self, mock_verify):
        """
        An email that is not pre-registered in the database must be rejected with HTTP 403.
        """
        mock_verify.return_value = {
            "sub": "some_google_sub",
            "email": "unregistered@example.com",
            "name": "Stranger",
            "email_verified": True,
            "iss": "https://accounts.google.com"
        }

        response = self.client.post(self.url, {"token": "valid_token_string"})
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "unauthorized_employee")
        self.assertEqual(response.data["detail"], "Employee is not pre-authorized to access this application.")

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_inactive_employee_rejected(self, mock_verify):
        """
        An employee whose account is marked is_active=False must be rejected with HTTP 403.
        """
        mock_verify.return_value = {
            "sub": "inactive_sub",
            "email": "inactive@example.com",
            "name": "Jane Doe",
            "email_verified": True,
            "iss": "https://accounts.google.com"
        }

        response = self.client.post(self.url, {"token": "valid_token_string"})
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "disabled_employee")
        self.assertEqual(response.data["detail"], "Employee account is disabled.")

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_google_id_mismatch_rejected(self, mock_verify):
        """
        If the sub received from Google doesn't match the linked google_id in DB,
        the login must be rejected with HTTP 403.
        """
        mock_verify.return_value = {
            "sub": "mismatched_google_sub_999",
            "email": "linked@example.com",
            "name": "Bob Smith",
            "email_verified": True,
            "iss": "https://accounts.google.com"
        }

        response = self.client.post(self.url, {"token": "valid_token_string"})
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["error"], "google_account_mismatch")
        self.assertEqual(response.data["detail"], "Google account mismatch detected.")

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_invalid_token_rejected(self, mock_verify):
        """
        If the Google library raises ValueError due to invalid signature/claims,
        it must return HTTP 401 Unauthorized.
        """
        mock_verify.side_effect = ValueError("Invalid signature")

        response = self.client.post(self.url, {"token": "invalid_token_string"})
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "invalid_google_token")
        self.assertEqual(response.data["detail"], "Invalid Google ID token.")

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_expired_token_rejected(self, mock_verify):
        """
        If the token is expired, return HTTP 401 with expired_google_token error code.
        """
        mock_verify.side_effect = ValueError("Token is expired")

        response = self.client.post(self.url, {"token": "expired_token_string"})
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["error"], "expired_google_token")
        self.assertEqual(response.data["detail"], "The Google ID token has expired.")

    def test_missing_token_payload(self):
        """
        If the token field is missing, return HTTP 400 validation error.
        """
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "validation_error")

    @patch("accounts.services.id_token.verify_oauth2_token")
    def test_rate_limiting_triggered(self, mock_verify):
        """
        Verify that making more than 5 requests/minute triggers throttling (HTTP 429).
        """
        mock_verify.return_value = {
            "sub": "new_google_sub_999",
            "email": "authorized@example.com",
            "name": "John Doe",
            "email_verified": True,
            "iss": "https://accounts.google.com"
        }

        # Send 5 requests (the throttle limit)
        for _ in range(5):
            response = self.client.post(self.url, {"token": "valid_token_string"})
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        # The 6th request must be throttled
        response = self.client.post(self.url, {"token": "valid_token_string"})
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(response.data["error"], "throttled")
