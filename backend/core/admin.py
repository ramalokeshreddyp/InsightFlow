from django.contrib import admin
from .models import User, Workspace, WorkspaceMembership, Event, OAuthConnection


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'name', 'provider', 'date_joined', 'is_active']
    list_filter = ['provider', 'is_active']
    search_fields = ['email', 'name']
    readonly_fields = ['id', 'date_joined']


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'owner', 'created_at']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(WorkspaceMembership)
class WorkspaceMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'workspace', 'role', 'joined_at']
    list_filter = ['role']
    search_fields = ['user__email', 'workspace__name']


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['event_name', 'workspace', 'visitor_id', 'created_at']
    list_filter = ['event_name', 'workspace']
    search_fields = ['event_name', 'visitor_id']
    readonly_fields = ['id', 'created_at']


@admin.register(OAuthConnection)
class OAuthConnectionAdmin(admin.ModelAdmin):
    list_display = ['user', 'provider', 'expires_at', 'created_at']
    list_filter = ['provider']
    readonly_fields = ['id', 'created_at', 'updated_at']
