from django.test import TestCase
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework_simplejwt.settings import api_settings
from accounts.models import Employee
from accounts.authentication import EmployeeJWTAuthentication
import uuid

class EmployeeJWTAuthenticationTests(TestCase):
    def setUp(self):
        self.auth = EmployeeJWTAuthentication()
        
        self.employee = Employee.objects.create(
            email="auth_test@example.com", 
            role=Employee.Role.PROJECT_MANAGER,
            is_active=True
        )
        
        self.inactive_employee = Employee.objects.create(
            email="inactive_auth@example.com", 
            role=Employee.Role.PROJECT_MANAGER,
            is_active=False
        )

    def test_get_user_success(self):
        """
        Verify that a valid token correctly retrieves an active employee.
        """
        validated_token = {
            api_settings.USER_ID_CLAIM: str(self.employee.id)
        }
        
        user = self.auth.get_user(validated_token)
        self.assertEqual(user.id, self.employee.id)

    def test_get_user_missing_claim(self):
        """
        Verify that an InvalidToken is raised if the user ID claim is missing.
        """
        validated_token = {}
        
        with self.assertRaisesMessage(InvalidToken, "Token contained no recognizable user identification"):
            self.auth.get_user(validated_token)

    def test_get_user_employee_not_found(self):
        """
        Verify that AuthenticationFailed is raised if the employee does not exist.
        """
        non_existent_uuid = str(uuid.uuid4())
        validated_token = {
            api_settings.USER_ID_CLAIM: non_existent_uuid
        }
        
        with self.assertRaises(AuthenticationFailed) as cm:
            self.auth.get_user(validated_token)
            
        self.assertEqual(str(cm.exception.detail['code']), "employee_not_found")

    def test_get_user_inactive_employee(self):
        """
        Verify that AuthenticationFailed is raised if the employee is inactive.
        """
        validated_token = {
            api_settings.USER_ID_CLAIM: str(self.inactive_employee.id)
        }
        
        with self.assertRaises(AuthenticationFailed) as cm:
            self.auth.get_user(validated_token)
            
        self.assertEqual(str(cm.exception.detail['code']), "employee_inactive")
