import logging
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.utils import timezone
from project.models import Project
from sprints.models import SprintTask

logger = logging.getLogger(__name__)

class OverdueEmailService:
    @staticmethod
    def send_overdue_tasks_emails():
        """
        Gathers active overdue tasks and sends separate email reports to 
        Project Managers (projects they created) and Team Leads (projects they lead).
        """
        today = timezone.localdate()
        active_projects = Project.objects.exclude(status='COMPLETED')

        # Overdue condition: is_deleted=False, exclude CLOSED/RESOLVED, planned_end_date is null or < today
        overdue_tasks = SprintTask.objects.filter(
            sprint__project__in=active_projects,
            is_deleted=False
        ).exclude(
            status__in=['CLOSED', 'RESOLVED']
        ).select_related(
            'sprint', 'sprint__project', 'sprint__project__created_by', 'sprint__project__team_lead', 'assigned_employee', 'assigned_employee__user'
        )

        overdue_by_project = {}
        for task in overdue_tasks:
            is_overdue = False
            if not task.planned_end_date:
                is_overdue = True
            elif task.planned_end_date < today:
                is_overdue = True

            if is_overdue:
                proj = task.sprint.project
                if proj not in overdue_by_project:
                    overdue_by_project[proj] = []
                overdue_by_project[proj].append(task)

        if not overdue_by_project:
            logger.info("No overdue tasks found. No emails sent.")
            return

        # Group by Project Manager (project.created_by)
        pm_projects = {}
        for proj, tasks in overdue_by_project.items():
            pm = proj.created_by
            if pm:
                if pm not in pm_projects:
                    pm_projects[pm] = {}
                pm_projects[pm][proj] = tasks

        # Group by Team Lead (project.team_lead)
        tl_projects = {}
        for proj, tasks in overdue_by_project.items():
            tl = proj.team_lead
            if tl:
                if tl not in tl_projects:
                    tl_projects[tl] = {}
                tl_projects[tl][proj] = tasks

        # Send emails to Project Managers
        for pm, proj_map in pm_projects.items():
            try:
                subject = "Daily Overdue Tasks Report (Project Manager)"
                
                # Structure project list for template context
                projects_context = []
                for proj, tasks in proj_map.items():
                    tasks_list = []
                    for t in tasks:
                        assignee = t.assigned_employee.user.full_name if (t.assigned_employee and t.assigned_employee.user) else "Unassigned"
                        due_str = str(t.planned_end_date) if t.planned_end_date else "No due date"
                        tasks_list.append({
                            'category': t.category,
                            'title': t.title,
                            'due_date': due_str,
                            'assignee': assignee
                        })
                    projects_context.append({
                        'project_name': proj.name,
                        'project_id': proj.project_id,
                        'tasks': tasks_list
                    })

                html_content = render_to_string('mail_service/overdue_report.html', {
                    'recipient_name': pm.full_name,
                    'role_description': 'projects created by you',
                    'projects': projects_context
                })
                text_content = strip_tags(html_content)

                msg = EmailMultiAlternatives(
                    subject,
                    text_content,
                    None,  # Uses DEFAULT_FROM_EMAIL
                    [pm.email]
                )
                msg.attach_alternative(html_content, "text/html")
                msg.send(fail_silently=False)
                logger.info(f"Overdue task email sent to PM: {pm.email}")
            except Exception as e:
                logger.error(f"Failed to send email to PM {pm.email}: {e}")

        # Send emails to Team Leads
        for tl, proj_map in tl_projects.items():
            try:
                subject = "Daily Overdue Tasks Report (Team Lead)"
                
                # Structure project list for template context
                projects_context = []
                for proj, tasks in proj_map.items():
                    tasks_list = []
                    for t in tasks:
                        assignee = t.assigned_employee.user.full_name if (t.assigned_employee and t.assigned_employee.user) else "Unassigned"
                        due_str = str(t.planned_end_date) if t.planned_end_date else "No due date"
                        tasks_list.append({
                            'category': t.category,
                            'title': t.title,
                            'due_date': due_str,
                            'assignee': assignee
                        })
                    projects_context.append({
                        'project_name': proj.name,
                        'project_id': proj.project_id,
                        'tasks': tasks_list
                    })

                html_content = render_to_string('mail_service/overdue_report.html', {
                    'recipient_name': tl.full_name,
                    'role_description': 'projects you are leading',
                    'projects': projects_context
                })
                text_content = strip_tags(html_content)

                msg = EmailMultiAlternatives(
                    subject,
                    text_content,
                    None,  # Uses DEFAULT_FROM_EMAIL
                    [tl.email]
                )
                msg.attach_alternative(html_content, "text/html")
                msg.send(fail_silently=False)
                logger.info(f"Overdue task email sent to Team Lead: {tl.email}")
            except Exception as e:
                logger.error(f"Failed to send email to Team Lead {tl.email}: {e}")


