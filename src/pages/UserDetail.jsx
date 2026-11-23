import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Ban, Check, Edit3, ExternalLink, Globe2, KeyRound,
  Mail, Shield, ShieldCheck, Trash2, UserCheck, Users, X,
} from 'lucide-react'
import {
  Avatar, Badge, Button, Card, CardBody, CardHeader, ConfirmDialog, EmptyState, Field,
  Input, Modal, PageHeader, Select, Table, Tabs, Td, Textarea, Th, Tr, useToast,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import api from '../lib/api'

const ROLE_LEVEL = { user: 1, 'team-lead': 2, admin: 3, 'super-admin': 4 }

function Perm({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${ok ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' : 'border-red-500/20 bg-red-500/10 text-red-500'}`}>
      {ok ? <Check size={10} /> : <X size={10} />} {label}
    </span>
  )
}

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [accounts, setAccounts] = useState([])
  const [tab, setTab] = useState('accounts')
  const [editOpen, setEditOpen] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [form, setForm] = useState({ name: '', email: '', role: 'user', status: 'active', team_lead_id: '' })

  useEffect(() => {
    let alive = true
    Promise.all([api.users(), api.accounts()])
      .then(([u, a]) => {
        if (!alive) return
        setUsers(u); setAccounts(a)
        const found = u.find(x => String(x.id) === String(id))
        if (found) {
          setUser(found)
          setReason(found.suspension_reason || '')
          setForm({ name: found.name, email: found.email, role: found.role, status: found.status, team_lead_id: found.team_lead_id ? String(found.team_lead_id) : '' })
        }
      })
      .catch(() => { if (alive) toast('Could not load user.', 'error', { title: 'Load failed' }) })
    return () => { alive = false }
  }, [id, toast])

  const assigned = useMemo(() => accounts.filter(a => (a.assigned || []).includes(Number(id))), [accounts, id])
  const leads = useMemo(() => users.filter(u => u.role === 'team-lead' && u.id !== user?.id), [users, user])
  const team = user?.team_lead_id
    ? (leads.find(l => l.id === user.team_lead_id)?.team || user.team)
    : user?.team && user.team !== '—' ? user.team : '—'

  const canSend = a => user?.status === 'active' && a.status === 'active'
  const canReceive = a => user?.status === 'active' && a.sync_enabled

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast('Name and email are required.', 'error', { title: 'Missing fields' }); return
    }
    const lead = leads.find(l => String(l.id) === form.team_lead_id)
    const payload = { ...form, name: form.name.trim(), email: form.email.trim(), team_lead_id: form.team_lead_id ? Number(form.team_lead_id) : null, team: lead?.team || (form.team_lead_id ? user?.team : '—') }
    await api.updateUser(user.id, payload)
    setUser(prev => ({ ...prev, ...payload }))
    setEditOpen(false)
    toast(`${form.name.trim()} updated.`, 'success', { title: 'User saved' })
  }

  const toggleSuspend = async () => {
    if (user.status === 'active') { setReason(''); setSuspendOpen(true); return }
    await api.unsuspendUser(user.id)
    setUser(prev => ({ ...prev, status: 'active', suspension_reason: null }))
    toast(`${user.name} is active again.`, 'success', { title: 'User unsuspended' })
  }

  const applySuspend = async () => {
    const r = reason.trim() || 'Suspended by administrator'
    await api.suspendUser(user.id, r)
    setUser(prev => ({ ...prev, status: 'suspended', suspension_reason: r }))
    setSuspendOpen(false)
    toast(`${user.name} was suspended.`, 'warning', { title: 'User suspended' })
  }

  const remove = async () => {
    if (confirm === 'delete') {
      const deleted_at = new Date().toISOString()
      await api.updateUser(user.id, { deleted: true, deleted_at })
      toast(`${user.name} moved to trash.`, 'success', { title: 'User deleted' }); navigate('/users')
    }
    else { toast('Role elevated to super-admin (demo).', 'info', { title: 'Permissions updated' }) }
    setConfirm(null)
  }

  if (!user) return <div className="animate-fade-up"><Breadcrumbs /><Card><EmptyState icon={Users} title="Loading user…" message="Fetching profile and mailbox assignments." /></Card></div>

  return (
    <div className="animate-fade-up">
      <Breadcrumbs title={user.name} />
      <PageHeader
        title={user.name}
        subtitle={user.email}
        backTo={() => navigate('/users')}
        actions={<>
          <Button variant="secondary" onClick={() => setEditOpen(true)}><Edit3 size={15} /> Edit</Button>
          <Button variant={user.status === 'active' ? 'secondary' : 'success'} onClick={toggleSuspend}>
            {user.status === 'active' ? <Ban size={15} className="text-amber-500" /> : <UserCheck size={15} />}
            {user.status === 'active' ? 'Suspend' : 'Unsuspend'}
          </Button>
          <Button variant="danger" onClick={() => setConfirm('delete')}><Trash2 size={15} /> Delete</Button>
        </>}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader title="Profile" subtitle="Account identity and placement in the organisation." actions={<Badge role={user.role}>{user.role}</Badge>} />
            <CardBody>
              <div className="flex items-center gap-4 mb-5">
                <Avatar name={user.name} size="lg" />
                <div className="min-w-0">
                  <p className="text-lg font-bold truncate">{user.name}</p>
                  <p className="text-xs text-muted truncate">{user.email}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <Badge role={user.role} className="text-[10px]">{user.role}</Badge>
                    <Badge variant={user.deleted ? 'danger' : user.status} dot className="text-[10px]">{user.deleted ? 'trashed' : user.status}</Badge>
                    <Badge variant="primary" className="text-[10px]"><Globe2 size={10} /> {team}</Badge>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['User ID', `#${user.id}`],
                  ['Email', user.email],
                  ['Role', user.role],
                  ['Team', team],
                  ['Team lead', leads.find(l => l.id === user.team_lead_id)?.name || '—'],
                  ['Last login', user.last_login],
                  ['Accounts', String(assigned.length)],
                  ['Status', user.status],
                ].map(([label, value]) => (
                  <div key={label} className="surface-2 border border-app rounded-xl px-3.5 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">{label}</p>
                    <p className="text-sm font-semibold mt-0.5 truncate" title={value}>{value}</p>
                  </div>
                ))}
              </div>
              {user.suspension_reason && (
                <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-500">
                  <p className="font-semibold flex items-center gap-1.5"><Ban size={13} /> Suspension reason</p>
                  <p className="mt-1 opacity-90">{user.suspension_reason}</p>
                </div>
              )}
            </CardBody>
          </Card>

          <div>
            <Tabs active={tab} onChange={setTab} tabs={[
              { key: 'accounts', label: 'Assigned Email Accounts', count: assigned.length },
              { key: 'audit', label: 'Access Notes' },
            ]} />
            {tab === 'accounts' && (
              <Card className="overflow-hidden">
                <CardBody className="p-0">
                  <Table>
                    <thead><tr><Th>Email account</Th><Th>Domain</Th><Th>Status</Th><Th>Sync</Th><Th>Permissions</Th><Th className="text-right">Open</Th></tr></thead>
                    <tbody>
                      {assigned.map(a => (
                        <Tr key={a.id}>
                          <Td><span className="flex items-center gap-2 font-semibold"><Mail size={14} className="text-indigo-500" />{a.email}</span></Td>
                          <Td><Badge variant="default" className="text-[10px]">{a.brand}</Badge></Td>
                          <Td><Badge variant={a.status} className="text-[10px]">{a.status}</Badge></Td>
                          <Td><Badge variant={a.sync === 'syncing' ? 'syncing' : a.sync === 'paused' ? 'paused' : 'info'} dot className="text-[10px]">{a.sync}</Badge></Td>
                          <Td><div className="flex flex-wrap gap-1.5"><Perm ok={canSend(a)} label="can_send" /><Perm ok={canReceive(a)} label="can_receive" /></div></Td>
                          <Td className="text-right"><Link to={`/webmail/${a.id}`}><Button size="sm" variant="secondary">Webmail <ExternalLink size={12} /></Button></Link></Td>
                        </Tr>
                      ))}
                      {assigned.length === 0 && <EmptyState icon={Mail} title="No assigned accounts" message="This user has no mailboxes assigned yet." colspan={6} />}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            )}
            {tab === 'audit' && (
              <Card><CardBody className="space-y-2.5 text-xs">
                <p className="font-semibold text-sm mb-1">How access is resolved</p>
                <div className="surface-2 border border-app rounded-xl p-3 flex items-start gap-2.5"><ShieldCheck size={15} className="text-indigo-500 mt-0.5" /><span>Team leads inherit every mailbox on their brand's domain automatically.</span></div>
                <div className="surface-2 border border-app rounded-xl p-3 flex items-start gap-2.5"><Users size={15} className="text-purple-500 mt-0.5" /><span>Regular users receive access only through explicit mailbox assignments.</span></div>
                <div className="surface-2 border border-app rounded-xl p-3 flex items-start gap-2.5"><Ban size={15} className="text-amber-500 mt-0.5" /><span>Suspending a user blocks login and immediately revokes can_send / can_receive.</span></div>
              </CardBody></Card>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Role & permissions" subtitle="Capability inspector for this role." actions={<Shield size={16} className="text-indigo-500" />} />
            <CardBody className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5"><span className="text-muted">Privilege level</span><span className="font-semibold">{ROLE_LEVEL[user.role] || 1} / 4</span></div>
                <div className="h-2 rounded-full surface-2 border border-app overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${((ROLE_LEVEL[user.role] || 1) / 4) * 100}%` }} />
                </div>
              </div>
              {[
                ['View webmail', true],
                ['Access team overview', ROLE_LEVEL[user.role] >= 2],
                ['Manage domains', ROLE_LEVEL[user.role] >= 3],
                ['Manage users & roles', ROLE_LEVEL[user.role] >= 3],
                ['System administration', ROLE_LEVEL[user.role] >= 4],
              ].map(([label, ok]) => (
                <div key={label} className="flex items-center justify-between text-xs border-b border-app/70 last:border-0 pb-2.5">
                  <span className="text-muted">{label}</span>
                  <Perm ok={ok && user.status === 'active'} label={ok && user.status === 'active' ? 'allowed' : 'denied'} />
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Danger zone" subtitle="Destructive account actions." />
            <CardBody className="space-y-2.5">
              <Button variant="secondary" className="w-full justify-start" onClick={() => setConfirm('promote')}><KeyRound size={15} /> Elevate role</Button>
              <Button variant="danger" className="w-full justify-start" onClick={() => setConfirm('delete')}><Trash2 size={15} /> Delete user</Button>
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Edit ${user.name}`} footer={<><Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={save}>Save changes</Button></>}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required><Input value={form.name} onChange={set('name')} /></Field>
            <Field label="Email" required><Input value={form.email} onChange={set('email')} /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role"><Select value={form.role} onChange={set('role')}>
              <option value="user">user</option><option value="team-lead">team-lead</option><option value="admin">admin</option><option value="super-admin">super-admin</option>
            </Select></Field>
            <Field label="Team lead"><Select value={form.team_lead_id} onChange={set('team_lead_id')}>
              <option value="">No team lead</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.name} · {l.team}</option>)}
            </Select></Field>
          </div>
          <Field label="Status"><Select value={form.status} onChange={set('status')}>
            <option value="active">active</option><option value="suspended">suspended</option>
          </Select></Field>
        </div>
      </Modal>

      <Modal open={suspendOpen} onClose={() => setSuspendOpen(false)} title={`Suspend ${user.name}`} footer={<><Button variant="secondary" onClick={() => setSuspendOpen(false)}>Cancel</Button><Button variant="danger" onClick={applySuspend}>Suspend user</Button></>}>
        <Field label="Reason" hint="Shown on the profile card while suspended."><Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason for suspension…" /></Field>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm === 'delete' ? 'Delete this user?' : 'Elevate role?'}
        message={confirm === 'delete' ? `${user.name} will be moved to trash and lose access immediately.` : `This grants ${user.name} elevated privileges in this demo.`}
        confirmLabel={confirm === 'delete' ? 'Delete' : 'Elevate'}
        danger={confirm === 'delete'}
        onConfirm={remove}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}
