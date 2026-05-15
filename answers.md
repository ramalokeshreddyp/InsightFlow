# Questionnaire Answers

## 1) Overall application architecture

InsightFlow is a three-tier SaaS analytics platform built as a React SPA on the frontend, a Django REST API on the backend, and PostgreSQL plus Redis on the data layer. React is responsible for the browser UI, routing, and client-side data fetching. It calls the backend through a shared Axios client that sends session cookies and CSRF tokens, and it uses TanStack Query to cache dashboard data on the client by workspace and period.

Django is the application and business-logic layer. It owns OAuth login, session creation, workspace management, event ingestion, analytics aggregation, permissions, and serializer logic. The backend exposes workspace-scoped REST endpoints such as `/api/w/<slug>/events/`, `/api/w/<slug>/dashboard/summary/`, and `/api/w/<slug>/dashboard/timeseries/`.

PostgreSQL is the primary system of record. It stores users, workspaces, memberships, events, and OAuth connections in a shared-schema model. Redis is used for two purposes: session storage and caching. Sessions are stored in Redis through Django's cache-backed session engine, and dashboard analytics responses are cached in Redis with tenant-specific keys. The overall data flow is: user action in React -> authenticated API request to Django -> permission check and workspace lookup -> either Redis cache hit or PostgreSQL aggregation -> JSON response back to the SPA.

## 2) Multi-tenancy and data isolation

Multi-tenancy is implemented with a shared database schema and a workspace-centric data model. Every tenant-owned record is tied to a `workspace` foreign key, and access to workspace-scoped endpoints is guarded by custom DRF permissions. The key permission class is `IsWorkspaceMember`, which checks whether the authenticated user has a `WorkspaceMembership` row for the `workspace_slug` in the URL before the view runs. `IsWorkspaceAdmin` adds role-based enforcement for admin-only actions.

At the API level, every workspace endpoint is filtered by the current workspace slug and membership check. For example, analytics views call `get_object_or_404(Workspace, slug=workspace_slug)` only after the permission check passes, and the queries inside those views are always scoped with `Event.objects.filter(workspace=workspace)`. Workspace listing is also restricted to the current user's memberships.

At the database level, isolation is reinforced by foreign keys and uniqueness constraints rather than Postgres row-level security. `Event` rows must belong to a workspace, `WorkspaceMembership` uses `unique_together = [('user', 'workspace')]`, and the models include indexes such as `(workspace, created_at)` and `(workspace, event_name)` to keep tenant-scoped queries efficient. So the isolation strategy is application-enforced tenancy with schema-level constraints, not separate databases or RLS policies.

## 3) Redis caching strategy

Redis is used as a cache-aside store for the dashboard analytics endpoints and as the session backend. The cached API endpoints are `GET /api/w/<workspace_slug>/dashboard/summary/` and `GET /api/w/<workspace_slug>/dashboard/timeseries/?period=7d|30d|90d`. The summary view caches the full KPI payload, and the timeseries view caches each period separately.

The cache key structure is tenant-specific: `workspaces:{workspace_id}:dashboard_summary` and `workspaces:{workspace_id}:dashboard_timeseries_{period}`. This ensures that one workspace never reads another workspace's cached analytics. The cache TTL is 15 minutes.

Cache invalidation happens on event ingestion. When `POST /api/w/<workspace_slug>/events/` creates a new event, the backend deletes the summary key and the period-specific timeseries keys for that workspace so the next dashboard request recomputes fresh data. That keeps the cache isolated and prevents stale analytics after new event writes. The frontend also benefits from client-side query caching through TanStack Query, which keys dashboard requests by workspace slug and period.

## 4) N+1 query avoidance

I used `select_related` and `prefetch_related` in the workspace views to avoid repetitive database hits when rendering workspace metadata and membership lists. In `WorkspaceListCreateView`, the queryset loads workspaces with `.prefetch_related('memberships').select_related('owner')`, which prevents separate queries for each workspace owner and membership collection. In `WorkspaceDetailView`, the same pattern is used so the detail response can be serialized without extra owner or membership queries.

The clearest N+1 fix is in `WorkspaceMembersView`, where `workspace.memberships.select_related('user').all()` fetches each membership and its related user in one query pattern instead of querying the user table once per member. That matters because the serializer nests `UserSerializer` inside each membership. On the analytics side, the views also keep queries scoped to a single workspace queryset and then aggregate over that queryset, which avoids cross-tenant scanning and keeps the query set narrow.

## 5) Security measures

OAuth is implemented with the authorization-code flow for Google and GitHub. The backend exchanges the code server-side, fetches the provider profile, upserts the local user record, and stores OAuth tokens in `OAuthConnection`. Those tokens are encrypted at the application layer with Fernet when `TOKEN_ENCRYPTION_KEY` is configured, so the raw provider tokens are not stored in plaintext in normal deployments.

Session management is cookie-based rather than JWT-based. Django uses `SessionAuthentication`, the session engine is backed by Redis, and the session cookie is configured with `SESSION_COOKIE_HTTPONLY = True` and `SESSION_COOKIE_SAMESITE = 'Lax'`. The frontend sends requests with `withCredentials: true`, fetches a CSRF token from `/api/auth/csrf/`, and attaches `X-CSRFToken` on mutating requests. That gives the SPA a standard Django session-and-CSRF security model.

Unauthorized access to workspace data is blocked by permission checks on every workspace-scoped endpoint. `IsWorkspaceMember` and `IsWorkspaceAdmin` verify that the current user belongs to the workspace before the view executes, and the data queries themselves are filtered by workspace slug or workspace object. Logout also clears the Django session and deletes the `sessionid` cookie, which helps terminate authenticated access cleanly.
