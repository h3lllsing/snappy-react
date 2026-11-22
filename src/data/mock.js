// FE-only reference data. Swap this layer with real /api calls when BE is ready.

export const CURRENT_USER = {
  id: 1, name: 'Bilal Ahmed', email: 'bilal@alphatach.com', role: 'super-admin',
  team_lead_id: null, suspended_at: null,
}

export const brands = [
  { id: 1, domain: 'xuz.com', name: 'XUZ Publishing', status: 'active', lead_id: 2, lead_name: 'Ali Raza', team_id: 1, accounts: 6, users: 4 },
  { id: 2, domain: 'xyz.com', name: 'XYZ Books', status: 'active', lead_id: 3, lead_name: 'Waqar Khan', team_id: 2, accounts: 5, users: 3 },
  { id: 3, domain: 'alphatach.com', name: 'Alphatach HQ', status: 'active', lead_id: 4, lead_name: 'Sana Iqbal', team_id: 3, accounts: 4, users: 2 },
  { id: 4, domain: 'oceanbookhouse.com', name: 'Ocean Book House', status: 'suspended', lead_id: 2, lead_name: 'Ali Raza', team_id: 1, accounts: 2, users: 4 },
]

export const teams = [
  { id: 1, name: 'XUZ Team', brand_id: 1, brand: 'xuz.com', lead_id: 2, lead_name: 'Ali Raza', members: 4, accounts: 6 },
  { id: 2, name: 'XYZ Team', brand_id: 2, brand: 'xyz.com', lead_id: 3, lead_name: 'Waqar Khan', members: 3, accounts: 5 },
  { id: 3, name: 'Alphatach Team', brand_id: 3, brand: 'alphatach.com', lead_id: 4, lead_name: 'Sana Iqbal', members: 2, accounts: 4 },
]

export const users = [
  { id: 1, name: 'Bilal Ahmed', email: 'bilal@alphatach.com', role: 'super-admin', team_lead_id: null, team: '—', status: 'active', last_login: '2 min ago', accounts: 0 },
  { id: 2, name: 'Ali Raza', email: 'ali@xuz.com', role: 'team-lead', team_lead_id: null, team: 'XUZ Team', status: 'active', last_login: 'just now', accounts: 6 },
  { id: 3, name: 'Waqar Khan', email: 'waqar@xyz.com', role: 'team-lead', team_lead_id: null, team: 'XYZ Team', status: 'active', last_login: '5 min ago', accounts: 5 },
  { id: 4, name: 'Sana Iqbal', email: 'sana@alphatach.com', role: 'team-lead', team_lead_id: null, team: 'Alphatach Team', status: 'active', last_login: '1 h ago', accounts: 4 },
  { id: 5, name: 'Fatima Sheikh', email: 'fatima@xuz.com', role: 'user', team_lead_id: 2, team: 'XUZ Team', status: 'active', last_login: 'just now', accounts: 6 },
  { id: 6, name: 'Usman Tariq', email: 'usman@xuz.com', role: 'user', team_lead_id: 2, team: 'XUZ Team', status: 'active', last_login: '12 min ago', accounts: 6 },
  { id: 7, name: 'Hina Malik', email: 'hina@xuz.com', role: 'user', team_lead_id: 2, team: 'XUZ Team', status: 'suspended', last_login: '3 d ago', accounts: 6 },
  { id: 8, name: 'Omar Farooq', email: 'omar@xyz.com', role: 'user', team_lead_id: 3, team: 'XYZ Team', status: 'active', last_login: 'just now', accounts: 5 },
  { id: 9, name: 'Ayesha Noor', email: 'ayesha@xyz.com', role: 'user', team_lead_id: 3, team: 'XYZ Team', status: 'active', last_login: '40 min ago', accounts: 5 },
  { id: 10, name: 'Kamran Shah', email: 'kamran@alphatach.com', role: 'user', team_lead_id: 4, team: 'Alphatach Team', status: 'active', last_login: '2 h ago', accounts: 4 },
]

export const domains = [
  { id: 1, name: 'xuz.com', status: 'active', accounts: 6, imap_host: 'mail.xuz.com', imap_port: 993, encryption: 'ssl', created_by: 'Bilal Ahmed', created_at: '2026-07-18' },
  { id: 2, name: 'xyz.com', status: 'active', accounts: 5, imap_host: 'mail.xyz.com', imap_port: 993, encryption: 'ssl', created_by: 'Bilal Ahmed', created_at: '2026-07-19' },
  { id: 3, name: 'alphatach.com', status: 'active', accounts: 4, imap_host: 'mail.alphatach.com', imap_port: 993, encryption: 'ssl', created_by: 'Bilal Ahmed', created_at: '2026-07-20' },
  { id: 4, name: 'oceanbookhouse.com', status: 'suspended', accounts: 2, imap_host: 'mail.oceanbookhouse.com', imap_port: 993, encryption: 'ssl', created_by: 'Ali Raza', created_at: '2026-08-02' },
]

