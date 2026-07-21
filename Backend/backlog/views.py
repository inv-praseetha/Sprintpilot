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

        created_count = 0
        updated_count = 0
        up_to_date_count = 0
        
        task_ids = request.data.get('task_ids', [])
        if task_ids:
            tasks = sprint.tasks.filter(id__in=task_ids)
        else:
            tasks = sprint.tasks.all()
            
        errors = []

        from django.utils import timezone

        for task in tasks:
            # Condition 1: Create if backlog_task_id is missing
            if not task.backlog_task_id:
                try:
                    issue_key = backlog_service.sync_task(task)
                    if issue_key:
                        task.backlog_task_id = issue_key
                        task.synced_at = timezone.now()
                        task.save(update_fields=['backlog_task_id', 'synced_at', 'updated_at'])
                        created_count += 1
                except Exception as e:
                    errors.append(f"Task '{task.title}' (Create): {str(e)}")
            else:
                # Condition 2: Update if updated_at > synced_at or synced_at is None
                if task.synced_at is not None and task.updated_at <= task.synced_at:
                    up_to_date_count += 1
                    continue
                    
                try:
                    issue_key = backlog_service.update_task(task)
                    if issue_key:
                        task.synced_at = timezone.now()
                        task.save(update_fields=['synced_at', 'updated_at'])
                        updated_count += 1
                except Exception as e:
                    if str(e) == "NO_CHANGES_DETECTED":
                        task.synced_at = timezone.now()
                        task.save(update_fields=['synced_at', 'updated_at'])
                        up_to_date_count += 1
                    else:
                        errors.append(f"Task '{task.title}' (Update): {str(e)}")

        parts = []
        if created_count > 0:
            parts.append(f"Created {created_count} new tasks")
        if updated_count > 0:
            parts.append(f"Updated {updated_count} tasks")
        if up_to_date_count > 0:
            parts.append(f"{up_to_date_count} tasks were already up-to-date")
            
        message = ", ".join(parts) + "." if parts else "No tasks processed."
        
        if errors:
            message += f" ({len(errors)} tasks failed)."
            
        total_success = created_count + updated_count + up_to_date_count
        
        if errors and total_success == 0:
            return Response(
                {"detail": message, "errors": errors},
                status=status.HTTP_502_BAD_GATEWAY
            )
            
        return Response(
            {"detail": message, "synced_count": total_success, "errors": errors}, 
            status=status.HTTP_200_OK
        )
