import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Check, ExternalLink, Globe2, Inbox, Lock, Mail, Paperclip,
  RefreshCw, Server, ShieldCheck, UserPlus, Users, X,
} from 'lucide-react'
import {
  Avatar, Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader,
  Select, useToast,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import { useLive } from '../context/LiveContext'
import api from '../lib/api'

export default function AccountDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { mails: liveMails } = useLive()
  const mails = useMemo(() => {
    const map = new Map()
    ;(fetchedMails || []).forEach(m => map.set(m.id, m))
    ;(liveMails || []).forEach(m => map.set(m.id, m))
    return [...map.values()]
  }, [fetchedMails, liveMails])
  const [account, setAccount] = useState(null)
  const [users, setUsers] = useState([])
  const [fetchedMails, setFetchedMails] = useState([])
  const [loading, setLoading] = useState(true)
  const [perms, setPerms] = useState({})
  const [addUserId, setAddUserId] = useState('')
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setAccount(null)
    Promise.all([api.accounts(), api.users(), api.mails()])
      .then(([a, u, m]) => {
        if (!alive) return
        setUsers(u)
        setFetchedMails(m || [])
        const found = a.find(x => String(x.id) === String(id))
        if (found) {
          setAccount(found)
          const next = {}
          ;(found.assigned || []).forEach(uid => {
            next[uid] = {
              can_send: found.status === 'active',
              can_receive: found.status === 'active' && found.sync_enabled,
            }
          })
          setPerms(next)
        }
        setLoading(false)
      })
      .catch(() => { if (alive) { setLoading(false); toast('Could not load account.', 'error', { title: 'Load failed' }) } })
    return () => { alive = false }
  }, [id, toast])

  const assignedUsers = useMemo(
    () => (account?.assigned || []).map(uid => users.find(u => u.id === uid)).filter(Boolean),
    [account, users]
  )
  const availableUsers = useMemo(
    () => users.filter(u => !(account?.assigned || []).includes(u.id)),
    [users, account]
  )
  const accountMails = useMemo(
    () => mails.filter(m => m.account === account?.email),
    [mails, account]
  )

  const togglePerm = async (uid, key) => {
    const current = perms[uid] || {}
    const next = { ...current, [key]: !(current?.[key]) }
    setPerms(p => ({ ...p, [uid]: next }))
    try {
      await api.updateAssignment(account.id, uid, { can_send: next.can_send, can_receive: next.can_receive })
    } catch {
      setPerms(p => ({ ...p, [uid]: current }))
      toast('Could not update assignment.', 'error', { title: 'Update failed' })
    }
  }

  const assign = async () => {
    if (!addUserId) { toast('Choose a user to assign.', 'error', { title: 'No user selected' }); return }
    const uid = Number(addUserId)
    const user = users.find(u => u.id === uid)
    try {
      await api.assignAccount(account.id, uid)
      setAccount(prev => ({ ...prev, assigned: [...(prev.assigned || []), uid] }))
      setPerms(p => ({ ...p, [uid]: { can_send: true, can_receive: true } }))
      setAddUserId('')
      toast(`${user?.name || 'User'} can now access ${account.email}.`, 'success', { title: 'User assigned' })
    } catch {
      toast('Could not assign user.', 'error', { title: 'Assignment failed' })
    }
  }

  const revoke = async uid => {
    const user = users.find(u => u.id === uid)
    try {
      await api.revokeAssignment(account.id, uid)
      setAccount(prev => ({ ...prev, assigned: (prev.assigned || []).filter(x => x !== uid) }))
      setPerms(p => { const next = { ...p }; delete next[uid]; return next })
      toast(`${user?.name || 'User'} no longer has access.`, 'success', { title: 'Access revoked' })
    } catch {
      toast('Could not revoke access.', 'error', { title: 'Revoke failed' })
    }
  }

  const syncNow = async () => {
    setSyncing(true)
    try {
      await api.syncAccount(account.id)
      setAccount(prev => ({ ...prev, sync: 'syncing', last_sync: 'now' }))
      toast(`Syncing ${account.email}…`, 'success', { title: 'Sync started' })
    } catch {
      toast('Could not start sync.', 'error', { title: 'Sync failed' })
    } finally {
      setSyncing(false)
    }
  }

  const toggleSync = async () => {
    const next = !account.sync_enabled
    try {
      await api.setAccountSync(account.id, { sync_enabled: next, reason: next ? 'enabled by user' : 'disabled by user' })
      setAccount(prev => ({ ...prev, sync_enabled: next, sync: next ? 'idle' : 'paused' }))
      toast(`Sync ${next ? 'enabled' : 'disabled'} for ${account.email}.`, 'success', { title: 'Sync updated' })
    } catch {
      toast('Could not update sync.', 'error', { title: 'Sync update failed' })
    }
  }

  if (loading) return (
    <div className="animate-fade-up">
      <Breadcrumbs />
      <Card><EmptyState icon={Mail} title="Loading account…" message="Fetching mailbox settings and assignments." /></Card>
    </div>
  )

  if (!account) return (
    <div className="animate-fade-up">
      <Breadcrumbs title="Account not found" />
      <Card>
        <EmptyState icon={Mail} title="Account not found" message={`No account matches #${id}. It may have been removed or the link is incorrect.`} />
        <div className="flex justify-center pb-6">
          <Link to="/accounts"><Button variant="secondary">Back to accounts</Button></Link>
        </div>
      </Card>
    </div>
  )

  const live = account.last_sync === 'live'

  return (
    <div className="animate-fade-up">
      <Breadcrumbs title={account.email} />
      <PageHeader
        title={account.email}
        subtitle={`${account.brand} · mailbox configuration and live access`}
        backTo={() => navigate('/accounts')}
        actions={<>
          <Link to={`/webmail/${account.id}`}><Button variant="secondary"><ExternalLink size={15} /> Open Webmail</Button></Link>
          <Button onClick={syncNow} loading={syncing}><RefreshCw size={15} /> Sync Now</Button>
        </>}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader
              title="Mailbox details"
              subtitle="Transport settings and current sync state."
              actions={<Badge variant={account.deleted ? 'danger' : account.status} dot className="text-[10px]">{account.deleted ? 'trashed' : account.status}</Badge>}
            />
            <CardBody>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 text-indigo-500 flex items-center justify-center"><Mail size={22} /></div>
                <div className="min-w-0">
                  <p className="text-lg font-bold truncate">{account.email}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <Badge variant="default" className="text-[10px]"><Globe2 size={10} /> {account.brand}</Badge>
                    {live
                      ? <Badge variant="success" dot="live" className="text-[10px]">Live · last sync {account.last_sync}</Badge>
                      : <Badge variant={account.sync === 'syncing' ? 'syncing' : account.sync === 'paused' ? 'paused' : 'info'} dot className="text-[10px]">{account.sync} · last sync {account.last_sync}</Badge>}
                    <button onClick={toggleSync} className="cursor-pointer" title="Toggle sync"><Badge variant={account.sync_enabled ? 'enabled' : 'disabled'} className="text-[10px]">sync {account.sync_enabled ? 'enabled' : 'disabled'}</Badge></button>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Account ID', `#${account.id}`],
                  ['Email', account.email],
                  ['Brand / domain', account.brand],
                  ['Status', account.status],
                  ['Sync', account.sync],
                  ['Last sync', account.last_sync],
                  ['Unread', String(account.unread ?? 0)],
                  ['Assigned users', String((account.assigned || []).length)],
                ].map(([label, value]) => (
                  <div key={label} className="surface-2 border border-app rounded-xl px-3.5 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">{label}</p>
                    <p className="text-sm font-semibold mt-0.5 truncate" title={value}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold text-indigo-500 mb-3"><Server size={14} /> Incoming · IMAP</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between gap-3"><span className="text-muted">Host</span><span className="font-mono font-semibold">{account.imap_host}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-muted">Port</span><span className="font-mono font-semibold">993</span></div>
                    <div className="flex justify-between gap-3"><span className="text-muted">Encryption</span><Badge variant="success" className="text-[10px]"><Lock size={10} /> SSL</Badge></div>
                  </div>
                </div>
                <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold text-purple-500 mb-3"><Mail size={14} /> Outgoing · SMTP</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between gap-3"><span className="text-muted">Host</span><span className="font-mono font-semibold">{account.smtp_host}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-muted">Port</span><span className="font-mono font-semibold">587</span></div>
                    <div className="flex justify-between gap-3"><span className="text-muted">Encryption</span><Badge variant="success" className="text-[10px]"><Lock size={10} /> TLS</Badge></div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Live Messages" subtitle={`Recent mail delivered to ${account.email}.`} actions={<Badge variant="info" className="text-[10px]">{accountMails.length} messages</Badge>} />
            <CardBody className="p-0 divide-y divide-[var(--border)]">
              {accountMails.map(m => (
                <div key={m.id} className="flex items-start gap-3 px-5 py-4 hover:surface-2 transition-colors">
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${m.unread ? 'bg-indigo-500 animate-pulse-dot' : 'bg-slate-600'}`} title={m.unread ? 'Unread' : 'Read'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm truncate ${m.unread ? 'font-bold' : 'font-medium'}`}>{m.subject}</p>
                      {m.has_attachment && <Paperclip size={12} className="text-muted shrink-0" />}
                      {m.unread && <Badge variant="primary" className="text-[10px]">New</Badge>}
                    </div>
                    <p className="text-xs text-muted mt-0.5">{m.from_name} · {m.from}</p>
                    <p className="text-xs text-muted mt-1 line-clamp-1">{m.preview}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-[11px] text-muted whitespace-nowrap">{m.time}</span>
                    <Link to={`/webmail/${account.id}`}><Button size="sm" variant="secondary"><ExternalLink size={12} /> Open in SnappyMail</Button></Link>
                  </div>
                </div>
              ))}
              {accountMails.length === 0 && <EmptyState icon={Inbox} title="No messages yet" message="Live mail for this mailbox will appear here as it arrives." />}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Assigned Users" subtitle="Who can access this mailbox and how." actions={<Users size={16} className="text-indigo-500" />} />
            <CardBody className="space-y-3">
              {assignedUsers.map(u => {
                const p = perms[u.id] || {}
                return (
                  <div key={u.id} className="rounded-xl surface-2 border border-app p-3.5">
                    <div className="flex items-center gap-2.5 mb-3">
                      <Avatar name={u.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{u.name}</p>
                        <p className="text-[10px] text-muted truncate">{u.email}</p>
                      </div>
                      <Badge variant={u.status === 'active' ? 'success' : 'warning'} className="text-[10px]">{u.status}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => togglePerm(u.id, 'can_send')} className={`flex items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${p.can_send ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-app text-muted'}`}>
                        can_send {p.can_send ? <Check size={12} /> : <X size={12} />}
                      </button>
                      <button onClick={() => togglePerm(u.id, 'can_receive')} className={`flex items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${p.can_receive ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-app text-muted'}`}>
                        can_receive {p.can_receive ? <Check size={12} /> : <X size={12} />}
                      </button>
                    </div>
                    <Button size="sm" variant="ghost" className="w-full mt-2 text-red-500" onClick={() => revoke(u.id)}><X size={13} /> Revoke access</Button>
                  </div>
                )
              })}
              {assignedUsers.length === 0 && <EmptyState icon={Users} title="No users assigned" message="Assign a team member to grant mailbox access." />}

              <div className="pt-3 border-t border-app space-y-2">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider"><UserPlus size={13} /> Assign a user</p>
                <Select value={addUserId} onChange={e => setAddUserId(e.target.value)}>
                  <option value="">Select a user…</option>
                  {availableUsers.map(u => <option key={u.id} value={u.id}>{u.name} · {u.team}</option>)}
                </Select>
                <Button className="w-full" onClick={assign}><UserPlus size={15} /> Assign</Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Access rules" subtitle="How this mailbox is resolved." actions={<ShieldCheck size={16} className="text-purple-500" />} />
            <CardBody className="space-y-2.5 text-xs text-muted">
              <div className="surface-2 border border-app rounded-xl p-3 flex items-start gap-2.5"><Users size={14} className="text-indigo-500 mt-0.5 shrink-0" /><span>The brand lead inherits every mailbox on this domain automatically.</span></div>
              <div className="surface-2 border border-app rounded-xl p-3 flex items-start gap-2.5"><ShieldCheck size={14} className="text-purple-500 mt-0.5 shrink-0" /><span>All members of the lead's team receive the same mailbox access.</span></div>
              <div className="surface-2 border border-app rounded-xl p-3 flex items-start gap-2.5"><X size={14} className="text-red-500 mt-0.5 shrink-0" /><span>Revoking access immediately removes can_send and can_receive.</span></div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
