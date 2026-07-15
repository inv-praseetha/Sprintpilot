from django.db import transaction
from accounts.models import Employee, EmployeeProfile
from project.models import Project, ProjectMember, ProjectStack, Skill

class ProjectService:
    """
    Service layer containing the business logic for Project lifecycle management.
    """
    
    @staticmethod
    @transaction.atomic
    def create_project(creator: Employee, validated_data: dict) -> Project:
        """
        Creates a Project, ProjectMembers, and ProjectStack entries in a single atomic transaction.
        Automatically calculates team_size and sets default number_of_days for AGILE projects.
        """
        member_ids = validated_data.pop("members", [])
        skill_ids = validated_data.pop("skills", [])
        team_lead_id = validated_data.pop("team_lead")

        # Retrieve verified Team Lead
        team_lead = Employee.objects.get(id=team_lead_id)
        
        # Retrieve team size from validated data or fallback to members count
        team_size = validated_data.pop("team_size", 0)
        if not team_size:
            team_size = len(member_ids)

        # Default number_of_days to 10 for AGILE type if not provided
        if validated_data.get("type") == "AGILE" and validated_data.get("number_of_days") is None:
            validated_data["number_of_days"] = 10

        # 1. Create the Project record
        project = Project.objects.create(
            created_by=creator,
            team_lead=team_lead,
            team_size=team_size,
            **validated_data
        )

        # 2. Bulk create Project Members using EmployeeProfile mapping
        if member_ids:
            profiles = EmployeeProfile.objects.filter(id__in=member_ids)
            member_instances = [
                ProjectMember(project=project, employee_profile=prof)
                for prof in profiles
            ]
            ProjectMember.objects.bulk_create(member_instances)

        # 3. Bulk create Project Skills (Stack)
        if skill_ids:
            skills = Skill.objects.filter(id__in=skill_ids)
            stack_instances = [
                ProjectStack(project=project, skill=sk)
                for sk in skills
            ]
            ProjectStack.objects.bulk_create(stack_instances)

        return project

    @staticmethod
    @transaction.atomic
    def update_project(project: Project, validated_data: dict) -> Project:
        """
        Updates a Project, ProjectMembers, and ProjectStack entries in a single atomic transaction.
        """
        member_ids = validated_data.pop("members", [])
        skill_ids = validated_data.pop("skills", [])
        team_lead_id = validated_data.pop("team_lead")

        # Retrieve verified Team Lead
        team_lead = Employee.objects.get(id=team_lead_id)
        
        # Retrieve team size
        team_size = validated_data.pop("team_size", 0)
        if not team_size:
            team_size = len(member_ids)

        # Default number_of_days to 10 for AGILE type if not provided
        if validated_data.get("type") == "AGILE" and validated_data.get("number_of_days") is None:
            validated_data["number_of_days"] = 10
        elif validated_data.get("type") == "WATERFALL":
            validated_data["number_of_days"] = None

        # Update Project fields
        project.team_lead = team_lead
        project.team_size = team_size
        for key, value in validated_data.items():
            setattr(project, key, value)
        project.save()

        # Update Members: delete old and create new
        ProjectMember.objects.filter(project=project).delete()
        if member_ids:
            profiles = EmployeeProfile.objects.filter(id__in=member_ids)
            member_instances = [
                ProjectMember(project=project, employee_profile=prof)
                for prof in profiles
            ]
            ProjectMember.objects.bulk_create(member_instances)

        # Update Skills: delete old and create new
        ProjectStack.objects.filter(project=project).delete()
        if skill_ids:
            skills = Skill.objects.filter(id__in=skill_ids)
            stack_instances = [
                ProjectStack(project=project, skill=sk)
                for sk in skills
            ]
            ProjectStack.objects.bulk_create(stack_instances)

        return project


