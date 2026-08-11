from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from sprints.models import Sprint

from backlog.models import BacklogCategory

class BacklogCategoriesView(APIView):
    """
    API View to fetch and merge categories from Backlog (DB and API) with defaults.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        project_id = request.query_params.get('project_id')
        project_key = request.query_params.get('project_key')
        
        dynamic_categories = []
        
        if project_id:
            try:
                db_cats = BacklogCategory.objects.filter(project_id=project_id)
                dynamic_categories = [c.name for c in db_cats]
            except Exception:
                pass
            
        if not dynamic_categories and project_key:
            from backlog.services.backlog_client import BacklogService
            try:
                service = BacklogService(project_key=project_key)
                backlog_data = service.fetch_project_categories()
                dynamic_categories = [c.get('name') for c in backlog_data if c.get('name')]
            except Exception:
                pass
                
        default_categories = ['UI', 'BACKEND', 'QA', 'INFRA']
        
        seen = set()
        merged = []
        for cat in default_categories + dynamic_categories:
            if cat.upper() not in seen:
                seen.add(cat.upper())
                merged.append(cat)
                
        merged.sort(key=lambda x: x.upper())
        
        return Response({"categories": merged}, status=status.HTTP_200_OK)

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

        # Authorization check: Ensure user is creator, team lead, or project member
        project = sprint.project
        user = request.user
        has_access = (
            project.created_by == user or 
            project.team_lead == user
        )
        
        if not has_access:
            return Response(
                {"detail": "You do not have permission to access this sprint."}, 
                status=status.HTTP_403_FORBIDDEN
            )

        if sprint.project.status == 'COMPLETED':
            return Response(
                {"detail": "Cannot sync tasks for a completed project."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        from backlog.services.backlog_sync_service import BacklogSyncService
        
        try:
            sync_service = BacklogSyncService()
            result = sync_service.push_sprint_to_backlog(sprint, task_ids=request.data.get('task_ids', []))
        except Exception as e:
            return Response({"detail": f"Configuration error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        created_count = result["created_count"]
        updated_count = result["updated_count"]
        up_to_date_count = result["up_to_date_count"]
        errors = result["errors"]

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
            
        sprint.synced_at = timezone.now()
        sprint.save(update_fields=['synced_at'])
            
        return Response(
            {"detail": message, "synced_count": total_success, "errors": errors}, 
            status=status.HTTP_200_OK
        )


class BacklogIssueCommentsView(APIView):
    """
    API View to fetch and post comments to a Backlog issue.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, backlog_task_id, *args, **kwargs):
        from backlog.services.backlog_client import BacklogService
        try:
            service = BacklogService()
            comments = service.get_issue_comments(backlog_task_id)
            return Response({"comments": comments}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, backlog_task_id, *args, **kwargs):
        content = request.data.get('content')
        if not content:
            return Response({"detail": "Comment content is required."}, status=status.HTTP_400_BAD_REQUEST)
            
        from backlog.services.backlog_client import BacklogService
        try:
            service = BacklogService()
            comment = service.post_issue_comment(backlog_task_id, content)
            return Response({"comment": comment}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SprintSyncCommentsView(APIView):
    """
    API View to silently sync comment counts for all tasks in a sprint.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, sprint_id, *args, **kwargs):
        from backlog.services.backlog_sync_service import BacklogSyncService
        
        try:
            sprint = Sprint.objects.get(id=sprint_id)
        except Sprint.DoesNotExist:
            return Response({"detail": "Sprint not found."}, status=status.HTTP_404_NOT_FOUND)

        try:
            sync_service = BacklogSyncService()
            updated_counts = sync_service.sync_sprint_comments(sprint)
            return Response({"updated_counts": updated_counts}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Service error: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
