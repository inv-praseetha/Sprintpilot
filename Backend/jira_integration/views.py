import os
import requests
import django.core.exceptions
from django.shortcuts import redirect
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import JiraOAuthToken
from decouple import config
import json
import urllib.parse
from django.utils import timezone
from datetime import timedelta

def extract_text_from_adf(node):
    """
    Recursively extracts plain text from Atlassian Document Format (ADF).
    """
    if not isinstance(node, dict):
        return ""
    
    text = ""
    if node.get("type") == "text":
        text += node.get("text", "")
    
    if "content" in node and isinstance(node["content"], list):
        for child in node["content"]:
            text += extract_text_from_adf(child)
            if child.get("type") in ["paragraph", "bulletList", "orderedList"]:
                text += "\n"
                
    return text.strip()

def check_project_access(user, project):
    """
    Checks if the given user is the creator, team lead, or a member of the project.
    """
    if project.created_by == user or project.team_lead == user:
        return True
    return project.members.filter(employee_profile__user=user).exists()

class JiraAuthUrlView(APIView):
    """
    Returns the Atlassian OAuth authorization URL.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        client_id = config("JIRA_CLIENT_ID", default=None)
        redirect_uri = config("JIRA_REDIRECT_URI", default="http://localhost:5173/jira/callback")
        
        if not client_id:
            return Response({"detail": "Jira OAuth is not configured on the backend."}, status=status.HTTP_501_NOT_IMPLEMENTED)

        import secrets
        from django.core.cache import cache
        
        state = secrets.token_urlsafe(32)
        # Store state in cache for 10 minutes, bound to user id
        cache.set(f"jira_oauth_state_{request.user.id}", state, timeout=600)
        
        # Scopes required to read Jira issues
        scopes = "read:jira-work read:jira-user offline_access"
        
        params = {
            "audience": "api.atlassian.com",
            "client_id": client_id,
            "scope": scopes,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "prompt": "consent",
            "state": state
        }
        
        auth_url = f"https://auth.atlassian.com/authorize?{urllib.parse.urlencode(params)}"
        return Response({"auth_url": auth_url}, status=status.HTTP_200_OK)


class JiraTokenExchangeView(APIView):
    """
    Exchanges the OAuth authorization code for an access token and stores it.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        code = request.data.get("code")
        state = request.data.get("state")
        
        if not code or not state:
            return Response({"detail": "Authorization code and state are required."}, status=status.HTTP_400_BAD_REQUEST)

        from django.core.cache import cache
        expected_state = cache.get(f"jira_oauth_state_{request.user.id}")
        if not expected_state or expected_state != state:
            return Response({"detail": "Invalid or expired state parameter. Security validation failed."}, status=status.HTTP_400_BAD_REQUEST)
        
        cache.delete(f"jira_oauth_state_{request.user.id}")

        client_id = config("JIRA_CLIENT_ID", default=None)
        client_secret = config("JIRA_CLIENT_SECRET", default=None)
        redirect_uri = config("JIRA_REDIRECT_URI", default="http://localhost:5173/jira/callback")

        if not client_id or not client_secret:
            return Response({"detail": "Jira OAuth credentials are not configured."}, status=status.HTTP_501_NOT_IMPLEMENTED)

        token_url = "https://auth.atlassian.com/oauth/token"
        payload = {
            "grant_type": "authorization_code",
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri
        }

        try:
            res = requests.post(token_url, json=payload)
            if res.status_code != 200:
                return Response({"detail": f"Failed to exchange token: {res.text}"}, status=status.HTTP_400_BAD_REQUEST)

            data = res.json()
            access_token = data.get("access_token")
            refresh_token = data.get("refresh_token")
            expires_in = data.get("expires_in", 3600)
            
            expires_at = timezone.now() + timedelta(seconds=expires_in)

            # Get the accessible resources (Cloud ID)
            resources_url = "https://api.atlassian.com/oauth/token/accessible-resources"
            headers = {"Authorization": f"Bearer {access_token}"}
            res_resources = requests.get(resources_url, headers=headers)
            
            if res_resources.status_code != 200:
                return Response({"detail": "Failed to fetch Atlassian resources."}, status=status.HTTP_400_BAD_REQUEST)

            resources = res_resources.json()
            if not resources:
                return Response({"detail": "No accessible Jira Cloud resources found for this user."}, status=status.HTTP_400_BAD_REQUEST)

            # Get the first available cloud_id
            cloud_id = resources[0].get("id")
            workspace_url = resources[0].get("url")

            # Save to Database (Singleton)
            JiraOAuthToken.objects.all().delete() # Clear existing tokens
            JiraOAuthToken.objects.create(
                access_token=access_token,
                refresh_token=refresh_token,
                cloud_id=cloud_id,
                workspace_url=workspace_url,
                expires_at=expires_at
            )

            return Response({"detail": "Jira account connected successfully."}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class JiraFetchTasksView(APIView):
    """
    Fetches tasks from Jira using the stored OAuth 2.0 token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        project_key = request.data.get('project_key')
        sprint_name = request.data.get('sprint_name')
        
        if not project_key:
            return Response({"detail": "Jira Project Key is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not sprint_name:
            return Response({"detail": "Jira Sprint Name is required."}, status=status.HTTP_400_BAD_REQUEST)

        from project.models import Project
        from django.db.models import Q
        project = Project.objects.filter(Q(project_id=project_key) | Q(jira_id=project_key), is_deleted=False).first()
        
        if not project:
            return Response({"detail": f"Project '{project_key}' not found in SprintPilot."}, status=status.HTTP_404_NOT_FOUND)
            
        if not check_project_access(request.user, project):
            return Response({"detail": "You do not have permission to access this project."}, status=status.HTTP_403_FORBIDDEN)
            
        # Retrieve token from DB
        token_obj = JiraOAuthToken.objects.first()
        if not token_obj:
            return Response(
                {"detail": "Jira account is not connected. Please connect Jira first.", "auth_required": True},
                status=status.HTTP_401_UNAUTHORIZED
            )

        search_url = f"https://api.atlassian.com/ex/jira/{token_obj.cloud_id}/rest/api/3/search/jql"
        headers = {
            "Authorization": f"Bearer {token_obj.access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        jql = f"project={project_key}"
        if sprint_name:
            jql += f' AND sprint="{sprint_name}"'
        jql += " ORDER BY created DESC"
            
        payload = {
            "jql": jql,
            "maxResults": 100,
            "fields": ["summary", "description", "issuetype"]
        }
        
        try:
            res = requests.post(search_url, json=payload, headers=headers)
            is_unauthorized = res.status_code == 401 or "Unauthorized" in res.text or '"code":401' in res.text
            
            if is_unauthorized:
                JiraOAuthToken.objects.all().delete()
                return Response(
                    {"detail": "Jira connection expired. Please reconnect.", "auth_required": True}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )

            if res.status_code == 404:
                return Response({"detail": f"Jira Project Key '{project_key}' not found or inaccessible."}, status=status.HTTP_404_NOT_FOUND)
            if res.status_code != 200:
                return Response({"detail": f"Failed to fetch Jira tasks: {res.text}"}, status=status.HTTP_400_BAD_REQUEST)
            
            data = res.json()
            issues = data.get("issues", [])
            
            if not issues:
                return Response({"tasks": [], "message": "No tasks found in Jira matching the specified Project Key and Sprint Name."}, status=status.HTTP_200_OK)
                
            from sprints.models import SprintTask
            fetched_jira_ids = [issue.get("key") for issue in issues if issue.get("key")]
            
            # Check if any of these tasks already exist in the system for this project
            existing_tasks_count = SprintTask.objects.filter(jira_id__in=fetched_jira_ids, is_deleted=False).count()
            if existing_tasks_count > 0:
                return Response({
                    "detail": f"This Jira sprint (or its tasks) has already been imported. To fetch newly created tasks, please use the 'Fetch from Jira' button inside the Sprint Details page.",
                    "auth_required": False
                }, status=status.HTTP_400_BAD_REQUEST)
            
            tasks = []
            for issue in issues:
                jira_id = issue.get("key")
                    
                fields = issue.get("fields", {})
                issue_type = fields.get("issuetype", {}).get("name", "").upper()
                
                desc = fields.get("description")
                if not desc:
                    desc = "No description provided."
                elif isinstance(desc, dict):
                    extracted = extract_text_from_adf(desc)
                    desc = extracted if extracted else "No description provided."

                category = "UI"
                if "BACKEND" in issue_type or "SERVER" in issue_type:
                    category = "BACKEND"
                elif "BUG" in issue_type or "QA" in issue_type:
                    category = "QA"
                elif "INFRA" in issue_type or "OPS" in issue_type or "TASK" in issue_type:
                    category = "INFRA"

                tasks.append({
                    "title": fields.get("summary", "Untitled Task"),
                    "desc": str(desc),
                    "category": category,
                    "status": "OPEN",
                    "jiraId": jira_id
                })
            
            return Response({"tasks": tasks}, status=status.HTTP_200_OK)
            
        except requests.exceptions.RequestException as e:
            return Response({"detail": f"Network error connecting to Jira: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)

class JiraSprintSyncView(APIView):
    """
    Syncs an existing Sprint in SprintPilot with Jira, importing any new tasks.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, sprint_id, *args, **kwargs):
        from sprints.models import Sprint, SprintTask
        
        try:
            sprint = Sprint.objects.get(id=sprint_id)
        except Sprint.DoesNotExist:
            return Response({"detail": "Sprint not found."}, status=status.HTTP_404_NOT_FOUND)

        if not check_project_access(request.user, sprint.project):
            return Response({"detail": "You do not have permission to access this sprint."}, status=status.HTTP_403_FORBIDDEN)
            
        token_obj = JiraOAuthToken.objects.first()
        if not token_obj:
            return Response(
                {"detail": "Jira account is not connected. Please connect Jira first.", "auth_required": True},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        project_key = sprint.project.jira_id or sprint.project.project_id
        override_name = request.data.get('sprint_name')
        sprint_name = override_name or sprint.backlog_version_id or sprint.milestone
        
        # Ensure we don't use purely numeric sprint names as defaults if they were accidentally saved
        if sprint.backlog_version_id and sprint.backlog_version_id.isdigit() and not override_name:
            sprint_name = sprint.milestone

        
        search_url = f"https://api.atlassian.com/ex/jira/{token_obj.cloud_id}/rest/api/3/search/jql"
        headers = {
            "Authorization": f"Bearer {token_obj.access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        jql = f'project="{project_key}" AND sprint="{sprint_name}" ORDER BY created DESC'
        payload = {
            "jql": jql,
            "maxResults": 100,
            "fields": ["summary", "description", "issuetype"]
        }
        
        try:
            res = requests.post(search_url, json=payload, headers=headers)
            is_unauthorized = res.status_code == 401 or "Unauthorized" in res.text or '"code":401' in res.text
            
            if is_unauthorized:
                JiraOAuthToken.objects.all().delete()
                return Response(
                    {"detail": "Jira connection expired. Please reconnect.", "auth_required": True}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
            if res.status_code != 200:
                return Response({"detail": f"Failed to fetch from Jira: {res.text}"}, status=status.HTTP_400_BAD_REQUEST)

                
            data = res.json()
            issues = data.get("issues", [])
            
            # Fallback for older sprints where backlog_version_id wasn't saved 
            # and milestone name might be prefixed with project key
            if not issues and not sprint.backlog_version_id:
                clean_name = sprint.milestone.replace(f"{project_key} ", "").strip()
                if clean_name != sprint.milestone:
                    fallback_jql = f'project="{project_key}" AND sprint="{clean_name}" ORDER BY created DESC'
                    payload["jql"] = fallback_jql
                    fallback_res = requests.post(search_url, json=payload, headers=headers)
                    if fallback_res.status_code == 200:
                        issues = fallback_res.json().get("issues", [])

            # Ultimate Fallback 1: Auto-detect tasks from ANY currently active open sprint for this project
            if not issues and not sprint.backlog_version_id:
                fallback_jql = f'project="{project_key}" AND sprint in openSprints() ORDER BY created DESC'
                payload["jql"] = fallback_jql
                fallback_res = requests.post(search_url, json=payload, headers=headers)
                if fallback_res.status_code == 200:
                    issues = fallback_res.json().get("issues", [])

            # Save the successful sprint name if an override was provided
            if issues and override_name and override_name != sprint.backlog_version_id:
                sprint.backlog_version_id = override_name
                sprint.save(update_fields=['backlog_version_id'])

            if not issues:
                return Response({"detail": "No tasks found in Jira for this sprint."}, status=status.HTTP_200_OK)
                
            fetched_jira_ids = [issue.get("key") for issue in issues if issue.get("key")]
            existing_jira_ids = set(SprintTask.objects.filter(sprint=sprint, jira_id__in=fetched_jira_ids, is_deleted=False).values_list('jira_id', flat=True))
            
            new_tasks = []
            for issue in issues:
                jira_id = issue.get("key")
                if jira_id in existing_jira_ids:
                    continue
                    
                fields = issue.get("fields", {})
                issue_type = fields.get("issuetype", {}).get("name", "").upper()
                desc = fields.get("description")
                if not desc:
                    desc = "No description provided."
                elif isinstance(desc, dict):
                    extracted = extract_text_from_adf(desc)
                    desc = extracted if extracted else "No description provided."
                    
                category = "UI"
                if "BACKEND" in issue_type or "SERVER" in issue_type:
                    category = "BACKEND"
                elif "BUG" in issue_type or "QA" in issue_type:
                    category = "QA"
                elif "INFRA" in issue_type or "OPS" in issue_type or "TASK" in issue_type:
                    category = "INFRA"
                    
                new_tasks.append({
                    "title": fields.get("summary", "Untitled Task"),
                    "description": str(desc),
                    "category": category,
                    "jiraId": jira_id
                })
                
            if len(new_tasks) > 0:
                return Response({"tasks": new_tasks, "detail": f"Found {len(new_tasks)} new tasks in Jira.", "sprint_name": sprint.backlog_version_id or sprint.milestone}, status=status.HTTP_200_OK)
            else:
                return Response({"tasks": [], "detail": "Sprint is already up to date with Jira. No new tasks found.", "sprint_name": sprint.backlog_version_id or sprint.milestone}, status=status.HTTP_200_OK)
                
        except Exception as e:
            return Response({"detail": f"An error occurred during Jira sync: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class JiraSprintAppendView(APIView):
    """
    Appends newly selected Jira tasks to an existing Sprint.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, sprint_id, *args, **kwargs):
        from sprints.models import Sprint, SprintTask
        from accounts.models import EmployeeProfile
        
        try:
            sprint = Sprint.objects.get(id=sprint_id)
        except Sprint.DoesNotExist:
            return Response({"detail": "Sprint not found."}, status=status.HTTP_404_NOT_FOUND)

        if not check_project_access(request.user, sprint.project):
            return Response({"detail": "You do not have permission to access this sprint."}, status=status.HTTP_403_FORBIDDEN)
            
        sprint_name_override = request.data.get("sprint_name")
        if sprint_name_override and sprint.backlog_version_id != sprint_name_override:
            sprint.backlog_version_id = sprint_name_override
            sprint.save(update_fields=['backlog_version_id'])
            
        tasks_data = request.data.get("tasks", [])
        if not tasks_data:
            return Response({"detail": "No tasks provided to append."}, status=status.HTTP_400_BAD_REQUEST)
            
        new_tasks_created = 0
        for task_item in tasks_data:
            assignee_id = task_item.get("assignee")
            assignee_profile = None
            if assignee_id:
                try:
                    assignee_profile = EmployeeProfile.objects.get(id=assignee_id)
                except EmployeeProfile.DoesNotExist:
                    pass

            start_date_str = task_item.get("startDate") or None
            end_date_str = task_item.get("endDate") or None
            
            story_points = None
            estimated_hours = None
            if start_date_str and end_date_str:
                from sprints.services.schedule_service import calculate_working_days
                holidays = list(sprint.holidays.values_list('date', flat=True))
                wd = calculate_working_days(start_date_str, end_date_str, holidays=holidays)
                story_points = wd * 2
                estimated_hours = wd * 8

            cat_val = task_item.get("category", "UI")
            if isinstance(cat_val, list):
                cat_val = ", ".join(cat_val)

            try:
                SprintTask.objects.create(
                    sprint=sprint,
                    assigned_employee=assignee_profile,
                    title=task_item.get("title", "Untitled Task"),
                    description=task_item.get("description", "No description provided."),
                    category=cat_val,
                    status=task_item.get("status", "OPEN").upper(),
                    priority=task_item.get("priority", "NORMAL").upper(),
                    jira_id=task_item.get("jiraId", ""),
                    planned_start_date=start_date_str,
                    planned_end_date=end_date_str,
                    story_points=story_points,
                    estimated_hours=estimated_hours
                )
                new_tasks_created += 1
            except django.core.exceptions.ValidationError as e:
                return Response({"detail": f"Validation Error on task '{task_item.get('title')}': {str(e.message_dict if hasattr(e, 'message_dict') else e.messages)}"}, status=status.HTTP_400_BAD_REQUEST)
                
        return Response({"detail": f"Successfully appended {new_tasks_created} tasks to the sprint!"}, status=status.HTTP_200_OK)
