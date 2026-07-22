from rest_framework import serializers
from accounts.serializers import EmployeeSerializer, EmployeeProfileSerializer
from project.models import Project, Skill, ProjectMember, ProjectStack
from project.validators import (
    validate_project_dates,
    validate_team_lead,
    validate_members,
    validate_skills
)

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
    from rest_framework.validators import UniqueValidator
    project_id = serializers.CharField(
        required=True,
        validators=[UniqueValidator(queryset=Project.objects.all(), message="A project with this Project ID already exists.")]
    )
    team_lead = serializers.UUIDField(required=True)
    number_of_days = serializers.IntegerField(required=False, allow_null=True)
    team_size = serializers.IntegerField(required=False, default=0)
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
        
        # Validating values and returning the actual objects (or verifying existence)
        validate_team_lead(attrs.get("team_lead"))
        validate_members(attrs.get("members", []))
        validate_skills(attrs.get("skills", []))
        
        # Validate that assigned members count does not exceed team size
        team_size = attrs.get("team_size", 0)
        if team_size <= 0:
            raise ProjectValidationException("Team size must be a positive integer.")
            
        members_count = len(attrs.get("members", []))
        if members_count > team_size:
            raise ProjectValidationException(f"Cannot assign more members ({members_count}) than the project team size ({team_size}).")
        
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
        # Map through prefetched project_members relations (related name is now 'members')
        profiles = [m.employee_profile for m in obj.members.all()]
        return EmployeeProfileSerializer(profiles, many=True).data

    def get_skills(self, obj):
        # Map through prefetched project_stack relations
        skills = [s.skill for s in obj.project_stack.all()]
        return SkillSerializer(skills, many=True).data