export const accounts = [
  { id: 1, email: 'sales@xuz.com', brand: 'xuz.com', domain_id: 1, brand_id: 1, status: 'active', sync: 'idle', sync_enabled: true, unread: 3, last_sync: 'live', imap_host: 'mail.xuz.com', smtp_host: 'mail.xuz.com', assigned: [2, 5, 6, 7] },
  { id: 2, email: 'support@xuz.com', brand: 'xuz.com', domain_id: 1, brand_id: 1, status: 'active', sync: 'idle', sync_enabled: true, unread: 1, last_sync: 'live', imap_host: 'mail.xuz.com', smtp_host: 'mail.xuz.com', assigned: [2, 5] },
  { id: 3, email: 'orders@xuz.com', brand: 'xuz.com', domain_id: 1, brand_id: 1, status: 'active', sync: 'syncing', sync_enabled: true, unread: 0, last_sync: 'now', imap_host: 'mail.xuz.com', smtp_host: 'mail.xuz.com', assigned: [2, 6, 7] },
  { id: 4, email: 'info@xyz.com', brand: 'xyz.com', domain_id: 2, brand_id: 2, status: 'active', sync: 'idle', sync_enabled: true, unread: 2, last_sync: 'live', imap_host: 'mail.xyz.com', smtp_host: 'mail.xyz.com', assigned: [3, 8, 9] },
  { id: 5, email: 'billing@xyz.com', brand: 'xyz.com', domain_id: 2, brand_id: 2, status: 'active', sync: 'idle', sync_enabled: true, unread: 0, last_sync: 'live', imap_host: 'mail.xyz.com', smtp_host: 'mail.xyz.com', assigned: [3, 8] },
  { id: 6, email: 'contact@alphatach.com', brand: 'alphatach.com', domain_id: 3, brand_id: 3, status: 'active', sync: 'idle', sync_enabled: true, unread: 1, last_sync: 'live', imap_host: 'mail.alphatach.com', smtp_host: 'mail.alphatach.com', assigned: [4, 10] },
  { id: 7, email: 'hello@oceanbookhouse.com', brand: 'oceanbookhouse.com', domain_id: 4, brand_id: 4, status: 'suspended', sync: 'paused', sync_enabled: false, unread: 0, last_sync: '3 d ago', imap_host: 'mail.oceanbookhouse.com', smtp_host: 'mail.oceanbookhouse.com', assigned: [2, 5] },
]

export const mails = [
  { id: 1042, account: 'sales@xuz.com', brand: 'xuz.com', from: 'client@penguinrandomhouse.com', from_name: 'Rebecca Wilson', subject: 'Re: Book Cover Final Approval — The Bears', preview: 'Hi team, please find the final approved cover attached. Let us know if anything else is needed…', time: 'just now', unread: true, has_attachment: true },
  { id: 1041, account: 'info@xyz.com', brand: 'xyz.com', from: 'j.fernandez@barnesandnoble.com', from_name: 'Joshua Fernandez', subject: 'Publishing Form — Updated Version', preview: 'Attached is the revised publishing form with all the corrections we discussed…', time: '2 min ago', unread: true, has_attachment: true },
  { id: 1040, account: 'sales@xuz.com', brand: 'xuz.com', from: 'maryellen.jones@gmail.com', from_name: 'Maryellen Jones', subject: 'Christian Secret — Chapter 4 feedback', preview: 'I have reviewed chapter 4 and have a few notes on the pacing. Please see…', time: '8 min ago', unread: false, has_attachment: false },
  { id: 1039, account: 'sales@xuz.com', brand: 'xuz.com', from: 'abdullah.irfan@outlook.com', from_name: 'Abdullah Irfan', subject: 'The Journey of Akuma — Formatted 18-sep', preview: 'The formatted manuscript is ready for your final review before we proceed…', time: '21 min ago', unread: false, has_attachment: true },
  { id: 1038, account: 'billing@xyz.com', brand: 'xyz.com', from: 'accounts@amazon.com', from_name: 'Amazon Accounts', subject: 'Invoice #1000121196 available', preview: 'Your invoice is now available in your account dashboard. No action required…', time: '45 min ago', unread: false, has_attachment: false },
  { id: 1037, account: 'contact@alphatach.com', brand: 'alphatach.com', from: 'support@监测系统.com', from_name: 'System Monitor', subject: 'Weekly IMAP health report', preview: 'All 17 configured mail accounts are syncing normally. No failures detected…', time: '1 h ago', unread: false, has_attachment: false },
]

