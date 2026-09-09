from django.test import SimpleTestCase
from django.urls import reverse, resolve
from backlog.views import SprintSyncBacklogView
import uuid

class TestUrls(SimpleTestCase):

    def test_sprint_sync_backlog_url_resolves(self):
        sprint_id = uuid.uuid4()
        url = reverse('sprint_sync_backlog', args=[sprint_id])
        self.assertEqual(resolve(url).func.view_class, SprintSyncBacklogView)
