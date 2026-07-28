import logging
from datetime import timedelta
from django.utils import timezone
from backlog.services.backlog_client import BacklogService
from sprints.models import SprintTask
from accounts.models import EmployeeProfile

logger = logging.getLogger(__name__)

class BacklogSyncService:
    def __init__(self):
        self.backlog_client = BacklogService()

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
        Synchronize updated issues from Backlog to SprintPilot.
        Uses updatedSince to fetch only recent changes.
        """
        logger.info("Synchronization Started")
        start_time = timezone.now()
        
        # Calculate updatedSince: 24 hours ago
        updated_since = start_time - timedelta(hours=24)
        
        try:
            issues = list(self.backlog_client.fetch_updated_issues(updated_since=updated_since))
        except Exception as e:
            logger.error(f"API failure during synchronization: {e}")
            return {"status": "error", "message": str(e)}

        logger.info(f"Fetched {len(issues)} updated issues from Backlog")

        updated_count = 0
        skipped_count = 0
        failed_count = 0

        for issue in issues:
            issue_key = issue.get("issueKey")
            
            # Find matching SprintTask
            task = SprintTask.objects.filter(backlog_task_id=issue_key).first()
            if not task:
                logger.info(f"Skipped Backlog Issue {issue_key} (Task not found in Sprintpilot)")
                skipped_count += 1
                continue

            try:
                # Update task fields from Backlog
                task.title = issue.get("summary", task.title)
                
                # Description might contain our appended assignee info, but Backlog is source of truth here
                if "description" in issue:
                    # Strip the extra text we appended in sync_task if necessary, but for now we just take what Backlog gives
                    raw_desc = issue.get("description") or ""
                    task.description = raw_desc.split("\n\n---")[0] if "\n\n---" in raw_desc else raw_desc

                # Status
                status_obj = issue.get("status")
                if status_obj and "id" in status_obj:
                    task.status = self._map_status(status_obj["id"])

                # Priority
                priority_obj = issue.get("priority")
                if priority_obj and "id" in priority_obj:
                    task.priority = self._map_priority(priority_obj["id"])

                # Dates
                start_date_str = issue.get("startDate")
                if start_date_str:
                    task.planned_start_date = start_date_str[:10]
                    
                due_date_str = issue.get("dueDate")
                if due_date_str:
                    task.planned_end_date = due_date_str[:10]

                # Assignee mapping (assuming assignee's email matches Employee.user.email)
                assignee_obj = issue.get("assignee")
                if assignee_obj and "mailAddress" in assignee_obj:
                    email = assignee_obj["mailAddress"]
                    emp = EmployeeProfile.objects.filter(user__email=email).first()
                    if emp:
                        task.assigned_employee = emp

                task.synced_at = timezone.now()
                task._skip_sync_validation = True
                task.save()
                
                logger.info(f"Updated SprintTask #{task.id} (Backlog Key: {issue_key})")
                updated_count += 1
                
            except Exception as e:
                logger.error(f"Database/Validation failure for SprintTask {issue_key}: {e}")
                failed_count += 1

        duration = (timezone.now() - start_time).total_seconds()
        
        logger.info("Synchronization Completed")
        logger.info(f"Duration: {duration:.2f} seconds")
        
        summary = {
            "status": "success",
            "fetched": len(issues),
            "updated": updated_count,
            "skipped": skipped_count,
            "failed": failed_count,
            "duration_seconds": duration
        }
        
        return summary
