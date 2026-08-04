import logging
from datetime import timedelta
from django.utils import timezone
from backlog.services.backlog_client import BacklogService
from sprints.models import SprintTask
from accounts.models import EmployeeProfile

logger = logging.getLogger(__name__)

class BacklogSyncService:
    def __init__(self):
        pass

    def _map_status(self, backlog_status_id):
        # Backlog default status IDs: 1 (Open), 2 (In Progress), 3 (Resolved), 4 (Closed)
        status_map = {
            1: SprintTask.Status.OPEN,
            2: SprintTask.Status.IN_PROGRESS,
            3: SprintTask.Status.RESOLVED,
            4: SprintTask.Status.CLOSED
        }
        return status_map.get(backlog_status_id, SprintTask.Status.OPEN)

    def _map_priority(self, backlog_priority_id):
        # Backlog default priority IDs: 2 (High), 3 (Normal), 4 (Low)
        priority_map = {
            2: SprintTask.Priority.HIGH,
            3: SprintTask.Priority.NORMAL,
            4: SprintTask.Priority.LOW
        }
        return priority_map.get(backlog_priority_id, SprintTask.Priority.NORMAL)

    def sync_daily_updates(self):
        """
        Synchronize updated issues from Backlog to SprintPilot across all active projects.
        Uses updatedSince to fetch only recent changes.
        """
        logger.info("Synchronization Started")
        start_time = timezone.now()
        
        # Calculate updatedSince: 24 hours ago
        updated_since = start_time - timedelta(hours=24)
        
        from project.models import Project
        # Only fetch issues for projects that have at least one synced task
        active_project_ids = SprintTask.objects.filter(
            is_deleted=False,
            backlog_task_id__isnull=False
        ).exclude(
            backlog_task_id=''
        ).values_list('sprint__project_id', flat=True).distinct()

        projects = Project.objects.filter(
            id__in=active_project_ids,
            is_deleted=False
        )
        
        total_fetched = 0
        updated_count = 0
        skipped_count = 0
        failed_count = 0

        for project in projects:
            if not project.project_id:
                continue
                
            backlog_client = BacklogService(project_key=project.project_id)
            
            try:
                issues = list(backlog_client.fetch_updated_issues(updated_since=updated_since))
            except Exception as e:
                logger.error(f"API failure during synchronization for project {project.project_id}: {e}")
                continue

            total_fetched += len(issues)
            logger.info(f"Fetched {len(issues)} updated issues from Backlog for project {project.project_id}")

            from django.db import transaction
            try:
                with transaction.atomic():
                    for issue in issues:
                        issue_key = issue.get("issueKey")
                        
                        # Find matching SprintTask, restricting to the current project
                        task = SprintTask.objects.filter(backlog_task_id=issue_key, sprint__project=project).first()
                        if not task:
                            logger.info(f"Skipped Backlog Issue {issue_key} (Task not found in Sprintpilot under project {project.project_id})")
                            skipped_count += 1
                            continue

                        # Update task fields from Backlog
                        task.title = issue.get("summary", task.title)
                        
                        if "description" in issue:
                            raw_desc = issue.get("description") or ""
                            task.description = raw_desc.split("\n\n---")[0] if "\n\n---" in raw_desc else raw_desc

                        status_obj = issue.get("status")
                        if status_obj and "id" in status_obj:
                            task.status = self._map_status(status_obj["id"])

                        priority_obj = issue.get("priority")
                        if priority_obj and "id" in priority_obj:
                            task.priority = self._map_priority(priority_obj["id"])

                        start_date_str = issue.get("startDate")
                        if start_date_str:
                            task.planned_start_date = start_date_str[:10]
                            
                        due_date_str = issue.get("dueDate")
                        if due_date_str:
                            task.planned_end_date = due_date_str[:10]

                        assignee_obj = issue.get("assignee")
                        if assignee_obj and "mailAddress" in assignee_obj:
                            email = assignee_obj["mailAddress"]
                            emp = EmployeeProfile.objects.filter(user__email=email).first()
                            if emp:
                                task.assigned_employee = emp
                                
                        issue_category = issue.get("category")
                        if issue_category and len(issue_category) > 0:
                            cat_obj = issue_category[0]
                            cat_id = str(cat_obj.get("id"))
                            cat_name = cat_obj.get("name")
                            if cat_name:
                                task.category = cat_name
                                try:
                                    from backlog.models import BacklogCategory
                                    b_cat, created = BacklogCategory.objects.get_or_create(
                                        project=project,
                                        name=cat_name,
                                        defaults={'backlog_category_id': cat_id}
                                    )
                                    if not b_cat.backlog_category_id and cat_id:
                                        b_cat.backlog_category_id = cat_id
                                        b_cat.save()
                                except Exception as cat_err:
                                    logger.error(f"Failed to sync category {cat_name}: {cat_err}")

                        task.synced_at = timezone.now()
                        task._skip_sync_validation = True
                        task.save()
                        
                        logger.info(f"Updated SprintTask #{task.id} (Backlog Key: {issue_key})")
                        updated_count += 1
                    
            except Exception as e:
                logger.error(f"Database/Validation failure for project {project.project_id}. Rolling back updates. Error: {e}")
                # The transaction.atomic() block will automatically roll back all DB saves for this project
                failed_count += len(issues) # Consider all issues for this project failed due to rollback

        # Auto-close sprints if all tasks are CLOSED
        from sprints.models import Sprint, SprintTask
        for project in projects:
            sprints = project.sprints.filter(status__in=[Sprint.Status.ACTIVE, Sprint.Status.PLANNED])
            for sprint in sprints:
                tasks = sprint.tasks.filter(is_deleted=False)
                if tasks.exists() and not tasks.exclude(status__in=[SprintTask.Status.CLOSED, SprintTask.Status.RESOLVED]).exists():
                    sprint.status = Sprint.Status.COMPLETED
                    sprint.save()
                    logger.info(f"Auto-closed Sprint #{sprint.id} as all tasks are CLOSED/RESOLVED")

        duration = (timezone.now() - start_time).total_seconds()
        
        logger.info("Synchronization Completed")
        logger.info(f"Duration: {duration:.2f} seconds")
        
        summary = {
            "status": "success",
            "fetched": total_fetched,
            "updated": updated_count,
            "skipped": skipped_count,
            "failed": failed_count,
            "duration_seconds": duration
        }
        
        return summary
