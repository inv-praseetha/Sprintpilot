from django.test import TestCase
from rest_framework.exceptions import APIException
from rest_framework_simplejwt.exceptions import InvalidToken
from accounts.exceptions import custom_exception_handler

class ExceptionsTests(TestCase):
    
    def test_custom_exception_handler_internal_server_error(self):
        """
        Test that an unhandled Exception returns a 500 internal server error response.
        """
        exc = Exception("Something went terribly wrong")
        context = {}
        
        response = custom_exception_handler(exc, context)
        
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["error"], "internal_server_error")
        self.assertEqual(response.data["detail"], "An internal server error occurred.")

    def test_custom_exception_handler_dict_detail_not_list(self):
        """
        Test that a DRF exception with a dict detail where values are strings 
        is formatted correctly.
        """
        class CustomAPIException(APIException):
            status_code = 400
            default_detail = "Bad request"
            default_code = "bad_request"
            
        exc = CustomAPIException(detail={"field_a": "Field A is invalid.", "field_b": []})
        context = {}
        
        response = custom_exception_handler(exc, context)
        
        self.assertEqual(response.status_code, 400)
        self.assertIn("field_a: Field A is invalid.", response.data["detail"])
        self.assertIn("field_b: []", response.data["detail"])

    def test_custom_exception_handler_list_detail(self):
        """
        Test that a DRF exception with a list detail is formatted correctly.
        """
        class CustomAPIException(APIException):
            status_code = 400
            default_detail = "Bad request"
            default_code = "bad_request"
            
        exc = CustomAPIException(detail=["List error 1", "List error 2"])
        context = {}
        
        response = custom_exception_handler(exc, context)
        
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "List error 1")

    def test_custom_exception_handler_simple_jwt_error(self):
        """
        Test that a simple-jwt exception with a code in the dict detail is handled correctly.
        """
        exc = InvalidToken(detail={"detail": "Token is invalid or expired", "code": "token_not_valid"})
        context = {}
        
        response = custom_exception_handler(exc, context)
        
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["error"], "token_not_valid")
        self.assertIn("Token is invalid", response.data["detail"])
