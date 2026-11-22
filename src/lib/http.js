import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'cookie'

let bearerToken = null

export const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: AUTH_MODE === 'cookie',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

export function setBearerToken(token) {
  bearerToken = token
  if (token) http.defaults.headers.common.Authorization = `Bearer ${token}`
  else delete http.defaults.headers.common.Authorization
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

    if (status === 401) {
      setBearerToken(null)
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
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
