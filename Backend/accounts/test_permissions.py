from django.test import TestCase
from rest_framework.test import APIRequestFactory
from django.contrib.auth.models import AnonymousUser
from accounts.models import Employee
from accounts.permissions import IsProjectManager, IsTeamLead, IsProjectManagerOrTeamLead

class PermissionsTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        
        self.pm_user = Employee(email="pm@example.com", role=Employee.Role.PROJECT_MANAGER)
        
        self.tl_user = Employee(email="tl@example.com", role=Employee.Role.TEAM_LEAD)
        
        self.dev_user = Employee(email="dev@example.com", role=Employee.Role.ENGINEER)
        
        self.unauth_user = AnonymousUser()

    def test_is_project_manager_permission(self):
        permission = IsProjectManager()
        
        # Test PM User
        request = self.factory.get('/')
        request.user = self.pm_user
        self.assertTrue(permission.has_permission(request, None))
        
        # Test TL User
        request.user = self.tl_user
        self.assertFalse(permission.has_permission(request, None))
        
        # Test Unauthenticated User
        request.user = self.unauth_user
        self.assertFalse(permission.has_permission(request, None))
        
        # Test No User
        request.user = None
        self.assertFalse(permission.has_permission(request, None))

    def test_is_team_lead_permission(self):
        permission = IsTeamLead()
        
        # Test TL User
        request = self.factory.get('/')
        request.user = self.tl_user
        self.assertTrue(permission.has_permission(request, None))
        
        # Test PM User
        request.user = self.pm_user
        self.assertFalse(permission.has_permission(request, None))

    def test_is_project_manager_or_team_lead_permission(self):
        permission = IsProjectManagerOrTeamLead()
        
        # Test PM User
        request = self.factory.get('/')
        request.user = self.pm_user
        self.assertTrue(permission.has_permission(request, None))
        
        # Test TL User
        request.user = self.tl_user
        self.assertTrue(permission.has_permission(request, None))
        
        # Test Dev User
        request.user = self.dev_user
        self.assertFalse(permission.has_permission(request, None))
