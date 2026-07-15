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
        elif validated_data.get("type") == "WATERFALL" and validated_data.get("start_date") and validated_data.get("end_date"):
            start = validated_data.get("start_date")
            end = validated_data.get("end_date")
            validated_data["number_of_days"] = (end - start).days

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

        # Sync statuses of all involved profiles (members and team lead)
        profiles_to_sync = list(member_ids)
        lead_profile = EmployeeProfile.objects.filter(user=team_lead).first()
        if lead_profile:
            profiles_to_sync.append(lead_profile.id)
        ProjectService.sync_employee_statuses(profiles_to_sync)

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
        elif validated_data.get("type") == "WATERFALL" and validated_data.get("start_date") and validated_data.get("end_date"):
            start = validated_data.get("start_date")
            end = validated_data.get("end_date")
            validated_data["number_of_days"] = (end - start).days

        # Capture previous state
        previous_team_lead = project.team_lead
        previous_member_ids = list(project.members.values_list('employee_profile_id', flat=True))

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

        # Gather all profiles to sync (previous members, current members, previous team lead, new team lead)
        profiles_to_sync = set(previous_member_ids) | set(member_ids)
        if previous_team_lead:
            prev_lead_profile = EmployeeProfile.objects.filter(user=previous_team_lead).first()
            if prev_lead_profile:
                profiles_to_sync.add(prev_lead_profile.id)
        if team_lead:
            new_lead_profile = EmployeeProfile.objects.filter(user=team_lead).first()
            if new_lead_profile:
                profiles_to_sync.add(new_lead_profile.id)

        # Update Skills: delete old and create new
        ProjectStack.objects.filter(project=project).delete()
        if skill_ids:
            skills = Skill.objects.filter(id__in=skill_ids)
            stack_instances = [
                ProjectStack(project=project, skill=sk)
                for sk in skills
            ]
            ProjectStack.objects.bulk_create(stack_instances)

        ProjectService.sync_employee_statuses(list(profiles_to_sync))

        return project

    @staticmethod
    def sync_employee_statuses(profile_ids: list) -> None:
        """
        Synchronizes status of employee profiles based on project assignments.
        Sets status to BUSY if they are team lead or member of any active project, WFM otherwise.
        """
        if not profile_ids:
            return
        profiles = EmployeeProfile.objects.filter(id__in=profile_ids).select_related("user")
        for profile in profiles:
            is_member = ProjectMember.objects.filter(
                employee_profile=profile,
                project__is_deleted=False
            ).exists()
            is_lead = Project.objects.filter(
                team_lead=profile.user,
                is_deleted=False
            ).exists()
            
            new_status = EmployeeProfile.Status.BUSY if (is_member or is_lead) else EmployeeProfile.Status.WFH
            if profile.status != new_status:
                profile.status = new_status
                profile.save(update_fields=["status"])


