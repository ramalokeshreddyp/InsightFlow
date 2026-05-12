import apiClient from './client'

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  me: () => apiClient.get('/auth/me/').then(r => r.data),
  logout: () => apiClient.post('/auth/logout/').then(r => r.data),
  loginWithGoogle: (code) => apiClient.post('/auth/google/', { code }).then(r => r.data),
  loginWithGitHub: (code) => apiClient.post('/auth/github/', { code }).then(r => r.data),
}

// ── Workspaces ────────────────────────────────────────────────────────────────
export const workspacesApi = {
  list: () => apiClient.get('/workspaces/').then(r => r.data),
  create: (name) => apiClient.post('/workspaces/', { name }).then(r => r.data),
  detail: (slug) => apiClient.get(`/w/${slug}/`).then(r => r.data),
  members: (slug) => apiClient.get(`/w/${slug}/members/`).then(r => r.data),
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  ingestEvent: (slug, payload) =>
    apiClient.post(`/w/${slug}/events/`, payload).then(r => r.data),
  summary: (slug) =>
    apiClient.get(`/w/${slug}/dashboard/summary/`).then(r => r.data),
  timeseries: (slug, period = '7d') =>
    apiClient.get(`/w/${slug}/dashboard/timeseries/`, { params: { period } }).then(r => r.data),
}
