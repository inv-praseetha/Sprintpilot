import json
from unittest.mock import patch
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from accounts.models import Employee, EmployeeProfile
from project.models import Project, ProjectMember
from sprints.models import Sprint, SprintTask
from jira_integration.models import JiraOAuthToken

class JiraIntegrationViewsTest(APITestCase):
    def setUp(self):
        # Create user & employee
        self.user = Employee.objects.create(
            email='test@example.com',
            full_name='Test User',
            role='ENGINEER'
        )
        self.employee = EmployeeProfile.objects.create(
            user=self.user,
            designation='Engineer',
            experience_years=3.0,
            availability_percentage=100
        )
        
        # Create Project
        self.project = Project.objects.create(name='Test Project', description='Test Desc', project_id='TEST', jira_id='TEST', created_by=self.user)
        ProjectMember.objects.create(project=self.project, employee_profile=self.employee)
        
        # Create Sprint
        self.sprint = Sprint.objects.create(
            project=self.project,
            milestone='Sprint 1',
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=14),
            status='ACTIVE'
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @patch('jira_integration.views.config')
    def test_jira_auth_url_success(self, mock_config):
        mock_config.side_effect = lambda k, default=None: 'test_value' if k in ['JIRA_CLIENT_ID', 'JIRA_REDIRECT_URI'] else default
        
        url = reverse('jira_auth_url')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('auth_url', response.data)

    @patch('jira_integration.views.config')
    def test_jira_auth_url_not_configured(self, mock_config):
        mock_config.return_value = None
        
        url = reverse('jira_auth_url')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_501_NOT_IMPLEMENTED)

    @patch('jira_integration.views.config')
    @patch('jira_integration.views.requests.post')
    @patch('jira_integration.views.requests.get')
    def test_jira_token_exchange_success(self, mock_get, mock_post, mock_config):
        mock_config.side_effect = lambda k, default=None: 'test_value'
        
        # Mock POST to auth token
        mock_post_response = mock_post.return_value
        mock_post_response.status_code = 200
        mock_post_response.json.return_value = {
            "access_token": "acc_tok",
            "refresh_token": "ref_tok",
            "expires_in": 3600
        }
        
        # Mock GET to accessible resources
        mock_get_response = mock_get.return_value
        mock_get_response.status_code = 200
        mock_get_response.json.return_value = [{"id": "cloud123", "url": "https://test.atlassian.net"}]
        
        url = reverse('jira_token_exchange')
        response = self.client.post(url, {'code': 'authcode123'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(JiraOAuthToken.objects.filter(cloud_id='cloud123').exists())

    def test_jira_token_exchange_no_code(self):
        url = reverse('jira_token_exchange')
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch('jira_integration.views.requests.post')
    def test_jira_fetch_tasks_success(self, mock_post):
        # Create token
        JiraOAuthToken.objects.create(
            access_token='acc_tok',
            refresh_token='ref_tok',
            cloud_id='cloud123',
            expires_at=timezone.now() + timezone.timedelta(days=1)
        )
        
        mock_response = mock_post.return_value
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "issues": [
                {
                    "key": "TEST-1",
                    "fields": {
                        "summary": "Task 1",
                        "issuetype": {"name": "Bug"},
                        "description": "A bug task"
                    }
                }
            ]
        }
        
        url = reverse('jira_fetch_tasks')
        response = self.client.post(url, {'project_key': 'TEST', 'sprint_name': 'Sprint 1'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['tasks']), 1)
        self.assertEqual(response.data['tasks'][0]['jiraId'], 'TEST-1')
        self.assertEqual(response.data['tasks'][0]['category'], 'QA')

    def test_jira_fetch_tasks_missing_data(self):
        url = reverse('jira_fetch_tasks')
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_jira_fetch_tasks_no_token(self):
        url = reverse('jira_fetch_tasks')
        response = self.client.post(url, {'project_key': 'TEST', 'sprint_name': 'Sprint 1'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('jira_integration.views.requests.post')
    def test_jira_sprint_sync_success(self, mock_post):
        JiraOAuthToken.objects.create(
            access_token='acc_tok',
            refresh_token='ref_tok',
            cloud_id='cloud123',
            expires_at=timezone.now() + timezone.timedelta(days=1)
        )
        
        mock_response = mock_post.return_value
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "issues": [
                {
                    "key": "TEST-2",
                    "fields": {
                        "summary": "Backend Task",
                        "issuetype": {"name": "Backend"},
                        "description": "Backend implementation"
                    }
                }
            ]
        }
        
        url = reverse('jira_sync_sprint', kwargs={'sprint_id': str(self.sprint.id)})
        response = self.client.post(url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['tasks']), 1)
        self.assertEqual(response.data['tasks'][0]['category'], 'BACKEND')

    def test_jira_sprint_append_success(self):
        url = reverse('jira_append_tasks', kwargs={'sprint_id': str(self.sprint.id)})
        
        # Calculate valid weekday dates
        import datetime
        start_date = timezone.now().date()
        while start_date.weekday() >= 5:
            start_date += datetime.timedelta(days=1)
        end_date = start_date + datetime.timedelta(days=1)
        while end_date.weekday() >= 5:
            end_date += datetime.timedelta(days=1)

        tasks_data = [
            {
                "title": "New Task",
                "description": "Desc",
                "category": "UI",
                "status": "OPEN",
                "priority": "Normal",
                "jiraId": "TEST-100",
                "startDate": start_date.isoformat(),
                "endDate": end_date.isoformat(),
                "assignee": str(self.employee.id)
            }
        ]
        
        response = self.client.post(url, {'sprint_name': 'Sprint 1', 'tasks': tasks_data}, format='json')
        print("Success Test Response:", response.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(SprintTask.objects.count(), 1)
        
        task = SprintTask.objects.first()
        self.assertEqual(task.title, "New Task")
        self.assertEqual(task.jira_id, "TEST-100")
        
    def test_jira_sprint_append_validation_error(self):
        url = reverse('jira_append_tasks', kwargs={'sprint_id': str(self.sprint.id)})
        
        # End date before start date to trigger validation error
        tasks_data = [
            {
                "title": "Invalid Task",
                "description": "Desc",
                "category": "UI",
                "status": "OPEN",
                "priority": "Normal",
                "startDate": (timezone.now().date() + timezone.timedelta(days=2)).isoformat(),
                "endDate": timezone.now().date().isoformat(),
            }
        ]
        
        response = self.client.post(url, {'sprint_name': 'Sprint 1', 'tasks': tasks_data}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(SprintTask.objects.count(), 0)

    def test_jira_sprint_append_no_sprint_name(self):
        url = reverse('jira_append_tasks', kwargs={'sprint_id': str(self.sprint.id)})
        response = self.client.post(url, {'tasks': []}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Jira Sprint Name is required", response.data['detail'])
