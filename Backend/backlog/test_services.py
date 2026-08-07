from django.test import TestCase
from unittest.mock import patch, MagicMock
from django.utils import timezone
from datetime import timedelta

from accounts.models import Employee, EmployeeProfile
from project.models import Project, ProjectMember
from sprints.models import Sprint, SprintTask
from backlog.services.backlog_sync_service import BacklogSyncService

class TestBacklogSyncService(TestCase):
    def setUp(self):
        self.user = Employee.objects.create(
            email="manager@example.com",
            full_name="Project Manager",
            role=Employee.Role.PROJECT_MANAGER
        )
        self.profile = EmployeeProfile.objects.create(user=self.user, experience_years=0)
        
        self.project = Project.objects.create(
            project_id="PROJ-1",
            name="Test Project",
            created_by=self.user,
            status=Project.Status.ACTIVE,
            type=Project.Type.AGILE,
            team_size=5
        )
        
        ProjectMember.objects.create(
            project=self.project,
            employee_profile=self.profile
        )
        
        base_date = timezone.now().date()
        if base_date.weekday() >= 5:
            base_date += timedelta(days=(7 - base_date.weekday()))

        self.sprint = Sprint.objects.create(
            project=self.project,
            milestone="Sprint 1",
            start_date=base_date,
            end_date=base_date + timedelta(days=14),
            status=Sprint.Status.ACTIVE
        )
        
        task_end_date = base_date + timedelta(days=2)
        if task_end_date.weekday() >= 5:
            task_end_date -= timedelta(days=2)
            
        self.task1 = SprintTask.objects.create(
            sprint=self.sprint,
            title="Task 1",
            priority=SprintTask.Priority.NORMAL,
            description="Test description",
            category=SprintTask.Category.UI,
            status=SprintTask.Status.OPEN,
            assigned_employee=self.profile,
            planned_start_date=base_date,
            planned_end_date=task_end_date,
            backlog_task_id="TEST-1"
        )
        self.service = BacklogSyncService()

    @patch('backlog.services.backlog_sync_service.BacklogService')
    def test_sync_daily_updates_success(self, MockBacklogService):
        mock_instance = MockBacklogService.return_value
        mock_instance.fetch_project_categories.return_value = [{'id': 1, 'name': 'Bug'}]
        mock_instance.fetch_updated_issues.return_value = [
            {
                "issueKey": "TEST-1",
                "summary": "Updated Task",
                "status": {"id": 2}, # In Progress
                "priority": {"id": 2}, # High
                "category": [{"id": 1, "name": "Bug"}]
            }
        ]
        
        summary = self.service.sync_daily_updates()
        
        self.assertEqual(summary["status"], "success")
        self.assertEqual(summary["fetched"], 1)
        self.assertEqual(summary["updated"], 1)
        
        self.task1.refresh_from_db()
        self.assertEqual(self.task1.title, "Updated Task")
        self.assertEqual(self.task1.status, SprintTask.Status.IN_PROGRESS)
        self.assertEqual(self.task1.priority, SprintTask.Priority.HIGH)
        self.assertEqual(self.task1.category, "Bug")

    @patch('backlog.services.backlog_sync_service.BacklogService')
    def test_sync_daily_updates_api_failure(self, MockBacklogService):
        mock_instance = MockBacklogService.return_value
        mock_instance.fetch_updated_issues.side_effect = Exception("API Error")
        
        summary = self.service.sync_daily_updates()
        
        self.assertEqual(summary["status"], "success") # API failure is caught and skipped for that project, so overall is success
        self.assertEqual(summary["fetched"], 0)

    @patch('backlog.services.backlog_sync_service.BacklogService')
    def test_sync_daily_updates_skipped(self, MockBacklogService):
        mock_instance = MockBacklogService.return_value
        mock_instance.fetch_project_categories.return_value = []
        mock_instance.fetch_updated_issues.return_value = [
            {
                "issueKey": "TEST-2",
                "summary": "Non-existent Task",
            }
        ]
        
        summary = self.service.sync_daily_updates()
        
        self.assertEqual(summary["status"], "success")
        self.assertEqual(summary["fetched"], 1)
        self.assertEqual(summary["skipped"], 1)
        self.assertEqual(summary["updated"], 0)
