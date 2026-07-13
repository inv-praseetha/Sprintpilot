from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

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
