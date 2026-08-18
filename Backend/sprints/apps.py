from django.apps import AppConfig


class SprintsConfig(AppConfig):
    name = 'sprints'

    def ready(self):
        import sprints.signals  # noqa

