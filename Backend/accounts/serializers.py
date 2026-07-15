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
        ]
        read_only_fields = fields

    def get_skills(self, obj):
        return [
            {"id": s.id, "name": s.name, "category": s.category}
            for s in obj.skills.all()
        ]


