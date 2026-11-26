import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, CalendarDays, Eye, Mail, Search, User } from 'lucide-react'
import {
  Badge, Button, Card, EmptyState, Field, Input, PageHeader, Select, Table, Td, Th, Tr, useToast,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import api from '../lib/api'

const ACTIONS = [
  'login', 'read', 'flag_add', 'flag_remove', 'flag_set', 'send',
  'delete', 'move', 'copy', 'append_draft', 'logout',
]

const ACTION_VARIANT = {
  send: 'success', read: 'info', flag_add: 'warning', flag_remove: 'warning',
  delete: 'danger', move: 'primary', copy: 'primary', login: 'default',
}

const display = v => (v === null || v === undefined || v === '' ? '—' : String(v))

// The API returns { data, next_cursor }; accept a bare array from legacy aliases.
const pageOf = (payload) => {
  if (Array.isArray(payload)) return { rows: payload, nextCursor: null }
  const rows = Array.isArray(payload?.data) ? payload.data
    : Array.isArray(payload?.rows) ? payload.rows
      : Array.isArray(payload?.items) ? payload.items : []
  const nextCursor = payload?.next_cursor ?? payload?.cursor ?? null
  return { rows, nextCursor }
}

export default function MailActivity() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ action: '', search: '', from: '', to: '' })
  const [nextCursor, setNextCursor] = useState(null)
  const cursorRef = useRef(null)

  const load = useCallback(async ({ append = false } = {}) => {
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
      if (!append) {
        cursorRef.current = null
        setNextCursor(null)
      } else if (cursorRef.current) {
        // next_cursor is an opaque "occurred_at,id" value consumed by the API.
        params.cursor = cursorRef.current
      }
      const page = pageOf(await api.mailActivity(params))
      cursorRef.current = page.nextCursor
      setNextCursor(page.nextCursor)
      setRows(previous => append ? [...previous, ...page.rows] : page.rows)
    } catch (error) {
      toast(error?.message || 'Mail activity report unavailable.', 'error', { title: 'Report' })
    } finally {
      setLoading(false)
    }
  }, [filters, toast])

  useEffect(() => { load() }, [load])

  const set = key => e => setFilters(f => ({ ...f, [key]: e.target.value }))

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Mail Activity' }]} />
      <PageHeader
        title="Mail Activity"
        description="Every read, send, flag, move and delete performed inside SnappyMail — with the user who did it."
        actions={<Button variant="secondary" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</Button>}
      />

      <Card>
        <div className="grid gap-3 md:grid-cols-5 p-4">
          <Field label="Action">
            <Select value={filters.action} onChange={set('action')}>
              <option value="">All actions</option>
              {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </Select>
          </Field>
          <Field label="Search"><Input value={filters.search} onChange={set('search')} placeholder="subject, user, mailbox, message-id" /></Field>
          <Field label="From"><Input type="date" value={filters.from} onChange={set('from')} /></Field>
          <Field label="To"><Input type="date" value={filters.to} onChange={set('to')} /></Field>
          <div className="flex items-end"><Button variant="secondary" onClick={load}><Search size={14} className="inline mr-1" />Apply</Button></div>
        </div>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={Activity} title="No recorded activity yet" description="Activity appears here as soon as a user reads, sends, flags, moves or deletes mail in webmail." />
        ) : (
          <Table>
            <thead><tr>
              <Th>When</Th><Th>User</Th><Th>Action</Th><Th>Mailbox</Th><Th>Message</Th><Th>Folder</Th><Th>UID</Th><Th>Source</Th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <Tr key={r.id}>
                  <Td className="whitespace-nowrap text-[11px]">{display(r.occurred_at)}</Td>
                  <Td>
                    <div className="flex items-center gap-2"><User size={13} className="text-indigo-500" />
                      <div><p className="text-sm font-medium">{display(r.actor_name)}</p><p className="text-[11px] text-muted">{display(r.actor_email)}</p></div>
                    </div>
                  </Td>
                  <Td><Badge variant={ACTION_VARIANT[r.action] || 'default'}>{display(r.action)}</Badge></Td>
                  <Td className="text-[11px]">{display(r.account_email)}</Td>
                  <Td className="max-w-[260px] truncate" title={display(r.subject)}>
                    <span className="flex items-center gap-1"><Mail size={12} className="text-muted" />{display(r.subject)}</span>
                  </Td>
                  <Td className="text-[11px]">{display(r.folder_from)}{r.folder_to ? ` → ${r.folder_to}` : ''}</Td>
                  <Td className="text-[11px]">{display(r.uid)}</Td>
                  <Td className="text-[11px]">{display(r.source)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {nextCursor !== null && nextCursor !== '' && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => load({ append: true })} disabled={loading}>
            {loading ? 'Loading…' : 'Load more activity'}
          </Button>
        </div>
      )}
    </div>
  )
}
