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
