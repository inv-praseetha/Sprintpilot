import datetime
import os
import json
from unittest.mock import patch, MagicMock
from django.core.exceptions import ValidationError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import Employee, EmployeeProfile, EmployeeSkill
from project.models import Project, ProjectMember, Skill
from sprints.models import Sprint, SprintTask
from sprints.services.schedule_service import (
    calculate_working_days,
    generate_and_persist_recommendations,
    import_schedule
)
from sprints.services.ai_scheduler import get_schedule_suggestions
from sprints.services.gemini_client import generate_schedule_content

class SprintModelTests(APITestCase):
    def setUp(self):
        self.creator = Employee.objects.create(
            email="manager@example.com",
            full_name="Manager Name",
            role="PROJECT_MANAGER",
            is_active=True
        )
        self.project = Project.objects.create(
            project_id="PRJ-101",
            name="Project Alpha",
            description="Test project",
            status="ACTIVE",
            type="AGILE",
            created_by=self.creator
        )

    def test_sprint_str(self):
        sprint = Sprint(
            project=self.project,
            milestone="Sprint 1",
            start_date=datetime.date.today(),
            end_date=datetime.date.today() + datetime.timedelta(days=14)
        )
        self.assertEqual(str(sprint), "Project Alpha - Sprint 1")

    def test_end_date_before_start_date_validation(self):
        sprint = Sprint(
            project=self.project,
            milestone="Invalid Sprint Dates",
            start_date=datetime.date.today(),
            end_date=datetime.date.today() - datetime.timedelta(days=1)
        )
        with self.assertRaises(ValidationError):
            sprint.full_clean()


