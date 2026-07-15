from accounts.models import Employee, EmployeeProfile
from project.models import Skill
from project.exceptions import ProjectValidationException

def validate_project_dates(project_type: str, start_date, end_date) -> None:
    """
    Validates project dates based on project type.
    """
    if not start_date or not end_date:
        raise ProjectValidationException(f"start_date and end_date are required.")
    if end_date <= start_date:
        raise ProjectValidationException("end_date must be greater than start_date.")


def validate_team_lead(team_lead_id) -> Employee:
    """
    Validates that the team lead exists, is active, and has the role of TEAM_LEAD.
    """
    if not team_lead_id:
        raise ProjectValidationException("team_lead is required.")
        
    try:
        lead = Employee.objects.get(id=team_lead_id)
    except (Employee.DoesNotExist, ValueError, TypeError):
        raise ProjectValidationException("Selected Team Lead does not exist.")

    if not lead.is_active:
        raise ProjectValidationException("Selected Team Lead is not active.")

    if lead.role != Employee.Role.TEAM_LEAD:
        raise ProjectValidationException("Selected Team Lead must have the role of Team Lead.")

    return lead


def validate_members(member_ids: list) -> list[EmployeeProfile]:
    """
    Validates that all member profiles exist, their users are active, and contain no duplicates.
    """
    if not member_ids:
        return []

    # Check for duplicates in the input list
    if len(member_ids) != len(set(member_ids)):
        raise ProjectValidationException("Duplicate members are not allowed.")

    # Bulk query to avoid N+1 query issue
    profiles = list(EmployeeProfile.objects.select_related("user").filter(id__in=member_ids))
    if len(profiles) != len(member_ids):
        raise ProjectValidationException("One or more selected member profiles do not exist.")

    for profile in profiles:
        if not profile.user.is_active:
            raise ProjectValidationException(f"Employee '{profile.user.full_name}' is not active.")

    return profiles


def validate_skills(skill_ids: list) -> list[Skill]:
    """
    Validates that all selected skills exist and contain no duplicates.
    """
    if not skill_ids:
        return []

    # Check for duplicates in the input list
    if len(skill_ids) != len(set(skill_ids)):
        raise ProjectValidationException("Duplicate skills are not allowed.")

    # Bulk query
    skills = list(Skill.objects.filter(id__in=skill_ids))
    if len(skills) != len(skill_ids):
        raise ProjectValidationException("One or more selected skills do not exist.")

    return skills
