from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from accounts.models import Employee


class EmployeeJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication class that uses the Employee model 
    instead of Django's default User model.
    """
    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken("Token contained no recognizable user identification")

        try:
            employee = Employee.objects.get(id=user_id)
        except Employee.DoesNotExist:
            raise AuthenticationFailed("Employee not found", code="employee_not_found")

        if not employee.is_active:
            raise AuthenticationFailed("Employee is inactive", code="employee_inactive")

        return employee
