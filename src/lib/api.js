// FE-only mock API. Every function mirrors the future Laravel /api endpoint.
// When BE is ready: replace the body with axios calls, keep the signatures.
import * as mock from '../data/mock'
import { http, unwrapList, setBearerToken } from './http'

const USE_API = import.meta.env.VITE_USE_API === 'true'

const delay = (ms = 120) => new Promise(r => setTimeout(r, ms))
const list = async (fn) => unwrapList(await fn())
const get = async (path) => (await http.get(path)).data
const post = async (path, body) => (await http.post(path, body || {})).data
const patch = async (path, body) => (await http.patch(path, body || {})).data

export const api = {
  me: async () => {
    if (USE_API) {
      const { data } = await http.get('/user')
      return data
    }
    await delay(); return mock.CURRENT_USER
  },
  login: async ({ email, password }) => {
    if (USE_API) {
      const { data } = await http.post('/login', { email, password })
      setBearerToken(data?.token)
      return data
    }
    await delay(400); return { token: 'mock-token', user: mock.CURRENT_USER }
  },

  brands: async () => {
    if (USE_API) {
      const { data } = await http.get('/brands')
      return unwrapList(data)
    }
    return list(async () => { await delay(); return mock.brands })
  },
  teams: async () => {
    if (USE_API) {
      const { data } = await http.get('/teams')
      return unwrapList(data)
    }
    return list(async () => { await delay(); return mock.teams })
  },
  users: async () => {
    if (USE_API) {
      const { data } = await http.get('/users')
      return unwrapList(data)
    }
    return list(async () => { await delay(); return mock.users })
  },
  domains: async () => {
    if (USE_API) {
      const { data } = await http.get('/domains')
      return unwrapList(data)
    }
    return list(async () => { await delay(); return mock.domains })
  },
  accounts: async () => {
    if (USE_API) {
      const { data } = await http.get('/email-accounts')
      return unwrapList(data)
    }
    return list(async () => { await delay(); return mock.accounts })
  },
  mails: async (params) => { if (USE_API) return list(async () => get('/mails' + (params ? '?' + new URLSearchParams(params).toString() : ''))); return list(async () => { await delay(); return mock.mails }) },
  notifications: async () => { if (USE_API) return list(async () => get('/notifications')); return list(async () => { await delay(); return mock.notifications }) },
  activities: async () => { if (USE_API) return list(async () => get('/activity-logs')); return list(async () => { await delay(); return mock.activities }) },
  loginAudits: async () => { if (USE_API) return list(async () => get('/login-audits')); return list(async () => { await delay(); return mock.loginAudits }) },
  failedJobs: async () => { if (USE_API) return list(async () => get('/admin/jobs/failed')); return list(async () => { await delay(); return mock.failedJobs }) },
  imapStatus: async () => { if (USE_API) return list(async () => get('/admin/imap-status')); return list(async () => { await delay(); return mock.imapStatus }) },
  dashboard: async () => {
    if (USE_API) {
      const { data } = await http.get('/dashboard/stats')
      return data
    }
    await delay(); return mock.dashboardStats
  },

  // Assignment rules (FE preview of BE auto-assign logic)
  autoAssignPreview: async (account) => {
    if (USE_API) {
      const { data } = await http.post('/email-accounts/auto-assign-preview', account)
      return data
    }
    await delay()
    const brand = mock.brandById(account.brand_id)
    if (!brand) return { lead: null, members: [], assigned: [] }
    return {
      brand: brand.domain,
      lead: mock.leadById(brand.lead_id),
      members: mock.teamMembers(brand.lead_id),
      assigned: account.assigned || [],
    }
  },

  // Mutations write into the shared in-memory store, so changes survive navigation
  // until reload. Swap these bodies for axios calls when the BE is ready.
  createBrand: async (data) => {
    if (USE_API) {
      const { data: res } = await http.post('/brands', data)
      return res
    }
    await delay()
    const row = { id: Date.now(), accounts: 0, users: 0, ...data }
    mock.brands.push(row)
    return row
  },
  createTeam: async (data) => {
    if (USE_API) {
      const { data: res } = await http.post('/teams', data)
      return res
    }
    await delay()
    const row = { id: Date.now(), members: 0, accounts: 0, ...data }
    mock.teams.push(row)
    return row
  },
  createUser: async (data) => {
    if (USE_API) {
      const { data: res } = await http.post('/users', data)
      return res
    }
    await delay()
    const row = { id: Date.now(), last_login: 'never', accounts: 0, ...data }
    mock.users.push(row)
    return row
  },
  createAccount: async (data) => {
    if (USE_API) {
      const { data: res } = await http.post('/email-accounts', data)
      return res
    }
    await delay()
    const row = { id: Date.now(), assigned: [], sync: 'idle', unread: 0, last_sync: 'never', ...data }
    mock.accounts.push(row)
    return row
  },
  updateAccount: async (id, data, updatedAt) => {
    if (USE_API) {
      const payload = updatedAt ? { ...data, updated_at: updatedAt } : data
      const { data: res } = await http.put(`/email-accounts/${id}`, payload)
      return res
    }
    await delay()
    const payload = updatedAt ? { ...data, updated_at: updatedAt } : data
    const row = mock.accounts.find(a => a.id === Number(id))
    if (row) Object.assign(row, payload)
    return row || { id, ...payload }
  },
  deleteAccount: async (id) => {
    if (USE_API) {
      const { data: res } = await http.delete(`/email-accounts/${id}`)
      return res
    }
    await delay()
    const idx = mock.accounts.findIndex(a => a.id === Number(id))
    if (idx >= 0) mock.accounts.splice(idx, 1)
    return { id }
  },
  assignAccount: async (accountId, userId) => {
    if (USE_API) {
      const { data: res } = await http.post(`/email-accounts/${accountId}/assign`, { user_id: userId })
      return res
    }
    await delay()
    const row = mock.accounts.find(a => a.id === Number(accountId))
    if (row && !row.assigned.includes(Number(userId))) row.assigned.push(Number(userId))
    return { accountId, userId }
  },
  revokeAssignment: async (accountId, userId) => {
    if (USE_API) {
      const { data: res } = await http.delete(`/email-accounts/${accountId}/assign/${userId}`)
      return res
    }
    await delay()
    const row = mock.accounts.find(a => a.id === Number(accountId))
    if (row) row.assigned = row.assigned.filter(id => id !== Number(userId))
    return { accountId, userId }
  },
  syncAccount: async (id) => {
    if (USE_API) {
      const { data: res } = await http.post(`/email-accounts/${id}/sync`)
      return res
    }
    await delay(600)
    const row = mock.accounts.find(a => a.id === Number(id))
    if (row) { row.sync = 'idle'; row.last_sync = 'just now' }
    return { id, sync: 'idle' }
  },
  webmailToken: async (accountId) => {
    if (USE_API) {
      const { data: res } = await http.post(`/email-accounts/${accountId}/webmail-token`)
      return res
    }
    await delay(); return { token: 'mock-' + accountId, expires_in: 300 }
  },
  markNotificationRead: async (id) => {
    if (USE_API) return (await http.put(`/notifications/${id}/read`)).data
    await delay()
    const row = mock.notifications.find(n => n.id === id)
    if (row) row.read = true
    return { id }
  },
  markAllRead: async () => { if (USE_API) return (await http.put('/notifications/read-all')).data; await delay(); mock.notifications.forEach(n => { n.read = true }); return true },
  retryJob: async (id) => {
    if (USE_API) return post(`/admin/jobs/failed/${id}/retry`)
    await delay()
    const i = mock.failedJobs.findIndex(j => j.id === id)
    if (i >= 0) mock.failedJobs.splice(i, 1)
    return { id }
  },

  // Seams reserved by the execution plan. Mock-backed until their BE endpoints land,
  // so later page edits are a one-line swap and no new seam is invented mid-phase.
  logout: async () => {
    if (USE_API) {
      await http.post('/logout')
      setBearerToken(null)
      return true
    }
    await delay(); return true
  },
  updateUser: async (id, data) => { await delay(); return { id, ...data } },
  suspendUser: async (id, payload) => { await delay(); return { id, ...payload, status: 'suspended' } },
  unsuspendUser: async (id) => { await delay(); return { id, status: 'active' } },
  restoreUser: async (id) => { await delay(); return { id, status: 'active' } },
  forceDeleteUser: async (id) => { await delay(); return { id } },
  resetPassword: async (payload) => { await delay(); return { ...payload } },
  changePassword: async (payload) => { await delay(); return { ...payload } },
  addTeamMember: async (teamId, userId) => { await delay(); return { teamId, userId } },
  removeTeamMember: async (teamId, userId) => { await delay(); return { teamId, userId } },
  updateAssignment: async (accountId, userId, payload) => { await delay(); return { accountId, userId, ...payload } },
  setDomainSync: async (id, payload) => {
    if (USE_API) {
      const { data } = await http.patch(`/domains/${id}/sync`, payload)
      return data
    }
    await delay(); return { id, ...payload }
  },
  setAccountSync: async (id, payload) => {
    if (USE_API) {
      const { data } = await http.patch(`/email-accounts/${id}/sync`, payload)
      return data
    }
    await delay(); return { id, ...payload }
  },
  notificationsPoll: async (after = null) => { if (USE_API) return get('/notifications/poll' + (after ? '?after=' + after : '')); await delay(); return { notifications: [], cursor: after, imap_status: [] } },

  opsSummary: async () => { if (USE_API) return get('/ops/summary'); await delay(); return {} },
  opsSyncRuns: async () => { if (USE_API) return list(async () => get('/ops/sync-runs')); return list(async () => { await delay(); return [] }) },
  opsSyncRun: async (id) => { await delay(); return { id } },
  opsMail: async (params) => { if (USE_API) return list(async () => get('/ops/mail' + (params ? '?' + new URLSearchParams(params).toString() : ''))); return list(async () => { await delay(); return [] }) },
  opsMailDetail: async (id) => { await delay(); return { id } },
  opsIssues: async () => { if (USE_API) return list(async () => get('/ops/issues')); return list(async () => { await delay(); return [] }) },
  opsIssue: async (id) => { if (USE_API) return get(`/ops/issues/${id}/timeline`); await delay(); return { id } },
  opsIssueTimeline: async (id) => { if (USE_API) return get(`/ops/issues/${id}/timeline`); await delay(); return { timeline: [] } },
  opsStream: async (after) => { if (USE_API) return get('/ops/stream' + (after ? '?after=' + after : '')); return list(async () => { await delay(); return [] }) },
  retryOpsJob: async (id) => { await delay(); return { id } },
  cancelOpsJob: async (id) => { await delay(); return { id } },
  acknowledgeIssue: async (id, payload) => { if (USE_API) return patch(`/ops/issues/${id}/ack`, payload); await delay(); return { id, ...payload } },
  resolveIssue: async (id, payload) => { if (USE_API) return patch(`/ops/issues/${id}/resolve`, payload); await delay(); return { id, ...payload } },
  assignIssue: async (id, payload) => { if (USE_API) return patch(`/ops/issues/${id}/assign`, payload); await delay(); return { id, ...payload } },
  snoozeIssue: async (id, payload) => { if (USE_API) return patch(`/ops/issues/${id}/snooze`, payload); await delay(); return { id, ...payload } },
  startIssue: async (id) => { if (USE_API) return patch(`/ops/issues/${id}/start`); await delay(); return { id } },
  closeIssue: async (id) => { if (USE_API) return patch(`/ops/issues/${id}/close`); await delay(); return { id } },
  enterMaintenance: async (payload) => { if (USE_API) return post('/ops/maintenance', { ...payload, enabled: true }); await delay(); return { ...payload } },
  exitMaintenance: async () => { if (USE_API) return post('/ops/maintenance', { enabled: false }); await delay(); return true },
}

export default api
