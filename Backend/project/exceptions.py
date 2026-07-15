from rest_framework.exceptions import APIException
from rest_framework import status

class ProjectValidationException(APIException):
    """
    Exception raised for project business logic validation failures.
    Returns HTTP 400 Bad Request.
    """
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid project data."
    default_code = "validation_error"
