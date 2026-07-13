import logging
from django.db import transaction
from django.conf import settings
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Employee
from accounts.exceptions import (
    InvalidGoogleTokenException,
    ExpiredGoogleTokenException,
    UnauthorizedEmployeeException,
    DisabledEmployeeException,
    GoogleAccountMismatchException,
)

logger = logging.getLogger(__name__)


class AuthenticationService:

    @staticmethod
    def verify_google_token(token: str) -> dict:
        """
        Verifies the Google ID token using Google's official library.
        Validates the signature, audience (Client ID), issuer, and expiration time.
        """
        client_id = getattr(settings, "GOOGLE_CLIENT_ID", None)
        if not client_id:
            logger.critical("GOOGLE_CLIENT_ID is not configured in settings.")
            raise InvalidGoogleTokenException("Google Client ID configuration error.")

        try:
            # The verify_oauth2_token method verifies signature, audience, issuer and expiration.
            payload = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                audience=client_id
            )

            # Extra safety check for issuer validation
            issuer = payload.get("iss")
            if issuer not in ["accounts.google.com", "https://accounts.google.com"]:
                logger.warning(f"Google ID token has invalid issuer: {issuer}")
                raise InvalidGoogleTokenException("Invalid token issuer.")

            # Extra safety check for email verification status
            if not payload.get("email_verified"):
                logger.warning("Google ID token has an unverified email address.")
                raise InvalidGoogleTokenException("Google email address is not verified.")

            return payload

        except ValueError as e:
            err_msg = str(e)
            logger.warning(f"Google ID token verification failed: {err_msg}")
            
            # Identify if token has expired
            if "token has expired" in err_msg.lower() or "token is expired" in err_msg.lower():
                raise ExpiredGoogleTokenException("The Google ID token has expired.")
            
            raise InvalidGoogleTokenException("Invalid Google ID token.")
        except Exception as e:
            logger.exception("Unexpected error verifying Google token: %s", str(e))
            raise InvalidGoogleTokenException("Invalid Google ID token.")

    @classmethod
    def authenticate_google_user(cls, token: str) -> tuple[Employee, dict]:
        """
        Main authentication flow service.
        1. Verifies the token payload.
        2. Retrieves the employee by email (unauthorized if email is missing or employee not found).
        3. Validates active status.
        4. Links or checks Google ID (atomic transaction for concurrency safety).
        5. Generates JWT tokens.
        """
        # 1. Verify token
        payload = cls.verify_google_token(token)
        google_id = payload.get("sub")
        email = payload.get("email")

        if not email:
            logger.warning("Google token did not contain an email address.")
            raise InvalidGoogleTokenException("Email missing from Google token payload.")

        # 2. Retrieve Employee by email (case-insensitive query)
        try:
            employee = Employee.objects.get(email__iexact=email)
        except Employee.DoesNotExist:
            # HTTP 403 Forbidden for unregistered email
            logger.warning(f"Unauthorized login attempt: {email} is not in the database.")
            raise UnauthorizedEmployeeException("Employee is not pre-authorized to access this application.")

        # 3. Validate active status
        if not employee.is_active:
            # HTTP 403 Forbidden for disabled employee
            logger.warning(f"Disabled account login attempt: Employee {email} is inactive.")
            raise DisabledEmployeeException("Employee account is disabled.")

        # 4. Link Google ID / Check Google ID mismatch (Atomic row lock check)
        with transaction.atomic():
            # Acquire row lock
            employee = Employee.objects.select_for_update().get(id=employee.id)

            if not employee.google_id:
                # First time login - save the Google sub ID
                employee.google_id = google_id
                employee.save(update_fields=["google_id", "updated_at"])
                logger.info(f"First-time login: Linked Google ID for employee {email}")
            else:
                # Subsequent login - verify Google ID matches
                if employee.google_id != google_id:
                    logger.critical(
                        f"SECURITY ALERT: Google ID mismatch for employee {email}. "
                        f"Stored: {employee.google_id}, Token received: {google_id}."
                    )
                    raise GoogleAccountMismatchException("Google account mismatch detected.")

        # 5. Generate Simple JWT tokens
        tokens = cls.generate_tokens_for_employee(employee)
        
        logger.info(f"Successful Google authentication for employee: {email}")
        return employee, tokens

    @staticmethod
    def generate_tokens_for_employee(employee: Employee) -> dict:
        """
        Generates access and refresh tokens using Simple JWT with custom claims.
        """
        refresh = RefreshToken()
        
        # Inject standard USER_ID claim
        refresh["user_id"] = str(employee.id)
        
        # Custom claims for the Refresh Token
        refresh["id"] = str(employee.id)
        refresh["email"] = employee.email
        refresh["role"] = employee.role

        # Custom claims for the Access Token
        access = refresh.access_token
        access["user_id"] = str(employee.id)
        access["id"] = str(employee.id)
        access["email"] = employee.email
        access["role"] = employee.role

        return {
            "access_token": str(access),
            "refresh_token": str(refresh),
        }
