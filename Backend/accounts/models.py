import uuid
from django.db import models


class Employee(models.Model):

    class Role(models.TextChoices):
        PROJECT_MANAGER = "PROJECT_MANAGER", "Project Manager"
        TEAM_LEAD = "TEAM_LEAD", "Team Lead"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    google_id = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True
    )

    email = models.EmailField(
        unique=True
    )

    full_name = models.CharField(
        max_length=255
    )

    role = models.CharField(
        max_length=30,
        choices=Role.choices
    )

    is_active = models.BooleanField(
        default=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    @property
    def is_authenticated(self):
        """
        Always returns True. This is used by Django REST framework permissions 
        to verify if the object is an authenticated user.
        """
        return True

    @property
    def is_anonymous(self):
        """
        Always returns False.
        """
        return False

    def __str__(self):
        return f"{self.full_name} ({self.email})"

    class Meta:
        db_table = "employees"