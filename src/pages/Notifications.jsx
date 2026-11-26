import { useMemo, useState } from 'react'
import {
  AlertTriangle, Bell, Check, CheckCheck, ExternalLink, Mail,
  PauseCircle, RotateCcw, Trash2,
} from 'lucide-react'
import {
  Badge, Button, Card, CardBody, EmptyState, PageHeader, Tabs,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import { useLive } from '../context/LiveContext'

const TYPE_META = {
  new_email: { icon: Mail, tone: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', badge: 'primary', label: 'New email' },
  email_sync_failed: { icon: AlertTriangle, tone: 'text-red-500 bg-red-500/10 border-red-500/20', badge: 'error', label: 'Sync failed' },
  email_sync_paused: { icon: PauseCircle, tone: 'text-amber-500 bg-amber-500/10 border-amber-500/20', badge: 'warning', label: 'Sync paused' },
}

// Accept a bare array or a paginated { data, notifications, next_cursor } payload.
const rowsOf = (payload) => {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.notifications)) return payload.notifications
  if (Array.isArray(payload?.rows)) return payload.rows
  return []
}

export default function Notifications() {
  const { notifications, unread, markRead, markAllRead, toggleDeleted, openWebmail } = useLive()
  const [tab, setTab] = useState('all')
  const [busy, setBusy] = useState(false)
  const rows = useMemo(() => rowsOf(notifications), [notifications])

  const counts = useMemo(() => ({
    all: rows.filter(n => !n.deleted).length,
    unread,
    trash: rows.filter(n => n.deleted).length,
  }), [rows, unread])

  const filtered = useMemo(() => rows.filter(n => {
    if (tab === 'trash') return !!n.deleted
    if (n.deleted) return false
    if (tab === 'unread') return !n.read
    return true
  }), [rows, tab])

  // The list and unread badge are the confirmation; no toast is needed.
  const handleMarkRead = id => markRead(id)

  const markAll = async () => {
    setBusy(true)
    try { await markAllRead() } finally { setBusy(false) }
  }

  const handleDelete = id => toggleDeleted(id, false)

  const handleRestore = id => toggleDeleted(id, true)

  return (
    <div className="animate-fade-up">
      <Breadcrumbs />
      <PageHeader
        title="Notifications"
        subtitle="Live alerts for new mail, sync failures and paused accounts."
        actions={<>
          <Badge variant="success" dot="live">Live · new alerts arrive automatically</Badge>
          <Button variant="secondary" onClick={markAll} loading={busy} disabled={unread === 0}><CheckCheck size={15} /> Mark all read</Button>
        </>}
      />

      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'all', label: 'All', count: counts.all },
        { key: 'unread', label: 'Unread', count: unread },
        { key: 'trash', label: 'Trash', count: counts.trash },
      ]} />

      <Card>
        <CardBody className="p-0 divide-y divide-[var(--border)]">
          {filtered.map(n => {
            const meta = TYPE_META[n.type] || TYPE_META.new_email
            const Icon = meta.icon
            return (
              <div key={n.id} className={`flex items-start gap-3.5 px-5 py-4 transition-colors hover:surface-2 ${!n.read && tab !== 'trash' ? 'bg-indigo-500/[0.06]' : ''}`}>
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${meta.tone}`}><Icon size={18} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!n.read && tab !== 'trash' && <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse-dot shrink-0" title="Unread" />}
                    <p className={`text-sm truncate ${n.read ? 'font-medium' : 'font-bold'}`}>{n.title}</p>
                    <Badge variant={meta.badge} className="text-[10px]">{meta.label}</Badge>
                  </div>
                  <p className="text-xs text-muted mt-1">{n.detail}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="default" className="text-[10px]">{n.brand}</Badge>
                    <span className="text-[11px] text-muted">{n.time}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {(n.type === 'new_email' || n.type === 'App\\Events\\NewEmailArrived') && tab !== 'trash' && (
                    <Button size="sm" variant="secondary" onClick={() => openWebmail(n.account_id)}><ExternalLink size={12} /> Open in SnappyMail</Button>
                  )}
                  {tab === 'trash' ? (
                    <Button size="sm" variant="ghost" title="Restore" onClick={() => handleRestore(n.id)}><RotateCcw size={14} className="text-emerald-500" /></Button>
                  ) : <>
                    {!n.read && <Button size="sm" variant="ghost" title="Mark as read" onClick={() => handleMarkRead(n.id)}><Check size={15} className="text-indigo-500" /></Button>}
                    <Button size="sm" variant="ghost" title="Delete" onClick={() => handleDelete(n.id)}><Trash2 size={14} className="text-red-500" /></Button>
                  </>}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <EmptyState
              icon={tab === 'trash' ? Trash2 : Bell}
              title={tab === 'unread' ? 'All caught up' : tab === 'trash' ? 'Trash is empty' : 'No notifications'}
              message={tab === 'unread' ? 'You have no unread notifications right now.' : tab === 'trash' ? 'Deleted notifications will appear here.' : 'New mail and sync alerts will show up here.'}
            />
          )}
        </CardBody>
      </Card>
    </div>
  )
}
