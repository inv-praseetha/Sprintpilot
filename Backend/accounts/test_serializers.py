from rest_framework.test import APITestCase
from accounts.models import Employee, EmployeeProfile, EmployeeSkill
from project.models import Skill
from accounts.serializers import EmployeeProfileSerializer

class EmployeeProfileSerializerTests(APITestCase):
    def setUp(self):
        # Create an employee
        self.employee = Employee.objects.create(
            email="developer@example.com",
            full_name="Jane Developer",
            role="DEVELOPER",
            is_active=True
        )
        
        # Create a profile
        self.profile = EmployeeProfile.objects.create(
            user=self.employee,
            designation="Senior Developer",
            experience_years=5.0,
            availability_percentage=100.0,
            current_capacity_hours=40.0,
            status="AVAILABLE"
        )
        
        # Create a skill
        self.skill = Skill.objects.create(
            name="Python",
            category="BACKEND",
            description="Python Programming"
        )
        
        # Link skill to profile
        self.employee_skill = EmployeeSkill.objects.create(
            employee=self.profile,
            skill=self.skill,
            proficiency_level=4
        )

    def test_employee_profile_serializer_skills(self):
        """
        Test that EmployeeProfileSerializer correctly serializes the 'skills' field 
        using the get_skills MethodField.
        """
        serializer = EmployeeProfileSerializer(self.profile)
        data = serializer.data
        
        # Check basic fields
        self.assertEqual(data["designation"], "Senior Developer")
        self.assertEqual(data["user"]["email"], "developer@example.com")
        
        # Check skills field
        self.assertIn("skills", data)
        self.assertEqual(len(data["skills"]), 1)
        
        skill_data = data["skills"][0]
        self.assertEqual(skill_data["id"], self.skill.id)
        self.assertEqual(skill_data["name"], "Python")
        self.assertEqual(skill_data["category"], "BACKEND")
        self.assertEqual(skill_data["parent"], None)
        self.assertEqual(skill_data["proficiency_level"], 4)
