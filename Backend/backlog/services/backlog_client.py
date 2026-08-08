import requests
import logging
from decouple import config

logger = logging.getLogger(__name__)

class BacklogService:
    def __init__(self, project_key=None):
        self.workspace_url = config('BACKLOG_WORKSPACE_URL', default='').rstrip('/')
        self.api_key = config('BACKLOG_API_KEY', default='')
        self.project_key = project_key or config('BACKLOG_PROJECT_KEY', default='')
        self.issue_type_id = config('BACKLOG_TASK_ISSUE_TYPE_ID', default='')

        if not all([self.workspace_url, self.api_key, self.project_key]):
            logger.warning("Backlog integration is not fully configured in .env (or missing dynamic project_key).")

    def get_project_issue_types(self):
        """Fetch issue types to find the Task Issue Type ID dynamically if not provided."""
        if not self.workspace_url or not self.api_key:
            return []
            
        url = f"{self.workspace_url}/api/v2/projects/{self.project_key}/issueTypes"
        params = {"apiKey": self.api_key}
        
        try:
            response = requests.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch Backlog issue types: {e}")
            return []

    def _resolve_project_and_issue_type(self):
        types = self.get_project_issue_types()
        if not types:
            return None, None
            
        project_id = types[0].get('projectId')
        
        # Determine issue type ID
        issue_type_id = None
        
        # Check if the env-provided issue type ID is valid for this specific project
        valid_type_ids = [t.get('id') for t in types]
        env_issue_type = int(self.issue_type_id) if self.issue_type_id and str(self.issue_type_id).isdigit() else None
        
        if env_issue_type and env_issue_type in valid_type_ids:
            issue_type_id = env_issue_type
        else:
            for itype in types:
                if 'task' in itype.get('name', '').lower():
                    issue_type_id = itype.get('id')
                    break
            if not issue_type_id and types:
                issue_type_id = types[0].get('id')
                
        return project_id, issue_type_id

    def _get_or_create_version(self, project_id, version_name):
        if not version_name:
            return None
        url = f"{self.workspace_url}/api/v2/projects/{self.project_key}/versions"
        params = {"apiKey": self.api_key}
        try:
            res = requests.get(url, params=params)
            res.raise_for_status()
            versions = res.json()
            for v in versions:
                if v.get('name') == version_name:
                    return v.get('id')
            
            # Create version
            payload = {"name": version_name}
            res_post = requests.post(url, params=params, data=payload, headers={"Content-Type": "application/x-www-form-urlencoded"})
            res_post.raise_for_status()
            return res_post.json().get('id')
        except Exception as e:
            logger.error(f"Failed to get or create Backlog version: {e}")
            return None

    def _get_assignee_id(self, employee_email):
        if not employee_email:
            return None
        url = f"{self.workspace_url}/api/v2/projects/{self.project_key}/users"
        params = {"apiKey": self.api_key}
        try:
            res = requests.get(url, params=params)
            res.raise_for_status()
            users = res.json()
            for u in users:
                if u.get('mailAddress') == employee_email:
                    return u.get('id')
            return None
        except Exception as e:
            logger.error(f"Failed to get Backlog assignee ID for {employee_email}: {e}")
            return None

    def _get_or_create_category(self, category_name):
        if not category_name:
            return None
        url = f"{self.workspace_url}/api/v2/projects/{self.project_key}/categories"
        params = {"apiKey": self.api_key}
        try:
            res = requests.get(url, params=params)
            res.raise_for_status()
            categories = res.json()
            for c in categories:
                if c.get('name', '').lower() == category_name.lower():
                    return c.get('id')
            
            # Create category if not found
            payload = {"name": category_name}
            res_post = requests.post(url, params=params, data=payload, headers={"Content-Type": "application/x-www-form-urlencoded"})
            res_post.raise_for_status()
            return res_post.json().get('id')
        except Exception as e:
            logger.error(f"Failed to get or create Backlog category '{category_name}': {e}")
            return None

    def fetch_project_categories(self):
        """Fetch all categories for the project from Backlog API."""
        if not self.workspace_url or not self.api_key:
            raise ValueError("Backlog configuration missing.")

        url = f"{self.workspace_url}/api/v2/projects/{self.project_key}/categories"
        params = {"apiKey": self.api_key}
        
        try:
            res = requests.get(url, params=params)
            res.raise_for_status()
            return res.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch categories from Backlog for project {self.project_key}: {e}")
            return []

    def sync_task(self, task, backlog_project_id=None):
        if not self.workspace_url or not self.api_key:
            raise ValueError("Backlog configuration missing.")

        url = f"{self.workspace_url}/api/v2/issues"
        
        # Resolve Numeric Project ID and Issue Type ID
        project_id, issue_type_id = self._resolve_project_and_issue_type()
        if not project_id or not issue_type_id:
            raise ValueError("Could not resolve Numeric Project ID or Issue Type ID from Backlog API.")

        # Prepare description with assignee details
        extra_info = []
        if task.assigned_employee:
            extra_info.append(f"*Assigned in Sprintpilot to: {task.assigned_employee.user.full_name} ({task.assigned_employee.user.email})*")
        
        if task.category:
            extra_info.append(f"*Category: {task.category}*")
            
        if task.planned_start_date:
            extra_info.append(f"*Start Date: {task.planned_start_date.isoformat()}*")
            
        if task.planned_end_date:
            extra_info.append(f"*End Date: {task.planned_end_date.isoformat()}*")
            
        if task.jira_id:
            extra_info.append(f"*Jira ID: {task.jira_id}*")

        extra_text = "\n".join(extra_info)
        description = f"{task.description or ''}\n\n---\n{extra_text}"
        
        # Map priority
        priority_map = {
            'LOW': 4,
            'NORMAL': 3,
            'HIGH': 2,
            'CRITICAL': 2
        }
        task_priority = getattr(task, 'priority', 'NORMAL').upper()
        priority_id = priority_map.get(task_priority, 3)
        
        # Map status
        status_map = {
            'OPEN': 1,
            'IN_PROGRESS': 2,
            'RESOLVED': 3,
            'CLOSED': 4
        }
        task_status = getattr(task, 'status', 'OPEN').upper()
        
        payload = {
            "projectId": backlog_project_id or project_id,
            "summary": task.title,
            "description": description,
            "issueTypeId": issue_type_id,
            "startDate": task.planned_start_date.isoformat() if task.planned_start_date else None,
            "dueDate": task.planned_end_date.isoformat() if task.planned_end_date else None,
            "estimatedHours": float(task.estimated_hours) if task.estimated_hours else None,
            "priorityId": priority_id
        }

        # Add milestone if sprint is available
        if hasattr(task, 'sprint') and task.sprint:
            milestone_name = getattr(task.sprint, 'milestone', getattr(task.sprint, 'name', None))
            if milestone_name:
                version_id = self._get_or_create_version(project_id, milestone_name)
                if version_id:
                    payload["milestoneId[]"] = version_id

        # Map Assignee
        if task.assigned_employee and task.assigned_employee.user:
            assignee_id = self._get_assignee_id(task.assigned_employee.user.email)
            if assignee_id:
                payload["assigneeId"] = assignee_id

        # Map Category
        if task.category:
            cat_list = [c.strip() for c in task.category.split(',')]
            category_ids = []
            for cat_name in cat_list:
                cat_id = self._get_or_create_category(cat_name)
                if cat_id:
                    category_ids.append(cat_id)
            if category_ids:
                payload["categoryId[]"] = category_ids
        
        # Remove None values
        payload = {k: v for k, v in payload.items() if v is not None}

        params = {"apiKey": self.api_key}
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        try:
            response = requests.post(url, params=params, data=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            issue_key = data.get("issueKey")
            
            # Since Backlog does not allow setting statusId on creation,
            # we must patch it immediately after creation if the status is not OPEN.
            target_status = status_map.get(task_status, 1)
            if issue_key and target_status != 1:
                patch_url = f"{self.workspace_url}/api/v2/issues/{issue_key}"
                patch_payload = {"statusId": target_status}
                try:
                    requests.patch(patch_url, params=params, data=patch_payload, headers=headers)
                except Exception as patch_e:
                    logger.warning(f"Failed to set initial status for newly created task {issue_key}: {patch_e}")
                    
            return issue_key
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to sync task to Backlog: {e}")
            if e.response is not None:
                logger.error(f"Backlog response: {e.response.text}")
            raise Exception(f"Failed to sync to Backlog: {e}")

    def update_task(self, task):
        if not self.workspace_url or not self.api_key:
            raise ValueError("Backlog configuration missing.")

        if not task.backlog_task_id:
            raise ValueError("Task does not have a Backlog Issue ID to update.")

        url = f"{self.workspace_url}/api/v2/issues/{task.backlog_task_id}"

        # Prepare description with assignee details
        extra_info = []
        if task.assigned_employee:
            extra_info.append(f"*Assigned in Sprintpilot to: {task.assigned_employee.user.full_name} ({task.assigned_employee.user.email})*")
        
        if task.category:
            extra_info.append(f"*Category: {task.category}*")
            
        if task.planned_start_date:
            extra_info.append(f"*Start Date: {task.planned_start_date.isoformat()}*")
            
        if task.planned_end_date:
            extra_info.append(f"*End Date: {task.planned_end_date.isoformat()}*")
            
        if task.jira_id:
            extra_info.append(f"*Jira ID: {task.jira_id}*")

        extra_text = "\n".join(extra_info)
        description = f"{task.description or ''}\n\n---\n{extra_text}"
        
        # Map priority
        priority_map = {
            'LOW': 4,
            'NORMAL': 3,
            'HIGH': 2,
            'CRITICAL': 2
        }
        task_priority = getattr(task, 'priority', 'NORMAL').upper()
        priority_id = priority_map.get(task_priority, 3)
        
        # Map status
        status_map = {
            'OPEN': 1,
            'IN_PROGRESS': 2,
            'RESOLVED': 3,
            'CLOSED': 4
        }
        task_status = getattr(task, 'status', 'OPEN').upper()
        
        payload = {
            "summary": task.title,
            "description": description,
            "startDate": task.planned_start_date.isoformat() if task.planned_start_date else "",
            "dueDate": task.planned_end_date.isoformat() if task.planned_end_date else "",
            "estimatedHours": float(task.estimated_hours) if task.estimated_hours else "",
            "priorityId": priority_id,
            "statusId": status_map.get(task_status, 1)
        }

        # Add milestone if sprint is available
        if hasattr(task, 'sprint') and task.sprint:
            project_id, _ = self._resolve_project_and_issue_type()
            milestone_name = getattr(task.sprint, 'milestone', getattr(task.sprint, 'name', None))
            if project_id and milestone_name:
                version_id = self._get_or_create_version(project_id, milestone_name)
                if version_id:
                    payload["milestoneId[]"] = version_id
        
        # Map Assignee
        if task.assigned_employee and task.assigned_employee.user:
            assignee_id = self._get_assignee_id(task.assigned_employee.user.email)
            if assignee_id:
                payload["assigneeId"] = assignee_id

        # Map Category
        if task.category:
            category_id = self._get_or_create_category(task.category)
            if category_id:
                payload["categoryId[]"] = category_id

        params = {"apiKey": self.api_key}
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        try:
            response = requests.patch(url, params=params, data=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data.get("issueKey")
        except requests.exceptions.RequestException as e:
            if e.response is not None:
                err_text = e.response.text
                # Backlog API throws "No comment content." (code: 7) if the PATCH payload
                # contains exactly the same values as the current issue and no comment is provided.
                if '"code":7' in err_text or '"code": 7' in err_text:
                    logger.info(f"Task '{task.title}' update ignored by Backlog because there were no changes.")
                    raise Exception("NO_CHANGES_DETECTED")
                    
                logger.error(f"Backlog response: {err_text}")
            logger.error(f"Failed to update task in Backlog: {e}")
            raise Exception(f"Failed to update task in Backlog: {e}")

    def delete_issue(self, backlog_task_id):
        if not self.workspace_url or not self.api_key:
            raise ValueError("Backlog configuration missing.")

        if not backlog_task_id:
            raise ValueError("No Backlog Issue ID provided to delete.")

        url = f"{self.workspace_url}/api/v2/issues/{backlog_task_id}"
        params = {"apiKey": self.api_key}

        try:
            response = requests.delete(url, params=params)
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            if e.response is not None:
                err_text = e.response.text
                logger.error(f"Backlog response on delete: {err_text}")
                # If it's already deleted or not found, we could ignore it or raise
                if e.response.status_code == 404:
                    logger.warning(f"Backlog task {backlog_task_id} not found on delete. Assuming already deleted.")
                    return True
            logger.error(f"Failed to delete task {backlog_task_id} in Backlog: {e}")
            raise Exception(f"Failed to delete task in Backlog: {e}")

    def fetch_updated_issues(self, updated_since=None):
        """
        Fetch issues updated since a given timestamp.
        Returns a generator of issue dictionaries, handling pagination automatically.
        :param updated_since: datetime object or ISO-8601 string (e.g. '2023-10-25T14:00:00Z')
        """
        if not self.workspace_url or not self.api_key:
            raise ValueError("Backlog configuration missing.")

        project_id, _ = self._resolve_project_and_issue_type()
        if not project_id:
            logger.warning(f"Could not resolve project ID for project key: {self.project_key}")
            return []

        url = f"{self.workspace_url}/api/v2/issues"
        params = {
            "apiKey": self.api_key,
            "projectId[]": project_id,
            "count": 100, # Max allowed per Backlog API docs is typically 100
            "sort": "updated",
            "order": "asc"
        }

        if updated_since:
            if hasattr(updated_since, 'strftime'):
                # Backlog API expects updatedSince in yyyy-MM-dd format or ISO-8601 depending on the exact filter, 
                # but standard updatedSince is often ISO format like 2014-02-27. Let's pass ISO format date string
                params["updatedSince"] = updated_since.strftime('%Y-%m-%d')

        offset = 0
        while True:
            params["offset"] = offset
            try:
                response = requests.get(url, params=params)
                response.raise_for_status()
                issues = response.json()
                
                if not issues:
                    break
                    
                for issue in issues:
                    yield issue
                    
                if len(issues) < 100:
                    break # Last page
                    
                offset += 100
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Failed to fetch updated issues from Backlog: {e}")
                if getattr(e, 'response', None) is not None:
                    logger.error(f"Backlog response: {e.response.text}")
                raise Exception(f"Failed to fetch updated issues from Backlog: {e}")
