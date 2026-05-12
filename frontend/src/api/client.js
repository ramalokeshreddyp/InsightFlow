import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,  // Send session cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── CSRF Token Management ─────────────────────────────────────────────────────
let csrfToken = null

const getCsrfToken = () => {
  // Try cookie first (set by Django)
  const match = document.cookie.match(/csrftoken=([^;]+)/)
  if (match) return match[1]
  return csrfToken
}

// Fetch CSRF token on first load
apiClient.get('/auth/csrf/')
  .then(res => { csrfToken = res.data.csrfToken })
  .catch(() => {})

// Request interceptor — attach CSRF token
apiClient.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase()
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const token = getCsrfToken()
    if (token) config.headers['X-CSRFToken'] = token
  }
  return config
})

// Response interceptor — handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Will be caught by AuthContext
    }
    return Promise.reject(error)
  }
)

export default apiClient
