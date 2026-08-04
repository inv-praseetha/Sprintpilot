import uuid
from django.db import models
from project.models import Project

class BacklogCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='backlog_categories')
    backlog_category_id = models.CharField(max_length=50, null=True, blank=True)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'backlog_categories'
        unique_together = ('project', 'name')

    def __str__(self):
        return f"{self.project.name} - {self.name}"
