from django.db import transaction
from accounts.models import Employee, EmployeeProfile
from project.models import Project, ProjectMember, ProjectStack, Skill
from django.utils import timezone
from project.exceptions import ProjectValidationException
from sprints.models import SprintTask
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

        # Check if REMOVED project members have tasks during updating/deleting time
        if has_members:
            removed_member_ids = set(previous_member_ids) - set(member_ids)
            if removed_member_ids:
                tasks = SprintTask.objects.filter(
                    sprint__project=project,
                    assigned_employee_id__in=removed_member_ids,
                    is_deleted=False
                ).exclude(status="CLOSED").exists()
                
                if tasks:
                    raise ProjectValidationException("Cannot remove member! They still have active tasks that are not CLOSED.")
                

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
    def delete_project(project: Project, deleted_by_user=None):
        """
        Soft deletes a project and synchronizes employee statuses.
        """
        from sprints.models import Sprint, SprintTask
        import logging
        logger = logging.getLogger(__name__)

        # Get member profiles associated with this project to sync later
        member_profiles = list(EmployeeProfile.objects.filter(project_memberships__project=project))
        profiles_to_sync = [p.id for p in member_profiles]
        if project.team_lead:
            lead_profile = EmployeeProfile.objects.filter(user=project.team_lead).first()
            if lead_profile:
                profiles_to_sync.append(lead_profile.id)
        
        sprints = Sprint.objects.filter(project=project)
        sprint_count = sprints.filter(is_deleted=False).count()
        open_task_count = SprintTask.objects.filter(sprint__in=sprints, is_deleted=False).exclude(status__in=['CLOSED', 'RESOLVED']).count()

        sprint_details = []
        for sprint in sprints.filter(is_deleted=False):
            tasks = SprintTask.objects.filter(sprint=sprint, is_deleted=False)
            closed_tasks = tasks.filter(status__in=['CLOSED', 'RESOLVED']).count()
            open_tasks = tasks.exclude(status__in=['CLOSED', 'RESOLVED']).count()
            sprint_details.append({
                'name': sprint.name,
                'open': open_tasks,
                'closed': closed_tasks
            })

        # Try to delete from backlog
        try:
            from backlog.services.backlog_client import BacklogService
            backlog_service = BacklogService(project_key=project.project_id)
            tasks_with_backlog = SprintTask.objects.filter(sprint__in=sprints, is_deleted=False, backlog_task_id__isnull=False).exclude(backlog_task_id='')
            for task in tasks_with_backlog:
                try:
                    backlog_service.delete_issue(task.backlog_task_id)
                except Exception as e:
                    logger.error(f"Failed to delete backlog issue {task.backlog_task_id}: {e}")
            
            backlog_service.delete_project()
        except Exception as e:
            logger.error(f"Failed to delete backlog project/issues: {e}")

        # Send Email
        team_lead_email = project.team_lead.email if project.team_lead else None
        if team_lead_email:
            from django.core.mail import send_mail
            from django.conf import settings
            
            manager_name = deleted_by_user.full_name if deleted_by_user else "Unknown Manager"
            subject = f"Alert: Project '{project.name}' has been deleted"
            
            sprint_rows = ""
            for sd in sprint_details:
                sprint_rows += f'''
                <tr>
                    <td style="padding: 10px; border: 1px solid #e2e8f0;">{sd['name']}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; color: #f59e0b; font-weight: bold;">{sd['open']}</td>
                    <td style="padding: 10px; border: 1px solid #e2e8f0; color: #10b981; font-weight: bold;">{sd['closed']}</td>
                </tr>
                '''
            
            if not sprint_rows:
                sprint_rows = '<tr><td colspan="3" style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; color: #64748b;">No sprints were found in this project.</td></tr>'

            html_message = f'''
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
                    <h2 style="margin: 0;">Project Deleted</h2>
                </div>
                <div style="padding: 20px; background-color: #f8fafc;">
                    <p>Hello {project.team_lead.full_name},</p>
                    <p>The project <strong>'{project.name}'</strong> has been permanently deleted from Sprintpilot.</p>
                    <p><strong>Deleted by:</strong> {manager_name}</p>
                    <h3 style="margin-top: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px;">Project Summary at Deletion</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px; background-color: white;">
                        <thead>
                            <tr style="background-color: #f1f5f9;">
                                <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Sprint Name</th>
                                <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Open Tasks</th>
                                <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Closed Tasks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sprint_rows}
                        </tbody>
                    </table>
                    <p style="margin-top: 20px; font-size: 12px; color: #64748b; text-align: center;">
                        This is an automated notification from Sprintpilot. Please do not reply to this email.
                    </p>
                </div>
            </div>
            '''
            message = (f"The project '{project.name}' has been deleted by {manager_name}.\n"
                      f"It had {sprint_count} sprint(s) and {open_task_count} open task(s).\n")
            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [team_lead_email],
                    fail_silently=False,
                    html_message=html_message
                )
            except Exception as e:
                logger.error(f"Failed to send email: {e}")
        
        project.is_deleted = True
        project.save(update_fields=["is_deleted", "updated_at"])
        
        # Soft delete related SprintTasks (Cascade)
        SprintTask.objects.filter(sprint__in=sprints).update(is_deleted=True)
        sprints.update(is_deleted=True)
        
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


