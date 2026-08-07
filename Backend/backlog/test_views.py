import uuid
from unittest.mock import patch, MagicMock
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from django.utils import timezone
from datetime import timedelta

from accounts.models import Employee, EmployeeProfile
from project.models import Project, ProjectMember
from sprints.models import Sprint, SprintTask

class SprintSyncBacklogViewTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Create user & authenticate
        self.user = Employee.objects.create(
            email="manager@example.com",
            full_name="Project Manager",
            role=Employee.Role.PROJECT_MANAGER
        )
        self.profile = EmployeeProfile.objects.create(user=self.user, experience_years=0)
        self.client.force_authenticate(user=self.user)
        
        # Create project
        self.project = Project.objects.create(
            project_id="PROJ-1",
            name="Test Project",
            created_by=self.user,
            status=Project.Status.ACTIVE,
            type=Project.Type.AGILE,
            team_size=5
        )
        
        # Make employee a project member
        ProjectMember.objects.create(
            project=self.project,
            employee_profile=self.profile
        )
        
        # Calculate a safe base date (next Monday)
        base_date = timezone.now().date()
        if base_date.weekday() >= 5:
            base_date += timedelta(days=(7 - base_date.weekday()))

        # Create sprint
        self.sprint = Sprint.objects.create(
            project=self.project,
            milestone="Sprint 1",
            start_date=base_date,
            end_date=base_date + timedelta(days=14),
            status=Sprint.Status.ACTIVE
        )
        
        # Create task
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
            planned_end_date=task_end_date
        )
        
        # Helper to generate URL
        self.url = f'/api/sprints/{self.sprint.id}/sync-backlog/'

    def test_sync_sprint_not_found(self):
        url = f'/api/sprints/{uuid.uuid4()}/sync-backlog/'
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_sync_completed_project(self):
        self.project.status = Project.Status.COMPLETED
        self.project.save()
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('backlog.services.backlog_client.BacklogService')
    def test_sync_configuration_error(self, MockBacklogService):
        MockBacklogService.side_effect = Exception("Invalid Config")
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn("Configuration error", response.data['detail'])

    @patch('backlog.services.backlog_client.BacklogService')
    def test_sync_resolve_project_exception(self, MockBacklogService):
        mock_service = MagicMock()
        MockBacklogService.return_value = mock_service
        mock_service._resolve_project_and_issue_type.side_effect = Exception("Resolve Error")
        
        mock_service.sync_task.return_value = "TASK-1"
        
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.task1.refresh_from_db()
        self.assertEqual(self.task1.backlog_task_id, "TASK-1")

    @patch('backlog.services.backlog_client.BacklogService')
    def test_sync_creates_new_task(self, MockBacklogService):
        mock_service = MagicMock()
        MockBacklogService.return_value = mock_service
        mock_service._resolve_project_and_issue_type.return_value = (123, 456)
        mock_service._get_or_create_version.return_value = 789
        
        mock_service.sync_task.return_value = "TASK-1"
        
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.sprint.refresh_from_db()
        self.assertEqual(self.sprint.backlog_project_id, "123")
        self.assertEqual(self.sprint.backlog_version_id, "789")
        
        self.task1.refresh_from_db()
        self.assertEqual(self.task1.backlog_task_id, "TASK-1")
        self.assertIsNotNone(self.task1.synced_at)
        
        self.assertIn("Created 1 new tasks", response.data['detail'])

    @patch('backlog.services.backlog_client.BacklogService')
    def test_sync_create_task_fails(self, MockBacklogService):
        mock_service = MagicMock()
        MockBacklogService.return_value = mock_service
        mock_service._resolve_project_and_issue_type.return_value = (123, 456)
        
        mock_service.sync_task.side_effect = Exception("API Error")
        
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertIn("1 tasks failed", response.data['detail'])

    @patch('backlog.services.backlog_client.BacklogService')
    def test_sync_updates_task(self, MockBacklogService):
        self.task1.backlog_task_id = "TASK-1"
        self.task1.synced_at = timezone.now() - timedelta(days=1)
        self.task1.save()
        
        # Mock updated_at slightly after synced_at
        SprintTask.objects.filter(id=self.task1.id).update(updated_at=timezone.now())
        
        mock_service = MagicMock()
        MockBacklogService.return_value = mock_service
        mock_service._resolve_project_and_issue_type.return_value = (None, None)
        
        mock_service.update_task.return_value = "TASK-1"
        
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Updated 1 tasks", response.data['detail'])

    @patch('backlog.services.backlog_client.BacklogService')
    def test_sync_up_to_date_task_skipped(self, MockBacklogService):
        self.task1.backlog_task_id = "TASK-1"
        # Make synced_at > updated_at
        self.task1.synced_at = timezone.now() + timedelta(days=1)
        self.task1.save()
        
        mock_service = MagicMock()
        MockBacklogService.return_value = mock_service
        mock_service._resolve_project_and_issue_type.return_value = (None, None)
        
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("1 tasks were already up-to-date", response.data['detail'])
        mock_service.update_task.assert_not_called()

    @patch('backlog.services.backlog_client.BacklogService')
    def test_sync_update_no_changes_detected(self, MockBacklogService):
        self.task1.backlog_task_id = "TASK-1"
        self.task1.synced_at = timezone.now() - timedelta(days=1)
        self.task1.save()
        
        SprintTask.objects.filter(id=self.task1.id).update(updated_at=timezone.now())
        
        mock_service = MagicMock()
        MockBacklogService.return_value = mock_service
        mock_service._resolve_project_and_issue_type.return_value = (None, None)
        
        mock_service.update_task.side_effect = Exception("NO_CHANGES_DETECTED")
        
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("1 tasks were already up-to-date", response.data['detail'])

    @patch('backlog.services.backlog_client.BacklogService')
    def test_sync_update_fails_other_error(self, MockBacklogService):
        self.task1.backlog_task_id = "TASK-1"
        self.task1.synced_at = timezone.now() - timedelta(days=1)
        self.task1.save()
        
        SprintTask.objects.filter(id=self.task1.id).update(updated_at=timezone.now())
        
        mock_service = MagicMock()
        MockBacklogService.return_value = mock_service
        mock_service._resolve_project_and_issue_type.return_value = (None, None)
        
        mock_service.update_task.side_effect = Exception("API Error")
        
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertIn("1 tasks failed", response.data['detail'])

    @patch('backlog.services.backlog_client.BacklogService')
    def test_sync_with_task_ids_filter(self, MockBacklogService):
        # Calculate a safe base date (next Monday)
        base_date = timezone.now().date()
        if base_date.weekday() >= 5:
            base_date += timedelta(days=(7 - base_date.weekday()))
            
        task_end_date = base_date + timedelta(days=2)
        if task_end_date.weekday() >= 5:
            task_end_date -= timedelta(days=2)
            
        # Create another task
        task2 = SprintTask.objects.create(
            sprint=self.sprint,
            title="Task 2",
            priority=SprintTask.Priority.NORMAL,
            description="Test description",
            category=SprintTask.Category.UI,
            status=SprintTask.Status.OPEN,
            assigned_employee=self.profile,
            planned_start_date=base_date,
            planned_end_date=task_end_date
        )
        
        mock_service = MagicMock()
        MockBacklogService.return_value = mock_service
        mock_service._resolve_project_and_issue_type.return_value = (None, None)
        mock_service.sync_task.return_value = "TASK-ID"
        
        # Send only task1 id
        response = self.client.post(self.url, {"task_ids": [self.task1.id]}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.assertEqual(mock_service.sync_task.call_count, 1)
