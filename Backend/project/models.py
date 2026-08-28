import uuid
from django.db import models
from accounts.models import Employee
from accounts.models import EmployeeProfile
from django.core.validators import MinValueValidator, MaxValueValidator, MinLengthValidator, MaxLengthValidator

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
    name = models.CharField(max_length=100, unique=True, validators=[MinLengthValidator(3)])
    category = models.CharField(max_length=10, choices=Category.choices, validators=[MinLengthValidator(2)])
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

    from django.core.validators import RegexValidator
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project_id = models.CharField(
        max_length=10, 
        validators=[
            MinLengthValidator(3),
            RegexValidator(regex=r'^[A-Z0-9\-]+$', message="Project ID must be alphanumeric and uppercase.")
        ], 
        unique=True
    )
    jira_id = models.CharField(
        max_length=10, 
        validators=[
            RegexValidator(regex=r'^[A-Z][A-Z0-9]+$', message="Jira ID must start with an uppercase letter and be uppercase alphanumeric.")
        ],
        null=True, 
        blank=True
    )
    jira_board_id = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="The ID of the primary Jira board for this project, used to construct backlog URLs."
    )
    name = models.CharField(max_length=255, validators=[MinLengthValidator(3)])
    description = models.TextField(null=True, blank=True, validators=[MinLengthValidator(10), MaxLengthValidator(5000)])
    created_by = models.ForeignKey(
        Employee, 
        on_delete=models.CASCADE, 
        related_name="created_projects"
    )
    status = models.CharField(
        max_length=9, 
        validators=[MinLengthValidator(6)],
        choices=Status.choices, 
        default=Status.ACTIVE
    )
    type = models.CharField(
        max_length=9, 
        validators=[MinLengthValidator(5)],
        choices=Type.choices
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    number_of_days = models.PositiveIntegerField(null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(365)])
    team_lead = models.ForeignKey(
        Employee, 
        on_delete=models.SET_NULL, 
        related_name="led_projects", 
        null=True, 
        blank=True
    )
    team_size = models.PositiveIntegerField(default=0, validators=[MinValueValidator(1)])
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
