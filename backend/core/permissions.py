from rest_framework.permissions import BasePermission
from .models import WorkspaceMembership


class IsWorkspaceMember(BasePermission):
    """
    Allows access only to users who are members of the workspace
    identified by `workspace_slug` in the URL kwargs.
    """
    message = 'You do not have permission to access this workspace.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        workspace_slug = view.kwargs.get('workspace_slug')
        if not workspace_slug:
            return False

        return WorkspaceMembership.objects.filter(
            user=request.user,
            workspace__slug=workspace_slug,
        ).exists()


class IsWorkspaceAdmin(BasePermission):
    """
    Allows access only to workspace members with the 'admin' role.
    """
    message = 'You must be a workspace admin to perform this action.'

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        workspace_slug = view.kwargs.get('workspace_slug')
        if not workspace_slug:
            return False

        return WorkspaceMembership.objects.filter(
            user=request.user,
            workspace__slug=workspace_slug,
            role=WorkspaceMembership.ROLE_ADMIN,
        ).exists()
