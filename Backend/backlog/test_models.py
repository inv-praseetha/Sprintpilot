from django.test import TestCase
from project.models import Project
from backlog.models import BacklogCategory
from accounts.models import Employee

class BacklogCategoryModelTests(TestCase):
    def setUp(self):
        # Create an Employee to act as project creator
        self.employee = Employee.objects.create(
            email="manager_backlog@example.com",
            full_name="Project Manager",
            role=Employee.Role.PROJECT_MANAGER
        )
        
        # Create a Project
        self.project = Project.objects.create(
            project_id="PROJ-123",
            name="Backlog Project",
            description="A test project for backlog tests",
            created_by=self.employee,
            status=Project.Status.ACTIVE,
            type=Project.Type.AGILE,
            team_size=5
        )
        
    def test_backlog_category_creation_and_str(self):
        """Test that a BacklogCategory can be created and __str__ returns the expected format."""
        category = BacklogCategory.objects.create(
            project=self.project,
            name="Bug",
            backlog_category_id="CAT-123"
        )
        
        # Verify str representation
        expected_str = f"Backlog Project - Bug"
        self.assertEqual(str(category), expected_str)
        
        # Verify fields were saved properly
        self.assertEqual(category.name, "Bug")
        self.assertEqual(category.project, self.project)
        self.assertEqual(category.backlog_category_id, "CAT-123")
