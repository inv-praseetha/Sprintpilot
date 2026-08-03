from django.db import transaction
from accounts.models import Employee, EmployeeProfile
from project.models import Project, ProjectMember, ProjectStack, Skill
from django.utils import timezone
from project.exceptions import ProjectValidationException

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
        team_lead_id = validated_data.pop("team_lead", None)
        team_lead = validated_data.pop("team_lead_obj", None)
        
        # Pop these early so they aren't passed to Project.objects.create()
        profiles = validated_data.pop("members_obj", None)
        skills = validated_data.pop("skills_obj", None)

        if not team_lead and team_lead_id:
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
        #2. Project create start_Date and end_date validation check
        start_date=validated_data.get("start_date")
        end_date=validated_data.get("end_date")
        today=timezone.localdate()
        if start_date and end_date:
            if end_date < start_date:
                raise ProjectValidationException("end_date must be greater than or equal to start_date")
            if start_date < today:
                raise ProjectValidationException("start_date must be greater than or equal to today")
            if end_date < today:
                raise ProjectValidationException("end_date must be greater than or equal to today")
        



        # 3. Bulk create Project Members using EmployeeProfile mapping
        if profiles is None and member_ids:
            profiles = EmployeeProfile.objects.filter(id__in=member_ids)
            
        if profiles:
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

        # 4. Bulk create Project Skills (Stack)
        if skills is None and skill_ids:
            skills = Skill.objects.filter(id__in=skill_ids)
            
        if skills:
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
        has_members = "members" in validated_data or "members_obj" in validated_data
        member_ids = validated_data.pop("members", []) if "members" in validated_data else []
        profiles = validated_data.pop("members_obj", None)
        
        has_skills = "skills" in validated_data or "skills_obj" in validated_data
        skill_ids = validated_data.pop("skills", []) if "skills" in validated_data else []
        skills = validated_data.pop("skills_obj", None)
        
        has_team_lead = "team_lead" in validated_data or "team_lead_obj" in validated_data
        team_lead_id = validated_data.pop("team_lead", None) if "team_lead" in validated_data else None
        team_lead = validated_data.pop("team_lead_obj", None)

        # Retrieve verified Team Lead if provided
        if has_team_lead and not team_lead and team_lead_id:
            team_lead = Employee.objects.get(id=team_lead_id)
        
        # Retrieve team size
        has_team_size = "team_size" in validated_data
        team_size = validated_data.pop("team_size", 0) if has_team_size else 0
        if has_team_size and not team_size and has_members:
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
        if has_team_lead and team_lead:
            project.team_lead = team_lead
        if has_team_size:
            project.team_size = team_size
        for key, value in validated_data.items():
            setattr(project, key, value)
        project.save()

        # Update Members: delete old and create new only if provided
        if has_members:
            ProjectMember.objects.filter(project=project).delete()
            if profiles is None and member_ids:
                profiles = EmployeeProfile.objects.filter(id__in=member_ids)
            if profiles:
                member_instances = [
                    ProjectMember(project=project, employee_profile=prof)
                    for prof in profiles
                ]
                ProjectMember.objects.bulk_create(member_instances)

        # Gather all profiles to sync (previous members, current members, previous team lead, new team lead)
        profiles_to_sync = set(previous_member_ids)
        if has_members:
            profiles_to_sync |= set(member_ids)
        if previous_team_lead:
            prev_lead_profile = EmployeeProfile.objects.filter(user=previous_team_lead).first()
            if prev_lead_profile:
                profiles_to_sync.add(prev_lead_profile.id)
        if has_team_lead and team_lead:
            new_lead_profile = EmployeeProfile.objects.filter(user=team_lead).first()
            if new_lead_profile:
                profiles_to_sync.add(new_lead_profile.id)

        # Update Skills (Stack): delete old and create new only if provided
        if has_skills:
            ProjectStack.objects.filter(project=project).delete()
            if skills is None and skill_ids:
                skills = Skill.objects.filter(id__in=skill_ids)
            if skills:
                stack_instances = [
                    ProjectStack(project=project, skill=sk)
                    for sk in skills
                ]
                ProjectStack.objects.bulk_create(stack_instances)

        ProjectService.sync_employee_statuses(list(profiles_to_sync))

        return project

    @staticmethod
    @transaction.atomic
    def delete_project(project: Project):
        """
        Soft deletes a project and synchronizes employee statuses.
        """
        # Get member profiles associated with this project to sync later
        member_profiles = list(EmployeeProfile.objects.filter(project_memberships__project=project))
        profiles_to_sync = [p.id for p in member_profiles]
        if project.team_lead:
            lead_profile = EmployeeProfile.objects.filter(user=project.team_lead).first()
            if lead_profile:
                profiles_to_sync.append(lead_profile.id)
        
        project.is_deleted = True
        project.save(update_fields=["is_deleted", "updated_at"])
        
        # Soft delete related SprintTasks (Cascade)
        from sprints.models import Sprint, SprintTask
        sprints = Sprint.objects.filter(project=project)
        SprintTask.objects.filter(sprint__in=sprints).update(is_deleted=True)
        
        # Synchronize statuses of all involved profiles
        ProjectService.sync_employee_statuses(profiles_to_sync)

    @staticmethod
    def sync_employee_statuses(profile_ids: list) -> None:
        """
        Synchronizes status of employee profiles based on project assignments.
        Sets status to BUSY if they are team lead or member of any active or on-hold project, WFH otherwise.
        """
        if not profile_ids:
            return
        profiles = EmployeeProfile.objects.filter(id__in=profile_ids).select_related("user")
        for profile in profiles:
            is_member = ProjectMember.objects.filter(
                employee_profile=profile,
                project__is_deleted=False,
                project__status__in=[Project.Status.ACTIVE, Project.Status.ON_HOLD]
            ).exists()
            is_lead = Project.objects.filter(
                team_lead=profile.user,
                is_deleted=False,
                status__in=[Project.Status.ACTIVE, Project.Status.ON_HOLD]
            ).exists()
            
            new_status = EmployeeProfile.Status.BUSY if (is_member or is_lead) else EmployeeProfile.Status.WFM
            if profile.status != new_status:
                profile.status = new_status
                profile.save(update_fields=["status"])


