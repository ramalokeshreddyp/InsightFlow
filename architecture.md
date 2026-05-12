# InsightFlow — System Architecture

> Comprehensive technical architecture documentation for the InsightFlow multi-tenant SaaS analytics platform.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [High-Level System Diagram](#2-high-level-system-diagram)
3. [Service Architecture](#3-service-architecture)
4. [Backend Architecture (Django)](#4-backend-architecture-django)
5. [Frontend Architecture (React)](#5-frontend-architecture-react)
6. [Database Architecture](#6-database-architecture)
7. [Caching Architecture (Redis)](#7-caching-architecture-redis)
8. [Authentication Architecture](#8-authentication-architecture)
9. [Multi-Tenancy Architecture](#9-multi-tenancy-architecture)
10. [Network and Infrastructure](#10-network-and-infrastructure)
11. [Data Flow Diagrams](#11-data-flow-diagrams)
12. [Security Architecture](#12-security-architecture)

---

## 1. Architecture Overview

InsightFlow follows a **three-tier web application architecture** with a clear separation between presentation, business logic, and data layers.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE TIERS                           │
├──────────────────────┬──────────────────────┬───────────────────────┤
│  PRESENTATION TIER   │   BUSINESS LOGIC     │      DATA TIER        │
│  ─────────────────   │   ─────────────────  │   ─────────────────   │
│  React 18 SPA        │   Django 4.2         │   PostgreSQL 15       │
│  Tailwind CSS        │   DRF REST API       │   Redis 7             │
│  Recharts            │   Session Auth       │   (Persistent Vol.)   │
│  TanStack Query      │   OAuth2 Exchange    │                       │
│  React Router v6     │   Redis Caching      │                       │
│  Axios HTTP Client   │   Multi-Tenancy      │                       │
└──────────────────────┴──────────────────────┴───────────────────────┘
```

### Architectural Principles

| Principle | Application in InsightFlow |
|---|---|
| **Separation of Concerns** | Frontend, backend, and database are fully decoupled services |
| **Tenant Isolation** | Every DB query is scoped to a workspace; permission checks at the view layer |
| **Cache-Aside Pattern** | Application checks Redis before querying PostgreSQL |
| **Stateless API** | Sessions stored in Redis, not in-memory — horizontally scalable |
| **12-Factor App** | Configuration via environment variables, no secrets in code |

---

## 2. High-Level System Diagram

```mermaid
graph TB
    subgraph client["🌐 Client Layer"]
        browser["Browser\n(Chrome, Firefox, Safari)"]
    end

    subgraph docker["🐳 Docker Compose Network: insightflow"]
        direction TB

        subgraph frontend_svc["Frontend Service (Port 3000)"]
            nginx["Nginx 1.25\nStatic File Server\n+ Reverse Proxy"]
            react_build["React Build\n/usr/share/nginx/html"]
        end

        subgraph backend_svc["Backend Service (Port 8000)"]
            gunicorn["Gunicorn\n3 Workers"]
            django["Django 4.2\nREST Framework"]
            auth_mod["Auth Module\nOAuth + Sessions"]
            ws_mod["Workspace Module\nMulti-Tenancy"]
            analytics_mod["Analytics Module\nAggregations + Cache"]
        end

        subgraph data_layer["Data Layer"]
            postgres["🐘 PostgreSQL 15\nPrimary Store"]
            redis["⚡ Redis 7\nCache + Sessions"]
        end
    end

    subgraph external["🔐 External OAuth Providers"]
        google["Google OAuth2\naccounts.google.com"]
        github["GitHub OAuth2\ngithub.com"]
    end

    browser -->|"HTTPS :3000"| nginx
    nginx -->|"Static Files"| react_build
    nginx -->|"Proxy /api/*"| gunicorn
    gunicorn --> django
    django --> auth_mod
    django --> ws_mod
    django --> analytics_mod
    auth_mod -->|"Token Exchange"| google
    auth_mod -->|"Token Exchange"| github
    analytics_mod -->|"Cache Aside"| redis
    django -->|"ORM Queries"| postgres
    django -->|"Session R/W"| redis

    style client fill:#1e1e33,stroke:#6366f1,color:#fff
    style docker fill:#0a0a1a,stroke:#4338ca,color:#fff
    style external fill:#1a1a2e,stroke:#7c3aed,color:#fff
```

---

## 3. Service Architecture

### Docker Compose Services

```mermaid
graph LR
    subgraph compose["docker-compose.yml"]
        db["db\npostgres:15-alpine\n📦 postgres_data volume\n🔌 internal only"]
        redis["redis\nredis:7-alpine\n📦 redis_data volume\n🔌 internal only"]
        backend["backend\nDjango/Gunicorn\n📦 mounts ./backend\n🔌 exposes :8000 internal"]
        frontend["frontend\nNginx\n🔌 publishes :3000→:80"]
    end

    db -->|"healthy check\npg_isready"| backend
    redis -->|"healthy check\nredis-cli ping"| backend
    backend -->|"depends_on healthy"| frontend
```

### Container Startup Sequence

```mermaid
sequenceDiagram
    participant DC as docker-compose
    participant PG as PostgreSQL
    participant R as Redis
    participant BE as Backend
    participant FE as Frontend

    DC->>PG: Start container
    DC->>R: Start container
    PG-->>DC: pg_isready ✅
    R-->>DC: redis-cli ping ✅
    DC->>BE: Start (after PG+Redis healthy)
    BE->>BE: entrypoint.sh
    BE->>PG: python manage.py migrate
    BE->>PG: python manage.py seed_data
    BE->>BE: gunicorn start (3 workers)
    DC->>FE: Start Nginx
    FE-->>DC: Ready on :3000 ✅
```

---

## 4. Backend Architecture (Django)

### Module Structure

```mermaid
graph TD
    subgraph insightflow["insightflow/ (Django Project)"]
        settings["settings.py\nAll configuration"]
        root_urls["urls.py\nRoot router"]
        wsgi["wsgi.py\nGSGI entry"]
    end

    subgraph core["core/ (Application)"]
        models["models.py\nUser · Workspace · Event\nWorkspaceMembership\nOAuthConnection"]
        serializers["serializers.py\nDRF serializers\n(validation + output)"]
        permissions["permissions.py\nIsWorkspaceMember\nIsWorkspaceAdmin"]
        utils["utils.py\nCustom exception handler"]
        admin["admin.py\nDjango admin config"]
        core_urls["urls.py\n13 API endpoints"]
    end

    subgraph views["core/views/"]
        auth_v["auth_views.py\nGoogleAuthView\nGitHubAuthView\nMeView · LogoutView\nCSRFView"]
        ws_v["workspace_views.py\nWorkspaceListCreateView\nWorkspaceDetailView\nWorkspaceMembersView"]
        ana_v["analytics_views.py\nEventIngestView\nDashboardSummaryView\nDashboardTimeSeriesView"]
        dev_v["dev_views.py\nDevLoginView"]
    end

    subgraph mgmt["core/management/commands/"]
        seed["seed_data.py\nCreates demo users\nworkspaces + events"]
    end

    root_urls --> core_urls
    core_urls --> auth_v
    core_urls --> ws_v
    core_urls --> ana_v
    core_urls --> dev_v
    models --> serializers
    permissions --> ws_v
    permissions --> ana_v
```

### Request Processing Pipeline

```mermaid
flowchart LR
    A[HTTP Request] --> B[Nginx Proxy]
    B --> C[Gunicorn Worker]
    C --> D[Django Middleware Stack]
    D --> E{URL Router}
    E --> F[DRF View]
    F --> G{Permission Check}
    G -->|Denied| H[403/401 Response]
    G -->|Allowed| I[Business Logic]
    I --> J{Cache?}
    J -->|Hit| K[Redis Response]
    J -->|Miss| L[PostgreSQL Query]
    L --> M[Cache Store]
    M --> N[JSON Response]
    K --> N
```

### Django Settings Architecture

```
settings.py
├── DATABASES          → PostgreSQL via psycopg2
├── CACHES             → Redis via django-redis
│   └── KEY_PREFIX     → "insightflow" namespace
├── SESSION_ENGINE     → django.contrib.sessions.backends.cache
├── REST_FRAMEWORK     → SessionAuthentication + custom exception handler
├── CORS               → Frontend origins + allow_credentials
├── AUTH_USER_MODEL    → core.User (custom UUID-based model)
└── OAuth Config       → CLIENT_ID, CLIENT_SECRET, REDIRECT_URI
```

---

## 5. Frontend Architecture (React)

### Component Tree

```mermaid
graph TD
    App["App.jsx\nBrowserRouter"]

    App --> AuthProvider["AuthProvider\n(AuthContext)"]
    AuthProvider --> WorkspaceProvider["WorkspaceProvider\n(WorkspaceContext)"]
    WorkspaceProvider --> Routes["React Router Routes"]

    Routes --> PublicRoutes["Public Routes"]
    Routes --> ProtectedRoute["ProtectedRoute\n(auth guard)"]

    PublicRoutes --> LoginPage["LoginPage\nOAuth buttons\nDev login"]
    PublicRoutes --> Callback["OAuthCallback\ncode → backend"]

    ProtectedRoute --> DashboardPage["DashboardPage"]
    ProtectedRoute --> WorkspacesPage["WorkspacesPage"]

    DashboardPage --> Sidebar["Sidebar\n+ WorkspaceSelector"]
    DashboardPage --> TopBar["TopBar\n+ UserMenu"]
    DashboardPage --> SummaryCards["SummaryCards\n4 KPI metrics"]
    DashboardPage --> TimeSeriesChart["TimeSeriesChart\nRecharts Area"]
    DashboardPage --> TopEventsChart["TopEventsChart\nRecharts Bar"]
    DashboardPage --> TopPagesTable["TopPagesTable\nProgress bars"]
```

### State Management

```mermaid
graph LR
    subgraph contexts["React Contexts (Global State)"]
        AuthCtx["AuthContext\n• user\n• isLoading\n• login/logout fns"]
        WSCtx["WorkspaceContext\n• workspaces[]\n• activeWorkspace\n• switchWorkspace()"]
    end

    subgraph rq["TanStack Query (Server State)"]
        Q1["['dashboardSummary', slug]\n15-min client cache"]
        Q2["['dashboardTimeseries', slug, period]\nper period cache"]
        Q3["['workspaces']\nworkspace list"]
    end

    subgraph local["Component Local State"]
        period["period: '7d'|'30d'|'90d'\n(DashboardPage)"]
        menuOpen["menuOpen: boolean\n(TopBar)"]
        newName["newName: string\n(WorkspaceSelector)"]
    end

    AuthCtx -->|"user data"| WSCtx
    WSCtx -->|"activeWorkspace.slug"| Q1
    WSCtx -->|"activeWorkspace.slug"| Q2
    period -->|"query param"| Q2
```

### Data Fetching Flow

```mermaid
sequenceDiagram
    participant C as Component
    participant TQ as TanStack Query
    participant Axios as Axios Client
    participant API as Django API

    C->>TQ: useQuery({queryKey, queryFn})
    TQ->>TQ: Check client cache
    alt Cache fresh
        TQ-->>C: Return cached data instantly
    else Cache stale/empty
        TQ->>Axios: Call queryFn()
        Axios->>Axios: Attach CSRF + session cookie
        Axios->>API: HTTP GET /api/w/{slug}/dashboard/summary/
        API-->>Axios: JSON response
        Axios-->>TQ: Resolved data
        TQ->>TQ: Store in query cache
        TQ-->>C: {data, isLoading:false}
    end
```

---

## 6. Database Architecture

### Schema Design

```
┌──────────────────────────────────────────────────────────────────┐
│                        POSTGRESQL SCHEMA                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  users                          workspaces                       │
│  ─────────────────              ─────────────────────           │
│  id          UUID PK            id         UUID PK              │
│  email       VARCHAR UNIQUE     name       VARCHAR(200)         │
│  name        VARCHAR(255)       slug       SLUG UNIQUE          │
│  avatar_url  URL                owner_id   FK → users           │
│  provider    VARCHAR(20)        created_at TIMESTAMPTZ          │
│  provider_uid VARCHAR(255)      updated_at TIMESTAMPTZ          │
│  is_active   BOOLEAN                                             │
│  date_joined TIMESTAMPTZ        workspace_memberships            │
│                                 ─────────────────────────       │
│  oauth_connections              user_id      FK → users         │
│  ─────────────────              workspace_id FK → workspaces    │
│  id         UUID PK             role         VARCHAR(20)        │
│  user_id    FK → users          joined_at    TIMESTAMPTZ        │
│  provider   VARCHAR(20)         UNIQUE(user_id, workspace_id)   │
│  access_token TEXT (encrypted)                                   │
│  refresh_token TEXT (encrypted) events                          │
│  expires_at TIMESTAMPTZ         ─────────────────────────       │
│                                 id           UUID PK            │
│                                 workspace_id FK → workspaces    │
│                                 event_name   VARCHAR(100)       │
│                                 payload      JSONB              │
│                                 visitor_id   VARCHAR(255)       │
│                                 created_at   TIMESTAMPTZ        │
└──────────────────────────────────────────────────────────────────┘
```

### Index Strategy

```sql
-- Events: primary analytical query path
CREATE INDEX idx_event_workspace_time
    ON events(workspace_id, created_at DESC);

CREATE INDEX idx_event_workspace_name
    ON events(workspace_id, event_name);

-- Users: OAuth lookup on every login
CREATE INDEX idx_user_provider
    ON users(provider, provider_user_id);

-- Memberships: permission check on every workspace request
CREATE INDEX idx_membership_workspace_user
    ON workspace_memberships(workspace_id, user_id);
```

### Query Patterns

| Query | Index Used | Typical Cost |
|---|---|---|
| `Event.filter(workspace=ws).count()` | `idx_event_workspace_time` | O(log n) |
| `Event.filter(workspace=ws, event_name='page_view')` | `idx_event_workspace_name` | O(log n) |
| `Event.filter(workspace=ws, created_at__gte=...)` | `idx_event_workspace_time` | O(log n) range |
| `WorkspaceMembership.filter(user=u, workspace__slug=s)` | `idx_membership_workspace_user` | O(1) |
| `User.get(provider=p, provider_user_id=id)` | `idx_user_provider` | O(1) |

### JSONB Payload Design

Events use a PostgreSQL `JSONB` field for flexible payload storage:

```json
// page_view
{"page": "/pricing", "referrer": "google", "duration_ms": 3200}

// button_click
{"element": "cta-button", "page": "/home", "text": "Get Started"}

// form_submit
{"form": "signup", "source": "landing-page"}
```

JSONB is chosen over plain text because:
- **Indexed queries**: `payload->>'page'` uses GIN indexes
- **Type safety**: Enforces valid JSON at DB level
- **Flexible schema**: Different event types have different fields

---

## 7. Caching Architecture (Redis)

### Cache-Aside Pattern

```mermaid
flowchart TD
    A["GET /dashboard/summary/"] --> B["Build cache key:\nworkspaces:{id}:dashboard_summary"]
    B --> C{{"Redis CACHE.GET(key)"}}

    C -->|"HIT ✅\n~0.5ms"| D["Return cached JSON\nto client"]

    C -->|"MISS ❌\n~50-200ms"| E["Query PostgreSQL:\n• COUNT events\n• DISTINCT visitors\n• TOP pages aggregation\n• TOP event types\n• Last 7d count"]
    E --> F["Build response dict"]
    F --> G{{"Redis CACHE.SET(key, data, TTL=900)"}}}
    G --> H["Return fresh JSON\nto client"]

    I["POST /events/ (new event)"] --> J{{"Redis CACHE.DELETE(\nall workspace cache keys)"}}}
    J --> K["Next request triggers\ncache rebuild"]
```

### Session Storage

```
Redis Key Structure:
─────────────────────────────────────────────
django.sessions:{session_id}   → session JSON
insightflow:workspaces:{id}:dashboard_summary → cached dict
insightflow:workspaces:{id}:dashboard_timeseries_7d → list
insightflow:workspaces:{id}:dashboard_timeseries_30d → list
insightflow:workspaces:{id}:dashboard_timeseries_90d → list
─────────────────────────────────────────────

TTL Policy:
Session keys    → SESSION_COOKIE_AGE (default 86400s = 1 day)
Dashboard cache → 900s (15 minutes)
Timeseries cache → 900s (15 minutes)
```

### Performance Impact

| Scenario | Without Redis | With Redis |
|---|---|---|
| First dashboard load | ~150ms (DB aggregation) | ~150ms (cache miss) |
| Subsequent loads | ~150ms (no cache) | ~1ms (cache hit) |
| Session lookup | ~10ms (DB query) | ~0.5ms (Redis) |
| Concurrent 100 users | Heavy DB load | Single DB query shared |

---

## 8. Authentication Architecture

### Session-Based Authentication Flow

```mermaid
flowchart TD
    A[Client Request] --> B{Has sessionid\ncookie?}
    B -->|No| C[401 Unauthorized]
    B -->|Yes| D{Redis session\nlookup}
    D -->|Not found| E[401 - Session expired]
    D -->|Found| F[Attach user to request]
    F --> G[Permission check]
    G --> H[Process request]
```

### OAuth Token Storage

```
Token Security Flow:
─────────────────────────────────────────────────
1. OAuth provider returns: access_token + refresh_token
2. application.encrypt_token(access_token)
   └─ Fernet.encrypt(token.encode())
   └─ Stores as base64-encoded ciphertext
3. Stored in oauth_connections.access_token (TEXT)
4. To use: Fernet.decrypt(stored_bytes).decode()
─────────────────────────────────────────────────
Key: TOKEN_ENCRYPTION_KEY (Fernet 32-byte base64)
Algorithm: AES-128-CBC + HMAC-SHA256
```

### Session vs JWT Decision

InsightFlow deliberately chose **session-based authentication** over JWT because:

| Factor | Session (Chosen) | JWT |
|---|---|---|
| **Revocation** | Instant (delete Redis key) | Requires token blacklist |
| **Complexity** | Simple (Django built-in) | Custom middleware needed |
| **Storage** | Redis (fast, centralised) | Client-side (stateless) |
| **Security** | HTTP-only cookie, no XSS | localStorage vulnerable |
| **Use case** | Web SPA (our case) | Mobile / microservices |

---

## 9. Multi-Tenancy Architecture

### Tenant Isolation Model

InsightFlow uses **shared database, shared schema** multi-tenancy — the most common SaaS pattern.

```mermaid
graph TD
    subgraph shared["Single PostgreSQL Instance"]
        subgraph tenant_a["Workspace: acme-inc"]
            a_events["events WHERE workspace_id = 'acme-uuid'"]
            a_members["memberships WHERE workspace_id = 'acme-uuid'"]
        end
        subgraph tenant_b["Workspace: insightflow-demo"]
            b_events["events WHERE workspace_id = 'demo-uuid'"]
            b_members["memberships WHERE workspace_id = 'demo-uuid'"]
        end
    end

    user_a["User A (Acme member)"] -->|"IsWorkspaceMember check ✅"| a_events
    user_a -->|"Trying demo workspace 🚫"| reject["403 Forbidden"]
    user_b["User B (Demo member)"] -->|"IsWorkspaceMember check ✅"| b_events
```

### Isolation Enforcement Layers

```
Layer 1 — URL Design:
  /api/w/{workspace_slug}/...
  Workspace slug is always explicit in the URL.

Layer 2 — Permission Class:
  class IsWorkspaceMember(BasePermission):
      def has_permission(self, request, view):
          return WorkspaceMembership.objects.filter(
              user=request.user,
              workspace__slug=view.kwargs['workspace_slug']
          ).exists()
  Applied to: ALL workspace-scoped views

Layer 3 — QuerySet Scoping:
  Event.objects.filter(workspace=workspace, ...)
  No view ever queries events without workspace filter.

Layer 4 — Cache Key Isolation:
  workspaces:{workspace_id}:... keys are tenant-specific
```

### Role Permission Matrix

| Action | Admin | Editor | Viewer |
|---|---|---|---|
| View dashboard | ✅ | ✅ | ✅ |
| Ingest events | ✅ | ✅ | ❌ |
| View members | ✅ | ✅ | ✅ |
| Manage members | ✅ | ❌ | ❌ |
| Delete workspace | ✅ | ❌ | ❌ |

---

## 10. Network and Infrastructure

### Docker Network Topology

```
Host Machine
│
├── Port 3000 (exposed) ──────────────────────────────┐
│                                                      │
│  ┌──── Docker Network: insightflow ────────────────┐ │
│  │                                                  │ │
│  │  ┌─────────────┐   proxy /api/   ┌───────────┐  │ │
│  │  │   frontend   │ ──────────────► │  backend  │  │ │
│  │  │  Nginx :80   │                │ Gunicorn  │  │ │
│  │  └─────────────┘                 │ Django    │  │ │
│  │         ▲                        └─────┬─────┘  │ │
│  │         │                             │         │ │
│  │         │                     ┌───────┴───────┐  │ │
│  │         │                     │               │  │ │
│  │         │               ┌─────▼────┐   ┌──────▼─┐│ │
│  │         │               │    db    │   │ redis  ││ │
│  │         │               │ PG 15    │   │ v7     ││ │
│  │         │               └──────────┘   └────────┘│ │
│  └─────────┼──────────────────────────────────────┘ │ │
│            │                                         │ │
└────────────┼─────────────────────────────────────────┘ │
             │                                            │
             └────────────────────────────────────────────┘
```

### Volume Architecture

```yaml
volumes:
  postgres_data:   # Named volume — survives container restarts
    driver: local  # Stores: /var/lib/postgresql/data

  redis_data:      # Named volume — persists Redis AOF logs
    driver: local  # Stores: /data (appendonly.aof)

  static_files:    # Django collectstatic output
    driver: local  # Shared between backend and (optional) Nginx
```

---

## 11. Data Flow Diagrams

### Event Ingestion Flow

```mermaid
sequenceDiagram
    participant C as Client SDK/curl
    participant N as Nginx
    participant D as Django
    participant PC as Permission Check
    participant DB as PostgreSQL
    participant R as Redis

    C->>N: POST /api/w/{slug}/events/\n{event, payload, visitor_id}
    N->>D: Proxy request
    D->>PC: IsAuthenticated?
    PC-->>D: ✅ Session valid
    D->>PC: IsWorkspaceMember(slug)?
    PC-->>D: ✅ Member confirmed
    D->>DB: Event.objects.create(workspace, event_name, payload, visitor_id)
    DB-->>D: Event saved ✅
    D->>R: cache.delete(workspace_summary_key)
    D->>R: cache.delete(workspace_timeseries_keys)
    R-->>D: Cache invalidated
    D-->>C: 201 Created + event JSON
```

### Dashboard Render Flow

```mermaid
sequenceDiagram
    participant B as Browser
    participant R as React
    participant TQ as TanStack Query
    participant API as Django API
    participant Redis as Redis
    participant PG as PostgreSQL

    B->>R: Navigate to /dashboard
    R->>R: AuthContext.fetchUser() → /api/auth/me/
    R->>R: WorkspaceContext.fetchWorkspaces() → /api/workspaces/
    R->>R: Render DashboardPage with activeWorkspace

    par Parallel queries
        TQ->>API: GET /summary/
        TQ->>API: GET /timeseries/?period=7d
    end

    API->>Redis: GET cache keys
    Redis-->>API: Hit ✅ or Miss ❌

    opt Cache Miss
        API->>PG: Aggregate queries
        PG-->>API: Results
        API->>Redis: SET cache 15min
    end

    API-->>TQ: JSON data
    TQ-->>R: {data, isLoading:false}
    R->>B: Render KPI cards + charts
```

---

## 12. Security Architecture

### Defence in Depth

```mermaid
graph TD
    A["Incoming Request"] --> B["Layer 1: Nginx\nRate limiting (future)\nTLS termination (production)"]
    B --> C["Layer 2: Django Middleware\nCSRF validation\nSession authentication\nSecurity headers"]
    C --> D["Layer 3: DRF Permissions\nIsAuthenticated\nIsWorkspaceMember"]
    D --> E["Layer 4: QuerySet Scoping\nAll queries filtered by workspace"]
    E --> F["Layer 5: Serializer Validation\nInput sanitisation\nField whitelisting"]
    F --> G["✅ Authorized Response"]
```

### Threat Model

| Threat | Mitigation |
|---|---|
| **Cross-Tenant Data Leak** | `IsWorkspaceMember` + QuerySet workspace filter on every request |
| **Session Hijacking** | HTTP-only cookie, `SameSite=Lax`, session stored in Redis |
| **CSRF Attack** | Django CSRF middleware + `X-CSRFToken` header required on writes |
| **OAuth Token Theft** | Tokens encrypted at rest with AES-128 (Fernet) |
| **SQL Injection** | Django ORM parameterised queries — no raw SQL |
| **XSS** | React DOM escaping, HTTP-only session cookie |
| **Brute Force** | OAuth offloads credentials to Google/GitHub (rate-limited) |
| **Insecure Secrets** | All secrets via environment variables, `.env` in `.gitignore` |

---

*InsightFlow Architecture — v1.0 | Last updated: May 2026*
