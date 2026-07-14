from django.contrib import admin
from accounts.models import Employee


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("id", "email", "full_name", "role", "is_active", "created_at")
    list_filter = ("role", "is_active")
    search_fields = ("email", "full_name", "google_id")
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("-created_at",)