export const notifications = [
  { id: 'n1', type: 'new_email', read: false, title: 'New mail in sales@xuz.com', detail: 'Re: Book Cover Final Approval — Rebecca Wilson', time: 'just now', account_id: 1, brand: 'xuz.com' },
  { id: 'n2', type: 'new_email', read: false, title: 'New mail in info@xyz.com', detail: 'Publishing Form — Updated Version', time: '2 min ago', account_id: 4, brand: 'xyz.com' },
  { id: 'n3', type: 'email_sync_failed', read: false, title: 'Sync failed: hello@oceanbookhouse.com', detail: 'Connection refused — account auto-paused after 3 failures', time: '18 min ago', account_id: 7, brand: 'oceanbookhouse.com' },
  { id: 'n4', type: 'new_email', read: true, title: 'New mail in sales@xuz.com', detail: 'Christian Secret — Chapter 4 feedback', time: '8 min ago', account_id: 1, brand: 'xuz.com' },
  { id: 'n5', type: 'email_sync_paused', read: true, title: 'Account paused: hello@oceanbookhouse.com', detail: 'Re-enable from the account page to resume live sync', time: '3 h ago', account_id: 7, brand: 'oceanbookhouse.com' },
]

export const activities = [
  { id: 1, causer: 'Bilal Ahmed', event: 'created', description: 'created email account sales@xuz.com', subject: 'EmailAccount', time: '2 h ago' },
  { id: 2, causer: 'Ali Raza', event: 'assigned', description: 'assigned support@xuz.com to Fatima Sheikh', subject: 'EmailAccount', time: '3 h ago' },
  { id: 3, causer: 'Bilal Ahmed', event: 'soft_delete', description: 'soft-deleted domain oceanbookhouse.com', subject: 'Domain', time: '1 d ago' },
  { id: 4, causer: 'Waqar Khan', event: 'updated', description: 'updated IMAP settings for info@xyz.com', subject: 'EmailAccount', time: '1 d ago' },
  { id: 5, causer: 'Bilal Ahmed', event: 'restored', description: 'restored user Hina Malik', subject: 'User', time: '2 d ago' },
]

export const loginAudits = [
  { id: 1, user: 'Ali Raza', email: 'ali@xuz.com', event: 'login_success', ip: '10.10.10.42', time: 'just now' },
  { id: 2, user: 'Unknown', email: 'admin@fake.com', event: 'login_failed', ip: '185.220.101.7', time: '12 min ago' },
  { id: 3, user: 'Waqar Khan', email: 'waqar@xyz.com', event: 'login_success', ip: '10.10.10.55', time: '35 min ago' },
  { id: 4, user: 'Bilal Ahmed', email: 'bilal@alphatach.com', event: 'logout', ip: '10.10.10.24', time: '2 h ago' },
]

export const failedJobs = [
  { id: 1, job: 'PushSentEmailsToServerJob', queue: 'sync', failed_at: '12 min ago', error: 'IMAP APPEND failed: authentication rejected' },
  { id: 2, job: 'SyncAccountEmailsJob', queue: 'sync', failed_at: '42 min ago', error: 'Connection timeout to mail.oceanbookhouse.com:993' },
]

export const pendingJobs = [
  { id: 101, job: 'SyncAccountEmailsJob', queue: 'sync', account: 'orders@xuz.com' },
  { id: 102, job: 'PushSentEmailsToServerJob', queue: 'sync', account: 'support@xuz.com' },
  { id: 103, job: 'IndexIncomingMailJob', queue: 'sync', account: 'info@xyz.com' },
]

export const imapStatus = [
  { account: 'sales@xuz.com', brand: 'xuz.com', status: 'connected', uidnext: 1043, users: 'Ali, Fatima, Usman', last_check: '4 s ago' },
  { account: 'info@xyz.com', brand: 'xyz.com', status: 'connected', uidnext: 892, users: 'Waqar, Omar, Ayesha', last_check: '6 s ago' },
  { account: 'orders@xuz.com', brand: 'xuz.com', status: 'connected', uidnext: 231, users: 'Ali, Usman', last_check: '5 s ago' },
  { account: 'hello@oceanbookhouse.com', brand: 'oceanbookhouse.com', status: 'paused', uidnext: 0, users: 'Ali, Fatima', last_check: '3 d ago' },
]

// ---- helpers ----
export const brandById = id => brands.find(b => b.id === id)
export const leadById = id => users.find(u => u.id === id)
export const teamMembers = leadId => users.filter(u => u.team_lead_id === leadId || u.id === leadId)
export const accountsForBrand = brand => accounts.filter(a => a.brand === brand)
export const assignedUserNames = ids => (ids || []).map(id => leadById(id)?.name).filter(Boolean)

export const dashboardStats = {
  total_users: users.length,
  total_accounts: accounts.length,
  active_domains: domains.filter(d => d.status === 'active').length,
  failed_imap_accounts: 1,
  suspended_users: users.filter(u => u.status === 'suspended').length,
  unread_notifications: notifications.filter(n => !n.read).length,
  total_notifications: notifications.length,
  assigned_accounts: 6,
  audit_actions: 5,
}
