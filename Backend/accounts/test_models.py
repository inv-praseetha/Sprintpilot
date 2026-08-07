from django.test import TestCase
from accounts.models import Employee, EmployeeProfile, BlacklistedEmployeeToken, EmployeeSkill
from project.models import Skill

class EmployeeModelTests(TestCase):
    def setUp(self):
        self.employee = Employee.objects.create(
            email="model_test@example.com",
            full_name="Model Test",
            role=Employee.Role.PROJECT_MANAGER
        )
        
        self.profile = EmployeeProfile.objects.create(
            user=self.employee,
            designation="Tester",
            experience_years=2.0
        )
        
        self.skill = Skill.objects.create(
            name="Django",
            category="BACKEND"
        )
        
        self.employee_skill = EmployeeSkill.objects.create(
            employee=self.profile,
            skill=self.skill,
            proficiency_level=5
        )
        
        self.token = BlacklistedEmployeeToken.objects.create(
            token="dummy_token_abc123"
        )

    def test_employee_str(self):
        self.assertEqual(str(self.employee), "Model Test (model_test@example.com)")

    def test_employee_is_anonymous(self):
        self.assertFalse(self.employee.is_anonymous)

    def test_employee_profile_str(self):
        self.assertEqual(str(self.profile), "Model Test")

    def test_blacklisted_token_str(self):
        self.assertEqual(str(self.token), f"Blacklisted Token {self.token.id}")

    def test_employee_skill_str(self):
        self.assertEqual(str(self.employee_skill), "Model Test - Django (Level 5)")