class SprintAPITests(APITestCase):
    def setUp(self):
        # Create users/roles
        self.creator = Employee.objects.create(
            email="manager@example.com",
            full_name="Manager Name",
            role="PROJECT_MANAGER",
            is_active=True
        )
        self.profile, _ = EmployeeProfile.objects.get_or_create(
            user=self.creator,
            defaults={"designation": "Manager", "experience_years": 5.0}
        )

        # Active Project
        self.active_project = Project.objects.create(
            project_id="PRJ-201",
            name="Active Project",
            status="ACTIVE",
            type="AGILE",
            created_by=self.creator
        )

        # Completed Project
        self.completed_project = Project.objects.create(
            project_id="PRJ-202",
            name="Completed Project",
            status="COMPLETED",
            type="AGILE",
            created_by=self.creator
        )

        # Base Sprint
        self.sprint = Sprint.objects.create(
            project=self.active_project,
            milestone="Sprint 1",
            start_date=datetime.date.today(),
            end_date=datetime.date.today() + datetime.timedelta(days=14),
            status="ACTIVE"
        )

        # Base Sprint Task
        self.task = SprintTask.objects.create(
            sprint=self.sprint,
            title="Task 1",
            status="OPEN",
            category="UI",
            description="Base task description"
        )

        # Add profile as project member of active_project
        ProjectMember.objects.create(project=self.active_project, employee_profile=self.profile)

        # Authenticate client requests
        self.client.force_authenticate(user=self.creator)

    # 1. Download Template Tests
    def test_download_template_success(self):
        url = reverse('sprint_download_template')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    # 2. Download Schedule Tests
    def test_download_schedule_success(self):
        # Create another task with assigned employee
        task2 = SprintTask.objects.create(
            sprint=self.sprint,
            title="Task 2 Backend",
            status="IN_PROGRESS",
            category="Backend",
            assigned_employee=self.profile,
            planned_start_date=datetime.date.today(),
            planned_end_date=datetime.date.today() + datetime.timedelta(days=2),
            description="Test task 2 description"
        )
        url = reverse('sprint_download_schedule', kwargs={'sprint_id': self.sprint.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    def test_download_schedule_not_found(self):
        non_existent_id = "00000000-0000-0000-0000-000000000000"
        url = reverse('sprint_download_schedule', kwargs={'sprint_id': non_existent_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # 3. List Sprints Tests
    def test_list_sprints_success(self):
        url = reverse('sprint_list_create', kwargs={'project_id': self.active_project.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_list_sprints_project_not_found(self):
        non_existent_id = "00000000-0000-0000-0000-000000000000"
        url = reverse('sprint_list_create', kwargs={'project_id': non_existent_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # 4. Create Sprint Tests
    def test_create_sprint_success(self):
        url = reverse('sprint_list_create', kwargs={'project_id': self.active_project.id})
        data = {
            "milestone": "Sprint 2",
            "start_date": str(datetime.date.today() + datetime.timedelta(days=15)),
            "end_date": str(datetime.date.today() + datetime.timedelta(days=29)),
            "status": "PLANNED",
            "tasks": [
                {
                    "title": "Task UI New",
                    "category": "UI",
                    "priority": "High",
                    "status": "TODO"
                },
                {
                    "title": "Task Backend New",
                    "category": "BACKEND",
                    "priority": "Normal",
                    "status": "IN_PROGRESS"
                }
            ]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['milestone'], "Sprint 2")

    def test_create_sprint_completed_project_blocked(self):
        url = reverse('sprint_list_create', kwargs={'project_id': self.completed_project.id})
        data = {
            "milestone": "Sprint 2",
            "start_date": str(datetime.date.today() + datetime.timedelta(days=15)),
            "end_date": str(datetime.date.today() + datetime.timedelta(days=29)),
            "status": "PLANNED"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot create sprints in a completed project.", response.data['detail'])

    # 5. Detail Sprint Tests
    def test_sprint_detail_success(self):
        url = reverse('sprint_detail', kwargs={'pk': self.sprint.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['milestone'], "Sprint 1")

    def test_sprint_detail_not_found(self):
        non_existent_id = "00000000-0000-0000-0000-000000000000"
        url = reverse('sprint_detail', kwargs={'pk': non_existent_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_sprint_delete_success(self):
        url = reverse('sprint_detail', kwargs={'pk': self.sprint.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Sprint.objects.filter(id=self.sprint.id).exists())

    # 6. Task Update Tests
    def test_task_status_update_success(self):
        url = reverse('sprint_task_update', kwargs={'pk': self.task.id})
        data = {
            "status": "CLOSED"
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, "CLOSED")

    def test_task_status_update_legacy_mapping(self):
        url = reverse('sprint_task_update', kwargs={'pk': self.task.id})
        
        # Test TODO maps to OPEN
        response = self.client.put(url, {"status": "TODO"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, "OPEN")

        # Test DONE maps to CLOSED
        response = self.client.put(url, {"status": "DONE"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, "CLOSED")

        # Test IN_REVIEW maps to RESOLVED
        response = self.client.put(url, {"status": "IN_REVIEW"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, "RESOLVED")

    def test_task_update_assignee_and_dates(self):
        url = reverse('sprint_task_update', kwargs={'pk': self.task.id})
        start_date = self.sprint.start_date
        end_date = self.sprint.start_date + datetime.timedelta(days=5)
        data = {
            "assigned_employee_id": str(self.profile.id),
            "planned_start_date": str(start_date),
            "planned_end_date": str(end_date)
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.assigned_employee, self.profile)
        self.assertEqual(str(self.task.planned_start_date), str(start_date))

        # Test unassigning is blocked (400) because assignee is mandatory for scheduled tasks
        response = self.client.put(url, {"assignedTo": ""}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_task_update_completed_project_blocked(self):
        # Move project to COMPLETED
        self.active_project.status = "COMPLETED"
        self.active_project.save()

        url = reverse('sprint_task_update', kwargs={'pk': self.task.id})
        data = {
            "status": "IN_PROGRESS"
        }
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot update tasks in a completed project.", response.data['detail'])

    def test_task_delete_success(self):
        url = reverse('sprint_task_update', kwargs={'pk': self.task.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertTrue(SprintTask.objects.get(id=self.task.id).is_deleted)

    def test_task_delete_completed_project_blocked(self):
        self.active_project.status = "COMPLETED"
        self.active_project.save()
        url = reverse('sprint_task_update', kwargs={'pk': self.task.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot delete tasks in a completed project.", response.data['detail'])

    def test_task_bulk_delete_success(self):
        # Create one more task to delete
        another_task = SprintTask.objects.create(
            title="Another Task",
            category="UI",
            priority="Normal",
            description="Another description",
            sprint=self.sprint
        )
        url = reverse('sprint_task_bulk_delete')
        data = {
            "task_ids": [str(self.task.id), str(another_task.id)]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Successfully deleted 2 tasks", response.data['detail'])
        self.assertTrue(all(t.is_deleted for t in SprintTask.objects.filter(id__in=[self.task.id, another_task.id])))

    def test_task_bulk_delete_completed_project_blocked(self):
        self.active_project.status = "COMPLETED"
        self.active_project.save()
        url = reverse('sprint_task_bulk_delete')
        data = {
            "task_ids": [str(self.task.id)]
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot delete tasks in a completed project.", response.data['detail'])

    def test_task_bulk_delete_no_ids(self):
        url = reverse('sprint_task_bulk_delete')
        data = {
            "task_ids": []
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # 7. AI Suggestion Tests
    @patch('decouple.config')
    def test_ai_schedule_no_api_key(self, mock_config):
        mock_config.return_value = None
        url = reverse('sprint_ai_schedule', kwargs={'sprint_id': self.sprint.id})
        with patch.dict('os.environ', {}, clear=True):
            response = self.client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("GEMINI_API_KEY is not configured", response.data['detail'])

    def test_ai_schedule_no_tasks(self):
        # Create empty sprint
        empty_sprint = Sprint.objects.create(
            project=self.active_project,
            milestone="Sprint Empty",
            start_date=datetime.date.today(),
            end_date=datetime.date.today() + datetime.timedelta(days=14)
        )
        url = reverse('sprint_ai_schedule', kwargs={'sprint_id': empty_sprint.id})
        with patch.dict('os.environ', {'GEMINI_API_KEY': 'dummy_key'}):
            response = self.client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("No tasks found in this sprint to schedule.", response.data['detail'])

    @patch('sprints.services.schedule_service.generate_and_persist_recommendations')
    def test_ai_schedule_success(self, mock_recommend):
        mock_recommend.return_value = [{"task_id": str(self.task.id), "reason": "Match"}]
        url = reverse('sprint_ai_schedule', kwargs={'sprint_id': self.sprint.id})
        with patch.dict('os.environ', {'GEMINI_API_KEY': 'dummy_key'}):
            response = self.client.post(url, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]['reason'], "Match")

    # 8. Import Schedule Tests
    def test_import_schedule_success(self):
        url = reverse('sprint_import_schedule', kwargs={'sprint_id': self.sprint.id})
        start_date = self.sprint.start_date
        while start_date.weekday() != 0:  # Find next Monday
            start_date += datetime.timedelta(days=1)
        end_date = start_date + datetime.timedelta(days=4)  # Friday
        data = [
            {
                "task_id": str(self.task.id),
                "assigned_employee_id": str(self.profile.id),
                "planned_start_date": str(start_date),
                "planned_end_date": str(end_date)
            }
        ]
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['detail'], "Schedule successfully imported and saved.")
        self.task.refresh_from_db()
        self.assertEqual(self.task.assigned_employee, self.profile)
        self.assertEqual(self.task.story_points, 10) # 5 working days * 2 SP/day

    def test_import_schedule_completed_project_blocked(self):
        self.active_project.status = "COMPLETED"
        self.active_project.save()

        url = reverse('sprint_import_schedule', kwargs={'sprint_id': self.sprint.id})
        response = self.client.post(url, [], format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot import schedule for a completed project.", response.data['detail'])

    def test_create_sprint_task_success(self):
        url = reverse('sprint_task_create', kwargs={'sprint_id': self.sprint.id})
        data = {
            "title": "New Single Task",
            "category": "Backend",
            "priority": "Critical",
            "status": "OPEN",
            "assigned_employee_id": str(self.profile.id),
            "planned_start_date": str(self.sprint.start_date),
            "planned_end_date": str(self.sprint.start_date + datetime.timedelta(days=1)),
            "description": "This is a new backend task."
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], "New Single Task")
        self.assertEqual(response.data['category'], "Backend")
        self.assertEqual(response.data['priority'], "Critical")
        
        # Verify it was saved in DB
        self.assertTrue(SprintTask.objects.filter(title="New Single Task", sprint=self.sprint).exists())

    def test_create_sprint_task_story_points_calculation(self):
        url = reverse('sprint_task_create', kwargs={'sprint_id': self.sprint.id})
        start_date = self.sprint.start_date
        while start_date.weekday() != 0:  # Find next Monday
            start_date += datetime.timedelta(days=1)
        end_date = start_date + datetime.timedelta(days=4)  # Friday
        data = {
            "title": "Scheduled Single Task",
            "category": "UI",
            "status": "OPEN",
            "assigned_employee_id": str(self.profile.id),
            "planned_start_date": str(start_date),
            "planned_end_date": str(end_date),
            "description": "Story points test description"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        task = SprintTask.objects.get(title="Scheduled Single Task", sprint=self.sprint)
        self.assertEqual(task.story_points, 10.0) # 5 days * 2
        self.assertEqual(task.estimated_hours, 40.0) # 5 days * 8

    def test_create_sprint_task_completed_project_blocked(self):
        self.active_project.status = "COMPLETED"
        self.active_project.save()

        url = reverse('sprint_task_create', kwargs={'sprint_id': self.sprint.id})
        data = {
            "title": "Blocked Task"
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Cannot add tasks to a completed project.", response.data['detail'])



class SprintServiceTests(APITestCase):
    def setUp(self):
        self.creator = Employee.objects.create(
            email="manager@example.com",
            full_name="Manager Name",
            role="PROJECT_MANAGER",
            is_active=True
        )
        self.profile, _ = EmployeeProfile.objects.get_or_create(
            user=self.creator,
            defaults={"designation": "Manager", "experience_years": 5.0}
        )
        self.project = Project.objects.create(
            project_id="PRJ-301",
            name="Project Alpha",
            status="ACTIVE",
            type="AGILE",
            created_by=self.creator
        )
        self.sprint = Sprint.objects.create(
            project=self.project,
            milestone="Sprint 1",
            start_date=datetime.date.today(),
            end_date=datetime.date.today() + datetime.timedelta(days=14),
            status="ACTIVE"
        )
        self.task = SprintTask.objects.create(
            sprint=self.sprint,
            title="Task 1",
            status="OPEN",
            category="UI",
            description="Base task description"
        )
        # Add profile as member of self.project
        ProjectMember.objects.create(project=self.project, employee_profile=self.profile)

    def test_calculate_working_days_edge_cases(self):
        # None cases
        self.assertEqual(calculate_working_days(None, "2026-07-20"), 0)
        self.assertEqual(calculate_working_days("2026-07-20", None), 0)
        # End before start
        self.assertEqual(calculate_working_days("2026-07-24", "2026-07-20"), 0)
        # Exception case
        self.assertEqual(calculate_working_days("invalid-date", "2026-07-20"), 1)

    @patch('sprints.services.schedule_service.get_schedule_suggestions')
    def test_generate_and_persist_recommendations(self, mock_suggestions):
        mock_response = {
            "suggestions": [
                {
                    "task_id": str(self.task.id),
                    "assigned_employee_id": str(self.profile.id),
                    "planned_start_date": "2026-07-20",
                    "planned_end_date": "2026-07-22",
                    "confidence": 0.95,
                    "matching_score": 0.90,
                    "reason": "Expert in UI",
                    "working_days": 3
                },
                {
                    "task_id": "00000000-0000-0000-0000-000000000000",  # non-existent task
                    "assigned_employee_id": str(self.profile.id),
                    "planned_start_date": "2026-07-20",
                    "planned_end_date": "2026-07-22",
                },
                {
                    "task_id": str(self.task.id),
                    "assigned_employee_id": "00000000-0000-0000-0000-000000000000",  # non-existent employee
                    "planned_start_date": "2026-07-20",
                    "planned_end_date": "2026-07-22",
                }
            ]
        }
        mock_suggestions.return_value = json.dumps(mock_response)
        res = generate_and_persist_recommendations(self.sprint, [self.task], "dummy_key")
        self.assertEqual(len(res), 2)  # Non-existent task is skipped

    def test_import_schedule_edge_cases(self):
        # 1. Payload not a list
        with self.assertRaises(ValueError):
            import_schedule(self.sprint, "not-a-list")
        
        start_date = self.sprint.start_date
        end_date = self.sprint.start_date + datetime.timedelta(days=2)
        # 2. Dict employee_id, missing fields, non-existent objects
        payload = [
            {
                # missing task_id / id
            },
            {
                "task_id": str(self.task.id),
                "assigned_employee_id": {"id": str(self.profile.id)},  # dict format
                "planned_start_date": str(start_date),
                "planned_end_date": str(end_date)
            },
            {
                "id": "00000000-0000-0000-0000-000000000000",  # non-existent task
                "assigned_employee_id": str(self.profile.id)
            },
            {
                "task_id": str(self.task.id),
                "assignedTo": "00000000-0000-0000-0000-000000000000",  # non-existent employee
                "startDate": None,
                "endDate": None
            }
        ]
        import_schedule(self.sprint, payload)
        self.task.refresh_from_db()
        self.assertIsNone(self.task.assigned_employee)
        self.assertIsNone(self.task.planned_start_date)


class SprintAISchedulerTests(APITestCase):
    def setUp(self):
        self.creator = Employee.objects.create(
            email="manager@example.com",
            full_name="Manager Name",
            role="PROJECT_MANAGER",
            is_active=True
        )
        self.profile, _ = EmployeeProfile.objects.get_or_create(
            user=self.creator,
            defaults={"designation": "Manager", "experience_years": 5.0}
        )
        self.project = Project.objects.create(
            project_id="PRJ-302",
            name="Project Alpha",
            status="ACTIVE",
            type="AGILE",
            created_by=self.creator
        )
        self.sprint = Sprint.objects.create(
            project=self.project,
            milestone="Sprint 1",
            start_date=datetime.date.today(),
            end_date=datetime.date.today() + datetime.timedelta(days=14),
            status="ACTIVE"
        )
        self.task = SprintTask.objects.create(
            sprint=self.sprint,
            title="Task 1",
            status="OPEN",
            category="UI",
            description="Base task description"
        )
        self.skill = Skill.objects.create(name="Python", category="BACKEND")
        
        # Add Project Member and Employee Skill
        ProjectMember.objects.create(project=self.project, employee_profile=self.profile)
        EmployeeSkill.objects.create(employee=self.profile, skill=self.skill, proficiency_level=5)

    @patch('sprints.services.ai_scheduler.generate_schedule_content')
    def test_get_schedule_suggestions(self, mock_generate):
        mock_generate.return_value = '{"suggestions": []}'
        res = get_schedule_suggestions(self.sprint, [self.task], "dummy_key")
        self.assertEqual(res, '{"suggestions": []}')


class SprintGeminiClientTests(APITestCase):
    @patch('sprints.services.gemini_client.get_gemini_client')
    def test_generate_schedule_content_success(self, mock_get_client):
        mock_client = mock_get_client.return_value
        mock_response = mock_client.models.generate_content.return_value
        mock_response.text = '{"suggestions": []}'
        
        res = generate_schedule_content("prompt", None, "dummy_key")
        self.assertEqual(res, '{"suggestions": []}')

    @patch('sprints.services.gemini_client.get_gemini_client')
    def test_generate_schedule_content_error(self, mock_get_client):
        mock_get_client.side_effect = Exception("Client error")
        with self.assertRaises(Exception):
            generate_schedule_content("prompt", None, "dummy_key")
