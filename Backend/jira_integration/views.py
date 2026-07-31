import os
import requests
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

        # Scopes required to read Jira issues
        scopes = "read:jira-work read:jira-user offline_access"
        
        params = {
            "audience": "api.atlassian.com",
            "client_id": client_id,
            "scope": scopes,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "prompt": "consent"
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
        if not code:
            return Response({"detail": "Authorization code is required."}, status=status.HTTP_400_BAD_REQUEST)

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

            # Save to Database (Singleton)
            JiraOAuthToken.objects.all().delete() # Clear existing tokens
            JiraOAuthToken.objects.create(
                access_token=access_token,
                refresh_token=refresh_token,
                cloud_id=cloud_id,
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
        if not project_key:
            return Response({"detail": "Jira Project Key is required."}, status=status.HTTP_400_BAD_REQUEST)

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
        payload = {
            "jql": f"project={project_key} ORDER BY created DESC",
            "maxResults": 100,
            "fields": ["summary", "description", "issuetype"]
        }
        
        try:
            res = requests.post(search_url, json=payload, headers=headers)
            
            # Basic refresh token logic could go here if res.status_code == 401
            if res.status_code == 401:
                # Token might be expired, need user to re-authenticate for now
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
            
            tasks = []
            for issue in issues:
                fields = issue.get("fields", {})
                issue_type = fields.get("issuetype", {}).get("name", "").upper()
                
                category = "UI"
                if "BACKEND" in issue_type or "SERVER" in issue_type:
                    category = "BACKEND"
                elif "BUG" in issue_type or "QA" in issue_type:
                    category = "QA"
                elif "INFRA" in issue_type or "OPS" in issue_type or "TASK" in issue_type:
                    category = "INFRA"
                    
                desc = fields.get("description")
                if not desc:
                    desc = "No description provided."
                elif isinstance(desc, dict):
                    # Extract text from Atlassian Document Format (ADF)
                    extracted = extract_text_from_adf(desc)
                    desc = extracted if extracted else "No description provided."

                tasks.append({
                    "title": fields.get("summary", "Untitled Task"),
                    "desc": str(desc),
                    "category": category,
                    "status": "OPEN",
                    "jiraId": issue.get("key")
                })
            
            return Response({"tasks": tasks}, status=status.HTTP_200_OK)
            
        except requests.exceptions.RequestException as e:
            return Response({"detail": f"Network error connecting to Jira: {str(e)}"}, status=status.HTTP_502_BAD_GATEWAY)
