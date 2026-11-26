import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown, ArrowUp, ChevronDown, Download, Edit3, ExternalLink, Globe2,
  Inbox, Mail, Plus, RefreshCw, Search, Trash2, UserCheck, Users, Workflow,
} from 'lucide-react'
import {
  Avatar, Badge, Button, Card, CardBody, Checkbox, ConfirmDialog, EmptyState, Field,
  Input, Modal, PageHeader, Select, Table, Tabs, Td, Th, Tr, useToast,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import api, { describeApiError } from '../lib/api'

const emptyForm = {
  email: '', password: '', brand_id: '', domain_id: '', status: 'active',
  sync_enabled: true, imap_host: '', imap_port: '993', imap_encryption: 'ssl',
  smtp_host: '', smtp_port: '587', smtp_encryption: 'tls',
}

function ChainNode({ icon: Icon, label, value, tone = 'indigo' }) {
  const tones = { indigo: 'text-indigo-500 bg-indigo-500/10', purple: 'text-purple-500 bg-purple-500/10', emerald: 'text-emerald-500 bg-emerald-500/10' }
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tones[tone]}`}><Icon size={13} /></div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted font-semibold leading-tight">{label}</p>
        <p className="text-xs font-semibold truncate" title={value}>{value || '—'}</p>
      </div>
    </div>
  )
}

export default function Accounts() {
  const toast = useToast()
  const [accounts, setAccounts] = useState([])
  const [brands, setBrands] = useState([])
  const [domains, setDomains] = useState([])
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState('active')
  const [query, setQuery] = useState('')
  const [brandFilter, setBrandFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assignedFilter, setAssignedFilter] = useState('')
  const [sort, setSort] = useState({ key: 'email', dir: 'asc' })
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [preview, setPreview] = useState(null)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([api.accounts(), api.brands(), api.users(), api.domains()])
      .then(([a, b, u, d]) => { if (alive) { setAccounts(a); setBrands(b); setUsers(u); setDomains(d) } })
      .catch(() => { if (alive) toast('Could not load accounts.', 'error', { title: 'Load failed' }) })
    return () => { alive = false }
  }, [toast])

  useEffect(() => {
    if (!addOpen) return
    let alive = true
    api.autoAssignPreview({ brand_id: form.brand_id ? Number(form.brand_id) : null, assigned: editing?.assigned || [] })
      .then(res => { if (alive) setPreview(res) })
      .catch(() => { if (alive) setPreview(null) })
    return () => { alive = false }
  }, [addOpen, form.brand_id, editing])

  const counts = useMemo(() => ({
    active: accounts.filter(a => !a.deleted).length,
    trash: accounts.filter(a => a.deleted).length,
  }), [accounts])

  const filtered = useMemo(() => {
    const list = accounts.filter(a => {
      if (tab === 'trash' ? !a.deleted : a.deleted) return false
      if (brandFilter && String(a.brand_id) !== String(brandFilter) && a.brand !== brandFilter) return false
      if (statusFilter && a.status !== statusFilter) return false
      if (assignedFilter && !(a.assigned || []).map(String).includes(String(assignedFilter))) return false
      if (query && !`${a.email} ${a.brand} ${a.imap_host}`.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
    return [...list].sort((a, b) => {
      const av = a[sort.key] ?? '', bv = b[sort.key] ?? ''
      const res = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? res : -res
    })
  }, [accounts, tab, query, brandFilter, statusFilter, assignedFilter, sort])

  const toggleSync = async a => {
    const next = !(a.sync_enabled !== false)
    const reason = next ? '' : (window.prompt('Reason for pausing sync (optional):') || '')
    try {
      const res = await api.setAccountSync(a.id, { sync_enabled: next, reason })
      setAccounts(prev => prev.map(x => x.id === a.id ? { ...x, sync_enabled: next, sync: next ? 'idle' : 'paused', effective_sync: res.effective_sync } : x))
      toast(next ? 'Mailbox sync enabled' : 'Mailbox sync paused', 'success', { title: a.email })
    } catch (err) {
      toast(describeApiError(err, 'Could not change sync state.'), 'error', { title: 'Sync control failed' })
    }
  }

  const recheckConnection = async a => {
    try {
      const result = await api.rediscover(a.id)
      toast(`Connection OK — ${result?.imap_host || a.imap_host || 'host unchanged'}.`, 'success', { title: a.email })
    } catch (error) {
      toast(describeApiError(error, 'Could not recheck connection.'), 'error', { title: 'Recheck failed' })
      return
    }
    try {
      setAccounts(await api.accounts())
    } catch (err) {
      toast(describeApiError(err, 'Connection rechecked, but the account list could not be refreshed.'), 'error', { title: 'Refresh failed' })
    }
  }

  const toggleSort = key => setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  const sortIcon = key => sort.key === key ? (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : null
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const userName = id => users.find(u => u.id === id)?.name || `User #${id}`

  const onDomainChange = e => {
    const id = e.target.value
    const domain = domains.find(d => String(d.id) === String(id))
    const brand = brands.find(b => b.domain === domain?.name)
    setForm(f => ({
      ...f,
      domain_id: id,
      brand_id: brand ? String(brand.id) : '',
      imap_host: domain?.imap_host || f.imap_host,
      imap_port: String(domain?.imap_port || f.imap_port),
      imap_encryption: domain?.imap_encryption || f.imap_encryption,
      smtp_host: domain?.smtp_host || f.smtp_host,
      smtp_port: String(domain?.smtp_port || f.smtp_port),
      smtp_encryption: domain?.smtp_encryption || f.smtp_encryption,
    }))
  }

  const openAdd = () => { setEditing(null); setForm(emptyForm); setPreview(null); setAddOpen(true) }
  const openEdit = a => {
    setEditing(a)
    setForm({
      email: a.email, password: '',
      brand_id: a.brand_id ? String(a.brand_id) : '',
      domain_id: a.domain_id ? String(a.domain_id) : '',
      status: a.status, sync_enabled: a.sync_enabled,
      imap_host: a.imap_host || '', imap_port: String(a.imap_port || '993'),
      imap_encryption: a.imap_encryption || 'ssl',
      smtp_host: a.smtp_host || '', smtp_port: String(a.smtp_port || '587'),
      smtp_encryption: a.smtp_encryption || 'tls',
    })
    setPreview(null)
    setAddOpen(true)
  }

  const save = async e => {
    e.preventDefault()
    if (!form.email.trim() || !form.domain_id) {
      toast('Email and domain are required.', 'error', { title: 'Missing fields' }); return
    }
    if (!editing && !form.password) {
      toast('Password is required for a new mailbox.', 'error', { title: 'Missing password' }); return
    }
    const domain = domains.find(d => String(d.id) === String(form.domain_id))
    try {
      const payload = {
        email: form.email.trim(),
        domain_id: Number(form.domain_id),
        brand_id: form.brand_id ? Number(form.brand_id) : null,
        status: form.status, sync_enabled: form.sync_enabled,
        imap_host: form.imap_host.trim(), imap_port: Number(form.imap_port), imap_encryption: form.imap_encryption,
        smtp_host: form.smtp_host.trim(), smtp_port: Number(form.smtp_port), smtp_encryption: form.smtp_encryption,
      }
      if (form.password) payload.password = form.password
      if (editing) {
        const updated = await api.updateAccount(editing.id, payload, editing.updated_at)
        setAccounts(prev => prev.map(a => a.id === editing.id ? { ...a, ...payload, brand: domain?.name || a.brand, ...(updated || {}) } : a))
        toast(`${form.email.trim()} updated.`, 'success', { title: 'Account saved' })
      } else {
        const created = await api.createAccount(payload)
        setAccounts(prev => [...prev, {
          ...created,
          brand: domain?.name || '', brand_id: payload.brand_id,
          assigned: [], unread: 0, last_sync: 'never', sync: payload.sync_enabled ? 'idle' : 'paused',
        }])
        toast(`${form.email.trim()} was added.`, 'success', { title: 'Account created' })
      }
      setAddOpen(false); setEditing(null); setForm(emptyForm); setPreview(null)
    } catch (err) {
      toast(describeApiError(err, 'Could not save account.'), 'error', { title: 'Save failed' })
    }
  }

  const runConfirm = async () => {
    if (!confirm) return
    const { account, action } = confirm
    try {
      if (action === 'delete') {
        await api.updateAccount(account.id, { deleted: true }, account.updated_at)
        setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, deleted: true } : a))
        toast(`${account.email} moved to trash.`, 'success', { title: 'Account deleted' })
      } else if (action === 'restore') {
        await api.updateAccount(account.id, { deleted: false }, account.updated_at)
        setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, deleted: false } : a))
        toast(`${account.email} restored.`, 'success', { title: 'Account restored' })
      } else {
        await api.deleteAccount(account.id)
        setAccounts(prev => prev.filter(a => a.id !== account.id))
        toast(`${account.email} permanently removed.`, 'success', { title: 'Account purged' })
      }
    } catch (err) {
      toast(describeApiError(err, 'Could not update account.'), 'error', { title: 'Action failed' })
    }
    setConfirm(null)
  }

  const exportCsv = () => {
    const rows = [['Email', 'Brand', 'Status', 'Sync', 'Unread', 'Assigned'],
      ...filtered.map(a => [a.email, a.brand, a.status, a.sync, a.unread, (a.assigned || []).map(userName).join('; ')])]
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'accounts.csv'; document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    toast(`Exported ${filtered.length} accounts.`, 'success', { title: 'CSV ready' })
  }

  const selectedDomain = domains.find(d => String(d.id) === String(form.domain_id))
  const previewMailboxes = preview?.brand ? accounts.filter(a => a.brand === preview.brand) : []

  return (
    <div className="animate-fade-up">
      <Breadcrumbs />
      <PageHeader
        title="Email Accounts"
        subtitle="Configure mailboxes, live sync and team access across every brand."
        actions={<>
          <Button variant="secondary" onClick={exportCsv}><Download size={15} /> Export</Button>
          <Button onClick={openAdd}><Plus size={16} /> Add Account</Button>
        </>}
      />

      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'active', label: 'Active', count: counts.active },
        { key: 'trash', label: 'Trash', count: counts.trash },
      ]} />

      <Card className="mb-4">
        <CardBody className="py-3 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search email, brand or host…" className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted font-semibold uppercase tracking-wider">Brand</span>
            <Select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="w-40">
              <option value="">All brands</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.domain}</option>)}
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted font-semibold uppercase tracking-wider">Status</span>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-32">
              <option value="">All</option>
              <option value="active">active</option>
              <option value="suspended">suspended</option>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted font-semibold uppercase tracking-wider">Assigned</span>
            <Select value={assignedFilter} onChange={e => setAssignedFilter(e.target.value)} className="w-40">
              <option value="">Anyone</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </Select>
          </div>
          {(query || brandFilter || statusFilter || assignedFilter) && <Button size="sm" variant="ghost" onClick={() => { setQuery(''); setBrandFilter(''); setStatusFilter(''); setAssignedFilter('') }}>Clear</Button>}
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardBody className="p-0">
          <Table>
            <thead><tr>
              <Th onClick={() => toggleSort('email')} sort={sortIcon('email')}>Email</Th>
              <Th onClick={() => toggleSort('brand')} sort={sortIcon('brand')}>Brand</Th>
              <Th onClick={() => toggleSort('status')} sort={sortIcon('status')}>Status</Th>
              <Th onClick={() => toggleSort('sync')} sort={sortIcon('sync')}>Sync / Live</Th>
              <Th onClick={() => toggleSort('unread')} sort={sortIcon('unread')}>Unread</Th>
              <Th>Assigned Users</Th>
              <Th className="text-right">Actions</Th>
            </tr></thead>
            <tbody>
              {filtered.map(a => (
                <Tr key={a.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0"><Mail size={15} /></div>
                      <div>
                        <Link to={`/accounts/${a.id}`} className="font-semibold hover:text-indigo-500 hover:underline whitespace-nowrap">{a.email}</Link>
                        <p className="text-[10px] text-muted font-mono">{a.imap_host}</p>
                      </div>
                    </div>
                  </Td>
                  <Td><Badge variant="default" className="text-[10px]"><Globe2 size={10} /> {a.brand}</Badge></Td>
                  <Td><Badge variant={a.deleted ? 'danger' : a.status} dot className="text-[10px]">{a.deleted ? 'trashed' : a.status}</Badge></Td>
                  <Td>
                    {a.last_sync === 'live' ? (
                      <Badge variant="success" dot="live" className="text-[10px]">Live</Badge>
                    ) : (
                      <Badge variant={a.sync === 'syncing' ? 'syncing' : a.sync === 'paused' ? 'paused' : 'info'} dot className="text-[10px]">{a.sync}{!a.sync_enabled ? ' · off' : ''}</Badge>
                    )}
                    <button role="switch" aria-checked={a.sync_enabled !== false}
                      title={a.sync_enabled === false ? 'Sync off — click to enable' : 'Live — click to pause'}
                      onClick={() => toggleSync(a)}
                      className={`ml-2 align-middle w-9 h-5 rounded-full relative inline-block transition-colors ${a.sync_enabled === false ? 'bg-slate-600' : 'bg-emerald-500'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${a.sync_enabled === false ? 'left-0.5' : 'left-4.5'}`} />
                    </button>
                  </Td>
                  <Td>
                    {a.unread > 0
                      ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500"><span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse-dot" />{a.unread} new</span>
                      : <span className="text-xs text-muted">0</span>}
                  </Td>
                  <Td>
                    <div className="flex items-center -space-x-2">
                      {(a.assigned || []).slice(0, 4).map(id => <span key={id} title={userName(id)} className="ring-2 ring-[var(--surface)] rounded-full"><Avatar name={userName(id)} size="sm" /></span>)}
                      {(a.assigned || []).length > 4 && <span className="w-7 h-7 rounded-full surface-2 border border-app flex items-center justify-center text-[10px] font-semibold ring-2 ring-[var(--surface)]">+{(a.assigned || []).length - 4}</span>}
                      {!(a.assigned || []).length && <span className="text-xs text-muted">Unassigned</span>}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1.5">
                      {tab === 'trash' ? <>
                        <Button size="sm" variant="secondary" onClick={() => setConfirm({ account: a, action: 'restore' })}>Restore</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirm({ account: a, action: 'force' })}><Trash2 size={14} className="text-red-500" /></Button>
                      </> : <>
                        <Link to={`/webmail/${a.id}`} title="Open Webmail"><Button size="sm" variant="secondary"><ExternalLink size={13} /> Webmail</Button></Link>
                        <Button size="sm" variant="ghost" title="Recheck connection" onClick={() => recheckConnection(a)}><RefreshCw size={14} /></Button>
                         <Button size="sm" variant="ghost" title="Edit" onClick={() => openEdit(a)}><Edit3 size={14} /></Button>
                        <Button size="sm" variant="ghost" title="Delete" onClick={() => setConfirm({ account: a, action: 'delete' })}><Trash2 size={14} className="text-red-500" /></Button>
                      </>}
                    </div>
                  </Td>
                </Tr>
              ))}
              {filtered.length === 0 && <EmptyState icon={Inbox} title={tab === 'trash' ? 'Trash is empty' : 'No accounts found'} message="Try a different search or add a new account." colspan={7} />}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditing(null) }}
        title={editing ? `Edit ${editing.email}` : 'Add email account'}
        size="lg"
        footer={<>
          <Button variant="secondary" onClick={() => { setAddOpen(false); setEditing(null) }}>Cancel</Button>
          <Button onClick={save}>{editing ? 'Save changes' : 'Create account'}</Button>
        </>}
      >
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Domain" required hint="Mail settings are taken from this domain. Auto-assign follows its brand lead.">
              <Select value={form.domain_id} onChange={onDomainChange}>
                <option value="">Select a domain…</option>
                {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="Status"><Select value={form.status} onChange={set('status')}>
              <option value="active">active</option>
              <option value="suspended">suspended</option>
            </Select></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email address" required><Input type="email" value={form.email} onChange={set('email')} placeholder={selectedDomain ? `sales@${selectedDomain.name}` : 'mailbox@domain.com'} /></Field>
            <Field label="Password" required={!editing}><Input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" /></Field>
          </div>

          <details className="group rounded-xl surface-2 border border-app">
            <summary className="flex items-center gap-2 cursor-pointer px-4 py-3 text-xs font-semibold text-muted hover:text-indigo-500 select-none list-none">
              <ChevronDown size={14} className="transition-transform group-open:rotate-180" /> Advanced IMAP / SMTP settings
            </summary>
            <div className="px-4 pb-4 space-y-4 border-t border-app">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-app p-3 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">IMAP</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Host"><Input value={form.imap_host} onChange={set('imap_host')} placeholder="mail.domain.com" /></Field>
                    <Field label="Port"><Input type="number" value={form.imap_port} onChange={set('imap_port')} /></Field>
                  </div>
                  <Field label="Encryption"><Select value={form.imap_encryption} onChange={set('imap_encryption')}><option value="ssl">SSL</option><option value="tls">TLS</option><option value="none">None</option></Select></Field>
                </div>
                <div className="rounded-lg border border-app p-3 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-500">SMTP</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Host"><Input value={form.smtp_host} onChange={set('smtp_host')} placeholder="mail.domain.com" /></Field>
                    <Field label="Port"><Input type="number" value={form.smtp_port} onChange={set('smtp_port')} /></Field>
                  </div>
                  <Field label="Encryption"><Select value={form.smtp_encryption} onChange={set('smtp_encryption')}><option value="tls">TLS</option><option value="ssl">SSL</option><option value="none">None</option></Select></Field>
                </div>
              </div>
              <Checkbox
                label="Enable live sync"
                description="Poll IMAP in real time and push new mail to assigned users."
                checked={form.sync_enabled}
                onChange={e => setForm(f => ({ ...f, sync_enabled: e.target.checked }))}
              />
            </div>
          </details>

          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-xs font-semibold text-indigo-500"><Workflow size={15} /> Auto-assign preview</p>
              <Badge variant="primary" className="text-[10px]">EXACT RULE</Badge>
            </div>
            <p className="text-[11px] text-muted mt-1">Brand → Team lead → Lead's whole team → Brand mailboxes</p>
            {preview ? (
              <div className="mt-3 rounded-lg surface-2 border border-app p-3.5 space-y-1.5">
                <ChainNode icon={Globe2} label="Brand" value={preview.brand} tone="indigo" />
                <div className="ml-3 text-indigo-500"><ArrowDown size={12} /></div>
                <ChainNode icon={UserCheck} label="Team lead" value={preview.lead?.name || '—'} tone="purple" />
                <div className="ml-3 text-purple-500"><ArrowDown size={12} /></div>
                <ChainNode icon={Users} label="Team members" value={(preview.members || []).map(m => m.name).join(', ')} tone="purple" />
                <div className="ml-3 text-emerald-500"><ArrowDown size={12} /></div>
                <ChainNode icon={Mail} label="Mailboxes" value={previewMailboxes.map(a => a.email).join(', ')} tone="emerald" />
              </div>
            ) : (
              <p className="text-xs text-muted mt-3">Select a domain/brand above to preview who gets access.</p>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'delete' ? 'Move account to trash?' : confirm?.action === 'restore' ? 'Restore account?' : 'Delete permanently?'}
        message={confirm?.action === 'restore'
          ? `${confirm?.account?.email} will become active again.`
          : `${confirm?.account?.email} will ${confirm?.action === 'force' ? 'be permanently removed' : 'move to trash'}.`}
        confirmLabel={confirm?.action === 'restore' ? 'Restore' : 'Delete'}
        onConfirm={runConfirm}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}
