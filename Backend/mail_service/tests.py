from django.test import TestCase, override_settings
from django.core import mail
from django.utils import timezone
from accounts.models import Employee, EmployeeProfile
from project.models import Project, ProjectMember
from sprints.models import Sprint, SprintTask
from mail_service.services import OverdueEmailService, DueTodayEmailService
import datetime

class MailServiceTests(TestCase):
    def setUp(self):
        # Create Employees
        self.pm_user = Employee.objects.create(
            email='pm@example.com',
            full_name='Project Manager',
            role='PROJECT_MANAGER'
        )
        self.tl_user = Employee.objects.create(
            email='tl@example.com',
            full_name='Team Lead',
            role='TEAM_LEAD'
        )
        self.dev_user = Employee.objects.create(
            email='dev@example.com',
            full_name='Developer User',
            role='ENGINEER'
        )

        # Create employee profiles
        self.pm_profile = EmployeeProfile.objects.create(
            user=self.pm_user,
            designation='PM',
            experience_years=5.0
        )
        self.tl_profile = EmployeeProfile.objects.create(
            user=self.tl_user,
            designation='TL',
            experience_years=4.0
        )
        self.dev_profile = EmployeeProfile.objects.create(
            user=self.dev_user,
            designation='DEV',
            experience_years=2.0
        )

        # Create active project
        self.project = Project.objects.create(
            project_id='PROJ-TEST',
            name='Test Project',
            created_by=self.pm_user,
            team_lead=self.tl_user,
            status='ACTIVE'
        )

        # Assign dev profile as project member
        ProjectMember.objects.create(
            project=self.project,
            employee_profile=self.dev_profile
        )

        # Create sprint
        self.sprint = Sprint.objects.create(
            project=self.project,
            milestone='Milestone 1',
            start_date=timezone.localdate() - datetime.timedelta(days=10),
            end_date=timezone.localdate() + datetime.timedelta(days=10)
        )

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_send_overdue_tasks_emails(self):
        # Create an overdue task (planned_end_date in past)
        # 2026-08-05 is Wednesday.
        # planned_end_date: 2026-08-03 (Monday)
        # planned_start_date: 2026-07-31 (Friday)
        task1 = SprintTask.objects.create(
            sprint=self.sprint,
            title='Overdue Task 1',
            category='Backend',
            description='Test task description 1',
            planned_start_date=timezone.localdate() - datetime.timedelta(days=5),
            planned_end_date=timezone.localdate() - datetime.timedelta(days=2),
            status='OPEN',
            assigned_employee=self.dev_profile
        )
        # planned_end_date: 2026-07-31 (Friday)
        # planned_start_date: 2026-07-28 (Tuesday)
        task2 = SprintTask.objects.create(
            sprint=self.sprint,
            title='Overdue Task 2',
            category='UI',
            description='Test task description 2',
            planned_start_date=timezone.localdate() - datetime.timedelta(days=8),
            planned_end_date=timezone.localdate() - datetime.timedelta(days=5),
            status='OPEN',
            assigned_employee=self.dev_profile
        )
        # Create non-overdue task
        # planned_end_date: 2026-08-07 (Friday)
        # planned_start_date: 2026-08-05 (Wednesday)
        SprintTask.objects.create(
            sprint=self.sprint,
            title='Not Overdue Task',
            category='QA',
            description='Test task description 3',
            planned_start_date=timezone.localdate(),
            planned_end_date=timezone.localdate() + datetime.timedelta(days=2),
            status='OPEN',
            assigned_employee=self.dev_profile
        )

        # Clear outbox
        mail.outbox = []

        # Run email dispatch
        OverdueEmailService.send_overdue_tasks_emails()

        # We expect 2 emails sent: one to Project Manager, one to Team Lead
        self.assertEqual(len(mail.outbox), 2)

        recipients = [m.to[0] for m in mail.outbox]
        self.assertIn('pm@example.com', recipients)
        self.assertIn('tl@example.com', recipients)

        # Check content
        for message in mail.outbox:
            body_content = message.body or message.alternatives[0][0]
            self.assertIn('Overdue Task 1', body_content)
            self.assertIn('Overdue Task 2', body_content)
            self.assertNotIn('Not Overdue Task', body_content)

    @override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
    def test_send_due_today_emails(self):
        # Create a task due today
        # planned_end_date: 2026-08-05 (Wednesday)
        # planned_start_date: 2026-08-04 (Tuesday)
        task = SprintTask.objects.create(
            sprint=self.sprint,
            title='Due Today Task',
            category='UI',
            description='Test task description due today',
            planned_start_date=timezone.localdate() - datetime.timedelta(days=1),
            planned_end_date=timezone.localdate(),
            status='OPEN',
            assigned_employee=self.dev_profile
        )
        # Create other tasks
        # planned_end_date: 2026-08-06 (Thursday)
        # planned_start_date: 2026-08-04 (Tuesday)
        SprintTask.objects.create(
            sprint=self.sprint,
            title='Future Task',
            category='Backend',
            description='Test task description future',
            planned_start_date=timezone.localdate() - datetime.timedelta(days=1),
            planned_end_date=timezone.localdate() + datetime.timedelta(days=1),
            status='OPEN',
            assigned_employee=self.dev_profile
        )

        # Clear outbox
        mail.outbox = []

        # Run email dispatch
        DueTodayEmailService.send_due_today_emails()

        # We expect 2 emails sent: one to PM, one to TL
        self.assertEqual(len(mail.outbox), 2)

        recipients = [m.to[0] for m in mail.outbox]
        self.assertIn('pm@example.com', recipients)
        self.assertIn('tl@example.com', recipients)

        # Check content
        for message in mail.outbox:
            body_content = message.body or message.alternatives[0][0]
            self.assertIn('Due Today Task', body_content)
            self.assertNotIn('Future Task', body_content)
