import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework.exceptions import APIException
from rest_framework import status

logger = logging.getLogger(__name__)


class GoogleAuthException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Google authentication failed."
    default_code = "google_auth_failed"


class InvalidGoogleTokenException(GoogleAuthException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Invalid Google Token"
    default_code = "invalid_google_token"


class ExpiredGoogleTokenException(GoogleAuthException):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = "Expired Google Token"
    default_code = "expired_google_token"


class UnauthorizedEmployeeException(GoogleAuthException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Unauthorized Employee"
    default_code = "unauthorized_employee"


class DisabledEmployeeException(GoogleAuthException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Disabled Employee"
    default_code = "disabled_employee"


class GoogleAccountMismatchException(GoogleAuthException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Google Account Mismatch"
    default_code = "google_account_mismatch"


def custom_exception_handler(exc, context):
    """
    Custom exception handler to return consistent JSON responses:
    {
        "error": "error_code",
        "detail": "Descriptive message"
    }
    """
    # Call standard DRF exception handler first
    response = exception_handler(exc, context)

    if response is None:
        # Unexpected exception occurred (e.g. database error, python bug, etc.)
        # Do not expose internal details to frontend, log it.
        logger.exception("Internal Server Error occurred: %s", str(exc))
        return Response(
            {
                "error": "internal_server_error",
                "detail": "An internal server error occurred."
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Format the error response consistently
    if isinstance(exc, GoogleAuthException):
        response.data = {
            "error": exc.detail.code if hasattr(exc.detail, 'code') else exc.default_code,
            "detail": str(exc.detail)
        }
    else:
        # Standardize other DRF exceptions (like ValidationError, PermissionDenied, NotAuthenticated)
        detail = response.data.get("detail", response.data) if isinstance(response.data, dict) else response.data
        
        if isinstance(detail, dict):
            # Grab all error detail messages
            error_msgs = []
            for key, val in detail.items():
                if isinstance(val, list) and len(val) > 0:
                    error_msgs.append(f"{key}: {val[0]}")
                else:
                    error_msgs.append(f"{key}: {val}")
            detail_msg = ", ".join(error_msgs)
        elif isinstance(detail, list) and len(detail) > 0:
            detail_msg = str(detail[0])
        else:
            detail_msg = str(detail)
            
        code = getattr(exc, "default_code", "error")
        if code == "invalid":
            code = "validation_error"
            
        # Handle simple-jwt custom error codes if present
        if hasattr(exc, 'detail') and isinstance(exc.detail, dict) and 'code' in exc.detail:
            code = exc.detail['code']
            
        response.data = {
            "error": code,
            "detail": detail_msg
        }

    return response
