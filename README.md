# InsightFlow 🚀

> **A multi-tenant, production-style SaaS analytics platform built with Django, React, PostgreSQL, and Redis.**

InsightFlow enables organisations to track user events, analyse trends, and gain actionable insights — all with strict tenant isolation and a premium dark-mode interface.

[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Django](https://img.shields.io/badge/Django-092E20?logo=django&logoColor=white)](https://djangoproject.com/)
[![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white)](https://redis.io/)

---

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Quick Start (Docker)](#quick-start-docker)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Caching Strategy](#caching-strategy)
- [Multi-Tenancy Design](#multi-tenancy-design)
- [OAuth2 Flow](#oauth2-flow)
- [Environment Variables](#environment-variables)

---

## ✨ Features

| Feature | Status |
|---------|--------|
| Google OAuth2 Login | ✅ |
| GitHub OAuth2 Login | ✅ |
| Multi-Tenant Workspaces | ✅ |
| Role-Based Access (admin/editor/viewer) | ✅ |
| Analytics Event Ingestion | ✅ |
| Dashboard Summary with Redis Cache | ✅ |
| Time-Series Charts (7d/30d/90d) | ✅ |
| Protected Frontend Routes | ✅ |
| Docker Compose One-Command Setup | ✅ |
| Seed Data for Demo | ✅ |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User's Browser                           │
│                   React SPA (InsightFlow UI)                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (port 3000)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Nginx (Frontend Container)                   │
│               Serves React SPA + proxies /api/ →               │
└──────────────────────────┬──────────────────────────────────────┘
                           │ proxy (port 8000)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               Django REST API (Backend Container)               │
│         Gunicorn • DRF • Session Auth • OAuth2 Exchange         │
└─────────┬───────────────────────────────────┬───────────────────┘
          │                                   │
          ▼                                   ▼
┌─────────────────────┐           ┌───────────────────────┐
│   PostgreSQL 15     │           │     Redis 7            │
│  (Primary DB)       │           │  Cache + Sessions      │
│  Users, Workspaces  │           │  15-min TTL on        │
│  Events, OAuth      │           │  dashboard queries     │
└─────────────────────┘           └───────────────────────┘
```

### Data Flow for Dashboard Request

```
Browser → Nginx → Django API
  → Check Redis cache (key: workspaces:{id}:dashboard_summary)
    ├─ CACHE HIT  → Return instantly (< 1ms)
    └─ CACHE MISS → Query PostgreSQL → Store in Redis (15 min TTL) → Return
```

---

## 🚀 Quick Start (Docker)

### Prerequisites

- [Docker Desktop](https://docs.docker.com/get-docker/) installed and running
- Git

### 1. Clone & Configure

```bash
git clone https://github.com/ramalokeshreddyp/InsightFlow.git
cd InsightFlow
```

The default `.env` file works out of the box for local development (no OAuth credentials needed to use the demo login).

### 2. Run with Docker Compose

```bash
docker-compose up --build
```

This single command will:
1. Pull PostgreSQL 15 and Redis 7 images
2. Build the Django backend container
3. Build the React frontend (multi-stage Nginx) container
4. Run database migrations automatically
5. Seed 300 demo events for two sample workspaces
6. Start all services

### 3. Access the App

| Service | URL |
|---------|-----|
| **Frontend** | http://localhost:3000 |
| **API** | http://localhost:3000/api/ |
| **Django Admin** | http://localhost:3000/admin/ |

### 4. Demo Login

Click **⚡ Quick Demo Login (Dev Mode)** on the login page to instantly access the pre-seeded demo workspace — no OAuth credentials required.

### 5. OAuth Login (Optional)

To enable real Google/GitHub OAuth:
1. Create OAuth apps at [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and [GitHub Developer Settings](https://github.com/settings/developers)
2. Set the redirect URI to `http://localhost:3000/auth/callback/google` (or `/github`)
3. Add your `CLIENT_ID` and `CLIENT_SECRET` to `backend/.env`

---

## 📡 API Reference

All endpoints are prefixed with `/api/`.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/auth/csrf/` | None | Get CSRF token |
| `POST` | `/api/auth/google/` | None | Google OAuth2 login |
| `POST` | `/api/auth/github/` | None | GitHub OAuth2 login |
| `POST` | `/api/auth/dev-login/` | None | Dev mode demo login |
| `GET` | `/api/auth/me/` | ✅ | Get current user |
| `POST` | `/api/auth/logout/` | ✅ | Logout and clear session |

### Workspaces

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/workspaces/` | ✅ | List user's workspaces |
| `POST` | `/api/workspaces/` | ✅ | Create a workspace |
| `GET` | `/api/w/{slug}/` | ✅ Member | Get workspace details |
| `GET` | `/api/w/{slug}/members/` | ✅ Member | List workspace members |

### Analytics (Tenant-Scoped)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/w/{slug}/events/` | ✅ Member | Ingest an event |
| `GET` | `/api/w/{slug}/dashboard/summary/` | ✅ Member | KPI summary (Redis cached) |
| `GET` | `/api/w/{slug}/dashboard/timeseries/?period=7d` | ✅ Member | Daily event counts |

#### Event Ingestion Example

```bash
curl -X POST http://localhost:3000/api/w/acme-inc/events/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: <your-csrf-token>" \
  -d '{"event": "page_view", "payload": {"page": "/pricing"}, "visitor_id": "visitor-001"}'
```

---

## 🗄️ Database Schema

```
┌──────────────┐     ┌──────────────────────┐     ┌────────────┐
│    Users     │────<│ WorkspaceMemberships │>────│ Workspaces │
│──────────────│     │──────────────────────│     │────────────│
│ id (UUID PK) │     │ user_id (FK)         │     │ id (UUID)  │
│ email        │     │ workspace_id (FK)    │     │ name       │
│ name         │     │ role (admin/editor/  │     │ slug       │
│ avatar_url   │     │       viewer)        │     │ owner_id   │
│ provider     │     └──────────────────────┘     │ created_at │
│ provider_uid │                                  └─────┬──────┘
└──────┬───────┘                                        │
       │                                                │ 1:N
       │ 1:N                                    ┌───────▼──────┐
┌──────▼──────────┐                             │    Events    │
│ OAuthConnections│                             │──────────────│
│─────────────────│                             │ id (UUID)    │
│ user_id (FK)    │                             │ workspace_id │
│ provider        │                             │ event_name   │
│ access_token    │                             │ payload(JSON)│
│ refresh_token   │                             │ visitor_id   │
│ expires_at      │                             │ created_at   │
└─────────────────┘                             └──────────────┘
```

**Indexes:**
- `events(workspace_id, created_at)` — time-series queries
- `events(workspace_id, event_name)` — event type filtering
- `users(provider, provider_user_id)` — OAuth lookup

---

## ⚡ Caching Strategy

InsightFlow uses Redis as a distributed cache for all expensive analytics queries.

### Cache Keys

```
insightflow:workspaces:{workspace_id}:dashboard_summary
insightflow:workspaces:{workspace_id}:dashboard_timeseries_7d
insightflow:workspaces:{workspace_id}:dashboard_timeseries_30d
insightflow:workspaces:{workspace_id}:dashboard_timeseries_90d
```

### TTL Policy

| Cache | TTL | Invalidated When |
|-------|-----|-----------------|
| `dashboard_summary` | 15 minutes | New event ingested for workspace |
| `dashboard_timeseries_*` | 15 minutes | New event ingested for workspace |

### Cache Miss Flow

```python
cached = cache.get(cache_key)
if cached:
    return Response(cached)   # ~0.5ms

# Cache miss: query DB, store result
data = compute_expensive_query(workspace)
cache.set(cache_key, data, timeout=900)  # 15 min
return Response(data)
```

### Sessions

User sessions are stored in Redis (not the DB) for fast lookup:

```python
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
```

---

## 🏢 Multi-Tenancy Design

InsightFlow uses a **shared database, shared schema** approach — the most common SaaS pattern.

### Isolation Mechanism

Every workspace-scoped API endpoint uses `IsWorkspaceMember` — a DRF permission class that verifies the requesting user's membership before any data access:

```python
class IsWorkspaceMember(BasePermission):
    def has_permission(self, request, view):
        workspace_slug = view.kwargs.get('workspace_slug')
        return WorkspaceMembership.objects.filter(
            user=request.user,
            workspace__slug=workspace_slug,
        ).exists()
```

### QuerySet Isolation

Views always scope querysets to the specific workspace — data from other tenants is never accessible:

```python
# Events are ALWAYS filtered by workspace before any other query
events = Event.objects.filter(workspace=workspace, ...)
```

### Roles

| Role | Can Ingest Events | View Dashboard | Manage Members |
|------|------------------|---------------|----------------|
| `admin` | ✅ | ✅ | ✅ |
| `editor` | ✅ | ✅ | ❌ |
| `viewer` | ❌ | ✅ | ❌ |

---

## 🔐 OAuth2 Flow

```
1. User clicks "Sign in with Google"
   │
   ▼
2. Browser redirects to Google consent screen
   (with client_id, redirect_uri, scope)
   │
   ▼
3. User approves → Google redirects to:
   http://localhost:3000/auth/callback/google?code=AUTH_CODE
   │
   ▼
4. React OAuthCallback component extracts `code`
   → POST /api/auth/google/ { "code": "AUTH_CODE" }
   │
   ▼
5. Django backend exchanges code with Google:
   POST https://oauth2.googleapis.com/token
   → Gets access_token + refresh_token
   │
   ▼
6. Backend fetches user info from Google
   → Upserts user in DB
   → Stores encrypted tokens in OAuthConnections
   → Creates session (stored in Redis)
   │
   ▼
7. Response: user data + Set-Cookie: sessionid=...
   React stores auth state → redirects to /dashboard
```

**Token Security:** OAuth access/refresh tokens are encrypted at rest using `cryptography.fernet` symmetric encryption before being stored in the database.

---

## 🔧 Environment Variables

See `backend/.env.example` for the full list.

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | ✅ | Django secret key |
| `DEBUG` | ✅ | `True` for development |
| `DB_*` | ✅ | PostgreSQL connection settings |
| `REDIS_URL` | ✅ | Redis connection string |
| `GOOGLE_CLIENT_ID` | OAuth only | Google OAuth app client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth only | Google OAuth app secret |
| `GITHUB_CLIENT_ID` | OAuth only | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | OAuth only | GitHub OAuth app secret |
| `TOKEN_ENCRYPTION_KEY` | Recommended | Fernet key for token encryption |

---

## 🛠️ Development (Without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # Edit with your local settings
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Project Structure

```
InsightFlow/
├── backend/
│   ├── core/
│   │   ├── models.py           # All Django models
│   │   ├── serializers.py      # DRF serializers
│   │   ├── permissions.py      # IsWorkspaceMember
│   │   ├── urls.py             # API URL patterns
│   │   └── views/
│   │       ├── auth_views.py   # OAuth + session views
│   │       ├── workspace_views.py
│   │       ├── analytics_views.py  # Cached dashboard
│   │       └── dev_views.py    # Dev-only login
│   ├── insightflow/
│   │   └── settings.py         # Django configuration
│   ├── Dockerfile
│   ├── entrypoint.sh           # Migrate + seed + start
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios client + API functions
│   │   ├── components/         # Sidebar, TopBar, ProtectedRoute
│   │   ├── features/
│   │   │   ├── auth/           # AuthContext, OAuthCallback
│   │   │   └── dashboard/      # Charts, KPI cards
│   │   └── pages/              # LoginPage, DashboardPage
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

---

*Built with ❤️ using Django, React, PostgreSQL, and Redis.*
