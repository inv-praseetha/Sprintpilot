from rest_framework.permissions import BasePermission
from accounts.models import Employee

class IsProjectManager(BasePermission):
    """
    Allows access only to Project Managers.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == Employee.Role.PROJECT_MANAGER
        )

class IsTeamLead(BasePermission):
    """
    Allows access only to Team/Technical Leads.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == Employee.Role.TEAM_LEAD
        )

class IsProjectManagerOrTeamLead(BasePermission):
    """
    Allows access only to Project Managers and Team/Technical Leads.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in [Employee.Role.PROJECT_MANAGER, Employee.Role.TEAM_LEAD]
        )

class IsPMOrReadOnly(BasePermission):
    """
    Allows read-only access (GET, HEAD, OPTIONS) to authenticated users (including Team Leads),
    but restricts write/mutation requests (POST, PUT, PATCH, DELETE) to Project Managers.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        from rest_framework.permissions import SAFE_METHODS
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == Employee.Role.PROJECT_MANAGER

