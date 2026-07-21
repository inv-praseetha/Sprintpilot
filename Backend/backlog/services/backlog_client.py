import requests
import logging
from decouple import config

logger = logging.getLogger(__name__)

class BacklogService:
    def __init__(self):
        self.workspace_url = config('BACKLOG_WORKSPACE_URL', default='').rstrip('/')
        self.api_key = config('BACKLOG_API_KEY', default='')
        self.project_key = config('BACKLOG_PROJECT_KEY', default='')
        self.issue_type_id = config('BACKLOG_TASK_ISSUE_TYPE_ID', default='')

        if not all([self.workspace_url, self.api_key, self.project_key]):
            logger.warning("Backlog integration is not fully configured in .env.")

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
        # if the user provided it in env, use it (making sure it's an int)
        if self.issue_type_id and str(self.issue_type_id).isdigit():
            issue_type_id = int(self.issue_type_id)
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
        
        # Remove None values
        payload = {k: v for k, v in payload.items() if v is not None}

        params = {"apiKey": self.api_key}
        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        try:
            response = requests.post(url, params=params, data=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data.get("issueKey")
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to sync task to Backlog: {e}")
            if e.response is not None:
                logger.error(f"Backlog response: {e.response.text}")
            raise Exception(f"Failed to sync to Backlog: {e}")

