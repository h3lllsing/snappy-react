// FE-only mock API. Every function mirrors the future Laravel /api endpoint.
// When BE is ready: replace the body with axios calls, keep the signatures.
import * as mock from '../data/mock'
import { http, unwrapList, setBearerToken } from './http'

const USE_API = import.meta.env.VITE_USE_API === 'true'

const delay = (ms = 120) => new Promise(r => setTimeout(r, ms))
const list = async (fn) => unwrapList(await fn())

export const api = {
  me: async () => {
    if (USE_API) {
      const { data } = await http.get('/api/user')
      return data
    }
    await delay(); return mock.CURRENT_USER
  },
  login: async ({ email, password }) => {
    if (USE_API) {
      const { data } = await http.post('/api/login', { email, password })
      setBearerToken(data?.token)
      return data
    }
    await delay(400); return { token: 'mock-token', user: mock.CURRENT_USER }
  },

  brands: async () => {
    if (USE_API) {
      const { data } = await http.get('/api/brands')
      return unwrapList(data)
    }
    return list(async () => { await delay(); return mock.brands })
  },
  teams: async () => {
    if (USE_API) {
      const { data } = await http.get('/api/teams')
      return unwrapList(data)
    }
    return list(async () => { await delay(); return mock.teams })
  },
  users: async () => {
    if (USE_API) {
      const { data } = await http.get('/api/users')
      return unwrapList(data)
    }
    return list(async () => { await delay(); return mock.users })
  },
  domains: async () => {
    if (USE_API) {
      const { data } = await http.get('/api/domains')
      return unwrapList(data)
    }
    return list(async () => { await delay(); return mock.domains })
  },
  accounts: async () => {
    if (USE_API) {
      const { data } = await http.get('/api/email-accounts')
      return unwrapList(data)
    }
    return list(async () => { await delay(); return mock.accounts })
  },
  mails: async () => list(async () => { await delay(); return mock.mails }),
  notifications: async () => list(async () => { await delay(); return mock.notifications }),
  activities: async () => list(async () => { await delay(); return mock.activities }),
  loginAudits: async () => list(async () => { await delay(); return mock.loginAudits }),
  failedJobs: async () => list(async () => { await delay(); return mock.failedJobs }),
  imapStatus: async () => list(async () => { await delay(); return mock.imapStatus }),
  dashboard: async () => {
    if (USE_API) {
      const { data } = await http.get('/api/dashboard/stats')
      return data
    }
    await delay(); return mock.dashboardStats
  },

  // Assignment rules (FE preview of BE auto-assign logic)
  autoAssignPreview: async (account) => {
    if (USE_API) {
      const { data } = await http.post('/api/email-accounts/auto-assign-preview', account)
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
      const { data: res } = await http.post('/api/brands', data)
      return res
    }
    await delay()
    const row = { id: Date.now(), accounts: 0, users: 0, ...data }
    mock.brands.push(row)
    return row
  },
  createTeam: async (data) => {
    if (USE_API) {
      const { data: res } = await http.post('/api/teams', data)
      return res
    }
    await delay()
    const row = { id: Date.now(), members: 0, accounts: 0, ...data }
    mock.teams.push(row)
    return row
  },
  createUser: async (data) => {
    if (USE_API) {
      const { data: res } = await http.post('/api/users', data)
      return res
    }
    await delay()
    const row = { id: Date.now(), last_login: 'never', accounts: 0, ...data }
    mock.users.push(row)
    return row
  },
  createAccount: async (data) => {
    if (USE_API) {
      const { data: res } = await http.post('/api/email-accounts', data)
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
      const { data: res } = await http.put(`/api/email-accounts/${id}`, payload)
      return res
    }
    await delay()
    const payload = updatedAt ? { ...data, updated_at: updatedAt } : data
    const row = mock.accounts.find(a => a.id === Number(id))
    if (row) Object.assign(row, payload)
    return row || { id, ...payload }
  },
  assignAccount: async (accountId, userId) => {
    if (USE_API) {
      const { data: res } = await http.post(`/api/email-accounts/${accountId}/assign`, { user_id: userId })
      return res
    }
    await delay()
    const row = mock.accounts.find(a => a.id === Number(accountId))
    if (row && !row.assigned.includes(Number(userId))) row.assigned.push(Number(userId))
    return { accountId, userId }
  },
  revokeAssignment: async (accountId, userId) => {
    if (USE_API) {
      const { data: res } = await http.delete(`/api/email-accounts/${accountId}/assign/${userId}`)
      return res
    }
    await delay()
    const row = mock.accounts.find(a => a.id === Number(accountId))
    if (row) row.assigned = row.assigned.filter(id => id !== Number(userId))
    return { accountId, userId }
  },
  syncAccount: async (id) => {
    if (USE_API) {
      const { data: res } = await http.post(`/api/email-accounts/${id}/sync`)
      return res
    }
    await delay(600)
    const row = mock.accounts.find(a => a.id === Number(id))
    if (row) { row.sync = 'idle'; row.last_sync = 'just now' }
    return { id, sync: 'idle' }
  },
  webmailToken: async (accountId) => {
    if (USE_API) {
      const { data: res } = await http.post(`/api/email-accounts/${accountId}/webmail-token`)
      return res
    }
    await delay(); return { token: 'mock-' + accountId, expires_in: 300 }
  },
  markNotificationRead: async (id) => {
    await delay()
    const row = mock.notifications.find(n => n.id === id)
    if (row) row.read = true
    return { id }
  },
  markAllRead: async () => { await delay(); mock.notifications.forEach(n => { n.read = true }); return true },
  retryJob: async (id) => {
    await delay()
    const i = mock.failedJobs.findIndex(j => j.id === id)
    if (i >= 0) mock.failedJobs.splice(i, 1)
    return { id }
  },

  // Seams reserved by the execution plan. Mock-backed until their BE endpoints land,
  // so later page edits are a one-line swap and no new seam is invented mid-phase.
  logout: async () => {
    if (USE_API) {
      await http.post('/api/logout')
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
      const { data } = await http.patch(`/api/domains/${id}/sync`, payload)
      return data
    }
    await delay(); return { id, ...payload }
  },
  setAccountSync: async (id, payload) => {
    if (USE_API) {
      const { data } = await http.patch(`/api/email-accounts/${id}/sync`, payload)
      return data
    }
    await delay(); return { id, ...payload }
  },
  notificationsPoll: async (after = null) => { await delay(); return { notifications: [], cursor: after, imap_status: [] } },

  opsSummary: async () => { await delay(); return {} },
  opsSyncRuns: async () => list(async () => { await delay(); return [] }),
  opsSyncRun: async (id) => { await delay(); return { id } },
  opsMail: async () => list(async () => { await delay(); return [] }),
  opsMailDetail: async (id) => { await delay(); return { id } },
  opsIssues: async () => list(async () => { await delay(); return [] }),
  opsIssue: async (id) => { await delay(); return { id } },
  opsStream: async () => list(async () => { await delay(); return [] }),
  retryOpsJob: async (id) => { await delay(); return { id } },
  cancelOpsJob: async (id) => { await delay(); return { id } },
  acknowledgeIssue: async (id, payload) => { await delay(); return { id, ...payload } },
  resolveIssue: async (id, payload) => { await delay(); return { id, ...payload } },
  assignIssue: async (id, payload) => { await delay(); return { id, ...payload } },
  snoozeIssue: async (id, payload) => { await delay(); return { id, ...payload } },
  startIssue: async (id) => { await delay(); return { id } },
  closeIssue: async (id) => { await delay(); return { id } },
  enterMaintenance: async (payload) => { await delay(); return { ...payload } },
  exitMaintenance: async () => { await delay(); return true },
}

export default api
