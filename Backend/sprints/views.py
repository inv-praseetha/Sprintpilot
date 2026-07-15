import os
from django.http import FileResponse
from django.conf import settings
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class SprintDownloadTemplateView(APIView):
    """
    API View to serve the static Excel template file stored on the backend.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        template_path = os.path.join(settings.BASE_DIR, 'templates', 'tasks_template.xlsx')
        if not os.path.exists(template_path):
            return Response(
                {"detail": "Template file not found on server."}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        response = FileResponse(
            open(template_path, 'rb'), 
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="tasks_template.xlsx"'
        return response
