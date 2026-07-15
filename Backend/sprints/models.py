import uuid
from django.db import models
from project.models import Project
from accounts.models import EmployeeProfile

class Sprint(models.Model):
    class Status(models.TextChoices):
        PLANNED = 'PLANNED', 'Planned'
        ACTIVE = 'ACTIVE', 'Active'
        COMPLETED = 'COMPLETED', 'Completed'
        CANCELLED = 'CANCELLED', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='sprints')
    name = models.CharField(max_length=150)
    goal = models.TextField(null=True, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PLANNED)

    class Meta:
        db_table = 'sprints'
        ordering = ['start_date']

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValidationError("end_date must be greater than or equal to start_date")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.project.name} - {self.name}"

class SprintTask(models.Model):
    class Priority(models.TextChoices):
        LOW = 'Low', 'Low'
        NORMAL = 'Normal', 'Normal'
        HIGH = 'High', 'High'
        CRITICAL = 'Critical', 'Critical'

    class Category(models.TextChoices):
        UI = 'UI', 'UI'
        BACKEND = 'Backend', 'Backend'
        QA = 'QA', 'QA'
        INFRA = 'INFRA', 'INFRA'

    class Status(models.TextChoices):
        TODO = 'TODO', 'TODO'
        IN_PROGRESS = 'IN_PROGRESS', 'IN_PROGRESS'
        IN_REVIEW = 'IN_REVIEW', 'IN_REVIEW'
        QA = 'QA', 'QA'
        DONE = 'DONE', 'DONE'
        BLOCKED = 'BLOCKED', 'BLOCKED'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sprint = models.ForeignKey(Sprint, on_delete=models.CASCADE, related_name='tasks')
    jira_id = models.CharField(max_length=50, null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    story_points = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    estimated_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.UI)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TODO)
    assigned_employee = models.ForeignKey(
        EmployeeProfile, 
        on_delete=models.SET_NULL, 
        related_name='assigned_tasks',
        null=True, 
        blank=True
    )
    planned_start_date = models.DateField(null=True, blank=True)
    planned_end_date = models.DateField(null=True, blank=True)
    backlog_task_id = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'sprint_tasks'
        ordering = ['created_at']

    def __str__(self):
        return self.title
