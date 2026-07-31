import os
from django.http import FileResponse
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from sprints.models import Sprint, SprintTask
from sprints.serializers import SprintSerializer, SprintTaskSerializer, SprintNoteSerializer
from sprints.services import SprintService


class SprintDownloadTemplateView(APIView):
    """
    API View to serve the static Excel template file stored on the backend.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            template_path = SprintService.get_template_path()
            response = FileResponse(
                open(template_path, 'rb'), 
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = 'attachment; filename="tasks_template.xlsx"'
            return response
        except FileNotFoundError as e:
            return Response(
                {"detail": str(e)}, 
                status=status.HTTP_404_NOT_FOUND
            )


class SprintDownloadScheduleView(APIView):
    """
    API View to load the Excel gantt_template.xlsx, populate the sprint project info and tasks,
    and return the styled Excel sheet with auto-updating formulas and conditional formatting.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, sprint_id, *args, **kwargs):
        try:
            buffer, filename = SprintService.generate_excel_schedule(sprint_id)
            response = FileResponse(
                buffer, 
                content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
        except Sprint.DoesNotExist:
            return Response({"detail": "Sprint not found."}, status=status.HTTP_404_NOT_FOUND)
        except FileNotFoundError as e:
            return Response({"detail": str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response(
                {"detail": f"Excel generation failed: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SprintListCreateView(APIView):
    """
    API View to handle listing sprints for a project and creating a sprint with tasks.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id, *args, **kwargs):
        from project.models import Project
        try:
            sprints = SprintService.list_sprints(project_id)
            serializer = SprintSerializer(sprints, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Project.DoesNotExist:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

    def post(self, request, project_id, *args, **kwargs):
        from project.models import Project
        try:
            sprint = SprintService.create_sprint(project_id, request.data)
            serializer = SprintSerializer(sprint)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Project.DoesNotExist:
            return Response({"detail": "Project not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SprintDetailView(APIView):
    """
    API View to retrieve or delete a specific sprint.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, pk, *args, **kwargs):
        try:
            sprint = SprintService.get_sprint_detail(pk)
            serializer = SprintSerializer(sprint)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Sprint.DoesNotExist:
            return Response({"detail": "Sprint not found."}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, pk, *args, **kwargs):
        try:
            SprintService.delete_sprint(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Sprint.DoesNotExist:
            return Response({"detail": "Sprint not found."}, status=status.HTTP_404_NOT_FOUND)


class SprintTaskUpdateView(APIView):
    """
    API View to update single fields of a sprint task.
    """
    permission_classes = [IsAuthenticated]

    def put(self, request, pk, *args, **kwargs):
        try:
            task = SprintService.update_task(pk, request.data)
            serializer = SprintTaskSerializer(task)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except SprintTask.DoesNotExist:
            return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk, *args, **kwargs):
        try:
            SprintService.delete_task(pk)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except SprintTask.DoesNotExist:
            return Response({"detail": "Task not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response(
                {"detail": f"Failed to delete task from Backlog: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )


class SprintTaskBulkDeleteView(APIView):
    """
    API View to bulk delete sprint tasks.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        task_ids = request.data.get('task_ids', [])
        try:
            count = SprintService.bulk_delete_tasks(task_ids)
            return Response({"detail": f"Successfully deleted {count} tasks."}, status=status.HTTP_200_OK)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SprintAISuggestScheduleView(APIView):
    """
    API View to generate suggestions for task scheduling using AI.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, sprint_id, *args, **kwargs):
        from decouple import config
        api_key = config('GEMINI_API_KEY', default=None) or os.environ.get("GEMINI_API_KEY")
        task_ids = request.data.get('task_ids', [])

        try:
            output_suggestions = SprintService.generate_ai_suggestions(sprint_id, task_ids, api_key)
            return Response(output_suggestions, status=status.HTTP_200_OK)
        except Sprint.DoesNotExist:
            return Response({"detail": "Sprint not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except ImportError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {"detail": f"AI Generation Failed: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )


class SprintImportScheduleView(APIView):
    """
    API View to save imported schedule suggestions.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, sprint_id, *args, **kwargs):
        try:
            SprintService.import_schedule_data(sprint_id, request.data)
            return Response({"detail": "Schedule successfully imported and saved."}, status=status.HTTP_200_OK)
        except Sprint.DoesNotExist:
            return Response({"detail": "Sprint not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SprintTaskCreateView(APIView):
    """
    API View to create a new task in a sprint.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, sprint_id, *args, **kwargs):
        try:
            task = SprintService.create_task(sprint_id, request.data)
            return Response(SprintTaskSerializer(task).data, status=status.HTTP_201_CREATED)
        except Sprint.DoesNotExist:
            return Response({"detail": "Sprint not found."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            # Check if ValueError contains dictionary errors (from serializer)
            err_msg = e.args[0] if e.args else str(e)
            if isinstance(err_msg, dict):
                return Response(err_msg, status=status.HTTP_400_BAD_REQUEST)
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SprintNoteListView(APIView):
    """
    API View to list and upsert daily notes for a sprint.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, sprint_id, *args, **kwargs):
        try:
            notes = SprintService.list_sprint_notes(sprint_id)
            return Response(SprintNoteSerializer(notes, many=True).data, status=status.HTTP_200_OK)
        except Sprint.DoesNotExist:
            return Response({"detail": "Sprint not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def post(self, request, sprint_id, *args, **kwargs):
        date_str = request.data.get('date')
        content = request.data.get('content', '')
        if not date_str:
            return Response({"detail": "date is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            note = SprintService.save_sprint_note(sprint_id, date_str, content)
            return Response(SprintNoteSerializer(note).data, status=status.HTTP_200_OK)
        except Sprint.DoesNotExist:
            return Response({"detail": "Sprint not found."}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

