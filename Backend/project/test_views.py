from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.urls import reverse
from accounts.models import Employee, EmployeeProfile
from project.models import Project, Skill
import datetime

class ProjectViewsTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        
        # Creator / Manager
        self.manager = Employee.objects.create(
            email="manager@example.com",
            full_name="Manager",
            role="PROJECT_MANAGER",
            is_active=True
        )
        # Auth
        self.client.force_authenticate(user=self.manager)
        
        # Another manager
        self.other_manager = Employee.objects.create(
            email="other@example.com",
            full_name="Other Manager",
            role="PROJECT_MANAGER",
            is_active=True
        )
        
        # Lead
        self.lead = Employee.objects.create(
            email="lead@example.com",
            full_name="Lead",
            role="TEAM_LEAD",
            is_active=True
        )
        self.lead_profile, _ = EmployeeProfile.objects.get_or_create(user=self.lead, defaults={"experience_years": 5})
        
        # Member
        self.member = Employee.objects.create(
            email="member@example.com",
            full_name="Member",
            role="TEAM_MEMBER",
            is_active=True
        )
        self.member_profile, _ = EmployeeProfile.objects.get_or_create(user=self.member, defaults={"experience_years": 3})
        self.member_profile.status = EmployeeProfile.Status.ACTIVE
        self.member_profile.save()
        
        self.skill = Skill.objects.create(name="Python", category="BACKEND")
        
        self.project_data = {
            "project_id": "PRJ-V1",
            "name": "Test View Project",
            "description": "Desc",
            "status": "ACTIVE",
            "type": "AGILE",
            "start_date": datetime.date.today(),
            "end_date": datetime.date.today() + datetime.timedelta(days=10),
            "number_of_days": 10,
            "team_lead": self.lead.id,
            "members": [self.member_profile.id],
            "skills": [self.skill.id],
            "team_size": 2
        }

    def test_project_create_and_list(self):
        # Create Project
        response = self.client.post("/api/projects/", self.project_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Test View Project")
        
        project_id = response.data["id"]
        
        # List Projects
        response_list = self.client.get("/api/projects/")
        self.assertEqual(response_list.status_code, status.HTTP_200_OK)
        # Should be paginated or list
        self.assertTrue(len(response_list.data["results"]) >= 1)
        
        # List with filter
        res_filter = self.client.get("/api/projects/?name=Test")
        self.assertEqual(res_filter.status_code, status.HTTP_200_OK)
        
        # Other filters
        self.client.get("/api/projects/?status=ACTIVE")
        self.client.get("/api/projects/?type=AGILE")
        self.client.get(f"/api/projects/?team_lead={self.lead.id}")

    def test_project_create_invalid(self):
        invalid_data = self.project_data.copy()
        invalid_data["name"] = ""
        response = self.client.post("/api/projects/", invalid_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_project_detail_get_put_patch_delete(self):
        # Create project first
        res = self.client.post("/api/projects/", self.project_data, format="json")
        project_id = res.data["id"]
        
        # GET
        res_get = self.client.get(f"/api/projects/{project_id}/")
        self.assertEqual(res_get.status_code, status.HTTP_200_OK)
        
        # GET not found
        self.client.get("/api/projects/9999/")
        
        # PUT update
        update_data = self.project_data.copy()
        update_data["name"] = "Updated Name"
        res_put = self.client.put(f"/api/projects/{project_id}/", update_data, format="json")
        self.assertEqual(res_put.status_code, status.HTTP_200_OK)
        self.assertEqual(res_put.data["name"], "Updated Name")
        
        # PUT by other manager (should fail)
        self.client.force_authenticate(user=self.other_manager)
        res_put_fail = self.client.put(f"/api/projects/{project_id}/", update_data, format="json")
        self.assertEqual(res_put_fail.status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=self.manager)
        
        # PATCH status
        res_patch = self.client.patch(f"/api/projects/{project_id}/", {"status": "ON_HOLD"}, format="json")
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        
        # PATCH by other manager
        self.client.force_authenticate(user=self.other_manager)
        res_patch_fail = self.client.patch(f"/api/projects/{project_id}/", {"status": "COMPLETED"}, format="json")
        self.assertEqual(res_patch_fail.status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=self.manager)
        
        # PATCH invalid status
        res_patch_inv = self.client.patch(f"/api/projects/{project_id}/", {"status": "INVALID"}, format="json")
        self.assertEqual(res_patch_inv.status_code, status.HTTP_400_BAD_REQUEST)
        
        # DELETE
        res_del = self.client.delete(f"/api/projects/{project_id}/")
        self.assertEqual(res_del.status_code, status.HTTP_204_NO_CONTENT)

    def test_update_completed_project(self):
        res = self.client.post("/api/projects/", self.project_data, format="json")
        project_id = res.data["id"]
        
        self.client.patch(f"/api/projects/{project_id}/", {"status": "COMPLETED"}, format="json")
        
        res_put = self.client.put(f"/api/projects/{project_id}/", self.project_data, format="json")
        self.assertEqual(res_put.status_code, status.HTTP_400_BAD_REQUEST)

    def test_skill_list(self):
        res = self.client.get("/api/projects/skills/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(len(res.data) >= 1)

    def test_employee_profile_list(self):
        res = self.client.get("/api/projects/employees/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        
        # with filter
        res2 = self.client.get("/api/projects/employees/?skill=Py")
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

    def test_dashboard_view(self):
        res = self.client.get("/api/dashboard/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("status_distribution", res.data)
        self.assertIn("due_today", res.data)
        self.assertIn("due_tomorrow", res.data)
        
        # test as team member
        self.client.force_authenticate(user=self.member)
        res_member = self.client.get("/api/dashboard/")
        self.assertEqual(res_member.status_code, status.HTTP_200_OK)

    def test_team_lead_sees_only_assigned_projects(self):
        # Create Project 1 assigned to self.lead
        res1 = self.client.post("/api/projects/", self.project_data, format="json")
        p1_id = res1.data["id"]

        # Create Project 2 NOT assigned to self.lead
        unassigned_lead = Employee.objects.create(
            email="unassigned_lead@example.com",
            full_name="Unassigned Lead",
            role="TEAM_LEAD",
            is_active=True
        )
        p2_data = self.project_data.copy()
        p2_data["project_id"] = "PRJ-V2"
        p2_data["name"] = "Unassigned Project"
        p2_data["team_lead"] = unassigned_lead.id
        p2_data["members"] = []
        res2 = self.client.post("/api/projects/", p2_data, format="json")
        p2_id = res2.data["id"]

        # Authenticate as self.lead
        self.client.force_authenticate(user=self.lead)

        # Team Lead listing projects should only see p1
        list_res = self.client.get("/api/projects/")
        self.assertEqual(list_res.status_code, status.HTTP_200_OK)
        project_ids = [p["id"] for p in list_res.data["results"]]
        self.assertIn(p1_id, project_ids)
        self.assertNotIn(p2_id, project_ids)

        # Team Lead accessing assigned project details
        detail1_res = self.client.get(f"/api/projects/{p1_id}/")
        self.assertEqual(detail1_res.status_code, status.HTTP_200_OK)

        # Team Lead accessing unassigned project details should be forbidden (403)
        detail2_res = self.client.get(f"/api/projects/{p2_id}/")
        self.assertEqual(detail2_res.status_code, status.HTTP_403_FORBIDDEN)

