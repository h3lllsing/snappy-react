import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown, ArrowUp, ArrowUpRight, Ban, Download, Edit3, Eye, Globe2,
  Lock, Plus, RotateCcw, Search, Server, Trash2,
} from 'lucide-react'
import {
  Badge, Button, Card, CardBody, ConfirmDialog, EmptyState, Field, Input, Modal,
  PageHeader, Select, Table, Tabs, Td, Textarea, Th, Tr, useToast,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import api from '../lib/api'

const emptyForm = {
  name: '', status: 'active',
  imap_host: '', imap_port: '993', imap_encryption: 'ssl',
  smtp_host: '', smtp_port: '587', smtp_encryption: 'tls', smtp_username: '',
  notes: '',
}

export default function Domains() {
  const toast = useToast()
  const [domains, setDomains] = useState([])
  const [tab, setTab] = useState('active')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' })
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    let alive = true
    api.domains()
      .then(d => { if (alive) setDomains(d) })
      .catch(() => { if (alive) toast('Could not load domains.', 'error', { title: 'Load failed' }) })
    return () => { alive = false }
  }, [toast])

  const counts = useMemo(() => ({
    active: domains.filter(d => !d.deleted).length,
    trash: domains.filter(d => d.deleted).length,
  }), [domains])

  const filtered = useMemo(() => {
    const list = domains.filter(d => {
      if (tab === 'trash' ? !d.deleted : d.deleted) return false
      if (statusFilter && d.status !== statusFilter) return false
      if (query && !`${d.name} ${d.imap_host} ${d.created_by}`.toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
    return [...list].sort((a, b) => {
      const av = a[sort.key] ?? '', bv = b[sort.key] ?? ''
      const res = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sort.dir === 'asc' ? res : -res
    })
  }, [domains, tab, query, statusFilter, sort])

  const toggleSync = async d => {
    const next = !(d.sync_enabled !== false)
    const reason = next ? '' : (window.prompt('Reason for pausing sync (optional):') || '')
    try {
      const res = await api.setDomainSync(d.id, { sync_enabled: next, reason })
      setDomains(prev => prev.map(x => x.id === d.id ? { ...x, sync_enabled: next, sync: next ? 'idle' : 'paused', effective_sync: res.effective_sync } : x))
      toast(next ? 'Domain sync enabled' : 'Domain sync paused', 'success', { title: d.name })
    } catch {
      toast('Could not change sync state.', 'error', { title: 'Sync control failed' })
    }
  }

  const toggleSort = key => setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' })
  const sortIcon = key => sort.key === key ? (sort.dir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />) : null
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const openAdd = () => { setEditing(null); setForm(emptyForm); setAddOpen(true) }
  const openEdit = d => {
    setEditing(d)
    setForm({
      name: d.name, status: d.status,
      imap_host: d.imap_host || '', imap_port: String(d.imap_port || 993), imap_encryption: d.imap_encryption || d.encryption || 'ssl',
      smtp_host: d.smtp_host || '', smtp_port: String(d.smtp_port || 587), smtp_encryption: d.smtp_encryption || 'tls',
      smtp_username: d.smtp_username || '', notes: d.notes || '',
    })
    setAddOpen(true)
  }

  const save = e => {
    e.preventDefault()
    if (!form.name.trim() || !form.imap_host.trim()) {
      toast('Domain name and IMAP host are required.', 'error', { title: 'Missing fields' }); return
    }
    if (editing) {
      setDomains(prev => prev.map(d => d.id === editing.id ? {
        ...d, name: form.name.trim(), status: form.status, imap_host: form.imap_host.trim(),
        imap_port: Number(form.imap_port), encryption: form.imap_encryption, smtp_host: form.smtp_host.trim(),
        smtp_port: Number(form.smtp_port), smtp_encryption: form.smtp_encryption, smtp_username: form.smtp_username.trim(), notes: form.notes,
      } : d))
      toast(`${form.name.trim()} updated.`, 'success', { title: 'Domain saved' })
    } else {
      setDomains(prev => [...prev, {
        id: Date.now(), name: form.name.trim(), status: form.status, accounts: 0,
        imap_host: form.imap_host.trim(), imap_port: Number(form.imap_port), encryption: form.imap_encryption,
        smtp_host: form.smtp_host.trim(), smtp_port: Number(form.smtp_port), smtp_encryption: form.smtp_encryption,
        smtp_username: form.smtp_username.trim(), notes: form.notes,
        created_by: 'Bilal Ahmed', created_at: new Date().toISOString().slice(0, 10),
      }])
      toast(`${form.name.trim()} added.`, 'success', { title: 'Domain created' })
    }
    setAddOpen(false); setEditing(null); setForm(emptyForm)
  }

  const runConfirm = () => {
    if (!confirm) return
    const { domain, action } = confirm
    if (action === 'delete') {
      setDomains(prev => prev.map(d => d.id === domain.id ? { ...d, deleted: true } : d))
      toast(`${domain.name} moved to trash.`, 'success', { title: 'Domain deleted' })
    } else if (action === 'restore') {
      setDomains(prev => prev.map(d => d.id === domain.id ? { ...d, deleted: false } : d))
      toast(`${domain.name} restored.`, 'success', { title: 'Domain restored' })
    } else {
      setDomains(prev => prev.filter(d => d.id !== domain.id))
      toast(`${domain.name} permanently removed.`, 'success', { title: 'Domain purged' })
    }
    setConfirm(null)
  }

  const exportCsv = () => {
    const rows = [['Name', 'Status', 'Accounts', 'IMAP Host', 'Encryption', 'Created By', 'Created At'],
      ...filtered.map(d => [d.name, d.status, d.accounts, d.imap_host, d.encryption, d.created_by, d.created_at])]
    const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = 'domains.csv'; document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    toast(`Exported ${filtered.length} domains.`, 'success', { title: 'CSV ready' })
  }

  return (
    <div className="animate-fade-up">
      <Breadcrumbs />
      <PageHeader
        title="Domains"
        subtitle="Registered mail domains and their IMAP / SMTP transport settings."
        actions={<>
          <Button variant="secondary" onClick={exportCsv}><Download size={15} /> Export</Button>
          <Button onClick={openAdd}><Plus size={16} /> Add Domain</Button>
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
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search domains, hosts or owners…" className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted font-semibold uppercase tracking-wider">Status</span>
            <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-36">
              <option value="">All</option>
              <option value="active">active</option>
              <option value="suspended">suspended</option>
            </Select>
          </div>
          {(query || statusFilter) && <Button size="sm" variant="ghost" onClick={() => { setQuery(''); setStatusFilter('') }}>Clear</Button>}
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardBody className="p-0">
          <Table>
            <thead><tr>
              <Th onClick={() => toggleSort('name')} sort={sortIcon('name')}>Name</Th>
              <Th onClick={() => toggleSort('status')} sort={sortIcon('status')}>Status</Th>
              <Th onClick={() => toggleSort('accounts')} sort={sortIcon('accounts')}>Accounts</Th>
              <Th onClick={() => toggleSort('imap_host')} sort={sortIcon('imap_host')}>IMAP Host</Th>
              <Th onClick={() => toggleSort('encryption')} sort={sortIcon('encryption')}>Encryption</Th>
              <Th onClick={() => toggleSort('created_by')} sort={sortIcon('created_by')}>Created By</Th>
              <Th>Sync</Th>
              <Th className="text-right">Actions</Th>
            </tr></thead>
            <tbody>
              {filtered.map(d => (
                <Tr key={d.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0"><Globe2 size={15} /></div>
                      <div><Link to={`/domains/${d.id}`} className="font-semibold hover:text-indigo-500 hover:underline">{d.name}</Link><p className="text-[10px] text-muted">{d.created_at}</p></div>
                    </div>
                  </Td>
                  <Td><Badge variant={d.deleted ? 'danger' : d.status} dot className="text-[10px]">{d.deleted ? 'trashed' : d.status}</Badge></Td>
                  <Td><Badge variant="default" className="text-[10px]"><Server size={10} /> {d.accounts}</Badge></Td>
                  <Td><span className="text-xs font-mono text-muted">{d.imap_host}:{d.imap_port}</span></Td>
                  <Td><Badge variant={d.encryption === 'ssl' || d.encryption === 'tls' ? 'success' : 'warning'} className="text-[10px]"><Lock size={10} /> {(d.encryption || 'none').toUpperCase()}</Badge></Td>
                  <Td><span className="text-xs">{d.created_by}</span></Td>
                  <Td>
                    <button role="switch" aria-checked={d.sync_enabled !== false} title={d.sync_enabled === false ? 'Sync is off — click to enable' : 'Sync is live — click to pause'}
                      onClick={() => toggleSync(d)}
                      className={`w-9 h-5 rounded-full relative transition-colors ${d.sync_enabled === false ? 'bg-slate-600' : 'bg-emerald-500'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${d.sync_enabled === false ? 'left-0.5' : 'left-4.5'}`} />
                    </button>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1.5">
                      {tab === 'trash' ? <>
                        <Button size="sm" variant="secondary" onClick={() => setConfirm({ domain: d, action: 'restore' })}><RotateCcw size={13} /> Restore</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirm({ domain: d, action: 'force' })}><Trash2 size={13} className="text-red-500" /></Button>
                      </> : <>
                        <Link to={`/domains/${d.id}`} title="View"><Button size="sm" variant="ghost"><Eye size={14} /></Button></Link>
                        <Button size="sm" variant="ghost" title="Edit" onClick={() => openEdit(d)}><Edit3 size={14} /></Button>
                        {d.status === 'active'
                          ? <Button size="sm" variant="ghost" title="Suspend" onClick={() => { setDomains(prev => prev.map(x => x.id === d.id ? { ...x, status: 'suspended' } : x)); toast(`${d.name} suspended.`, 'warning', { title: 'Domain suspended' }) }}><Ban size={14} className="text-amber-500" /></Button>
                          : <Button size="sm" variant="ghost" title="Activate" onClick={() => { setDomains(prev => prev.map(x => x.id === d.id ? { ...x, status: 'active' } : x)); toast(`${d.name} activated.`, 'success', { title: 'Domain active' }) }}><ArrowUpRight size={14} className="text-emerald-500" /></Button>}
                        <Button size="sm" variant="ghost" title="Delete" onClick={() => setConfirm({ domain: d, action: 'delete' })}><Trash2 size={14} className="text-red-500" /></Button>
                      </>}
                    </div>
                  </Td>
                </Tr>
              ))}
              {filtered.length === 0 && <EmptyState icon={Globe2} title={tab === 'trash' ? 'Trash is empty' : 'No domains found'} message="Try a different search or add a new domain." colspan={7} />}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => { setAddOpen(false); setEditing(null) }}
        title={editing ? `Edit ${editing.name}` : 'Add domain'}
        size="lg"
        footer={<><Button variant="secondary" onClick={() => { setAddOpen(false); setEditing(null) }}>Cancel</Button><Button onClick={save}>{editing ? 'Save changes' : 'Create domain'}</Button></>}
      >
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Domain name" required hint="e.g. newbrand.com"><Input value={form.name} onChange={set('name')} placeholder="newbrand.com" /></Field>
            <Field label="Status"><Select value={form.status} onChange={set('status')}><option value="active">active</option><option value="suspended">suspended</option></Select></Field>
          </div>
          <div className="rounded-xl surface-2 border border-app p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-500">IMAP settings</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Host" required><Input value={form.imap_host} onChange={set('imap_host')} placeholder="mail.newbrand.com" /></Field>
              <Field label="Port"><Input type="number" value={form.imap_port} onChange={set('imap_port')} /></Field>
              <Field label="Encryption"><Select value={form.imap_encryption} onChange={set('imap_encryption')}><option value="ssl">SSL</option><option value="tls">TLS</option><option value="none">None</option></Select></Field>
            </div>
          </div>
          <div className="rounded-xl surface-2 border border-app p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-500">SMTP settings</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Host"><Input value={form.smtp_host} onChange={set('smtp_host')} placeholder="mail.newbrand.com" /></Field>
              <Field label="Port"><Input type="number" value={form.smtp_port} onChange={set('smtp_port')} /></Field>
              <Field label="Encryption"><Select value={form.smtp_encryption} onChange={set('smtp_encryption')}><option value="tls">TLS</option><option value="ssl">SSL</option><option value="none">None</option></Select></Field>
            </div>
            <Field label="SMTP username"><Input value={form.smtp_username} onChange={set('smtp_username')} placeholder="smtp@newbrand.com" /></Field>
          </div>
          <Field label="Notes"><Textarea rows={3} value={form.notes} onChange={set('notes')} placeholder="Internal notes about this domain…" /></Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.action === 'delete' ? 'Move domain to trash?' : confirm?.action === 'restore' ? 'Restore domain?' : 'Delete permanently?'}
        message={confirm?.action === 'restore' ? `${confirm?.domain?.name} will be restored to active domains.` : `${confirm?.domain?.name} and its settings will ${confirm?.action === 'force' ? 'be permanently removed' : 'move to trash'}.`}
        confirmLabel={confirm?.action === 'restore' ? 'Restore' : 'Delete'}
        onConfirm={runConfirm}
        onClose={() => setConfirm(null)}
      />
    </div>
  )
}
