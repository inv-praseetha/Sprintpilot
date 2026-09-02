from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

from accounts.models import Employee
from accounts.serializers import GoogleAuthSerializer, EmployeeSerializer
from accounts.services import AuthenticationService
from accounts.throttling import AuthRateThrottle


class GoogleAuthView(APIView):
    """
    POST /api/auth/google/
    Receives Google ID Token from the frontend, verifies it using the Google API, 
    and returns Access/Refresh JWT tokens along with Employee details.
    """
    permission_classes = [AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request, *args, **kwargs):
        # Validate request body
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data["token"]
        
        # Authenticate employee through the service layer
        employee, tokens = AuthenticationService.authenticate_google_user(token)
        
        # Serialize employee details
        employee_serializer = EmployeeSerializer(employee)
        
        # Return success response
        response_data = {
            "access_token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "id": employee_serializer.data["id"],
            "full_name": employee_serializer.data["full_name"],
            "email": employee_serializer.data["email"],
            "role": employee_serializer.data["role"],
            "employee": employee_serializer.data
        }
        return Response(response_data, status=status.HTTP_200_OK)


class EmployeeTokenRefreshView(APIView):
    """
    POST /api/auth/refresh/
    Receives refresh token, verifies it, checks if employee is active and authorized,
    and returns a fresh access/refresh token pair.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token_str = request.data.get("refresh")
        if not refresh_token_str:
            return Response(
                {"error": "bad_request", "detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Parse and validate the refresh token
            refresh_token = RefreshToken(refresh_token_str)
            
            # Check if token is blacklisted
            from accounts.models import BlacklistedEmployeeToken
            if BlacklistedEmployeeToken.objects.filter(token=refresh_token_str).exists():
                raise InvalidToken("This token has been blacklisted.")
            
            # Extract employee ID from custom claims
            employee_id = refresh_token.get("id") or refresh_token.get("user_id")
            if not employee_id:
                raise InvalidToken("Token contained no recognizable employee identification")

            # Retrieve employee and verify their current active status and role
            try:
                employee = Employee.objects.get(id=employee_id)
            except Employee.DoesNotExist:
                return Response(
                    {"error": "employee_not_found", "detail": "Employee associated with this token does not exist."},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            if not employee.is_active:
                return Response(
                    {"error": "employee_inactive", "detail": "Employee account is disabled."},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            if employee.role not in [Employee.Role.PROJECT_MANAGER, Employee.Role.TEAM_LEAD]:
                return Response(
                    {"error": "unauthorized_employee", "detail": "Employee role is not authorized."},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            # Generate fresh token pair with updated claims
            tokens = AuthenticationService.generate_tokens_for_employee(employee)

            return Response({
                "access_token": tokens["access_token"],
                "refresh_token": tokens["refresh_token"]
            }, status=status.HTTP_200_OK)

        except TokenError as e:
            return Response(
                {"error": "invalid_token", "detail": str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )


class EmployeeLogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklists the provided refresh token.
    """
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token_str = request.data.get("refresh")
        if not refresh_token_str:
            return Response(
                {"error": "bad_request", "detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Verify the token is valid before blacklisting
            token = RefreshToken(refresh_token_str)
            
            from accounts.models import BlacklistedEmployeeToken
            BlacklistedEmployeeToken.objects.get_or_create(token=refresh_token_str)
            
            return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
        except TokenError as e:
            return Response(
                {"error": "invalid_token", "detail": str(e)},
                status=status.HTTP_401_UNAUTHORIZED
            )


