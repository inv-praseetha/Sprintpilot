import uuid
from django.db import models
from django.utils import timezone
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
    milestone = models.CharField(max_length=150)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.ACTIVE)
    backlog_version_id = models.CharField(max_length=50, null=True, blank=True)
    backlog_project_id = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    synced_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'sprints'
        ordering = ['start_date']

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValidationError("end_date must be greater than or equal to start_date")

    def save(self, *args, **kwargs):
        if self.status == self.Status.COMPLETED and not self.completed_at:
            self.completed_at = timezone.now()
        elif self.status != self.Status.COMPLETED:
            self.completed_at = None
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.project.name} - {self.milestone}"

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
        OPEN = 'OPEN', 'OPEN'
        IN_PROGRESS = 'IN_PROGRESS', 'IN_PROGRESS'
        RESOLVED='RESOLVED','RESOLVED'
        CLOSED='CLOSED','CLOSED'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sprint = models.ForeignKey(Sprint, on_delete=models.CASCADE, related_name='tasks')
    jira_id = models.CharField(max_length=50, null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.NORMAL)
    story_points = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    estimated_hours = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.UI)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
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
    synced_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'sprint_tasks'
        ordering = ['created_at']

    def clean(self):
        from django.core.exceptions import ValidationError
        from datetime import datetime, date

        def to_date(d):
            if isinstance(d, str):
                try:
                    return datetime.strptime(d, "%Y-%m-%d").date()
                except ValueError:
                    return None
            return d

        start = to_date(self.planned_start_date)
        end = to_date(self.planned_end_date)

        # 1. Validate dates relative to each other
        if start and end:
            if end < start:
                raise ValidationError({"planned_end_date": "Task planned end date cannot be before planned start date."})

        # 2. Validate dates are within sprint bounds
        if self.sprint:
            sprint_start = to_date(self.sprint.start_date)
            sprint_end = to_date(self.sprint.end_date)
            if start:
                if start < sprint_start or start > sprint_end:
                    raise ValidationError({"planned_start_date": f"Task planned start date ({start}) must be within the sprint duration ({sprint_start} to {sprint_end})."})
            if end:
                if end < sprint_start or end > sprint_end:
                    raise ValidationError({"planned_end_date": f"Task planned end date ({end}) must be within the sprint duration ({sprint_start} to {sprint_end})."})

        # 3. Validate assigned employee is a project member
        if self.assigned_employee and self.sprint and self.sprint.project:
            from project.models import ProjectMember
            is_member = ProjectMember.objects.filter(
                project=self.sprint.project,
                employee_profile=self.assigned_employee
            ).exists()
            if not is_member:
                raise ValidationError({"assigned_employee": f"Employee {self.assigned_employee.user.full_name} is not a member of project {self.sprint.project.name}."})

        # 4. Mandatory fields checks
        # Allow blank dates/assignees only if the task has no planned_start_date AND no planned_end_date AND no assigned_employee
        is_unscheduled = (not self.planned_start_date) and (not self.planned_end_date) and (not self.assigned_employee)
        if not is_unscheduled:
            if not self.category:
                raise ValidationError({"category": "Category is required."})
            if not self.status:
                raise ValidationError({"status": "Status is required."})
            if not self.assigned_employee:
                raise ValidationError({"assigned_employee": "Assignee is required."})
            if not self.planned_start_date:
                raise ValidationError({"planned_start_date": "Planned start date is required."})
            if not self.planned_end_date:
                raise ValidationError({"planned_end_date": "Planned end date is required."})
            if not self.description or not self.description.strip():
                raise ValidationError({"description": "Description is required."})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

class TaskRecommendation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(SprintTask, on_delete=models.CASCADE, related_name='recommendations')
    recommended_employee = models.ForeignKey(
        EmployeeProfile, 
        on_delete=models.CASCADE, 
        related_name='task_recommendations',
        null=True,
        blank=True
    )
    confidence = models.DecimalField(max_digits=5, decimal_places=2)
    matching_score = models.DecimalField(max_digits=5, decimal_places=2)
    reason = models.TextField()
    generated_at = models.DateTimeField(auto_now_add=True)
    accepted = models.BooleanField(null=True, blank=True)

    class Meta:
        db_table = 'task_recommendations'
        ordering = ['-generated_at']

    def __str__(self):
        emp_name = self.recommended_employee.user.full_name if self.recommended_employee else "Unassigned"
        return f"Recommendation for {self.task.title} -> {emp_name}"
