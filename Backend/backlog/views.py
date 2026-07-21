from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from sprints.models import Sprint

class SprintSyncBacklogView(APIView):
    """
    API View to sync sprint tasks to external Backlog API.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, sprint_id, *args, **kwargs):
        try:
            sprint = Sprint.objects.prefetch_related('tasks__assigned_employee__user').get(id=sprint_id)
        except Sprint.DoesNotExist:
            return Response({"detail": "Sprint not found."}, status=status.HTTP_404_NOT_FOUND)

        if sprint.project.status == 'COMPLETED':
            return Response(
                {"detail": "Cannot sync tasks for a completed project."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        from backlog.services.backlog_client import BacklogService
        
        try:
            backlog_service = BacklogService()
        except Exception as e:
            return Response({"detail": f"Configuration error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        try:
            project_id, _ = backlog_service._resolve_project_and_issue_type()
            if project_id:
                version_id = backlog_service._get_or_create_version(project_id, sprint.milestone)
                sprint.backlog_project_id = project_id
                sprint.backlog_version_id = version_id
                sprint.save(update_fields=['backlog_project_id', 'backlog_version_id'])
        except Exception as e:
            pass # Non-critical if we fail to fetch version info

        synced_count = 0
        tasks = sprint.tasks.all()
        errors = []

        for task in tasks:
            # Skip tasks that are already synced (have a backlog_task_id)
            if task.backlog_task_id:
                continue
                
            try:
                issue_key = backlog_service.sync_task(task)
                if issue_key:
                    task.backlog_task_id = issue_key
                    task.save(update_fields=['backlog_task_id', 'updated_at'])
                    synced_count += 1
            except Exception as e:
                errors.append(f"Task '{task.title}': {str(e)}")

        if errors and synced_count == 0:
            return Response(
                {"detail": "Failed to sync tasks to Backlog.", "errors": errors},
                status=status.HTTP_502_BAD_GATEWAY
            )
            
        message = f"Successfully synced {synced_count} tasks to Backlog."
        if errors:
            message += f" ({len(errors)} tasks failed)."
            
        return Response(
            {"detail": message, "synced_count": synced_count, "errors": errors}, 
            status=status.HTTP_200_OK
        )
