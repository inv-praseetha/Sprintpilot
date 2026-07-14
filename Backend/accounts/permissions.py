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