class DueTodayEmailService:
    @staticmethod
    def send_due_today_emails():
        """
        Gathers active tasks due today and sends separate email reports to 
        Project Managers (projects they created) and Team Leads (projects they lead).
        """
        today = timezone.localdate()
        active_projects = Project.objects.exclude(status='COMPLETED')

        # Due today condition: is_deleted=False, exclude CLOSED/RESOLVED, planned_end_date == today
        due_today_tasks = SprintTask.objects.filter(
            sprint__project__in=active_projects,
            is_deleted=False,
            planned_end_date=today
        ).exclude(
            status__in=['CLOSED', 'RESOLVED']
        ).select_related(
            'sprint', 'sprint__project', 'sprint__project__created_by', 'sprint__project__team_lead', 'assigned_employee', 'assigned_employee__user'
        )

        due_by_project = {}
        for task in due_today_tasks:
            proj = task.sprint.project
            if proj not in due_by_project:
                due_by_project[proj] = []
            due_by_project[proj].append(task)

        if not due_by_project:
            logger.info("No tasks due today found. No emails sent.")
            return

        # Group by Project Manager (project.created_by)
        pm_projects = {}
        for proj, tasks in due_by_project.items():
            pm = proj.created_by
            if pm:
                if pm not in pm_projects:
                    pm_projects[pm] = {}
                pm_projects[pm][proj] = tasks

        # Group by Team Lead (project.team_lead)
        tl_projects = {}
        for proj, tasks in due_by_project.items():
            tl = proj.team_lead
            if tl:
                if tl not in tl_projects:
                    tl_projects[tl] = {}
                tl_projects[tl][proj] = tasks

        # Send emails to Project Managers
        for pm, proj_map in pm_projects.items():
            try:
                subject = "Daily Due Today Tasks Report (Project Manager)"
                
                # Structure project list for template context
                projects_context = []
                for proj, tasks in proj_map.items():
                    tasks_list = []
                    for t in tasks:
                        assignee = t.assigned_employee.user.full_name if (t.assigned_employee and t.assigned_employee.user) else "Unassigned"
                        due_str = str(t.planned_end_date) if t.planned_end_date else "Today"
                        tasks_list.append({
                            'category': t.category,
                            'title': t.title,
                            'due_date': due_str,
                            'assignee': assignee
                        })
                    projects_context.append({
                        'project_name': proj.name,
                        'project_id': proj.project_id,
                        'tasks': tasks_list
                    })

                html_content = render_to_string('mail_service/due_today_report.html', {
                    'recipient_name': pm.full_name,
                    'role_description': 'projects created by you',
                    'projects': projects_context
                })
                text_content = strip_tags(html_content)

                msg = EmailMultiAlternatives(
                    subject,
                    text_content,
                    None,  # Uses DEFAULT_FROM_EMAIL
                    [pm.email]
                )
                msg.attach_alternative(html_content, "text/html")
                msg.send(fail_silently=False)
                logger.info(f"Due today task email sent to PM: {pm.email}")
            except Exception as e:
                logger.error(f"Failed to send due today email to PM {pm.email}: {e}")

        # Send emails to Team Leads
        for tl, proj_map in tl_projects.items():
            try:
                subject = "Daily Due Today Tasks Report (Team Lead)"
                
                # Structure project list for template context
                projects_context = []
                for proj, tasks in proj_map.items():
                    tasks_list = []
                    for t in tasks:
                        assignee = t.assigned_employee.user.full_name if (t.assigned_employee and t.assigned_employee.user) else "Unassigned"
                        due_str = str(t.planned_end_date) if t.planned_end_date else "Today"
                        tasks_list.append({
                            'category': t.category,
                            'title': t.title,
                            'due_date': due_str,
                            'assignee': assignee
                        })
                    projects_context.append({
                        'project_name': proj.name,
                        'project_id': proj.project_id,
                        'tasks': tasks_list
                    })

                html_content = render_to_string('mail_service/due_today_report.html', {
                    'recipient_name': tl.full_name,
                    'role_description': 'projects you are leading',
                    'projects': projects_context
                })
                text_content = strip_tags(html_content)

                msg = EmailMultiAlternatives(
                    subject,
                    text_content,
                    None,  # Uses DEFAULT_FROM_EMAIL
                    [tl.email]
                )
                msg.attach_alternative(html_content, "text/html")
                msg.send(fail_silently=False)
                logger.info(f"Due today task email sent to Team Lead: {tl.email}")
            except Exception as e:
                logger.error(f"Failed to send due today email to Team Lead {tl.email}: {e}")

