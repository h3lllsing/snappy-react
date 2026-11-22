// FE-only mock API. Every function mirrors the future Laravel /api endpoint.
// When BE is ready: replace the body with axios calls, keep the signatures.
import * as mock from '../data/mock'

const delay = (ms = 120) => new Promise(r => setTimeout(r, ms))

export const api = {
  me: async () => { await delay(); return mock.CURRENT_USER },
  login: async ({ email, password }) => { await delay(400); return { token: 'mock-token', user: mock.CURRENT_USER } },

  brands: async () => { await delay(); return mock.brands },
  teams: async () => { await delay(); return mock.teams },
  users: async () => { await delay(); return mock.users },
  domains: async () => { await delay(); return mock.domains },
  accounts: async () => { await delay(); return mock.accounts },
  mails: async () => { await delay(); return mock.mails },
  notifications: async () => { await delay(); return mock.notifications },
  activities: async () => { await delay(); return mock.activities },
  loginAudits: async () => { await delay(); return mock.loginAudits },
  failedJobs: async () => { await delay(); return mock.failedJobs },
  imapStatus: async () => { await delay(); return mock.imapStatus },
  dashboard: async () => { await delay(); return mock.dashboardStats },

  // Assignment rules (FE preview of BE auto-assign logic)
  autoAssignPreview: async (account) => {
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
    await delay()
    const row = { id: Date.now(), accounts: 0, users: 0, ...data }
    mock.brands.push(row)
    return row
  },
  createTeam: async (data) => {
    await delay()
    const row = { id: Date.now(), members: 0, accounts: 0, ...data }
    mock.teams.push(row)
    return row
  },
  createUser: async (data) => {
    await delay()
    const row = { id: Date.now(), last_login: 'never', accounts: 0, ...data }
    mock.users.push(row)
    return row
  },
  createAccount: async (data) => {
    await delay()
    const row = { id: Date.now(), assigned: [], sync: 'idle', unread: 0, last_sync: 'never', ...data }
    mock.accounts.push(row)
    return row
  },
  updateAccount: async (id, data) => {
    await delay()
    const row = mock.accounts.find(a => a.id === Number(id))
    if (row) Object.assign(row, data)
    return row || { id, ...data }
  },
  assignAccount: async (accountId, userId) => {
    await delay()
    const row = mock.accounts.find(a => a.id === Number(accountId))
    if (row && !row.assigned.includes(Number(userId))) row.assigned.push(Number(userId))
    return { accountId, userId }
  },
  revokeAssignment: async (accountId, userId) => {
    await delay()
    const row = mock.accounts.find(a => a.id === Number(accountId))
    if (row) row.assigned = row.assigned.filter(id => id !== Number(userId))
    return { accountId, userId }
  },
  syncAccount: async (id) => {
    await delay(600)
    const row = mock.accounts.find(a => a.id === Number(id))
    if (row) { row.sync = 'idle'; row.last_sync = 'just now' }
    return { id, sync: 'idle' }
  },
  webmailToken: async (accountId) => { await delay(); return { token: 'mock-' + accountId, expires_in: 300 } },
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
}

export default api
