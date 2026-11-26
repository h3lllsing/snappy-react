import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, Clock, RefreshCw, Server, Users, Wifi } from 'lucide-react'
import {
  Badge, Button, Card, PageHeader, StatCard, StatusDot, Table, Td, Th, Tr, useToast,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import api from '../lib/api'

const STATUS_VARIANT = { connected: 'success', paused: 'paused', reconnecting: 'warning', failed: 'danger', error: 'error', syncing: 'info' }

export default function ImapStatus() {
  const toast = useToast()
  const [rows, setRows] = useState([])
  const [busy, setBusy] = useState(false)
  const [lastPoll, setLastPoll] = useState(null)
  const [now, setNow] = useState(Date.now())

  const load = useCallback(({ notify = false, initial = false } = {}) => {
    setBusy(true)
    return api.imapStatus()
      .then(r => {
        setRows(r)
        setLastPoll(Date.now())
        setNow(Date.now())
        if (notify) toast('IMAP status refreshed from the local DB mirror.', 'success', { title: 'Status updated' })
      })
      .catch(error => {
        if (notify || initial) {
          toast(`Could not ${initial ? 'load' : 'refresh'} IMAP status: ${error?.message || 'Request failed'}`, 'error', { title: initial ? 'Load failed' : 'Refresh failed' })
        }
      })
      .finally(() => setBusy(false))
  }, [toast])

  useEffect(() => {
    load({ initial: true })
    const pollTimer = setInterval(() => load({ notify: true }), 30000)
    const tickTimer = setInterval(() => setNow(Date.now()), 1000)
    return () => { clearInterval(pollTimer); clearInterval(tickTimer) }
  }, [load])

  const heartbeat = lastPoll ? `${Math.max(0, Math.floor((now - lastPoll) / 1000))} s ago` : '—'

  const stats = useMemo(() => ({
    total: rows.length,
    connected: rows.filter(r => r.status === 'connected').length,
    failed: rows.filter(r => r.status !== 'connected').length,
    uidnext: rows.reduce((sum, r) => sum + (r.uidnext || 0), 0),
  }), [rows])

  return (
    <div className="animate-fade-up">
      <Breadcrumbs />
      <PageHeader
        title="IMAP Status"
        subtitle="Live connection health of every configured mailbox account."
        actions={<Button onClick={() => load({ notify: true })} loading={busy}><RefreshCw size={15} /> Refresh</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-5">
        <StatCard label="Total accounts" value={stats.total} icon={Server} tone="indigo" sub="Configured mailboxes" />
        <StatCard label="Connected" value={stats.connected} icon={Wifi} tone="emerald" sub="Streaming via IDLE" />
        <StatCard label="Failed / Paused" value={stats.failed} icon={Activity} tone="red" sub={stats.failed ? 'Needs attention' : 'All accounts healthy'} />
        <StatCard label="Last heartbeat" value={heartbeat} icon={Clock} tone="sky" sub="Daemon poll cycle" />
      </div>

      <div className="flex items-center gap-2 text-xs text-muted mb-4">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
        </span>
        Auto-refresh every 30 seconds — this page reads the local DB mirror synced from real IMAP. Last poll {heartbeat}.
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-app">
          <h3 className="font-semibold">Account connections</h3>
          <Badge variant={stats.failed ? 'warning' : 'success'} dot="live">{stats.connected}/{stats.total} online</Badge>
        </div>
        <Table className="min-w-[820px]">
          <thead><tr>
            <Th>Account</Th><Th>Brand</Th><Th>Status</Th><Th>UIDNEXT</Th><Th>Assigned users</Th><Th>Last check</Th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <Tr key={r.account}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <StatusDot status={r.status} />
                    <span className="font-semibold whitespace-nowrap">{r.account}</span>
                  </div>
                </Td>
                <Td><Badge variant="default">{r.brand}</Badge></Td>
                <Td><Badge variant={STATUS_VARIANT[r.status] || 'default'} dot={r.status === 'connected' ? 'live' : false}>{r.status}</Badge></Td>
                <Td><span className="font-mono text-xs text-muted">{r.uidnext}</span></Td>
                <Td>
                  <div className="flex items-center gap-1.5 text-xs text-muted"><Users size={13} className="text-indigo-500" />{r.users || '—'}</div>
                </Td>
                <Td className="text-xs text-muted whitespace-nowrap">{r.last_check}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  )
}
