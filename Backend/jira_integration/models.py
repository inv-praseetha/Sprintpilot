from django.db import models

class JiraOAuthToken(models.Model):
    """
    Stores the Atlassian OAuth 2.0 (3LO) tokens for the application.
    Linked to a specific user to prevent global token sharing.
    """
    user = models.ForeignKey('accounts.Employee', on_delete=models.CASCADE, related_name='jira_tokens', null=True, blank=True)
    access_token = models.TextField()
    refresh_token = models.TextField()
    cloud_id = models.CharField(max_length=255)
    workspace_url = models.URLField(null=True, blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "jira_oauth_tokens"

    def __str__(self):
        return f"Jira Token (Cloud ID: {self.cloud_id})"
