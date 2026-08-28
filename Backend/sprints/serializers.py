from rest_framework import serializers
from accounts.serializers import EmployeeProfileSerializer
from sprints.models import Sprint, SprintTask, SprintHoliday, SprintNote
from accounts.models import EmployeeProfile

class SprintNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SprintNote
        fields = ['id', 'sprint', 'date', 'content', 'attachment', 'created_at', 'updated_at']
        read_only_fields = ['id', 'sprint', 'created_at', 'updated_at']

class SprintHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model = SprintHoliday
        fields = ['id', 'date', 'description']

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
        
        start_date = attrs.get('planned_start_date')
        end_date = attrs.get('planned_end_date')
        if not start_date:
            raise serializers.ValidationError({"planned_start_date": "Planned start date is required."})
        if not end_date:
            raise serializers.ValidationError({"planned_end_date": "Planned end date is required."})
            
        if start_date > end_date:
            raise serializers.ValidationError({"planned_start_date": "Planned start date must be before or equal to planned end date."})
            
        # Get sprint from context (if set during creation) or from instance
        sprint = self.context.get('sprint') or (self.instance.sprint if self.instance else None)
        if sprint:
            if start_date < sprint.start_date or end_date > sprint.end_date:
                raise serializers.ValidationError({
                    "planned_start_date": f"Task dates must fall within the sprint range ({sprint.start_date} to {sprint.end_date})."
                })

        estimated_hours = attrs.get('estimated_hours')
        if estimated_hours is None or estimated_hours == '':
            raise serializers.ValidationError({"estimated_hours": "Estimated hours are mandatory."})
        try:
            hours_val = float(estimated_hours)
            if hours_val <= 0:
                raise serializers.ValidationError({"estimated_hours": "Estimated hours must be greater than 0."})
            if start_date and end_date and hours_val > 0:
                import datetime
                from math import ceil
                working_days = 0
                curr = start_date
                while curr <= end_date:
                    if curr.weekday() < 5:
                        working_days += 1
                    curr += datetime.timedelta(days=1)
                min_days = ceil(hours_val / 8.0)
                if working_days < min_days:
                    raise serializers.ValidationError({
                        "planned_end_date": f"Estimated hours ({estimated_hours}h) require at least {min_days} working day(s). Selected range has only {working_days} working day(s)."
                    })
        except (ValueError, TypeError) as e:
            if isinstance(e, serializers.ValidationError):
                raise e
            raise serializers.ValidationError({"estimated_hours": "Estimated hours must be a valid number."})

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
            'comment_count',
            'read_comment_count',
            'first_unread_comment_id',
            'synced_at',
            'created_at',
            'updated_at',
            'recommendation_reason'
        ]
        read_only_fields = ['id', 'sprint', 'synced_at', 'created_at', 'updated_at']

    def get_backlog_task_url(self, obj):
        if obj.backlog_task_id:
            from decouple import config
            workspace = config('BACKLOG_WORKSPACE_URL', default='').rstrip('/')
            if workspace:
                return f"{workspace}/view/{obj.backlog_task_id}"
        return None

    def get_recommendation_reason(self, obj):
        # Avoid N+1 database queries by checking prefetched recommendations in memory
        recs = list(obj.recommendations.all())
        accepted_rec = next((r for r in recs if r.accepted), None)
        if accepted_rec:
            return accepted_rec.reason
        if obj.assigned_employee:
            matching_rec = next((r for r in recs if r.recommended_employee_id == obj.assigned_employee_id), None)
            if matching_rec:
                return matching_rec.reason
        return None

class SprintSerializer(serializers.ModelSerializer):
    tasks = SprintTaskSerializer(many=True, read_only=True)
    holidays = SprintHolidaySerializer(many=True, read_only=True)
    project_status = serializers.CharField(source='project.status', read_only=True)
    project_custom_id = serializers.CharField(source='project.project_id', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    workspace_url = serializers.SerializerMethodField()
    jira_url = serializers.SerializerMethodField()
    backlog_status = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()

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
            'holidays',
            'project_custom_id',
            'backlog_version_id',
            'workspace_url',
            'jira_url',
            'backlog_status',
            'progress_percentage',
            'created_at'
        ]
        read_only_fields = ['id', 'project', 'created_at']

    def get_workspace_url(self, obj):
        if not obj.backlog_version_id or not obj.backlog_project_id:
            return None
            
        from decouple import config
        workspace = config('BACKLOG_WORKSPACE_URL', default='').rstrip('/')
        project_key = obj.project.project_id if obj.project and obj.project.project_id else config('BACKLOG_PROJECT_KEY', default='')
        
        if workspace and project_key:
            return f"{workspace}/find/{project_key}?allOver=false&fixedVersionId={obj.backlog_version_id}&limit=20&offset=0&order=false&projectId={obj.backlog_project_id}&simpleSearch=true&sort=UPDATED&statusId=1&statusId=2"
        return None

    def get_jira_url(self, obj):
        tasks_with_jira = obj.tasks.filter(is_deleted=False, jira_id__isnull=False).exclude(jira_id='')
        if tasks_with_jira.exists():
            from decouple import config
            workspace = config('JIRA_WORKSPACE_URL', default='').rstrip('/')
            project_key = obj.project.jira_id or obj.project.project_id if obj.project else ''
            if workspace and project_key:
                board_id = getattr(obj.project, 'jira_board_id', None)
                if board_id:
                    # Use rapidView URL which is universally supported across project types and goes directly to the backlog
                    return f"{workspace}/secure/RapidBoard.jspa?rapidView={board_id}&view=planning"
                
                # Fallback to the project's default board/issue view universally using /browse/
                return f"{workspace}/browse/{project_key}"
        return None

    def get_backlog_status(self, obj):
        if obj.status == 'COMPLETED':
            return "CLOSED"
            
        tasks = obj.tasks.filter(is_deleted=False)
        if not tasks.exists():
            return "NO TASKS"
        
        statuses = [t.status for t in tasks]
        
        if all(s in ['CLOSED', 'RESOLVED', 'COMPLETED', 'DONE'] for s in statuses):
            return "RESOLVED"
            
        if any(s in ['IN_PROGRESS', 'RESOLVED', 'QA', 'IN_REVIEW'] for s in statuses):
            return "IN PROGRESS"
            
        return "OPEN"

    def get_progress_percentage(self, obj):
        tasks = obj.tasks.filter(is_deleted=False)
        total_tasks = tasks.count()
        if total_tasks == 0:
            return 0
            
        total_weight = 0
        for task in tasks:
            status = str(task.status).upper().strip()
            if status in ('CLOSED', 'DONE', 'COMPLETED'):
                total_weight += 100
            elif status in ('RESOLVED', 'IN_REVIEW', 'QA'):
                total_weight += 90
            elif status == 'IN_PROGRESS':
                total_weight += 50
            # Open and others are 0%
            
        return round(total_weight / total_tasks)

