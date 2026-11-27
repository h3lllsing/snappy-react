import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity, AlertTriangle, ArrowUpRight, Bell, ChevronRight, Globe2, Inbox,
  Mail, Paperclip, Radio, Server, ShieldCheck, Users, UserX,
} from 'lucide-react'
import {
  Avatar, Badge, Button, Card, CardBody, CardHeader, PageHeader, StatCard, useToast,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import { useAuth } from '../context/AuthContext'
import { useLive } from '../context/LiveContext'
import api from '../lib/api'

const LOAD_LABELS = {
  stats: 'Dashboard statistics',
  brands: 'Brands',
  accounts: 'Email accounts',
  activities: 'Recent activity',
}

function Unavailable({ label }) {
  return (
    <div className="rounded-xl border border-app surface-2 px-4 py-6 text-center text-xs text-muted">
      {label} not available for your role.
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { mails, unread, inboxUnread, pulse } = useLive()
  const [stats, setStats] = useState(null)
  const [brands, setBrands] = useState([])
  const [accounts, setAccounts] = useState([])
  const [activities, setActivities] = useState([])
  // Each card stands on its own: an admin-only 403 must not discard the rest.
  const [available, setAvailable] = useState({ stats: true, brands: true, accounts: true, activities: true })

  useEffect(() => {
    let alive = true
    const keys = ['stats', 'brands', 'accounts', 'activities']
    const setters = [setStats, setBrands, setAccounts, setActivities]
    Promise.allSettled([api.dashboard(), api.brands(), api.accounts(), api.activities()])
      .then(results => {
        if (!alive) return
        results.forEach((result, index) => {
          const key = keys[index]
          if (result.status === 'fulfilled') {
            setters[index](result.value)
            setAvailable(prev => ({ ...prev, [key]: true }))
            return
          }
          if (Number(result.reason?.status) === 403) {
            setAvailable(prev => ({ ...prev, [key]: false }))
            return
          }
          toast(`Could not load ${LOAD_LABELS[key]}.`, 'error', { title: 'Load failed' })
        })
      })
    return () => { alive = false }
  }, [toast])

  const accountIdFor = (email) => accounts.find(a => a.email === email)?.id
  const firstAccountFor = (domain) => accounts.find(a => a.brand === domain)?.id
  const healthy = stats ? (stats.failed_imap_accounts || 0) === 0 : null
  const pausedDomains = brands.filter(b => b.status === 'suspended').length
  // Links follow the route guards in App.jsx; the cards themselves remain visible.
  const role = user?.role
  const isSuperAdmin = role === 'super-admin'
  const canUsers = isSuperAdmin || role === 'admin'
  const canDomains = canUsers || role === 'team-lead'

  const attention = [
    ...(stats?.failed_imap_accounts && isSuperAdmin ? [{ label: `${stats.failed_imap_accounts} IMAP failure`, to: '/imap-status', variant: 'danger' }] : []),
    ...(stats?.suspended_users && canUsers ? [{ label: `${stats.suspended_users} suspended user`, to: '/users', variant: 'warning' }] : []),
    ...(pausedDomains && canDomains ? [{ label: `${pausedDomains} suspended domain`, to: '/domains', variant: 'warning' }] : []),
    ...(unread ? [{ label: `${unread} unread notification`, to: '/notifications', variant: 'info' }] : []),
  ]

  return (
    <div className="animate-fade-up">
      <Breadcrumbs />
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user?.name?.split(' ')[0] || 'there'}. Here is what is happening across your mail workspace.`}
        actions={<>
          <Link to="/webmail"><Button variant="secondary"><Inbox size={16} /> Go to Webmail</Button></Link>
          <Badge variant="primary" dot="live">Live · updated · {pulse} events</Badge>
        </>}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6 mb-5">
        {available.stats ? <>
          <StatCard label="Users" value={stats?.total_users} icon={Users} tone="indigo" sub="Across all teams" onClick={canUsers ? () => navigate('/users') : undefined} />
          <StatCard label="Email Accounts" value={stats?.total_accounts} icon={Mail} tone="sky" sub="Configured mailboxes" onClick={canUsers ? () => navigate('/accounts') : undefined} />
          <StatCard label="Active Domains" value={stats?.active_domains} icon={Globe2} tone="emerald" sub="Connected domains" onClick={canDomains ? () => navigate('/domains') : undefined} />
          <StatCard label="Unread Notifications" value={unread} icon={Bell} tone="indigo" sub={`of ${stats?.total_notifications ?? 0} total`} onClick={() => navigate('/notifications')} />
          <StatCard label="Failed IMAP" value={stats?.failed_imap_accounts} icon={Server} tone="red" sub="Needs attention" onClick={isSuperAdmin ? () => navigate('/imap-status') : undefined} />
          <StatCard label="Suspended Users" value={stats?.suspended_users} icon={UserX} tone="amber" sub="Access blocked" onClick={canUsers ? () => navigate('/users') : undefined} />
        </> : <div className="col-span-full"><Unavailable label="Workspace statistics" /></div>}
      </div>

      {available.stats && stats && <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-2xl border px-4 py-3.5 mb-5 ${healthy ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-red-500/30 bg-red-500/10 text-red-500'}`}>
        <div className="w-9 h-9 rounded-xl surface-2 flex items-center justify-center shrink-0">
          {healthy ? <ShieldCheck size={19} /> : <AlertTriangle size={19} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{healthy ? 'All IMAP connections healthy' : 'IMAP health alert'}</p>
          <p className="text-xs opacity-80 mt-0.5">
            {healthy
              ? `${stats?.total_accounts ?? 0} mailboxes are polling in real time. Incoming mail is delivered instantly.`
              : `${stats?.failed_imap_accounts} mailbox failed IMAP authentication and was auto-paused. New mail for that domain is not being delivered.`}
          </p>
        </div>
        {isSuperAdmin && <Link to="/imap-status">
          <Button size="sm" variant={healthy ? 'secondary' : 'danger'}>
            {healthy ? 'View health' : 'Review IMAP status'} <ArrowUpRight size={14} />
          </Button>
        </Link>}
      </div>}

      <div className="flex flex-wrap items-center gap-2 mb-5">
        <span className="text-[11px] uppercase tracking-wider text-muted font-semibold mr-1">Needs attention</span>
        {attention.length === 0 && <Badge variant="success" dot>All clear</Badge>}
        {attention.map(a => (
          <Link key={a.label} to={a.to}>
            <Badge variant={a.variant} dot className="hover:brightness-125 cursor-pointer">
              {a.label} <ChevronRight size={11} />
            </Badge>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3 overflow-hidden">
          <CardHeader
            title="Live Inbox"
            subtitle="The latest mail across every brand — streamed in real time."
            actions={<div className="flex items-center gap-2">
              <Badge variant="success" dot="live">Live · {pulse} events</Badge>
              <Link to="/webmail"><Button size="sm" variant="outline">Open Webmail <ArrowUpRight size={13} /></Button></Link>
            </div>}
          />
          <CardBody className="p-0">
            {!available.accounts && <div className="p-5"><Unavailable label="The live inbox" /></div>}
            {available.accounts && mails.slice(0, 6).map(mail => {
              const mailAccountId = accountIdFor(mail.account)
              return (
                <div key={mail.id} className="flex items-start gap-3 px-5 py-3.5 border-b border-app last:border-0 hover:surface-2 transition-colors">
                  <div className="relative pt-1.5 shrink-0">
                    <span className={`block w-2 h-2 rounded-full ${mail.unread ? 'bg-indigo-500 ring-4 ring-indigo-500/15' : 'bg-slate-500/40'}`} />
                  </div>
                  <Avatar name={mail.from_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm truncate ${mail.unread ? 'font-bold' : 'font-medium'}`}>{mail.from_name}</span>
                      <span className="text-[11px] text-muted truncate">{mail.account}</span>
                    </div>
                    <p className={`text-xs mt-0.5 truncate ${mail.unread ? 'text-[var(--text)] font-medium' : 'text-muted'}`}>{mail.subject}</p>
                    <p className="text-[11px] text-muted mt-0.5 truncate hidden sm:block">{mail.preview}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[10px] text-muted whitespace-nowrap">{mail.time}</span>
                    <Badge variant="primary">{mail.brand}</Badge>
                    <div className="flex items-center gap-1.5">
                      {mail.has_attachment && <Paperclip size={12} className="text-muted" />}
                      {mailAccountId && (
                        <Link to={`/webmail/${mailAccountId}`} title="Open Webmail" className="text-indigo-500 hover:text-indigo-400">
                          <ArrowUpRight size={14} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {available.accounts && <div className="flex items-center justify-between px-5 py-3">
              <span className="text-[11px] text-muted flex items-center gap-1.5"><Radio size={12} className="text-emerald-500" /> {inboxUnread} unread in this view · updated live · {pulse} events</span>
              <Link to="/webmail" className="text-xs font-semibold text-indigo-500 hover:underline">View all mail →</Link>
            </div>}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden">
          <CardHeader title="My Brands" subtitle="Domains you own and their coverage." actions={canUsers && <Link to="/brands"><Button size="sm" variant="ghost">Matrix →</Button></Link>} />
          <CardBody className="space-y-3">
            {!available.brands && <Unavailable label="Brand coverage" />}
            {available.brands && brands.map(brand => {
              const mailId = firstAccountFor(brand.domain)
              return (
                <div key={brand.id} className="surface-2 border border-app rounded-xl p-3.5 card-hover">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
                      <Globe2 size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate">{brand.domain}</p>
                        <Badge variant={brand.status}>{brand.status}</Badge>
                      </div>
                      <p className="text-[11px] text-muted truncate">{brand.name}</p>
                    </div>
                    <Avatar name={brand.lead_name} size="sm" />
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-app">
                    <div className="flex items-center gap-3 text-[11px] text-muted">
                      <span className="flex items-center gap-1"><Mail size={12} /> {brand.accounts} accounts</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {brand.users} users</span>
                    </div>
                    <span className="text-[11px] text-muted truncate max-w-[90px]">{brand.lead_name}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2.5">
                    <Badge variant="info" className="text-[10px]">Lead · {brand.lead_name}</Badge>
                    {mailId && <Link to={`/webmail/${mailId}`} className="text-[11px] font-semibold text-indigo-500 hover:underline">Open Webmail →</Link>}
                  </div>
                </div>
              )
            })}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Recent activity" subtitle="Latest actions across the workspace." actions={isSuperAdmin && <Link to="/activity-logs"><Button size="sm" variant="ghost">All activity →</Button></Link>} />
        <CardBody className="p-0">
          {!available.activities && <div className="p-5"><Unavailable label="Recent activity" /></div>}
          {available.activities && activities.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-5 py-3 border-b border-app last:border-0">
              <div className="w-8 h-8 rounded-lg surface-2 border border-app flex items-center justify-center text-indigo-500 shrink-0"><Activity size={15} /></div>
              <Avatar name={a.causer} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-xs"><span className="font-semibold">{a.causer}</span> <span className="text-muted">{a.description}</span></p>
              </div>
              <Badge variant="default" className="text-[10px] hidden sm:inline-flex">{a.subject}</Badge>
              <span className="text-[11px] text-muted whitespace-nowrap">{a.time}</span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  )
}
