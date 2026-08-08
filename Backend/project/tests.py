from django.test import TestCase
from accounts.models import Employee, EmployeeProfile
from project.models import Project, Skill, ProjectMember
from project.services import ProjectService
import datetime

class ProjectMemberStatusTests(TestCase):

    def setUp(self):
        # Create a project manager / creator
        self.creator = Employee.objects.create(
            email="manager@example.com",
            full_name="Manager Name",
            role="PROJECT_MANAGER",
            is_active=True
        )
        
        # Create a team lead
        self.team_lead = Employee.objects.create(
            email="lead@example.com",
            full_name="Lead Name",
            role="TEAM_LEAD",
            is_active=True
        )
        
        # Create two employees
        self.employee1 = Employee.objects.create(
            email="emp1@example.com",
            full_name="Employee One",
            role="TEAM_MEMBER",
            is_active=True
        )
        self.employee2 = Employee.objects.create(
            email="emp2@example.com",
            full_name="Employee Two",
            role="TEAM_MEMBER",
            is_active=True
        )

        # Retrieve profiles (automatically created by signals or manually create if not)
        self.profile1, _ = EmployeeProfile.objects.get_or_create(
            user=self.employee1,
            defaults={"designation": "Developer", "experience_years": 3.0}
        )
        self.profile2, _ = EmployeeProfile.objects.get_or_create(
            user=self.employee2,
            defaults={"designation": "Developer", "experience_years": 2.0}
        )
        self.lead_profile, _ = EmployeeProfile.objects.get_or_create(
            user=self.team_lead,
            defaults={"designation": "Lead Developer", "experience_years": 5.0}
        )
        
        # Explicitly set initial status to ACTIVE
        self.profile1.status = EmployeeProfile.Status.ACTIVE
        self.profile1.save()
        self.profile2.status = EmployeeProfile.Status.ACTIVE
        self.profile2.save()
        self.lead_profile.status = EmployeeProfile.Status.ACTIVE
        self.lead_profile.save()

    def test_status_busy_on_project_create(self):
        """
        Verify that employee profile status changes to BUSY when they are added to a project.
        """
        project_data = {
            "project_id": "PRJ-001",
            "name": "Project Alpha",
            "description": "Test project",
            "status": "ACTIVE",
            "type": "AGILE",
            "start_date": datetime.date.today(),
            "end_date": datetime.date.today() + datetime.timedelta(days=10),
            "number_of_days": 10,
            "team_lead": self.team_lead.id,
            "members": [self.profile1.id],
            "skills": [],
            "team_size": 2
        }

        project = ProjectService.create_project(creator=self.creator, validated_data=project_data)
        
        # Check that profile1 status is now BUSY
        self.profile1.refresh_from_db()
        self.assertEqual(self.profile1.status, EmployeeProfile.Status.BUSY)
        
        # Check that profile2 is still ACTIVE
        self.profile2.refresh_from_db()
        self.assertEqual(self.profile2.status, EmployeeProfile.Status.ACTIVE)

    def test_status_transitions_on_project_update(self):
        """
        Verify that:
        - Added members' status changes to BUSY.
        - Removed members' status changes to WFM.
        """
        # 1. Create project with profile1
        project_data = {
            "project_id": "PRJ-002",
            "name": "Project Beta",
            "description": "Test project",
            "status": "ACTIVE",
            "type": "AGILE",
            "start_date": datetime.date.today(),
            "end_date": datetime.date.today() + datetime.timedelta(days=10),
            "number_of_days": 10,
            "team_lead": self.team_lead.id,
            "members": [self.profile1.id],
            "skills": [],
            "team_size": 2
        }
        project = ProjectService.create_project(creator=self.creator, validated_data=project_data)

        self.profile1.refresh_from_db()
        self.assertEqual(self.profile1.status, EmployeeProfile.Status.BUSY)

        # 2. Update project: replace profile1 with profile2
        update_data = {
            "project_id": "PRJ-002",
            "name": "Project Beta Updated",
            "description": "Test project",
            "status": "ACTIVE",
            "type": "AGILE",
            "start_date": datetime.date.today(),
            "end_date": datetime.date.today() + datetime.timedelta(days=10),
            "number_of_days": 10,
            "team_lead": self.team_lead.id,
            "members": [self.profile2.id],
            "skills": [],
            "team_size": 2
        }
        ProjectService.update_project(project=project, validated_data=update_data)

        # Check statuses
        self.profile1.refresh_from_db()
        self.profile2.refresh_from_db()

        self.assertEqual(self.profile1.status, EmployeeProfile.Status.WFM) # "WFM"
        self.assertEqual(self.profile2.status, EmployeeProfile.Status.BUSY)

    def test_status_reverts_on_project_delete(self):
        """
        Verify that member status changes to WFM when a project is deleted.
        """
        # Create project with profile1
        project_data = {
            "project_id": "PRJ-003",
            "name": "Project Gamma",
            "description": "Test project",
            "status": "ACTIVE",
            "type": "AGILE",
            "start_date": datetime.date.today(),
            "end_date": datetime.date.today() + datetime.timedelta(days=10),
            "number_of_days": 10,
            "team_lead": self.team_lead.id,
            "members": [self.profile1.id],
            "skills": [],
            "team_size": 2
        }
        project = ProjectService.create_project(creator=self.creator, validated_data=project_data)

        self.profile1.refresh_from_db()
        self.assertEqual(self.profile1.status, EmployeeProfile.Status.BUSY)

        # Use view logic / endpoint representation of delete to delete project
        # Simulate view's delete by importing the view or writing mock client request
        from rest_framework.test import APIRequestFactory
        from project.views import ProjectDetailView
        
        factory = APIRequestFactory()
        request = factory.delete(f'/api/projects/{project.id}/')
        from rest_framework.test import force_authenticate
        force_authenticate(request, user=self.creator)
        
        view = ProjectDetailView.as_view()
        response = view(request, pk=project.id)
        self.assertEqual(response.status_code, 204)
        
        # Verify profile1 status is now WFM because they are no longer in any active project
        self.profile1.refresh_from_db()
        self.assertEqual(self.profile1.status, EmployeeProfile.Status.WFM)

    def test_team_lead_status_transitions(self):
        """
        Verify that a Team Lead's status changes to BUSY when assigned to a project,
        and reverts to WFH when the project is deleted or lead is changed.
        """
        # Create another team lead for testing lead change
        lead2 = Employee.objects.create(
            email="lead2@example.com",
            full_name="Lead 2",
            role="TEAM_LEAD",
            is_active=True
        )
        lead2_profile, _ = EmployeeProfile.objects.get_or_create(
            user=lead2,
            defaults={"designation": "Lead Developer 2", "experience_years": 4.0}
        )
        lead2_profile.status = EmployeeProfile.Status.ACTIVE
        lead2_profile.save()

        # 1. Create project with self.team_lead as lead
        project_data = {
            "project_id": "PRJ-006",
            "name": "Project Lead Test",
            "description": "Test lead statuses",
            "status": "ACTIVE",
            "type": "AGILE",
            "start_date": datetime.date.today(),
            "end_date": datetime.date.today() + datetime.timedelta(days=10),
            "number_of_days": 10,
            "team_lead": self.team_lead.id,
            "members": [self.profile1.id],
            "skills": [],
            "team_size": 2
        }
        project = ProjectService.create_project(creator=self.creator, validated_data=project_data)

        # Both the team lead and the member should be BUSY
        self.lead_profile.refresh_from_db()
        self.profile1.refresh_from_db()
        self.assertEqual(self.lead_profile.status, EmployeeProfile.Status.BUSY)
        self.assertEqual(self.profile1.status, EmployeeProfile.Status.BUSY)

        # 2. Update project: change team lead to lead2
        update_data = project_data.copy()
        update_data["team_lead"] = lead2.id
        ProjectService.update_project(project=project, validated_data=update_data)

        # self.team_lead should revert to WFH, lead2 should become BUSY
        self.lead_profile.refresh_from_db()
        lead2_profile.refresh_from_db()
        self.assertEqual(self.lead_profile.status, EmployeeProfile.Status.WFM)
        self.assertEqual(lead2_profile.status, EmployeeProfile.Status.BUSY)

        # 3. Delete the project
        from rest_framework.test import APIRequestFactory
        from project.views import ProjectDetailView
        from rest_framework.test import force_authenticate
        
        factory = APIRequestFactory()
        request = factory.delete(f'/api/projects/{project.id}/')
        force_authenticate(request, user=self.creator)
        
        view = ProjectDetailView.as_view()
        response = view(request, pk=project.id)
        
        self.assertEqual(response.status_code, 204)

        # Both lead2 and the member should now be WFH
        lead2_profile.refresh_from_db()
        self.profile1.refresh_from_db()
        self.assertEqual(lead2_profile.status, EmployeeProfile.Status.WFM)
        self.assertEqual(self.profile1.status, EmployeeProfile.Status.WFM)

    def test_patch_project_status(self):
        """
        Verify that PATCH method on ProjectDetailView updates the status of the project,
        and synchronizes assigned employee statuses.
        """
        project_data = {
            "project_id": "PRJ-007",
            "name": "Project Patch Status Test",
            "description": "Test patch status",
            "status": "ACTIVE",
            "type": "AGILE",
            "start_date": datetime.date.today(),
            "end_date": datetime.date.today() + datetime.timedelta(days=10),
            "number_of_days": 10,
            "team_lead": self.team_lead.id,
            "members": [self.profile1.id],
            "skills": [],
            "team_size": 2
        }
        project = ProjectService.create_project(creator=self.creator, validated_data=project_data)

        # Both the team lead and the member should be BUSY initially
        self.lead_profile.refresh_from_db()
        self.profile1.refresh_from_db()
        self.assertEqual(self.lead_profile.status, EmployeeProfile.Status.BUSY)
        self.assertEqual(self.profile1.status, EmployeeProfile.Status.BUSY)

        # Now PATCH the project status to COMPLETED
        from rest_framework.test import APIRequestFactory
        from project.views import ProjectDetailView
        from rest_framework.test import force_authenticate
        
        factory = APIRequestFactory()
        request = factory.patch(f'/api/projects/{project.id}/', {"status": "COMPLETED"}, format="json")
        force_authenticate(request, user=self.creator)
        
        view = ProjectDetailView.as_view()
        response = view(request, pk=project.id)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "COMPLETED")

        # Verify project is COMPLETED in DB
        project.refresh_from_db()
        self.assertEqual(project.status, "COMPLETED")

        # Both the team lead and the member should now revert to WFH
        self.lead_profile.refresh_from_db()
        self.profile1.refresh_from_db()
        self.assertEqual(self.lead_profile.status, EmployeeProfile.Status.WFM)
        self.assertEqual(self.profile1.status, EmployeeProfile.Status.WFM)

    def test_status_busy_on_project_on_hold(self):
        """
        Verify that employee profile status remains/changes to BUSY when a project status is ON_HOLD.
        """
        project_data = {
            "project_id": "PRJ-008",
            "name": "Project On Hold Status Test",
            "description": "Test on hold status",
            "status": "ON_HOLD",
            "type": "AGILE",
            "start_date": datetime.date.today(),
            "end_date": datetime.date.today() + datetime.timedelta(days=10),
            "number_of_days": 10,
            "team_lead": self.team_lead.id,
            "members": [self.profile1.id],
            "skills": [],
            "team_size": 2
        }
        project = ProjectService.create_project(creator=self.creator, validated_data=project_data)

        # Both the team lead and the member should be BUSY because the project is ON_HOLD
        self.lead_profile.refresh_from_db()
        self.profile1.refresh_from_db()
        self.assertEqual(self.lead_profile.status, EmployeeProfile.Status.BUSY)
        self.assertEqual(self.profile1.status, EmployeeProfile.Status.BUSY)
