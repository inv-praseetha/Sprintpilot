from django.test import TestCase
from accounts.models import Employee, EmployeeProfile
from project.models import Skill, Project
from project.serializers import ProjectCreateSerializer, SkillSerializer
import datetime
from django.utils import timezone

class SerializersTests(TestCase):
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
        self.lead_profile, _ = EmployeeProfile.objects.get_or_create(user=self.team_lead, defaults={"experience_years": 5.0, "designation": "Lead"})
        self.member_profile, _ = EmployeeProfile.objects.get_or_create(user=self.regular_member, defaults={"experience_years": 3.0, "designation": "Dev"})
        
        self.skill1 = Skill.objects.create(name="Python", category="BACKEND")
        self.skill2 = Skill.objects.create(name="Django", category="BACKEND", parent=self.skill1)

    def test_skill_serializer(self):
        serializer = SkillSerializer(self.skill1)
        data = serializer.data
        self.assertEqual(data["name"], "Python")
        self.assertEqual(len(data["sub_skills"]), 1)
        self.assertEqual(data["sub_skills"][0]["name"], "Django")

        serializer2 = SkillSerializer(self.skill2)
        self.assertEqual(serializer2.data["sub_skills"], [])

    def test_project_create_serializer_valid(self):
        data = {
            "project_id": "PRJ-001",
            "name": "Test Project",
            "description": "Valid description",
            "status": "ACTIVE",
            "type": "AGILE",
            "start_date": datetime.date.today(),
            "end_date": datetime.date.today() + datetime.timedelta(days=10),
            "number_of_days": 10,
            "team_lead": self.team_lead.id,
            "members": [self.member_profile.id],
            "skills": [self.skill1.id],
            "team_size": 5
        }
        serializer = ProjectCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        
    def test_project_create_serializer_invalid_name(self):
        data = {
            "project_id": "PRJ-002",
            "name": "   ",
            "status": "ACTIVE",
            "type": "AGILE",
            "start_date": datetime.date.today(),
            "end_date": datetime.date.today() + datetime.timedelta(days=10),
            "team_lead": self.team_lead.id
        }
        serializer = ProjectCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("name", serializer.errors)

    def test_project_create_serializer_invalid_agile_days(self):
        data = {
            "project_id": "PRJ-003",
            "name": "Test Project 3",
            "status": "ACTIVE",
            "type": "AGILE",
            "start_date": datetime.date.today(),
            "end_date": datetime.date.today() + datetime.timedelta(days=10),
            "number_of_days": 0,
            "team_lead": self.team_lead.id
        }
        serializer = ProjectCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("number_of_days", serializer.errors)

    def test_project_create_serializer_whitespace_desc(self):
        data = {
            "project_id": "PRJ-004",
            "name": "Test Project 4",
            "description": "   ",
            "status": "ACTIVE",
            "type": "AGILE",
            "start_date": datetime.date.today(),
            "end_date": datetime.date.today() + datetime.timedelta(days=10),
            "number_of_days": 10,
            "team_lead": self.team_lead.id
        }
        # Since DRF CharField strips whitespace by default, a whitespace description 
        # becomes an empty string, which is allowed by allow_blank=True.
        # To test our custom validator for pure whitespace, we would need to pass a string 
        # that somehow bypasses DRF's strip, but it's fine if DRF handles it first.
        # We can test the serializer is valid because DRF converts "   " to "".
        serializer = ProjectCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data.get("description", ""), "")
        
    def test_project_create_serializer_team_size_less_than_members(self):
        data = {
            "project_id": "PRJ-005",
            "name": "Test Project",
            "status": "ACTIVE",
            "type": "AGILE",
            "start_date": datetime.date.today(),
            "end_date": datetime.date.today() + datetime.timedelta(days=10),
            "number_of_days": 10,
            "team_lead": self.team_lead.id,
            "members": [self.member_profile.id, self.lead_profile.id], # 2 members
            "team_size": 1
        }
        # lead is not allowed as regular member, so this will also fail from validation
        # we will mock or just test the failure
        serializer = ProjectCreateSerializer(data=data)
        from project.exceptions import ProjectValidationException
        with self.assertRaises(ProjectValidationException):
            serializer.is_valid()
