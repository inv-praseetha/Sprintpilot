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

    @patch('backlog.services.backlog_sync_service.BacklogService')
    def test_sync_sprint_comments(self, MockBacklogService):
        mock_instance = MockBacklogService.return_value
        # 3 valid comments, 1 empty
        mock_instance.get_issue_comments.return_value = [
            {"id": 101, "content": "First comment", "created": "2026-08-11T10:00:00Z"},
            {"id": 102, "content": "Second comment", "created": "2026-08-11T11:00:00Z"},
            {"id": 103, "content": "", "created": "2026-08-11T12:00:00Z"}, # Empty content
            {"id": 104, "content": "Third comment", "created": "2026-08-11T13:00:00Z"},
        ]
        
        self.task1.read_comment_count = 1
        self.task1.save()
        
        updated_counts = self.service.sync_sprint_comments(self.sprint)
        
        self.task1.refresh_from_db()
        self.assertEqual(self.task1.comment_count, 3)
        self.assertEqual(self.task1.first_unread_comment_id, "102")
        self.assertEqual(updated_counts[str(self.task1.id)]["count"], 3)
        self.assertEqual(updated_counts[str(self.task1.id)]["first_unread_id"], "102")

    @patch('backlog.services.backlog_sync_service.BacklogService')
    def test_sync_sprint_comments_all_read(self, MockBacklogService):
        mock_instance = MockBacklogService.return_value
        mock_instance.get_issue_comments.return_value = [
            {"id": 101, "content": "First comment", "created": "2026-08-11T10:00:00Z"},
            {"id": 102, "content": "Second comment", "created": "2026-08-11T11:00:00Z"},
        ]
        
        self.task1.read_comment_count = 2
        self.task1.save()
        
        updated_counts = self.service.sync_sprint_comments(self.sprint)
        
        self.task1.refresh_from_db()
        self.assertEqual(self.task1.comment_count, 2)
        self.assertIsNone(self.task1.first_unread_comment_id)
        self.assertEqual(updated_counts[str(self.task1.id)]["count"], 2)
        self.assertIsNone(updated_counts[str(self.task1.id)]["first_unread_id"])

from backlog.services.backlog_client import BacklogService

class TestBacklogClientService(TestCase):
    def setUp(self):
        self.service = BacklogService(project_key="PROJ")
        self.service.workspace_url = "https://example.backlog.com"
        self.service.api_key = "test_key"
        self.service.issue_type_id = "1"

    @patch('backlog.services.backlog_client.requests.get')
    def test_get_project_issue_types(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = [{"id": 1, "name": "Task", "projectId": 123}]
        mock_get.return_value = mock_response

        result = self.service.get_project_issue_types()
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["id"], 1)

    @patch.object(BacklogService, 'get_project_issue_types')
    def test_resolve_project_and_issue_type(self, mock_get_types):
        mock_get_types.return_value = [{"id": 1, "name": "Task", "projectId": 123}]
        
        project_id, issue_type_id = self.service._resolve_project_and_issue_type()
        self.assertEqual(project_id, 123)
        self.assertEqual(issue_type_id, 1)

    @patch('backlog.services.backlog_client.requests.get')
    @patch('backlog.services.backlog_client.requests.post')
    def test_get_or_create_version(self, mock_post, mock_get):
        # First try GET where version doesn't exist, then POST creates it
        mock_get_response = MagicMock()
        mock_get_response.json.return_value = []
        mock_get.return_value = mock_get_response

        mock_post_response = MagicMock()
        mock_post_response.json.return_value = {"id": 100}
        mock_post.return_value = mock_post_response

        version_id = self.service._get_or_create_version(123, "Sprint 1")
        self.assertEqual(version_id, 100)

    @patch('backlog.services.backlog_client.requests.get')
    def test_get_assignee_id(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = [{"id": 5, "mailAddress": "test@example.com"}]
        mock_get.return_value = mock_response

        assignee_id = self.service._get_assignee_id("test@example.com")
        self.assertEqual(assignee_id, 5)

    @patch('backlog.services.backlog_client.requests.get')
    def test_fetch_project_categories(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = [{"id": 10, "name": "UI"}]
        mock_get.return_value = mock_response
        
        cats = self.service.fetch_project_categories()
        self.assertEqual(cats[0]["name"], "UI")

    @patch.object(BacklogService, '_get_or_create_version')
    @patch.object(BacklogService, '_resolve_project_and_issue_type')
    @patch('backlog.services.backlog_client.requests.post')
    def test_sync_task(self, mock_post, mock_resolve, mock_version):
        mock_version.return_value = 100
        mock_resolve.return_value = (123, 1)
        mock_post_response = MagicMock()
        mock_post_response.json.return_value = {"issueKey": "PROJ-1"}
        mock_post.return_value = mock_post_response
        
        # Need a dummy task object
        task = MagicMock()
        task.title = "Test"
        task.description = "Test Desc"
        task.planned_start_date = None
        task.planned_end_date = None
        task.estimated_hours = None
        task.priority = 'NORMAL'
        task.status = 'OPEN'
        task.assigned_employee = None
        task.category = None
        mock_sprint = MagicMock()
        mock_sprint.milestone = "Sprint 1"
        mock_sprint.backlog_version_id = None
        task.sprint = mock_sprint
        task.jira_id = None
        
        issue_key = self.service.sync_task(task)
        self.assertEqual(issue_key, "PROJ-1")

    @patch.object(BacklogService, '_get_or_create_version')
    @patch.object(BacklogService, '_resolve_project_and_issue_type')
    @patch('backlog.services.backlog_client.requests.patch')
    def test_update_task(self, mock_patch, mock_resolve, mock_version):
        mock_version.return_value = 100
        mock_resolve.return_value = (123, 1)
        mock_patch_response = MagicMock()
        mock_patch_response.json.return_value = {"issueKey": "PROJ-2"}
        mock_patch.return_value = mock_patch_response

        task = MagicMock()
        task.backlog_task_id = "PROJ-2"
        task.title = "Test"
        task.description = "Test Desc"
        task.planned_start_date = None
        task.planned_end_date = None
        task.estimated_hours = None
        task.priority = 'NORMAL'
        task.status = 'OPEN'
        task.assigned_employee = None
        task.category = None
        mock_sprint = MagicMock()
        mock_sprint.milestone = "Sprint 1"
        mock_sprint.backlog_version_id = None
        task.sprint = mock_sprint
        task.jira_id = None

        issue_key = self.service.update_task(task)
        self.assertEqual(issue_key, "PROJ-2")

    @patch('backlog.services.backlog_client.requests.delete')
    def test_delete_issue(self, mock_delete):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_delete.return_value = mock_response

        result = self.service.delete_issue("PROJ-3")
        self.assertTrue(result)

    @patch.object(BacklogService, '_resolve_project_and_issue_type')
    @patch('backlog.services.backlog_client.requests.get')
    def test_fetch_updated_issues(self, mock_get, mock_resolve):
        mock_resolve.return_value = (123, 1)
        mock_response = MagicMock()
        mock_response.json.return_value = [{"issueKey": "PROJ-4"}]
        mock_get.return_value = mock_response
        
        issues = list(self.service.fetch_updated_issues())
        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0]["issueKey"], "PROJ-4")
