from django.test import TestCase
from django.utils import timezone
from jira_integration.models import JiraOAuthToken

class JiraOAuthTokenModelTest(TestCase):
    def test_jira_oauth_token_creation(self):
        token = JiraOAuthToken.objects.create(
            access_token="test_access",
            refresh_token="test_refresh",
            cloud_id="test_cloud_id",
            workspace_url="https://test.atlassian.net",
            expires_at=timezone.now()
        )
        self.assertEqual(str(token), "Jira Token (Cloud ID: test_cloud_id)")
        self.assertEqual(token.access_token, "test_access")
