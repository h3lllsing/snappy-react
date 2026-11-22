import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Search, ShieldCheck, Trash2 } from 'lucide-react'
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, Input, PageHeader, Pagination,
  Select, Table, Td, Th, Tr, useToast,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import api from '../lib/api'

const EVENT_META = {
  login_success: { label: 'success', variant: 'success' },
  login_failed: { label: 'failed', variant: 'danger' },
  logout: { label: 'logout', variant: 'default' },
}
const EVENT_DATES = { 1: '2026-11-22', 2: '2026-11-22', 3: '2026-11-21', 4: '2026-11-20' }
const PAGE_SIZE = 3

export default function LoginAudits() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [event, setEvent] = useState('')
  const [date, setDate] = useState('')
  const [page, setPage] = useState(1)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => {
    let alive = true
    api.loginAudits()
      .then(r => { if (alive) setRows(r) })
      .catch(() => { if (alive) toast('Could not load login history.', 'error', { title: 'Load failed' }) })
    return () => { alive = false }
  }, [toast])

  const filtered = useMemo(() => rows.filter(r => {
    if (event && r.event !== event) return false
    if (date && (EVENT_DATES[r.id] || '') !== date) return false
    if (query && !`${r.user} ${r.email} ${r.ip} ${r.event}`.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }), [rows, event, date, query])

  useEffect(() => { setPage(1) }, [query, event, date])

  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, lastPage)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const hasFilters = !!(query || event || date)

  const deleteRow = () => {
    if (!confirm) return
    setRows(prev => prev.filter(r => r.id !== confirm.id))
    toast(`Audit entry #${confirm.id} deleted.`, 'success', { title: 'Record removed' })
    setConfirm(null)
  }

  return (
    <div className="animate-fade-up">
      <Breadcrumbs />
      <PageHeader
        title="Login Audits"
        subtitle="Review sign-in attempts, failures and logout events across the portal."
        actions={<Badge variant="danger" dot>{rows.filter(r => r.event === 'login_failed').length} failed attempts</Badge>}
      />

      <Card className="mb-5">
        <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search user, email or IP…" className="pl-9" />
          </div>
          <Select value={event} onChange={e => setEvent(e.target.value)}>
            <option value="">All events</option>
            {Object.keys(EVENT_META).map(k => <option key={k} value={k}>{EVENT_META[k].label}</option>)}
          </Select>
          <div className="relative">
            <CalendarDays size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="pl-9 text-xs" />
          </div>
        </div>
        {hasFilters && <div className="px-4 pb-3"><Button size="sm" variant="ghost" onClick={() => { setQuery(''); setEvent(''); setDate('') }}>Clear filters</Button></div>}
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table className="min-w-[720px]">
          <thead><tr>
            <Th>User</Th><Th>Email</Th><Th>Event</Th><Th>IP address</Th><Th>Time</Th><Th className="text-right">Action</Th>
          </tr></thead>
          <tbody>
            {pageRows.map(r => {
              const meta = EVENT_META[r.event] || { label: r.event, variant: 'default' }
              return (
                <Tr key={r.id}>
                  <Td><span className="font-semibold whitespace-nowrap">{r.user}</span></Td>
                  <Td className="text-muted">{r.email}</Td>
                  <Td><Badge variant={meta.variant} dot={r.event === 'login_success' ? 'live' : false}>{meta.label}</Badge></Td>
                  <Td><span className="font-mono text-xs text-muted">{r.ip}</span></Td>
                  <Td className="text-xs text-muted whitespace-nowrap">{r.time}</Td>
                  <Td className="text-right">
                    <Button size="sm" variant="ghost" title="Delete entry" onClick={() => setConfirm(r)}><Trash2 size={14} className="text-red-500" /></Button>
                  </Td>
                </Tr>
              )
            })}
            {pageRows.length === 0 && <EmptyState icon={ShieldCheck} title="No audits found" message={hasFilters ? 'Try a different search or date.' : 'Login attempts will be recorded here.'} colspan={6} />}
          </tbody>
        </Table>
      </Card>

      <Pagination page={safePage} lastPage={lastPage} total={filtered.length}
        from={(safePage - 1) * PAGE_SIZE + 1} to={Math.min(safePage * PAGE_SIZE, filtered.length)} onPage={setPage} />

      <ConfirmDialog
        open={!!confirm}
        title="Delete audit entry?"
        message={confirm ? `This will remove the ${confirm.event} record for ${confirm.email} (${confirm.ip}) from the local audit list.` : ''}
        confirmLabel="Delete"
        onClose={() => setConfirm(null)}
        onConfirm={deleteRow}
      />
    </div>
  )
}
