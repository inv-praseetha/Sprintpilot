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
from project.models import Project

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
            "project_stack__skill"
        )
        # Apply filters based on query parameters
        name = request.query_params.get('name')
        if name:
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
        serializer = ProjectDetailSerializer(projects, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        # Validate request body
        serializer = ProjectCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

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
            "project_stack__skill"
        ).get(id=created_project.id)

        # Serialize and return detail response
        detail_serializer = ProjectDetailSerializer(project)
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)


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
        profiles = EmployeeProfile.objects.select_related("user").prefetch_related("skills").filter(user__is_active=True)
        # Apply filters based on query parameters
        skill = request.query_params.get('skill')
        if skill:
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
        if self.request.method in ['PUT', 'DELETE']:
            return [IsAuthenticated(), IsProjectManager()]
        return super().get_permissions()

    def get_object(self, pk):
        try:
            return Project.objects.filter(is_deleted=False).select_related(
                "created_by", 
                "team_lead"
            ).prefetch_related(
                "members__employee_profile__user", 
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

        serializer = ProjectCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_project = ProjectService.update_project(
            project=project,
            validated_data=serializer.validated_data
        )

        refreshed_project = Project.objects.filter(is_deleted=False).select_related(
            "created_by", 
            "team_lead"
        ).prefetch_related(
            "members__employee_profile__user", 
            "project_stack__skill"
        ).get(id=updated_project.id)

        detail_serializer = ProjectDetailSerializer(refreshed_project)
        return Response(detail_serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk, *args, **kwargs):
        project = self.get_object(pk)
        if not project:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)
        
        project.is_deleted = True
        project.save(update_fields=["is_deleted", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)

