import { useCallback, useEffect, useRef, useState } from 'react'
import { Activity, AlertTriangle, ArrowDownLeft, ArrowUpRight, Check, Clock, Inbox, Play, RefreshCw, Server, ShieldAlert, UserPlus, Wrench, X } from 'lucide-react'
import { Alert, Badge, Button, Card, CardBody, CardHeader, Field, Input, Modal, PageHeader, StatCard, Table, Td, Th, Tr, useToast } from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

// Accept both the legacy bare-array responses and paginated envelopes.
const rowsOf = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.rows)) return payload.rows
  return []
}

const cursorOf = (payload) => {
  const value = payload?.next_cursor ?? payload?.cursor
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const errorText = (error, fallback) => error?.message || fallback

const EMPTY_SUMMARY = {
  accounts: 0, online: 0, syncing: 0, paused: 0, open_issues: 0,
  received_today: 0, sent_today: 0, pushed_today: 0, queue_depth: 0,
  failed_jobs: 0, maintenance: false,
}

export default function OpsConsole() {
  const toast = useToast()
  const { user } = useAuth()
  const pollFailures = useRef(0)
  const [summary, setSummary] = useState(EMPTY_SUMMARY)
  const [runs, setRuns] = useState([])
  const [issues, setIssues] = useState([])
  const [mail, setMail] = useState([])
  const [direction, setDirection] = useState('in')
  const [loading, setLoading] = useState(false)
  const [timeline, setTimeline] = useState(null)
  const [cursor, setCursor] = useState(0)
  const [assignTarget, setAssignTarget] = useState(null)
  const [ownerId, setOwnerId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, r, i, m] = await Promise.all([
        api.opsSummary(), api.opsSyncRuns(), api.opsIssues(), api.opsMail({ direction }),
      ])
      if (s && Object.keys(s).length) setSummary(s)
      setRuns(rowsOf(r))
      setIssues(rowsOf(i))
      setMail(rowsOf(m))
    } catch (error) { toast(`Ops data unavailable: ${errorText(error, 'Request failed')}`, 'error') }
    finally { setLoading(false) }
  }, [toast, direction])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const stream = await api.opsStream(cursor)
        const events = rowsOf(stream?.events ?? stream)
        const ids = events.map((e) => e?.id).filter((v) => typeof v === 'number')
        const maxId = ids.length ? Math.max(...ids) : cursor
        const nextCursor = cursorOf(stream)
        if (maxId > cursor) {
          setCursor(nextCursor ?? maxId)
          load()
        } else if (nextCursor !== null && nextCursor > cursor) {
          setCursor(nextCursor)
        }
        pollFailures.current = 0
      } catch (error) {
        pollFailures.current += 1
        // One toast per failing streak instead of one per 30-second poll.
        if (pollFailures.current === 2) {
          toast(`Ops stream polling failed: ${errorText(error, 'Request failed')}`, 'error', { title: 'Polling' })
        }
      }
    }, 30000)
    return () => clearInterval(id)
  }, [cursor, load])

  const act = async (id, action, payload = {}) => {
    const fn = {
      ack: api.acknowledgeIssue, resolve: api.resolveIssue, start: api.startIssue,
      assign: api.assignIssue, snooze: api.snoozeIssue, close: api.closeIssue,
    }[action]
    try {
      await fn(id, payload)
      toast(`Issue #${id}: ${action}`, 'success')
      load()
      return true
    } catch (error) {
      toast(`Issue #${id}: ${action} failed — ${errorText(error, 'Action failed')}`, 'error', { title: 'Action failed' })
      return false
    }
  }

  const openAssign = (id) => {
    setOwnerId(user?.id !== null && user?.id !== undefined ? String(user.id) : '')
    setAssignTarget(id)
  }

  const submitAssignment = async () => {
    const parsed = Number(ownerId)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      toast('owner_id must be a positive user id.', 'error', { title: 'Assign issue' })
      return
    }
    if (await act(assignTarget, 'assign', { owner_id: parsed })) setAssignTarget(null)
  }

  const openTimeline = async (id) => {
    try { setTimeline(await api.opsIssueTimeline(id)) }
    catch (error) { toast(`Timeline unavailable: ${errorText(error, 'Request failed')}`, 'error') }
  }

  const toggleMaintenance = async () => {
    try {
      if (summary.maintenance) await api.exitMaintenance()
      else await api.enterMaintenance({ reason: 'Operator maintenance' })
      toast(summary.maintenance ? 'Maintenance exited' : 'Maintenance entered', 'warning')
      load()
    } catch (error) { toast(`Maintenance toggle failed: ${errorText(error, 'Request failed')}`, 'error') }
  }

  return (
    <>
      <Breadcrumbs title="Live Operations" />
      <PageHeader title="Live Operations Console" subtitle="Everything happening right now — syncs, mail in/out, issues and actions"
        actions={<>
          <Badge variant="success" dot="live">Live · {summary.online}/{summary.accounts} online</Badge>
          <Button variant="secondary" onClick={load} loading={loading}><RefreshCw size={14} /> Refresh</Button>
          <Button variant={summary.maintenance ? 'warning' : 'secondary'} onClick={toggleMaintenance}><Wrench size={14} /> {summary.maintenance ? 'Exit maintenance' : 'Maintenance'}</Button>
        </>} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Received today" value={summary.received_today} icon={ArrowDownLeft} tone="emerald" onClick={() => setDirection('in')} />
        <StatCard label="Sent today" value={summary.sent_today} icon={ArrowUpRight} tone="indigo" onClick={() => setDirection('out')} />
        <StatCard label="Open issues" value={summary.open_issues} icon={ShieldAlert} tone="red" />
        <StatCard label="Paused accounts" value={summary.paused} icon={AlertTriangle} tone="amber" />
      </div>

      {summary.maintenance && <Alert type="warning" className="mb-4" title="Maintenance mode active">Alerts are suppressed. Exit maintenance when finished.</Alert>}

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Sync runs" subtitle="Which syncs ran and what they fetched" actions={<Badge variant="info">{runs.length}</Badge>} />
          <CardBody className="p-0">
            <Table minWidth={false}>
              <thead><tr><Th>Account</Th><Th>Outcome</Th><Th>Fetched</Th><Th>Duration</Th><Th>When</Th></tr></thead>
              <tbody>{runs.map(r => (
                <Tr key={r.id}>
                  <Td className="text-xs font-semibold">{r.email ?? r.email_account_id ?? '—'}</Td>
                  <Td><Badge variant={r.outcome === 'success' ? 'success' : 'danger'}>{r.outcome}</Badge></Td>
                  <Td>{r.emails_fetched}</Td><Td className="text-xs text-muted">{r.duration_ms} ms</Td>
                  <Td className="text-xs text-muted">{r.started_at}</Td>
                </Tr>
              ))}</tbody>
            </Table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Mail flow" subtitle="Received / sent with delivery status" actions={
            <div className="flex gap-1">{[['in','Received'],['out','Sent']].map(([k,l]) => (
              <button key={k} onClick={() => setDirection(k)} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${direction === k ? 'bg-indigo-600 text-white' : 'surface-2 border border-app'}`}>{l}</button>
            ))}</div>
          } />
          <CardBody className="p-0">
            <Table minWidth={false}>
              <thead><tr><Th>Subject</Th><Th>From / To</Th><Th>Status</Th></tr></thead>
              <tbody>{mail.map(m => (
                <Tr key={m.id}>
                  <Td className="text-xs font-semibold">{m.subject}</Td>
                  <Td className="text-xs text-muted">{m.from || m.to}</Td>
                  <Td>{direction === 'out' ? <Badge variant={m.pushed_to_server_at ? 'success' : 'warning'}>{m.pushed_to_server_at ? 'Pushed ✓' : 'Pending push'}</Badge> : <Badge variant={m.is_read ? 'default' : 'primary'}>{m.is_read ? 'Read' : 'New'}</Badge>}</Td>
                </Tr>
              ))}</tbody>
            </Table>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Issues & actions" subtitle="Acknowledge, assign, resolve — from this screen" actions={<Badge variant="danger">{issues.filter(i => i.status !== 'resolved').length} open</Badge>} />
        <CardBody className="space-y-3">
          {issues.length === 0 && <p className="text-sm text-muted">No open issues.</p>}
          {issues.map(issue => (
            <div key={issue.id} className="surface-2 border border-app rounded-xl p-3.5 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={issue.severity === 'critical' ? 'danger' : 'warning'}>{issue.severity}</Badge>
                  <Badge variant="default">{issue.status}</Badge>
                  <span className="text-xs font-mono text-muted">{issue.error_code}</span>
                </div>
                <p className="text-sm font-semibold mt-1.5 truncate">{issue.account ?? issue.email_account_id ?? '—'} · {issue.brand ?? issue.brand_id ?? '—'}</p>
                <p className="text-xs text-muted">{issue.remediation_hint} <span className="text-indigo-500">{issue.runbook_url}</span></p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {issue.status === 'open' && <Button size="sm" variant="secondary" onClick={() => act(issue.id, 'ack')}><Check size={13} /> Ack</Button>}
                <Button size="sm" variant="secondary" onClick={() => openAssign(issue.id)}><UserPlus size={13} /> Assign</Button>
                <Button size="sm" variant="secondary" onClick={() => act(issue.id, 'start')}><Play size={13} /> Start</Button>
                <Button size="sm" variant="secondary" onClick={() => act(issue.id, 'snooze')}><Clock size={13} /> Snooze</Button>
                <Button size="sm" variant="secondary" onClick={() => openTimeline(issue.id)}><Clock size={13} /> Timeline</Button>
                <Button size="sm" variant="success" onClick={() => act(issue.id, 'resolve', { note: 'Resolved from Ops Console' })}><Check size={13} /> Resolve</Button>
                {issue.status !== 'closed' && <Button size="sm" variant="secondary" onClick={() => act(issue.id, 'close')}><X size={13} /> Close</Button>}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <Modal
        open={assignTarget !== null}
        onClose={() => setAssignTarget(null)}
        title={assignTarget !== null ? `Assign issue #${assignTarget}` : 'Assign issue'}
        size="sm"
        footer={<>
          <Button variant="secondary" onClick={() => setAssignTarget(null)}>Cancel</Button>
          <Button onClick={submitAssignment}>Assign</Button>
        </>}
      >
        <Field label="Owner ID" required hint="Defaults to your user id; enter the id of an eligible admin or brand lead.">
          <Input type="number" min="1" value={ownerId} onChange={e => setOwnerId(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitAssignment() }} placeholder="user id" autoFocus />
        </Field>
      </Modal>

      <div className="grid md:grid-cols-4 gap-3 mt-5 text-xs text-muted">
        <span><Activity size={13} className="inline text-indigo-500" /> Queue depth: {summary.queue_depth}</span>
        <span><Server size={13} className="inline text-indigo-500" /> Failed jobs: {summary.failed_jobs}</span>
        <span><Inbox size={13} className="inline text-indigo-500" /> Pushed today: {summary.pushed_today}</span>
        <span><RefreshCw size={13} className="inline text-indigo-500" /> Poll every 30s</span>
      </div>
      <Modal open={!!timeline} onClose={() => setTimeline(null)} title={timeline?.issue ? `Issue #${timeline.issue.id} timeline` : 'Incident timeline'} size="lg">
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {(timeline?.timeline || []).length === 0 && <p className="text-sm text-muted">No timeline events yet.</p>}
          {(timeline?.timeline || []).map((e, i) => (
            <div key={i} className="surface-2 border border-app rounded-xl p-3 flex gap-3">
              <Badge variant={e.kind === 'action' ? 'info' : 'default'}>{e.kind}</Badge>
              <div className="min-w-0"><p className="text-sm font-semibold">{e.label}</p><p className="text-[11px] text-muted">{e.at}</p><pre className="text-[10px] mt-1 whitespace-pre-wrap break-all">{JSON.stringify(e.payload || {})}</pre></div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  )
}
