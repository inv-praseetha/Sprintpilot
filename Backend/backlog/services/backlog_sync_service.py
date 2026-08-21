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
        
        # Calculate updatedSince: 24 hours ago (Safest window for irregular daily schedules)
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
            
            # Fetch categories from Project Settings and ONLY insert the newly created ones
            try:
                project_categories = backlog_client.fetch_project_categories()
                from backlog.models import BacklogCategory
                new_categories_count = 0
                for cat in project_categories:
                    cat_id = str(cat.get('id'))
                    cat_name = cat.get('name')
                    if cat_id and cat_name:
                        # Use get_or_create by ID: ignores existing ones, only creates new ones
                        b_cat, created = BacklogCategory.objects.get_or_create(
                            project=project,
                            backlog_category_id=cat_id,
                            defaults={'name': cat_name}
                        )
                        if created:
                            new_categories_count += 1
                if new_categories_count > 0:
                    logger.info(f"Added {new_categories_count} newly created categories from Backlog for project {project.project_id}")
            except Exception as e:
                logger.error(f"Failed to sync categories directly from Backlog for project {project.project_id}: {e}")
                
            try:
                issues = list(backlog_client.fetch_updated_issues(updated_since=updated_since))
            except Exception as e:
                logger.error(f"API failure during synchronization for project {project.project_id}: {e}")
                continue

            total_fetched += len(issues)
            logger.info(f"Fetched {len(issues)} updated issues from Backlog for project {project.project_id}")

            from django.db import transaction
            for issue in issues:
                issue_key = issue.get("issueKey")
                try:
                    with transaction.atomic():
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
                                    if cat_id:
                                        b_cat, created = BacklogCategory.objects.get_or_create(
                                            project=project,
                                            backlog_category_id=cat_id,
                                            defaults={'name': cat_name}
                                        )
                                    else:
                                        # Fallback if no ID is present
                                        b_cat, created = BacklogCategory.objects.get_or_create(
                                            project=project,
                                            name=cat_name
                                        )
                                except Exception as cat_err:
                                    logger.error(f"Failed to sync category {cat_name}: {cat_err}")

                        task.synced_at = timezone.now()
                        task._skip_sync_validation = True
                        task.save()
                        
                        logger.info(f"Updated SprintTask #{task.id} (Backlog Key: {issue_key})")
                        updated_count += 1
                except Exception as e:
                    logger.error(f"Database/Validation failure for Backlog Issue {issue_key}. Error: {e}")
                    failed_count += 1

        # Auto-close sprints if all tasks are CLOSED
        from sprints.models import Sprint
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
        
        # Sync comments for all active/planned sprints
        for project in projects:
            sprints = project.sprints.filter(status__in=[Sprint.Status.ACTIVE, Sprint.Status.PLANNED])
            for sprint in sprints:
                try:
                    self.sync_sprint_comments(sprint)
                except Exception as e:
                    logger.error(f"Failed to sync comments for Sprint #{sprint.id}: {e}")

        summary = {
            "status": "success",
            "fetched": total_fetched,
            "updated": updated_count,
            "skipped": skipped_count,
            "failed": failed_count,
            "duration_seconds": duration
        }
        
        return summary

    def push_sprint_to_backlog(self, sprint, task_ids=None):
        backlog_service = BacklogService(project_key=sprint.project.project_id)
        
        try:
            project_id, _ = backlog_service._resolve_project_and_issue_type()
            if project_id:
                version_id = backlog_service._get_or_create_version(project_id, sprint.milestone)
                sprint.backlog_project_id = project_id
                sprint.backlog_version_id = version_id
                sprint.save(update_fields=['backlog_project_id', 'backlog_version_id'])
        except Exception:
            pass

        created_count = 0
        updated_count = 0
        up_to_date_count = 0
        errors = []

        if task_ids:
            tasks = sprint.tasks.filter(id__in=task_ids, is_deleted=False)
        else:
            tasks = sprint.tasks.filter(is_deleted=False)

        import concurrent.futures
        from django.db import connection

        def process_task(task):
            res = {"created_count": 0, "updated_count": 0, "up_to_date_count": 0, "error": None}
            try:
                if not task.backlog_task_id:
                    try:
                        issue_key = backlog_service.sync_task(task)
                        if issue_key:
                            task.backlog_task_id = issue_key
                            task.save()
                            task.synced_at = task.updated_at
                            task.save(update_fields=['synced_at'])
                            res["created_count"] = 1
                    except Exception as e:
                        res["error"] = f"Task '{task.title}' (Create): {str(e)}"
                else:
                    try:
                        count = backlog_service.get_issue_comments_count(task.backlog_task_id)
                        if task.comment_count != count:
                            task.comment_count = count
                            task.save(update_fields=['comment_count'])
                    except Exception:
                        pass

                    if task.synced_at is not None and task.updated_at <= task.synced_at:
                        res["up_to_date_count"] = 1
                        return res
                        
                    try:
                        issue_key = backlog_service.update_task(task)
                        if issue_key:
                            task.save()
                            task.synced_at = task.updated_at
                            task.save(update_fields=['synced_at'])
                            res["updated_count"] = 1
                    except Exception as e:
                        if str(e) == "NO_CHANGES_DETECTED":
                            task.save()
                            task.synced_at = task.updated_at
                            task.save(update_fields=['synced_at'])
                            res["up_to_date_count"] = 1
                        else:
                            res["error"] = f"Task '{task.title}' (Update): {str(e)}"
            finally:
                connection.close()
            return res

        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(process_task, task) for task in tasks]
            for future in concurrent.futures.as_completed(futures):
                try:
                    res = future.result()
                    created_count += res["created_count"]
                    updated_count += res["updated_count"]
                    up_to_date_count += res["up_to_date_count"]
                    if res["error"]:
                        errors.append(res["error"])
                except Exception as e:
                    errors.append(f"Thread error: {str(e)}")

        return {
            "created_count": created_count,
            "updated_count": updated_count,
            "up_to_date_count": up_to_date_count,
            "errors": errors
        }

    def sync_sprint_comments(self, sprint):
        backlog_service = BacklogService(project_key=sprint.project.project_id)
        
        tasks = sprint.tasks.exclude(backlog_task_id__isnull=True).exclude(backlog_task_id__exact='')
        updated_counts = {}

        for task in tasks:
            try:
                comments_data = backlog_service.get_issue_comments(task.backlog_task_id)
                valid_comments = [c for c in comments_data if c.get('content') and str(c.get('content')).strip()]
                # Guarantee oldest-first ordering so our index logic works perfectly
                valid_comments.sort(key=lambda x: x.get('created', ''))
                count = len(valid_comments)
                
                first_unread_id = None
                if task.read_comment_count < count:
                    first_unread_id = str(valid_comments[task.read_comment_count].get('id'))

                update_fields = []
                if task.comment_count != count:
                    task.comment_count = count
                    update_fields.append('comment_count')
                    
                if task.first_unread_comment_id != first_unread_id:
                    task.first_unread_comment_id = first_unread_id
                    update_fields.append('first_unread_comment_id')
                    
                if update_fields:
                    task.save(update_fields=update_fields)

                updated_counts[str(task.id)] = {
                    "count": count,
                    "first_unread_id": first_unread_id
                }
            except Exception:
                pass

        return updated_counts
