import uuid
from django.db import models


class Employee(models.Model):

    class Role(models.TextChoices):
        PROJECT_MANAGER = "PROJECT_MANAGER", "Project Manager"
        TEAM_LEAD = "TEAM_LEAD", "Team Lead"
        ENGINEER = "ENGINEER", 'Engineer'
        

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


class EmployeeProfile(models.Model):
    class Status(models.TextChoices):
        WFM = "WFM", "WFM"
        ACTIVE = "ACTIVE", "Active"
        BUSY = "BUSY", "Busy"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    user = models.OneToOneField(
        Employee,
        on_delete=models.CASCADE,
        related_name="profile"
    )

    designation = models.CharField(
        max_length=150
    )

    experience_years = models.DecimalField(
        max_digits=4,
        decimal_places=1
    )

    availability_percentage = models.PositiveSmallIntegerField(
        default=100
    )

    current_capacity_hours = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=40
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )

    skills = models.ManyToManyField(
        'project.Skill',
        through='EmployeeSkill',
        related_name="employee_profiles",
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        db_table = "employee_profiles"

    def __str__(self):
        return self.user.full_name

class BlacklistedEmployeeToken(models.Model):
    """
    Custom token blacklist for the Employee authentication flow.
    Stores revoked refresh tokens to prevent reuse after logout.
    """
    token = models.CharField(max_length=500, unique=True, db_index=True)
    blacklisted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Blacklisted Token {self.id}"


class EmployeeSkill(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        'EmployeeProfile',
        on_delete=models.CASCADE,
        related_name='employee_skill_relations'
    )
    skill = models.ForeignKey(
        'project.Skill',
        on_delete=models.CASCADE,
        related_name='employee_skill_relations'
    )
    proficiency_level = models.PositiveSmallIntegerField(default=1)  # 1-10
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'employee_skills'
        unique_together = ('employee', 'skill')

    def __str__(self):
        return f"{self.employee.user.full_name} - {self.skill.name} (Level {self.proficiency_level})"