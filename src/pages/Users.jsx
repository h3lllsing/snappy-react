import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Ban, Edit3, Mail, Plus, RotateCcw, Search, ShieldCheck,
  Trash2, UserCheck, UserX, Users as UsersIcon,
} from 'lucide-react'
import {
  Avatar, Badge, Button, Card, CardBody, ConfirmDialog, EmptyState, Field,
  Input, Modal, PageHeader, Select, Table, Tabs, Td, Textarea, Th, Tr, useToast,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import api, { describeApiError } from '../lib/api'

const emptyForm = { name: '', email: '', password: '', role: 'user', team_lead_id: '', status: 'active' }

export default function Users() {
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState('active')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [confirm, setConfirm] = useState(null)
  const [suspendTarget, setSuspendTarget] = useState(null)
  const [reason, setReason] = useState('')

  useEffect(() => {
    let alive = true
    api.users()
      .then(u => { if (alive) setUsers(u) })
      .catch(() => { if (alive) toast('Could not load users.', 'error', { title: 'Load failed' }) })
    return () => { alive = false }
  }, [toast])

  const leads = useMemo(() => users.filter(u => u.role === 'team-lead' && !u.deleted_at), [users])
  const filtered = useMemo(() => users.filter(u => {
    if (tab === 'trash' ? !u.deleted_at : !!u.deleted_at) return false
    if (roleFilter && u.role !== roleFilter) return false
    if (statusFilter && u.status !== statusFilter) return false
    if (query && !`${u.name} ${u.email} ${u.team || ''}`.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }), [users, tab, query, roleFilter, statusFilter])

  const counts = useMemo(() => ({
    active: users.filter(u => !u.deleted_at).length,
    trash: users.filter(u => !!u.deleted_at).length,
  }), [users])

  const refreshUsers = async () => {
    try {
      setUsers(await api.users())
    } catch {
      toast('Saved on the server, but the list could not be refreshed. Reload the page.', 'warning', { title: 'Stale list' })
    }
  }
  const showError = (err, fallback, title = 'Action failed') =>
    toast(describeApiError(err, fallback), 'error', { title })
  const lastLogin = value => {
    if (!value) return '—'
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
  }

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }))
  const teamName = u => {
    if (u.team_lead_id) return leads.find(l => l.id === u.team_lead_id)?.team || u.team || '—'
    return u.team && u.team !== '—' ? u.team : '—'
  }

  const openAdd = () => { setEditing(null); setForm(emptyForm); setAddOpen(true) }
  const openEdit = u => {
    setEditing(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, team_lead_id: u.team_lead_id ? String(u.team_lead_id) : '', status: u.status })
    setAddOpen(true)
  }

  const saveUser = async e => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || (!editing && !form.password)) {
      toast('Name, email and password are required.', 'error', { title: 'Missing fields' })
      return
    }
    try {
      if (editing) {
        await api.updateUser(editing.id, {
          name: form.name.trim(), email: form.email.trim(), role: form.role,
        })
        toast(`${form.name.trim()} updated.`, 'success', { title: 'User saved' })
      } else {
        await api.createUser({
          name: form.name.trim(), email: form.email.trim(), password: form.password, role: form.role,
        })
        toast(`${form.name.trim()} was added as ${form.role}.`, 'success', { title: 'User created' })
      }
      await refreshUsers()
      setAddOpen(false)
      setEditing(null)
      setForm(emptyForm)
    } catch (err) {
      showError(err, 'Could not save the user.', editing ? 'Update failed' : 'Create failed')
    }
  }

  const toggleSuspend = async u => {
    if (u.status === 'active') { setSuspendTarget(u); setReason(''); return }
    try {
      await api.unsuspendUser(u.id)
      await refreshUsers()
      toast(`${u.name} is active again.`, 'success', { title: 'User unsuspended' })
    } catch (err) {
      showError(err, 'Could not unsuspend the user.', 'Unsuspend failed')
    }
  }

  const applySuspend = async () => {
    if (!suspendTarget) return
    const r = reason.trim() || 'Suspended by administrator'
    try {
      await api.suspendUser(suspendTarget.id, r)
      await refreshUsers()
      toast(`${suspendTarget.name} was suspended.`, 'warning', { title: 'User suspended' })
      setSuspendTarget(null)
    } catch (err) {
      showError(err, 'Could not suspend the user.', 'Suspend failed')
    }
  }

  const runConfirm = async () => {
    if (!confirm) return
    const { user, action } = confirm
    try {
      if (action === 'delete') {
        await api.deleteUser(user.id)
        toast(`${user.name} moved to trash.`, 'success', { title: 'User deleted' })
      } else if (action === 'restore') {
        await api.restoreUser(user.id)
        toast(`${user.name} restored.`, 'success', { title: 'User restored' })
      } else if (action === 'force') {
        await api.forceDeleteUser(user.id)
        toast(`${user.name} permanently removed.`, 'success', { title: 'User purged' })
      }
      await refreshUsers()
    } catch (err) {
      showError(err, 'Could not change the user.', action === 'restore' ? 'Restore failed' : 'Delete failed')
    }
    setConfirm(null)
  }

  return (
    <div className="animate-fade-up">
      <Breadcrumbs />
      <PageHeader
        title="Users"
        subtitle="Manage team members, roles and mailbox access across every team."
        actions={<>
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search users…" className="pl-9 w-56" />
          </div>
          <Button onClick={openAdd}><Plus size={16} /> Add User</Button>
        </>}
      />

      <div className="grid gap-3 sm:grid-cols-3 mb-5">
        <Card className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center"><UsersIcon size={18} /></div><div><p className="text-[11px] text-muted uppercase tracking-wider">Total users</p><p className="text-xl font-bold">{counts.active}</p></div></Card>
        <Card className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center"><UserX size={18} /></div><div><p className="text-[11px] text-muted uppercase tracking-wider">Suspended</p><p className="text-xl font-bold">{users.filter(u => u.status === 'suspended' && !u.deleted_at).length}</p></div></Card>
        <Card className="p-4 flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center"><ShieldCheck size={18} /></div><div><p className="text-[11px] text-muted uppercase tracking-wider">Team leads</p><p className="text-xl font-bold">{leads.length}</p></div></Card>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[{ key: 'active', label: 'Active', count: counts.active }, { key: 'trash', label: 'Trash', count: counts.trash }]}
      />

      <Card className="mb-4">
        <CardBody className="py-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] sm:hidden">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search users…" className="pl-9" />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] text-muted font-semibold uppercase tracking-wider">Role</span>
            <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-full sm:w-40">
              <option value="">All roles</option>
              <option value="super-admin">super-admin</option>
              <option value="admin">admin</option>
              <option value="team-lead">team-lead</option>
              <option value="user">user</option>
            </Select>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[11px] text-muted font-semibold uppercase tracking-wider">Status</span>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full sm:w-36">
              <option value="">All</option>
              <option value="active">active</option>
              <option value="suspended">suspended</option>
            </Select>
          </div>
          {(query || roleFilter || statusFilter) && <Button size="sm" variant="ghost" onClick={() => { setQuery(''); setRoleFilter(''); setStatusFilter('') }}>Clear filters</Button>}
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardBody className="p-0">
          <Table>
            <thead><tr>
              <Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Team</Th><Th>Status</Th><Th>Last Login</Th><Th>Accounts</Th><Th className="text-right">Actions</Th>
            </tr></thead>
            <tbody>
              {filtered.map(u => (
                <Tr key={u.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.name} size="sm" />
                      <Link to={`/users/${u.id}`} className="font-semibold hover:text-indigo-500 hover:underline whitespace-nowrap">{u.name}</Link>
                    </div>
                  </Td>
                  <Td><span className="text-xs text-muted flex items-center gap-1.5"><Mail size={12} />{u.email}</span></Td>
                  <Td><Badge role={u.role} className="text-[10px]">{u.role}</Badge></Td>
                  <Td><span className="text-xs">{teamName(u)}</span></Td>
                  <Td><Badge variant={u.deleted_at ? 'danger' : u.status} dot className="text-[10px]">{u.deleted_at ? 'trashed' : u.status}</Badge></Td>
                  <Td><span className="text-xs text-muted whitespace-nowrap">{lastLogin(u.last_login)}</span></Td>
                  <Td><span className="text-xs font-semibold">{u.accounts}</span></Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1.5">
                      {tab === 'trash' ? <>
                        <Button size="sm" variant="secondary" onClick={() => setConfirm({ user: u, action: 'restore' })}><RotateCcw size={13} /> Restore</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirm({ user: u, action: 'force' })}><Trash2 size={13} className="text-red-500" /></Button>
                      </> : <>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(u)}><Edit3 size={14} /></Button>
                        <Button size="sm" variant="ghost" title={u.status === 'active' ? 'Suspend' : 'Unsuspend'} onClick={() => toggleSuspend(u)}>
                          {u.status === 'active' ? <Ban size={14} className="text-amber-500" /> : <UserCheck size={14} className="text-emerald-500" />}
                        </Button>
                        <Button size="sm" variant="ghost" title="Delete" onClick={() => setConfirm({ user: u, action: 'delete' })}><Trash2 size={14} className="text-red-500" /></Button>
                      </>}
                    </div>
                  </Td>
                </Tr>
              ))}
              {filtered.length === 0 && <EmptyState icon={UsersIcon} title={tab === 'trash' ? 'Trash is empty' : 'No users found'} message="Try adjusting your search or filters." colspan={8} />}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditing(null) }}
        title={editing ? `Edit ${editing.name}` : 'Add user'}
        footer={<>
          <Button variant="secondary" onClick={() => { setAddOpen(false); setEditing(null) }}>Cancel</Button>
          <Button onClick={saveUser}>{editing ? 'Save changes' : 'Create user'}</Button>
        </>}
      >
        <form onSubmit={saveUser} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required><Input value={form.name} onChange={set('name')} placeholder="e.g. Jane Doe" /></Field>
            <Field label="Email" required><Input type="email" value={form.email} onChange={set('email')} placeholder="user@example.com" /></Field>
          </div>
          <Field label={editing ? 'New password (optional)' : 'Password'} required={!editing}>
            <Input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role" required hint="Controls which pages and actions this user can reach.">
              <Select value={form.role} onChange={set('role')}>
                <option value="user">user</option>
                <option value="team-lead">team-lead</option>
                <option value="admin">admin</option>
                <option value="super-admin">super-admin</option>
              </Select>
            </Field>
            <Field label="Team lead" hint="Assigns the user to the lead's team and mailboxes.">
              <Select value={form.team_lead_id} onChange={set('team_lead_id')}>
                <option value="">No team lead</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.name} · {l.team}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Status">
            <Select value={form.status} onChange={set('status')}>
              <option value="active">active</option>
              <option value="suspended">suspended</option>
            </Select>
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        title={`Suspend ${suspendTarget?.name || ''}`}
        footer={<>
          <Button variant="secondary" onClick={() => setSuspendTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={applySuspend}>Suspend user</Button>
        </>}
      >
        <Field label="Reason" hint="Stored on the user profile so admins can review it later.">
          <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Repeated failed logins" rows={3} />
        </Field>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'delete' ? 'Move user to trash?' : confirm?.action === 'restore' ? 'Restore user?' : 'Delete permanently?'}
        message={confirm?.action === 'delete'
          ? `${confirm?.user?.name} will be moved to trash. You can restore them later.`
          : confirm?.action === 'restore'
            ? `${confirm?.user?.name} will regain access with their previous role.`
            : `${confirm?.user?.name} will be permanently removed. This cannot be undone.`}
        confirmLabel={confirm?.action === 'restore' ? 'Restore' : 'Delete'}
        onConfirm={runConfirm}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}
