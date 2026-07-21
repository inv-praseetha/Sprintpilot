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
    recommendation_reason = serializers.SerializerMethodField()

    backlog_task_url = serializers.SerializerMethodField()

    def validate(self, attrs):
        if not attrs.get('category'):
            raise serializers.ValidationError({"category": "Category is required."})
        if not attrs.get('status'):
            raise serializers.ValidationError({"status": "Status is required."})
        if not attrs.get('assigned_employee'):
            raise serializers.ValidationError({"assigned_employee_id": "Assignee is required."})
        if not attrs.get('planned_start_date'):
            raise serializers.ValidationError({"planned_start_date": "Planned start date is required."})
        if not attrs.get('planned_end_date'):
            raise serializers.ValidationError({"planned_end_date": "Planned end date is required."})
        description = attrs.get('description')
        if not description or not description.strip():
            raise serializers.ValidationError({"description": "Description is required."})
        return attrs

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
            'backlog_task_url',
            'created_at',
            'updated_at',
            'recommendation_reason'
        ]
        read_only_fields = ['id', 'sprint', 'created_at', 'updated_at']

    def get_backlog_task_url(self, obj):
        if obj.backlog_task_id:
            from decouple import config
            workspace = config('BACKLOG_WORKSPACE_URL', default='').rstrip('/')
            if workspace:
                return f"{workspace}/view/{obj.backlog_task_id}"
        return None

    def get_recommendation_reason(self, obj):
        rec = obj.recommendations.filter(accepted=True).first()
        if rec:
            return rec.reason
        if obj.assigned_employee:
            rec = obj.recommendations.filter(recommended_employee=obj.assigned_employee).first()
            if rec:
                return rec.reason
        return None

class SprintSerializer(serializers.ModelSerializer):
    tasks = SprintTaskSerializer(many=True, read_only=True)
    project_status = serializers.CharField(source='project.status', read_only=True)
    project_custom_id = serializers.CharField(source='project.project_id', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    workspace_url = serializers.SerializerMethodField()

    class Meta:
        model = Sprint
        fields = [
            'id',
            'project',
            'project_status',
            'project_name',
            'milestone',
            'start_date',
            'end_date',
            'status',
            'tasks',
            'project_custom_id',
            'workspace_url',
            'created_at'
        ]
        read_only_fields = ['id', 'project', 'created_at']

    def get_workspace_url(self, obj):
        from decouple import config
        workspace = config('BACKLOG_WORKSPACE_URL', default='').rstrip('/')
        project_key = config('BACKLOG_PROJECT_KEY', default='')
        
        if workspace and project_key:
            if obj.backlog_version_id and obj.backlog_project_id:
                return f"{workspace}/find/{project_key}?allOver=false&fixedVersionId={obj.backlog_version_id}&limit=20&offset=0&order=false&projectId={obj.backlog_project_id}&simpleSearch=true&sort=UPDATED&statusId=1&statusId=2&statusId=3"
            return f"{workspace}/projects/{project_key}"
        return workspace if workspace else None
