from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from project.permissions import IsProjectManager
from project.serializers import (
    ProjectCreateSerializer,
    ProjectListSerializer,
    ProjectDetailSerializer
)
from project.services import ProjectService
from project.models import Project, ProjectMember

from rest_framework.pagination import PageNumberPagination

class ProjectPagination(PageNumberPagination):
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100

class ProjectCreateView(APIView):
    """
    API View to handle project listing and creation.
    - POST /api/projects/ : Creates a new project (Only for Project Managers).
    - GET /api/projects/  : Lists all projects (For any authenticated user).
    """
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        # Override to enforce Project Manager role only for creation (POST)
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsProjectManager()]
        return super().get_permissions()

    def get(self, request, *args, **kwargs):
        # Query optimization: select_related & prefetch_related
        projects = Project.objects.filter(is_deleted=False).select_related(
            "created_by",
            "team_lead"
        ).prefetch_related(
            "members__employee_profile__user",
            "members__employee_profile__employee_skill_relations__skill",
            "project_stack__skill"
        )
        # Apply filters based on query parameters
        name = request.query_params.get('name')
        if name:
            name = name[:100]
            projects = projects.filter(name__icontains=name)
        status_param = request.query_params.get('status')
        if status_param:
            projects = projects.filter(status=status_param)
        type_param = request.query_params.get('type')
        if type_param:
            projects = projects.filter(type=type_param)
        team_lead = request.query_params.get('team_lead')
        if team_lead:
            projects = projects.filter(team_lead__id=team_lead)
        
        paginator = ProjectPagination()
        page = paginator.paginate_queryset(projects, request, view=self)
        if page is not None:
            serializer = ProjectDetailSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)

        serializer = ProjectDetailSerializer(projects, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        # Validate request body
        serializer = ProjectCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            # Call service layer to perform business logic & DB creation inside a transaction
            created_project = ProjectService.create_project(
                creator=request.user,
                validated_data=serializer.validated_data
            )

            # Query optimization for response object representation
            project = Project.objects.filter(is_deleted=False).select_related(
                "created_by", 
                "team_lead"
            ).prefetch_related(
                "members__employee_profile__user", 
                "members__employee_profile__employee_skill_relations__skill", 
                "project_stack__skill"
            ).get(id=created_project.id)

            # Serialize and return detail response
            detail_serializer = ProjectDetailSerializer(project)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Failed to create project: %s", str(e))
            return Response({"detail": f"Failed to create project: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


from project.models import Skill
from accounts.models import EmployeeProfile
from project.serializers import SkillSerializer
from accounts.serializers import EmployeeProfileSerializer

class SkillListView(APIView):
    """
    API View to list all available skills/technologies.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        skills = Skill.objects.all()
        serializer = SkillSerializer(skills, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class EmployeeProfileListView(APIView):
    """
    API View to list all active employee profiles.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        profiles = EmployeeProfile.objects.select_related("user").prefetch_related("employee_skill_relations__skill").filter(
            user__is_active=True,
            status__in=[EmployeeProfile.Status.ACTIVE, EmployeeProfile.Status.WFM, EmployeeProfile.Status.BUSY]
        )
        # Apply filters based on query parameters
        skill = request.query_params.get('skill')
        if skill:
            skill = skill[:100]
            profiles = profiles.filter(skills__name__icontains=skill)
            
        serializer = EmployeeProfileSerializer(profiles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProjectDetailView(APIView):
    """
    API View to handle individual project operations (Retrieve, Update, Delete).
    - GET /api/projects/<int:pk>/    : Retrieve details of a project (Authenticated users).
    - PUT /api/projects/<int:pk>/    : Update a project (Only for Project Managers).
    - DELETE /api/projects/<int:pk>/ : Delete a project (Only for Project Managers).
    """
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            return [IsAuthenticated(), IsProjectManager()]
        return super().get_permissions()

    def get_object(self, pk):
        try:
            return Project.objects.filter(is_deleted=False).select_related(
                "created_by", 
                "team_lead"
            ).prefetch_related(
                "members__employee_profile__user", 
                "members__employee_profile__employee_skill_relations__skill", 
                "project_stack__skill"
            ).get(pk=pk)
        except Project.DoesNotExist:
            return None

    def get(self, request, pk, *args, **kwargs):
        project = self.get_object(pk)
        if not project:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)
        serializer = ProjectDetailSerializer(project)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk, *args, **kwargs):
        project = self.get_object(pk)
        if not project:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)
            
        if request.user.role == 'PROJECT_MANAGER' and project.created_by != request.user:
            return Response({"detail": "You do not have permission to modify this project."}, status=status.HTTP_403_FORBIDDEN)

        # Prevent updating if the project is already COMPLETED
        if project.status == 'COMPLETED':
            return Response(
                {"detail": "Cannot update a completed project."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ProjectCreateSerializer(instance=project, data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            updated_project = ProjectService.update_project(
                project=project,
                validated_data=serializer.validated_data
            )

            refreshed_project = Project.objects.filter(is_deleted=False).select_related(
                "created_by", 
                "team_lead"
            ).prefetch_related(
                "members__employee_profile__user", 
                "members__employee_profile__employee_skill_relations__skill", 
                "project_stack__skill"
            ).get(id=updated_project.id)

            detail_serializer = ProjectDetailSerializer(refreshed_project)
            return Response(detail_serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Failed to update project: %s", str(e))
            return Response({"detail": f"Failed to update project: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk, *args, **kwargs):
        project = self.get_object(pk)
        if not project:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'PROJECT_MANAGER' and project.created_by != request.user:
            return Response({"detail": "You do not have permission to modify this project."}, status=status.HTTP_403_FORBIDDEN)

        status_value = request.data.get("status")

        if project.status == 'COMPLETED':
            if not status_value or status_value == 'COMPLETED':
                return Response(
                    {"detail": "Cannot modify a completed project, except to reopen it."}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        try:
            if status_value:
                if status_value not in Project.Status.values:
                    return Response({"detail": f"Invalid status: {status_value}"}, status=status.HTTP_400_BAD_REQUEST)

                # Collect profiles to sync before saving
                member_profiles = list(EmployeeProfile.objects.filter(project_memberships__project=project))
                profile_ids = [p.id for p in member_profiles]
                if project.team_lead:
                    try:
                        lead_profile = EmployeeProfile.objects.get(user=project.team_lead)
                        profile_ids.append(lead_profile.id)
                    except EmployeeProfile.DoesNotExist:
                        pass

                project.status = status_value
                project.save()

                # Sync profiles to update status (e.g. active to inactive or vice versa)
                ProjectService.sync_employee_statuses(profile_ids)

            refreshed_project = self.get_object(pk)
            detail_serializer = ProjectDetailSerializer(refreshed_project)
            return Response(detail_serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Failed to patch project: %s", str(e))
            return Response({"detail": f"Failed to modify project: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, *args, **kwargs):
        project = self.get_object(pk)
        if not project:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'PROJECT_MANAGER' and project.created_by != request.user:
            return Response({"detail": "You do not have permission to delete this project."}, status=status.HTTP_403_FORBIDDEN)

        if project.status == 'COMPLETED':
            return Response(
                {"detail": "Cannot delete a completed project."}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Deletion logic moved to Service layer for Transactional Safety
            ProjectService.delete_project(project)
                    
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.exception("Failed to delete project: %s", str(e))
            return Response({"detail": f"Failed to delete project: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)




from datetime import timedelta
from django.utils import timezone
from sprints.models import SprintTask
from django.db.models import Count

class ProjectAssignableMembersView(APIView):
    """
    GET /api/projects/<uuid:pk>/assignable-members/
    Returns all EmployeeProfiles assignable to sprint tasks for this project:
      - All ProjectMember entries for the project (queried directly via reverse FK)
      - The project team_lead (who may not be a registered ProjectMember)
    Deduplicated and sorted by name.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        # Validate the project exists
        try:
            project = Project.objects.select_related("team_lead").get(
                pk=pk, is_deleted=False
            )
        except Project.DoesNotExist:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        # 1. Query all EmployeeProfiles that are members of this project directly
        #    via the reverse FK on ProjectMember (avoids prefetch traversal issues)
        member_profiles = EmployeeProfile.objects.filter(
            project_memberships__project_id=pk
        ).select_related("user").prefetch_related(
            "employee_skill_relations__skill"
        ).distinct()

        # Exclude Team Lead (both project.team_lead user and users with TEAM_LEAD role)
        if project.team_lead:
            member_profiles = member_profiles.exclude(user=project.team_lead)
        member_profiles = member_profiles.exclude(user__role='TEAM_LEAD')

        profiles = sorted(member_profiles, key=lambda p: p.user.full_name)
        serializer = EmployeeProfileSerializer(profiles, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)



from django.db import transaction
from project.permissions import IsProjectManager
from project.models import ProjectMember

class ProjectReassignAndRemoveMemberView(APIView):
    """
    POST /api/projects/<uuid:pk>/reassign-and-remove/
    Reassigns all active tasks from old_member to new_member and removes old_member from the project.
    """
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return [IsAuthenticated(), IsProjectManager()]

    def post(self, request, pk, *args, **kwargs):
        try:
            project = Project.objects.get(pk=pk, is_deleted=False)
        except Project.DoesNotExist:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        if request.user.role == 'PROJECT_MANAGER' and project.created_by != request.user:
            return Response({"detail": "You do not have permission to modify this project."}, status=status.HTTP_403_FORBIDDEN)

        old_member_id = request.data.get("old_member_id")
        new_member_id = request.data.get("new_member_id")

        if not old_member_id or not new_member_id:
            return Response({"detail": "old_member_id and new_member_id are required."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Ensure the new assignee is actually a member of the project
            ProjectMember.objects.get_or_create(project=project, employee_profile_id=new_member_id)

            SprintTask.objects.filter(
                sprint__project=project,
                assigned_employee_id=old_member_id,
                is_deleted=False
            ).exclude(status='CLOSED').update(assigned_employee_id=new_member_id)

            ProjectMember.objects.filter(project=project, employee_profile_id=old_member_id).delete()

        return Response({"detail": "Tasks reassigned and member removed successfully."}, status=status.HTTP_200_OK)

class DashboardView(APIView):
    """
    API View to retrieve dashboard metrics including Backlog task status distribution
    and tasks that are due today and tomorrow.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        tasks = SprintTask.objects.filter(is_deleted=False)
        
        user = request.user
        if user.role != 'PROJECT_MANAGER':
            tasks = tasks.filter(sprint__project__members__employee_profile__user=user)

        # Status distribution
        status_counts = tasks.values('status').annotate(count=Count('status'))
        status_distribution = {item['status']: item['count'] for item in status_counts}
        
        for s in SprintTask.Status.values:
            if s not in status_distribution:
                status_distribution[s] = 0

        today = timezone.localdate()
        tomorrow = today + timedelta(days=1)

        # Due Today
        due_today_qs = tasks.filter(planned_end_date=today).select_related('sprint__project', 'assigned_employee__user')
        due_today = [
            {
                'id': str(task.id),
                'title': task.title,
                'project_name': task.sprint.project.name,
                'sprint_name': task.sprint.milestone,
                'status': task.status,
                'assignee': task.assigned_employee.user.full_name if task.assigned_employee else 'Unassigned',
                'due_date': task.planned_end_date.isoformat() if task.planned_end_date else None
            } for task in due_today_qs
        ]

        # Due Tomorrow
        due_tomorrow_qs = tasks.filter(planned_end_date=tomorrow).select_related('sprint__project', 'assigned_employee__user')
        due_tomorrow = [
            {
                'id': str(task.id),
                'title': task.title,
                'project_name': task.sprint.project.name,
                'sprint_name': task.sprint.milestone,
                'status': task.status,
                'assignee': task.assigned_employee.user.full_name if task.assigned_employee else 'Unassigned',
                'due_date': task.planned_end_date.isoformat() if task.planned_end_date else None
            } for task in due_tomorrow_qs
        ]

        return Response({
            'status_distribution': status_distribution,
            'due_today': due_today,
            'due_tomorrow': due_tomorrow
        }, status=status.HTTP_200_OK)
