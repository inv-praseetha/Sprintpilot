from django.test import TestCase
from django.core.exceptions import ValidationError
from accounts.models import Employee, EmployeeProfile
from project.models import Skill
from project.validators import (
    validate_project_dates,
    validate_team_lead,
    validate_members,
    validate_skills
)
from project.exceptions import ProjectValidationException
import datetime

class ValidatorsTests(TestCase):
    def setUp(self):
        self.team_lead = Employee.objects.create(
            email="lead@example.com",
            full_name="Lead Name",
            role="TEAM_LEAD",
            is_active=True
        )
        self.regular_member = Employee.objects.create(
            email="emp@example.com",
            full_name="Emp Name",
            role="TEAM_MEMBER",
            is_active=True
        )
        self.inactive_member = Employee.objects.create(
            email="inactive@example.com",
            full_name="Inactive Name",
            role="TEAM_MEMBER",
            is_active=False
        )
        self.lead_profile, _ = EmployeeProfile.objects.get_or_create(user=self.team_lead, defaults={"experience_years": 5.0, "designation": "Lead"})
        self.member_profile, _ = EmployeeProfile.objects.get_or_create(user=self.regular_member, defaults={"experience_years": 3.0, "designation": "Dev"})
        self.inactive_profile, _ = EmployeeProfile.objects.get_or_create(user=self.inactive_member, defaults={"experience_years": 1.0, "designation": "Intern"})
        
        self.skill = Skill.objects.create(name="Python", category="BACKEND")

    def test_validate_project_dates(self):
        start = datetime.date(2023, 1, 1)
        end = datetime.date(2023, 1, 10)
        validate_project_dates("AGILE", start, end)  # should pass
        
        with self.assertRaises(ProjectValidationException):
            validate_project_dates("AGILE", None, end)
            
        with self.assertRaises(ProjectValidationException):
            validate_project_dates("AGILE", start, start)

    def test_validate_team_lead(self):
        lead = validate_team_lead(self.team_lead.id)
        self.assertEqual(lead, self.team_lead)
        
        with self.assertRaises(ProjectValidationException):
            validate_team_lead(None)
            
        with self.assertRaises(ProjectValidationException):
            validate_team_lead("invalid-uuid")
            
        self.team_lead.is_active = False
        self.team_lead.save()
        with self.assertRaises(ProjectValidationException):
            validate_team_lead(self.team_lead.id)
            
        self.team_lead.is_active = True
        self.team_lead.role = "TEAM_MEMBER"
        self.team_lead.save()
        with self.assertRaises(ProjectValidationException):
            validate_team_lead(self.team_lead.id)

    def test_validate_members(self):
        members = validate_members([self.member_profile.id])
        self.assertEqual(list(members), [self.member_profile])
        
        self.assertEqual(validate_members([]), [])
        
        with self.assertRaises(ProjectValidationException):
            validate_members([self.member_profile.id, self.member_profile.id])
            
        with self.assertRaises(ProjectValidationException):
            validate_members(["invalid-uuid"])
            
        with self.assertRaises(ProjectValidationException):
            validate_members([self.inactive_profile.id])
            
        with self.assertRaises(ProjectValidationException):
            validate_members([self.lead_profile.id])

    def test_validate_skills(self):
        skills = validate_skills([self.skill.id])
        self.assertEqual(list(skills), [self.skill])
        
        self.assertEqual(validate_skills([]), [])
        
        with self.assertRaises(ProjectValidationException):
            validate_skills([self.skill.id, self.skill.id])
            
        with self.assertRaises(ProjectValidationException):
            validate_skills(["invalid-uuid"])
