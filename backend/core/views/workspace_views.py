"""Workspace CRUD views."""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.models import Workspace, WorkspaceMembership
from core.serializers import WorkspaceSerializer, WorkspaceCreateSerializer, WorkspaceMembershipSerializer
from core.permissions import IsWorkspaceMember, IsWorkspaceAdmin


class WorkspaceListCreateView(APIView):
    """
    GET  /api/workspaces/  — list workspaces the user belongs to
    POST /api/workspaces/  — create a new workspace
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        workspace_ids = request.user.memberships.values_list('workspace_id', flat=True)
        workspaces = (
            Workspace.objects
            .filter(id__in=workspace_ids)
            .prefetch_related('memberships')
            .select_related('owner')
        )
        serializer = WorkspaceSerializer(workspaces, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        serializer = WorkspaceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workspace = serializer.save(owner=request.user)
        # Creator is automatically an admin member
        WorkspaceMembership.objects.create(
            user=request.user,
            workspace=workspace,
            role=WorkspaceMembership.ROLE_ADMIN,
        )
        return Response(
            WorkspaceSerializer(workspace, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class WorkspaceDetailView(APIView):
    """GET /api/w/<workspace_slug>/"""
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    def get(self, request, workspace_slug):
        from django.shortcuts import get_object_or_404
        workspace = get_object_or_404(
            Workspace.objects.prefetch_related('memberships').select_related('owner'),
            slug=workspace_slug,
        )
        return Response(WorkspaceSerializer(workspace, context={'request': request}).data)


class WorkspaceMembersView(APIView):
    """GET /api/w/<workspace_slug>/members/"""
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    def get(self, request, workspace_slug):
        from django.shortcuts import get_object_or_404
        workspace = get_object_or_404(Workspace, slug=workspace_slug)
        memberships = workspace.memberships.select_related('user').all()
        serializer = WorkspaceMembershipSerializer(memberships, many=True)
        return Response(serializer.data)
