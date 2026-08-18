from rest_framework import serializers
from accounts.models import Employee


class GoogleAuthSerializer(serializers.Serializer):
    """
    Serializer to validate incoming Google ID Token.
    """
    token = serializers.CharField(
        required=True,
        allow_blank=False,
        error_messages={"required": "Token is required.", "blank": "Token cannot be empty."}
    )


class EmployeeSerializer(serializers.ModelSerializer):
    """
    Serializer for the Employee model.
    """
    class Meta:
        model = Employee
        fields = [
            "id",
            "email",
            "full_name",
            "role",
        ]
        read_only_fields = fields


from accounts.models import EmployeeProfile

class EmployeeProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for the EmployeeProfile model.
    """
    user = EmployeeSerializer(read_only=True)
    skills = serializers.SerializerMethodField()
    active_task_count = serializers.SerializerMethodField()

    class Meta:
        model = EmployeeProfile
        fields = [
            "id",
            "user",
            "designation",
            "experience_years",
            "availability_percentage",
            "current_capacity_hours",
            "status",
            "skills",
            "active_task_count",
        ]
        read_only_fields = fields

    def get_active_task_count(self, obj):
        if hasattr(obj, 'annotated_active_task_count'):
            return obj.annotated_active_task_count
            
        from sprints.models import SprintTask
        return obj.assigned_tasks.filter(
            status__in=[SprintTask.Status.OPEN, SprintTask.Status.IN_PROGRESS],
            is_deleted=False
        ).count()

    def get_skills(self, obj):
        relations = obj.employee_skill_relations.all()
        return [
            {
                "id": rel.skill.id, 
                "name": rel.skill.name, 
                "category": rel.skill.category, 
                "parent": rel.skill.parent_id,
                "proficiency_level": rel.proficiency_level
            }
            for rel in relations
        ]


