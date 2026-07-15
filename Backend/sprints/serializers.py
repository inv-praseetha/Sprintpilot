from rest_framework import serializers
from accounts.serializers import EmployeeProfileSerializer
from sprints.models import Sprint, SprintTask
from accounts.models import EmployeeProfile

class SprintTaskSerializer(serializers.ModelSerializer):
    assigned_employee = EmployeeProfileSerializer(read_only=True)
    assigned_employee_id = serializers.PrimaryKeyRelatedField(
        queryset=EmployeeProfile.objects.all(),
        source='assigned_employee',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = SprintTask
        fields = [
            'id',
            'sprint',
            'jira_id',
            'title',
            'description',
            'priority',
            'story_points',
            'estimated_hours',
            'category',
            'status',
            'assigned_employee',
            'assigned_employee_id',
            'planned_start_date',
            'planned_end_date',
            'backlog_task_id',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'sprint', 'created_at', 'updated_at']

class SprintSerializer(serializers.ModelSerializer):
    tasks = SprintTaskSerializer(many=True, read_only=True)

    class Meta:
        model = Sprint
        fields = [
            'id',
            'project',
            'name',
            'goal',
            'start_date',
            'end_date',
            'status',
            'tasks'
        ]
        read_only_fields = ['id', 'project']
