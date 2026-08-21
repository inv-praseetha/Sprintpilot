from rest_framework import serializers
from accounts.serializers import EmployeeSerializer, EmployeeProfileSerializer
from project.models import Project, Skill, ProjectMember, ProjectStack
from project.validators import (
    validate_project_dates,
    validate_team_lead,
    validate_members,
    validate_skills
)
from rest_framework.validators import UniqueValidator
class SkillSerializer(serializers.ModelSerializer):
    """
    Serializer for Skill model.
    """
    sub_skills = serializers.SerializerMethodField()

    class Meta:
        model = Skill
        fields = ["id", "name", "category", "parent", "sub_skills"] 
        read_only_fields = fields

    def get_sub_skills(self, obj):
        if obj.parent_id is None:
            return SkillSerializer(obj.sub_skills.all(), many=True).data
        return []


class ProjectCreateSerializer(serializers.ModelSerializer):
    """
    Serializer to validate Project creation input.
    """
    from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
    project_id = serializers.CharField(
        required=True,
        validators=[
            UniqueValidator(queryset=Project.objects.all(), message="A project with this Project ID already exists."),
            RegexValidator(regex=r'^[A-Z0-9\-]+$', message="Project ID must be alphanumeric and uppercase.")
        ]
    )
    jira_id = serializers.CharField(
        required=False, 
        allow_null=True, 
        allow_blank=True, 
        max_length=10,
        validators=[
            RegexValidator(regex=r'^[A-Z][A-Z0-9]+$', message="Jira ID must start with an uppercase letter and be uppercase alphanumeric.")
        ]
    )
    description = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=5000)
    team_lead = serializers.UUIDField(required=True)
    number_of_days = serializers.IntegerField(required=False, allow_null=True, validators=[MinValueValidator(1), MaxValueValidator(365)])
    team_size = serializers.IntegerField(required=False, default=1, validators=[MinValueValidator(1)])
    members = serializers.ListField(
        child=serializers.UUIDField(), 
        required=False, 
        default=list
    )
    skills = serializers.ListField(
        child=serializers.UUIDField(), 
        required=False, 
        default=list
    )

    class Meta:
        model = Project
        fields = [
            "project_id",
            "jira_id",
            "name",
            "description",
            "status",
            "type",
            "start_date",
            "end_date",
            "number_of_days",
            "team_lead",
            "members",
            "skills",
            "team_size"
        ]

    def validate(self, attrs):
        from project.exceptions import ProjectValidationException

        name = attrs.get("name", "")
        if not name or not name.strip():
            raise ProjectValidationException("Project name is required and cannot be empty.")

        # Call the business logic validation checks
        validate_project_dates(
            attrs.get("type"),
            attrs.get("start_date"),
            attrs.get("end_date")
        )
        
        project_type = attrs.get("type")
        if project_type == "AGILE":
            number_of_days = attrs.get("number_of_days")
            if not number_of_days or number_of_days <= 0:
                raise ProjectValidationException("Number of days must be a positive integer for Agile projects.")
        
        # Description Trim Validation
        description = attrs.get("description", "")
        if description and not description.strip():
            raise ProjectValidationException("Description cannot be purely whitespace.")
        if description:
            attrs["description"] = description.strip()
            
        team_size = attrs.get("team_size", getattr(self.instance, "team_size", 1))
        members = attrs.get("members", None)
        
        # Check against provided members if available, otherwise check existing members for updates
        if members is not None:
            if team_size < len(members):
                raise ProjectValidationException(f"Team size ({team_size}) cannot be less than the number of provided members ({len(members)}).")
        elif self.instance:
            existing_count = self.instance.members.count()
            if team_size < existing_count:
                raise ProjectValidationException(f"Team size ({team_size}) cannot be less than the number of currently assigned members ({existing_count}).")

        # Validate Team Lead UUID directly via validator (which returns Model)
        team_lead_id = attrs.get("team_lead")
        if team_lead_id:
            lead = validate_team_lead(team_lead_id)
            attrs["team_lead_obj"] = lead

        member_ids = attrs.get("members", [])
        if member_ids:
            profiles = validate_members(member_ids)
            attrs["members_obj"] = profiles

        skill_ids = attrs.get("skills", [])
        if skill_ids:
            skills = validate_skills(skill_ids)
            attrs["skills_obj"] = skills
        

        
        return attrs


class ProjectListSerializer(serializers.ModelSerializer):
    """
    Serializer for listing Projects.
    """
    created_by = EmployeeSerializer(read_only=True)
    team_lead = EmployeeSerializer(read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "project_id",
            "jira_id",
            "name",
            "description",
            "created_by",
            "status",
            "type",
            "start_date",
            "end_date",
            "number_of_days",
            "team_lead",
            "team_size",
            "created_at",
            "updated_at"
        ]
        read_only_fields = fields


class ProjectDetailSerializer(serializers.ModelSerializer):
    """
    Serializer for detailed Project view.
    """
    created_by = EmployeeSerializer(read_only=True)
    team_lead = EmployeeSerializer(read_only=True)
    members = serializers.SerializerMethodField()
    skills = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "project_id",
            "jira_id",
            "name",
            "description",
            "created_by",
            "status",
            "type",
            "start_date",
            "end_date",
            "number_of_days",
            "team_lead",
            "members",
            "skills",
            "team_size",
            "created_at",
            "updated_at"
        ]
        read_only_fields = fields

    def get_members(self, obj):
        from django.utils import timezone
        from sprints.models import SprintTask

        today = timezone.localdate()
        profiles = [m.employee_profile for m in obj.members.all()]

        tasks = SprintTask.objects.filter(
            sprint__project=obj,
            sprint__is_deleted=False,
            is_deleted=False
        ).values('assigned_employee_id', 'status', 'planned_end_date')

        stats_map = {}
        for t in tasks:
            emp_id = t['assigned_employee_id']
            if not emp_id:
                continue
            emp_str = str(emp_id)
            if emp_str not in stats_map:
                stats_map[emp_str] = {'pending_tasks': 0, 'on_track_tasks': 0}

            is_closed = t['status'] in ['CLOSED', 'RESOLVED', 'COMPLETED', 'DONE']
            end_date = t['planned_end_date']
            is_overdue = (end_date < today) if end_date else False

            if not is_closed and is_overdue:
                stats_map[emp_str]['pending_tasks'] += 1
            else:
                stats_map[emp_str]['on_track_tasks'] += 1

        data = EmployeeProfileSerializer(profiles, many=True).data
        for member_data in data:
            emp_str = str(member_data['id'])
            emp_stats = stats_map.get(emp_str, {'pending_tasks': 0, 'on_track_tasks': 0})
            member_data['pending_tasks'] = emp_stats['pending_tasks']
            member_data['on_track_tasks'] = emp_stats['on_track_tasks']

        return data

    def get_skills(self, obj):
        # Map through prefetched project_stack relations
        skills = [s.skill for s in obj.project_stack.all()]
        return SkillSerializer(skills, many=True).data

