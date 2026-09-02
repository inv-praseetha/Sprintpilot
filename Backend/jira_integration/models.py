from django.db import models
from django.conf import settings
from cryptography.fernet import Fernet
import base64

class EncryptedTextField(models.TextField):
    def get_fernet(self):
        # Generate a consistent 32-byte url-safe base64-encoded key using Django's SECRET_KEY
        key = settings.SECRET_KEY.encode('utf-8')[:32]
        key = base64.urlsafe_b64encode(key.ljust(32, b' '))
        return Fernet(key)

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        try:
            return self.get_fernet().decrypt(value.encode('utf-8')).decode('utf-8')
        except Exception:
            return value

    def to_python(self, value):
        return value

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value is None:
            return value
        # Don't re-encrypt if it's already a fernet token (rudimentary check)
        if isinstance(value, str) and value.startswith('gAAAAA'):
            return value
        return self.get_fernet().encrypt(str(value).encode('utf-8')).decode('utf-8')

class JiraOAuthToken(models.Model):
    """
    Stores the Atlassian OAuth 2.0 (3LO) tokens for the application.
    Linked to a specific user to prevent global token sharing.
    """
    user = models.ForeignKey('accounts.Employee', on_delete=models.CASCADE, related_name='jira_tokens', null=True, blank=True)
    access_token = EncryptedTextField()
    refresh_token = EncryptedTextField()
    cloud_id = models.CharField(max_length=255)
    workspace_url = models.URLField(null=True, blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "jira_oauth_tokens"

    def __str__(self):
        return f"Jira Token (Cloud ID: {self.cloud_id})"
