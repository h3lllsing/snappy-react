// Every method talks to the live Laravel API through the shared http client.
import { http, unwrapList, setBearerToken } from './http'

const list = async (fn) => unwrapList(await fn())
const get = async (path) => (await http.get(path)).data
const post = async (path, body) => (await http.post(path, body || {})).data
const put = async (path, body) => (await http.put(path, body || {})).data
const patch = async (path, body) => (await http.patch(path, body || {})).data
const remove = async (path) => (await http.delete(path)).data
const query = (params) => {
  const search = new URLSearchParams(params || {}).toString()
  return search ? `?${search}` : ''
}

export const api = {
  me: async () => get('/user'),
  login: async ({ email, password }) => {
    const data = await post('/login', { email, password })
    setBearerToken(data?.token)
    return data
  },
  logout: async () => {
    try {
      return await post('/logout')
    } finally {
      setBearerToken(null)
    }
  },

  brands: async () => list(async () => get('/brands')),
  teams: async () => list(async () => get('/teams')),
  users: async () => list(async () => get('/users')),
  domains: async () => list(async () => get('/domains')),
  accounts: async () => list(async () => get('/email-accounts')),
  mails: async (params) => list(async () => get('/mails' + query(params))),
  notifications: async () => list(async () => get('/notifications')),
  activities: async () => list(async () => get('/activity-logs')),
  loginAudits: async () => list(async () => get('/login-audits')),
  failedJobs: async () => list(async () => get('/admin/jobs/failed')),
  imapStatus: async () => list(async () => get('/admin/imap-status')),
  dashboard: async () => get('/dashboard/stats'),

  domainAccess: async () => get('/domains/access'),
  discoverDomain: async (domain) => post('/domains/discover', { domain }),
  createDomain: async (data) => post('/domains', data),
  deleteDomain: async (id) => remove(`/domains/${id}`),
  createBrand: async (data) => post('/brands', data),
  createTeam: async (data) => post('/teams', data),
  createUser: async (data) => post('/users', data),

  createAccount: async (data) => post('/email-accounts', data),
  updateAccount: async (id, data, updatedAt) =>
    put(`/email-accounts/${id}`, updatedAt ? { ...data, updated_at: updatedAt } : data),
  deleteAccount: async (id) => remove(`/email-accounts/${id}`),
  assignAccount: async (accountId, userId) =>
    patch(`/email-accounts/${accountId}/assign/${userId}`, { can_send: true, can_receive: true }),
  revokeAssignment: async (accountId, userId) =>
    remove(`/email-accounts/${accountId}/assign/${userId}`),
  syncAccount: async (id) => post(`/email-accounts/${id}/sync`),
  webmailToken: async (accountId) => post(`/email-accounts/${accountId}/webmail-token`),
  setDomainSync: async (id, payload) => patch(`/domains/${id}/sync`, payload),
  setAccountSync: async (id, payload) => patch(`/email-accounts/${id}/sync`, payload),
  autoAssignPreview: async (account) => post('/email-accounts/auto-assign-preview', account),

  markNotificationRead: async (id) => put(`/notifications/${id}/read`),
  markAllRead: async () => put('/notifications/read-all'),
  notificationsPoll: async (after = null) =>
    get('/notifications/poll' + (after !== null && after !== undefined && after !== '' ? '?after=' + encodeURIComponent(after) : '')),

  changePassword: async (data) => post('/change-password', data),
  updateUser: async (id, data) => patch(`/users/${id}`, data),
  suspendUser: async (id, payload) =>
    patch(`/users/${id}/suspend`, typeof payload === 'string' ? { reason: payload } : payload),
  unsuspendUser: async (id) => patch(`/users/${id}/unsuspend`),
  restoreUser: async (id) => patch(`/users/${id}/restore`),
  forceDeleteUser: async (id) => remove(`/users/${id}/force-delete`),
  resetPassword: async (payload) => post('/change-password', payload),

  addTeamMember: async (teamId, userId) => post(`/teams/${teamId}/members`, { user_id: userId }),
  removeTeamMember: async (teamId, userId) => remove(`/teams/${teamId}/members/${userId}`),
  updateAssignment: async (accountId, userId, payload) =>
    patch(`/email-accounts/${accountId}/assign/${userId}`, payload),

  opsSummary: async () => get('/ops/summary'),
  opsSyncRuns: async () => list(async () => get('/ops/sync-runs')),
  opsSyncRun: async (id) =>
    list(async () => get('/ops/sync-runs' + (id !== null && id !== undefined ? `?id=${encodeURIComponent(id)}` : ''))),
  opsMail: async (params) => list(async () => get('/ops/mail' + query(params))),
  opsMailDetail: async (id) => get(`/mails/${id}`),
  opsIssues: async () => list(async () => get('/ops/issues')),
  opsIssue: async (id) => get(`/ops/issues/${id}/timeline`),
  opsIssueTimeline: async (id) => get(`/ops/issues/${id}/timeline`),
  opsEvents: async () => list(async () => get('/ops/events')),
  opsStream: async (after) =>
    get('/ops/stream' + (after !== null && after !== undefined && after !== '' ? '?after=' + encodeURIComponent(after) : '')),
  opsMetrics: async () => get('/ops/metrics'),
  mailActivity: async (params) => list(async () => get('/webmail/activity-log' + query(params))),

  acknowledgeIssue: async (id, payload) => patch(`/ops/issues/${id}/ack`, payload),
  resolveIssue: async (id, payload) => patch(`/ops/issues/${id}/resolve`, payload),
  assignIssue: async (id, payload) => patch(`/ops/issues/${id}/assign`, payload),
  snoozeIssue: async (id, payload) => patch(`/ops/issues/${id}/snooze`, payload),
  startIssue: async (id) => patch(`/ops/issues/${id}/start`),
  closeIssue: async (id) => patch(`/ops/issues/${id}/close`),
  enterMaintenance: async (payload) => post('/ops/maintenance', { ...payload, enabled: true }),
  exitMaintenance: async () => post('/ops/maintenance', { enabled: false }),

  retryJob: async (id) => post(`/admin/jobs/failed/${id}/retry`),
  retryOpsJob: async (id) => post(`/admin/jobs/failed/${id}/retry`),
  // No backend cancellation route exists for a failed job; fetch the failed
  // job list so operators can act through the supported queue controls.
  cancelOpsJob: async () => list(async () => get('/admin/jobs/failed')),
}

export default api
