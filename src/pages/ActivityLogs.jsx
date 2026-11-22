import { useEffect, useMemo, useState } from 'react'
import { Activity, CalendarDays, Eye, Search } from 'lucide-react'
import {
  Badge, Button, Card, EmptyState, Input, Modal, PageHeader, Pagination,
  Select, Table, Td, Th, Tr, useToast,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import api from '../lib/api'

const EVENT_STYLE = {
  created: { label: 'created', variant: 'success' },
  assigned: { label: 'assigned', variant: 'info' },
  soft_delete: { label: 'soft_delete', variant: 'danger' },
  updated: { label: 'updated', variant: 'warning' },
  restored: { label: 'restored', variant: 'primary' },
}

const EVENT_DATES = { 1: '2026-11-22', 2: '2026-11-22', 3: '2026-11-21', 4: '2026-11-21', 5: '2026-11-20' }
const PAGE_SIZE = 3

const diffFor = a => {
  switch (a.event) {
    case 'created':
      return [
        { field: 'id', before: '—', after: `#${a.id + 90}` },
        { field: 'email', before: '—', after: 'sales@xuz.com' },
        { field: 'status', before: '—', after: 'active' },
        { field: 'created_by', before: '—', after: a.causer },
      ]
    case 'assigned':
      return [
        { field: 'assigned_to', before: 'Unassigned', after: a.description.split(' to ')[1] || 'Fatima Sheikh' },
        { field: 'assignee_count', before: '2', after: '3' },
        { field: 'updated_by', before: '—', after: a.causer },
      ]
    case 'soft_delete':
      return [
        { field: 'status', before: 'active', after: 'suspended' },
        { field: 'deleted_at', before: 'null', after: '2026-11-21 09:14:02' },
        { field: 'deleted_by', before: '—', after: a.causer },
      ]
    case 'updated':
      return [
        { field: 'encryption', before: 'ssl', after: 'tls' },
        { field: 'imap_port', before: '993', after: '993' },
        { field: 'updated_by', before: '—', after: a.causer },
      ]
    default:
      return [
        { field: 'status', before: 'suspended', after: 'active' },
        { field: 'suspended_at', before: '2026-11-18 11:02:11', after: 'null' },
        { field: 'restored_by', before: '—', after: a.causer },
      ]
  }
}

export default function ActivityLogs() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [query, setQuery] = useState('')
  const [event, setEvent] = useState('')
  const [causer, setCauser] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    let alive = true
    api.activities()
      .then(a => { if (alive) setRows(a) })
      .catch(() => { if (alive) toast('Could not load activity logs.', 'error', { title: 'Load failed' }) })
    return () => { alive = false }
  }, [toast])

  const causers = useMemo(() => Array.from(new Set(rows.map(r => r.causer))), [rows])

  const filtered = useMemo(() => rows.filter(r => {
    const date = EVENT_DATES[r.id] || ''
    if (event && r.event !== event) return false
    if (causer && r.causer !== causer) return false
    if (from && date < from) return false
    if (to && date > to) return false
    if (query && !`${r.causer} ${r.description} ${r.subject} ${r.event}`.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }), [rows, event, causer, from, to, query])

  useEffect(() => { setPage(1) }, [query, event, causer, from, to])

  const lastPage = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, lastPage)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const hasFilters = !!(query || event || causer || from || to)

  const clear = () => { setQuery(''); setEvent(''); setCauser(''); setFrom(''); setTo('') }

  const openDetail = row => setDetail(row)

  return (
    <div className="animate-fade-up">
      <Breadcrumbs />
      <PageHeader
        title="Activity Logs"
        subtitle="Audit trail of every change made across accounts, users and domains."
        actions={<Badge variant="primary" dot="live">{rows.length} recorded events</Badge>}
      />

      <Card className="mb-5">
        <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search description, user, subject…" className="pl-9" />
          </div>
          <Select value={event} onChange={e => setEvent(e.target.value)}>
            <option value="">All events</option>
            {Object.keys(EVENT_STYLE).map(k => <option key={k} value={k}>{k}</option>)}
          </Select>
          <Select value={causer} onChange={e => setCauser(e.target.value)}>
            <option value="">All causers</option>
            {causers.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <CalendarDays size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="pl-8 text-xs" title="From date" />
            </div>
            <div className="relative flex-1">
              <CalendarDays size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="pl-8 text-xs" title="To date" />
            </div>
          </div>
        </div>
        {hasFilters && <div className="px-4 pb-3"><Button size="sm" variant="ghost" onClick={clear}>Clear filters</Button></div>}
      </Card>

      <Card className="p-0 overflow-hidden">
        <Table className="min-w-[860px]">
          <thead><tr>
            <Th>User</Th><Th>Event</Th><Th>Description</Th><Th>Subject</Th><Th>Time</Th><Th className="text-right">Details</Th>
          </tr></thead>
          <tbody>
            {pageRows.map(r => {
              const meta = EVENT_STYLE[r.event] || { label: r.event, variant: 'default' }
              return (
                <Tr key={r.id}>
                  <Td><span className="font-semibold whitespace-nowrap">{r.causer}</span></Td>
                  <Td><Badge variant={meta.variant}>{meta.label}</Badge></Td>
                  <Td className="max-w-[340px]"><span className="text-muted">{r.description}</span></Td>
                  <Td><Badge variant="default">{r.subject}</Badge></Td>
                  <Td className="text-xs text-muted whitespace-nowrap">{r.time}</Td>
                  <Td className="text-right"><Button size="sm" variant="ghost" onClick={() => openDetail(r)} title="View change diff"><Eye size={15} className="text-indigo-500" /></Button></Td>
                </Tr>
              )
            })}
            {pageRows.length === 0 && <EmptyState icon={Activity} title="No matching activity" message={hasFilters ? 'Try adjusting your filters.' : 'Actions will appear here as your team works.'} colspan={6} />}
          </tbody>
        </Table>
      </Card>

      <Pagination page={safePage} lastPage={lastPage} total={filtered.length}
        from={(safePage - 1) * PAGE_SIZE + 1} to={Math.min(safePage * PAGE_SIZE, filtered.length)} onPage={setPage} />

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Activity detail" size="lg"
        footer={<Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>}>
        {detail && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={(EVENT_STYLE[detail.event] || {}).variant || 'default'}>{detail.event}</Badge>
              <Badge variant="default">{detail.subject}</Badge>
              <span className="text-xs text-muted ml-auto">{detail.time}</span>
            </div>
            <p className="text-sm">{detail.causer} <span className="text-muted">{detail.description}</span></p>
            <div className="rounded-xl border border-app overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_1fr] bg-surface-2 px-3 py-2 text-[10px] uppercase tracking-wider text-muted font-semibold">
                <span>Field</span><span>Before</span><span>After</span>
              </div>
              {diffFor(detail).map((d, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr] px-3 py-2 text-xs border-t border-app">
                  <span className="font-mono text-muted">{d.field}</span>
                  <span className="font-mono text-red-500 line-through break-all">{d.before}</span>
                  <span className="font-mono text-emerald-500 break-all">{d.after}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted">Change diff is a local mock preview of the stored audit payload.</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
