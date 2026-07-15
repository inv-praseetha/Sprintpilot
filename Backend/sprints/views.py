import os
from django.http import FileResponse
from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from project.models import Project
from accounts.models import EmployeeProfile
from sprints.models import Sprint, SprintTask
from sprints.serializers import SprintSerializer, SprintTaskSerializer

class SprintDownloadTemplateView(APIView):
    """
    API View to serve the static Excel template file stored on the backend.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        template_path = os.path.join(settings.BASE_DIR, 'templates', 'tasks_template.xlsx')
        if not os.path.exists(template_path):
            return Response(
                {"detail": "Template file not found on server."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        response = FileResponse(
            open(template_path, 'rb'), 
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="tasks_template.xlsx"'
        return response

class SprintListCreateView(APIView):
    """
    API View to handle listing sprints for a project and creating a sprint with tasks.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id, *args, **kwargs):
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        sprints = Sprint.objects.filter(project=project).prefetch_related(
            'tasks__assigned_employee__user'
        )
        serializer = SprintSerializer(sprints, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, project_id, *args, **kwargs):
        try:
            project = Project.objects.get(id=project_id)
        except Project.DoesNotExist:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        data = request.data
        name = data.get('name')
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        if not name or not start_date or not end_date:
            return Response(
                {"detail": "Sprint name, start_date, and end_date are required."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                sprint = Sprint.objects.create(
                    project=project,
                    name=name,
                    goal=data.get('goal') or '',
                    start_date=start_date,
                    end_date=end_date,
                    status=data.get('status') or 'PLANNED'
                )

                tasks_data = data.get('tasks') or []
                for task_item in tasks_data:
                    title = task_item.get('title')
                    if not title:
                        continue

                    cat = task_item.get('category', 'UI')
                    cat_upper = str(cat).upper().strip()
                    if cat_upper == 'BACKEND':
                        cat = 'Backend'
                    elif cat_upper == 'INFRA':
                        cat = 'INFRA'
                    elif cat_upper == 'UI':
                        cat = 'UI'
                    elif cat_upper == 'QA':
                        cat = 'QA'
                    else:
                        cat = 'UI'

                    priority = task_item.get('priority', 'Normal')
                    if priority not in ['Low', 'Normal', 'High', 'Critical']:
                        priority = 'Normal'

                    status_val = task_item.get('status', 'TODO')
                    status_val_clean = str(status_val).upper().replace(' ', '_').strip()
                    if status_val_clean == 'IN_PROGRESS':
                        status_val = 'IN_PROGRESS'
                    elif status_val_clean == 'COMPLETED' or status_val_clean == 'DONE':
                        status_val = 'DONE'
                    elif status_val_clean == 'TODO':
                        status_val = 'TODO'
                    elif status_val_clean == 'IN_REVIEW':
                        status_val = 'IN_REVIEW'
                    elif status_val_clean == 'QA':
                        status_val = 'QA'
                    elif status_val_clean == 'BLOCKED':
                        status_val = 'BLOCKED'
                    else:
                        status_val = 'TODO'

                    SprintTask.objects.create(
                        sprint=sprint,
                        title=title,
                        description=task_item.get('description') or task_item.get('desc') or '',
                        category=cat,
                        jira_id=task_item.get('jira_id') or task_item.get('jiraId') or '',
                        priority=priority,
                        status=status_val,
                        story_points=task_item.get('story_points') or task_item.get('storyPoints') or None,
                        estimated_hours=task_item.get('estimated_hours') or task_item.get('estimatedHours') or None,
                        planned_start_date=task_item.get('planned_start_date') or sprint.start_date,
                        planned_end_date=task_item.get('planned_end_date') or sprint.end_date,
                        backlog_task_id=task_item.get('backlog_task_id') or ''
                    )

            serializer = SprintSerializer(sprint)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class SprintDetailView(APIView):
    """
    API View to retrieve or delete a specific sprint.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        try:
            sprint = Sprint.objects.prefetch_related('tasks__assigned_employee__user').get(id=pk)
        except Sprint.DoesNotExist:
            return Response({"detail": "Sprint not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = SprintSerializer(sprint)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk, *args, **kwargs):
        try:
            sprint = Sprint.objects.get(id=pk)
        except Sprint.DoesNotExist:
            return Response({"detail": "Sprint not found."}, status=status.HTTP_404_NOT_FOUND)

        sprint.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class SprintTaskUpdateView(APIView):
    """
    API View to update single fields of a sprint task.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request, pk, *args, **kwargs):
        try:
            task = SprintTask.objects.get(id=pk)
        except SprintTask.DoesNotExist:
            return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)

        data = request.data

        if 'status' in data:
            status_val = data['status']
            status_val_clean = str(status_val).upper().replace(' ', '_').strip()
            if status_val_clean == 'IN_PROGRESS':
                task.status = 'IN_PROGRESS'
            elif status_val_clean == 'COMPLETED' or status_val_clean == 'DONE':
                task.status = 'DONE'
            elif status_val_clean == 'TODO':
                task.status = 'TODO'
            elif status_val_clean == 'IN_REVIEW':
                task.status = 'IN_REVIEW'
            elif status_val_clean == 'QA':
                task.status = 'QA'
            elif status_val_clean == 'BLOCKED':
                task.status = 'BLOCKED'
            else:
                task.status = status_val

        if 'assigned_employee_id' in data or 'assignedTo' in data:
            emp_id = data.get('assigned_employee_id') or data.get('assignedTo')
            if emp_id:
                if emp_id == 'unassigned' or emp_id == '':
                    task.assigned_employee = None
                else:
                    try:
                        task.assigned_employee = EmployeeProfile.objects.get(id=emp_id)
                    except EmployeeProfile.DoesNotExist:
                        return Response({"detail": "Employee profile not found."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                task.assigned_employee = None

        if 'planned_start_date' in data or 'startDate' in data:
            task.planned_start_date = data.get('planned_start_date') or data.get('startDate')

        if 'planned_end_date' in data or 'endDate' in data:
            task.planned_end_date = data.get('planned_end_date') or data.get('endDate')

        try:
            task.save()
            serializer = SprintTaskSerializer(task)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
