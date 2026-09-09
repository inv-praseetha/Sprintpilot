"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    path('api/', include('project.urls')),
    path('api/', include('sprints.urls')),
    path('api/', include('backlog.urls')),
    path('api/jira/', include('jira_integration.urls')),
]

if settings.DEBUG:
    from django.views.decorators.clickjacking import xframe_options_exempt
    from django.views.static import serve
    from django.urls import re_path
    import re
    urlpatterns += [
        re_path(r'^%s(?P<path>.*)$' % re.escape(settings.MEDIA_URL.lstrip('/')), 
                xframe_options_exempt(serve), 
                kwargs={'document_root': settings.MEDIA_ROOT}),
    ]

