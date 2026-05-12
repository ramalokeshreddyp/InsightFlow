from django.urls import path
from core.views import (
    GoogleAuthView, GitHubAuthView, MeView, LogoutView, CSRFView,
    WorkspaceListCreateView, WorkspaceDetailView, WorkspaceMembersView,
    EventIngestView, DashboardSummaryView, DashboardTimeSeriesView,
    DevLoginView,
)

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────────
    path('auth/csrf/', CSRFView.as_view(), name='auth-csrf'),
    path('auth/google/', GoogleAuthView.as_view(), name='auth-google'),
    path('auth/github/', GitHubAuthView.as_view(), name='auth-github'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/dev-login/', DevLoginView.as_view(), name='auth-dev-login'),

    # ── Workspaces ─────────────────────────────────────────────────────────────
    path('workspaces/', WorkspaceListCreateView.as_view(), name='workspace-list-create'),
    path('w/<slug:workspace_slug>/', WorkspaceDetailView.as_view(), name='workspace-detail'),
    path('w/<slug:workspace_slug>/members/', WorkspaceMembersView.as_view(), name='workspace-members'),

    # ── Analytics ──────────────────────────────────────────────────────────────
    path('w/<slug:workspace_slug>/events/', EventIngestView.as_view(), name='event-ingest'),
    path('w/<slug:workspace_slug>/dashboard/summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('w/<slug:workspace_slug>/dashboard/timeseries/', DashboardTimeSeriesView.as_view(), name='dashboard-timeseries'),
]
