import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'cookie'

// The SPA performs full page navigations (e.g. to /change-password), so the
// bearer token must survive a reload. sessionStorage keeps it for the tab
// session only and is cleared when the browser/tab closes.
const TOKEN_KEY = 'portal_session_token'
let bearerToken = typeof sessionStorage !== 'undefined'
  ? sessionStorage.getItem(TOKEN_KEY)
  : null

export const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: AUTH_MODE === 'cookie',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

if (bearerToken) {
  http.defaults.headers.common.Authorization = `Bearer ${bearerToken}`
}

export function setBearerToken(token) {
  bearerToken = token
  if (token) {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(TOKEN_KEY, token)
    http.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(TOKEN_KEY)
    delete http.defaults.headers.common.Authorization
  }
}

export function reportClientError({ message, stack = '', url = '', severity = 'warning' }) {
  if (import.meta.env.VITE_USE_API !== 'true' || typeof fetch === 'undefined') return
  try {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
    if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`
    fetch(`${BASE_URL}/ops/errors`, {
      method: 'POST',
      headers,
      credentials: AUTH_MODE === 'cookie' ? 'include' : 'omit',
      body: JSON.stringify({
        message: String(message || 'Unknown frontend error').slice(0, 2000),
        stack: String(stack || '').slice(0, 8000),
        url: String(url || '').slice(0, 2000),
        severity,
      }),
      keepalive: true,
    }).catch(() => {})
  } catch { /* reporting must never break the app */ }
}

export class ApiError extends Error {
  constructor(status, message, errors = null, retryAfter = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.retryAfter = retryAfter
  }
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status || 0
    const data = error.response?.data || {}
    const message = data.message || error.message || 'Request failed'
    const retryAfter = error.response?.headers?.['retry-after'] || null

    if (status >= 500 || status === 405 || status === 404) {
      reportClientError({
        message: `HTTP ${status}: ${message}`,
        stack: error.config?.url || '',
        url: typeof window !== 'undefined' ? window.location.href : '',
        severity: status >= 500 ? 'critical' : 'warning',
      })
    }
    if (status === 401) {
      setBearerToken(null)
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }
    if (status === 403 && data?.code === 'password_change_required') {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname
        if (path !== '/change-password' && !path.startsWith('/login')) {
          window.location.assign('/change-password')
        }
      }
    }
    return Promise.reject(new ApiError(status, message, data.errors || null, retryAfter))
  },
)

// Both the mock layer and the real API can return either a bare array (legacy
// aliases) or a { data, links, meta } paginator. Pages always receive an array.
export function unwrapList(payload) {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray(payload.data)) return payload.data
  return []
}
