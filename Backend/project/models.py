import uuid
from django.db import models
from accounts.models import Employee
from accounts.models import EmployeeProfile

class Skill(models.Model):
    """
    Skill / Tech Stack definition model.
    """
    class Category(models.TextChoices):
        UI = "UI", "UI"
        QA = "QA", "QA"
        INFRA = "INFRA", "INFRA"
        BACKEND = "BACKEND", "Backend"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=30, choices=Category.choices)
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sub_skills'
    )

    class Meta:
        db_table = "skills"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Project(models.Model):
    """
    Project model.
    """
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        ON_HOLD = "ON_HOLD", "On Hold"
        COMPLETED = "COMPLETED", "Completed"

    class Type(models.TextChoices):
        WATERFALL = "WATERFALL", "Waterfall"
        AGILE = "AGILE", "Agile"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(
        Employee, 
        on_delete=models.CASCADE, 
        related_name="created_projects"
    )
    status = models.CharField(
        max_length=30, 
        choices=Status.choices, 
        default=Status.ACTIVE
    )
    type = models.CharField(
        max_length=30, 
        choices=Type.choices
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    number_of_days=models.IntegerField(blank=True,null=True)
    team_lead = models.ForeignKey(
        Employee, 
        on_delete=models.CASCADE, 
        related_name="led_projects", 
        null=True, 
        blank=True
    )
    team_size = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        db_table = "projects"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class ProjectMember(models.Model):
    """
    Maps employees to projects.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="members"
    )

    employee_profile = models.ForeignKey(
        EmployeeProfile,
        on_delete=models.CASCADE,
        related_name="project_memberships"
    )

    class Meta:
        db_table = "project_members"
        unique_together = ("project", "employee_profile")
        ordering = ["project", "employee_profile"]

    def __str__(self):
        return f"{self.project.name} - {self.employee_profile.user.full_name}"



class ProjectStack(models.Model):
    """
    Project Stack / Required Skills mapping table.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        Project, 
        on_delete=models.CASCADE, 
        related_name="project_stack"
    )
    skill = models.ForeignKey(
        Skill, 
        on_delete=models.CASCADE, 
        related_name="project_stack"
    )

    class Meta:
        db_table = "project_stack"
        unique_together = ("project", "skill")
        ordering = ["project", "skill"]

    def __str__(self):
        return f"{self.project.name} - {self.skill.name}"
