import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CreditCard, Globe2, Search as SearchIcon, Users, Boxes, Zap } from 'lucide-react'
import {
  Badge, Card, CardBody, EmptyState, Input, PageHeader, useToast,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import api from '../lib/api'

export default function Search() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const [data, setData] = useState({ users: [], accounts: [], domains: [], brands: [] })

  useEffect(() => {
    let alive = true
    // Users is admin-only; a 403 must not discard accounts/domains/brands.
    Promise.allSettled([api.users(), api.accounts(), api.domains(), api.brands()])
      .then(results => {
        if (!alive) return
        const [users, accounts, domains, brands] = results.map(r => r.status === 'fulfilled' ? r.value : [])
        setData({ users, accounts, domains, brands })
        if (results.some(r => r.status === 'rejected' && Number(r.reason?.status) !== 403)) {
          toast('Could not load some search data. Please try again.', 'error', { title: 'Search unavailable' })
        }
      })
    return () => { alive = false }
  }, [toast])

  const term = q.trim().toLowerCase()
  const ready = term.length >= 2

  const groups = useMemo(() => {
    if (!ready) return []
    const match = (...fields) => fields.some(f => String(f ?? '').toLowerCase().includes(term))
    return [
      {
        key: 'users', title: 'Users', icon: Users, badge: 'primary',
        rows: data.users.filter(u => match(u.name, u.email, u.team, u.role)).map(u => ({
          id: u.id, label: u.name, subtitle: `${u.role} · ${u.team} · ${u.email}`, link: `/users/${u.id}`,
        })),
      },
      {
        key: 'accounts', title: 'Email Accounts', icon: CreditCard, badge: 'success',
        rows: data.accounts.filter(a => match(a.email, a.brand, a.imap_host, a.smtp_host)).map(a => ({
          id: a.id, label: a.email, subtitle: `${a.brand} · ${a.status} · sync ${a.sync}`, link: `/accounts/${a.id}`,
        })),
      },
      {
        key: 'domains', title: 'Domains', icon: Globe2, badge: 'info',
        rows: data.domains.filter(d => match(d.name, d.imap_host, d.created_by)).map(d => ({
          id: d.id, label: d.name, subtitle: `${d.status} · ${d.accounts} accounts · ${d.imap_host}`, link: `/domains/${d.id}`,
        })),
      },
      {
        key: 'brands', title: 'Brands', icon: Boxes, badge: 'warning',
        rows: data.brands.filter(b => match(b.domain, b.name, b.lead_name)).map(b => ({
          id: b.id, label: b.domain, subtitle: `${b.name} · lead: ${b.lead_name} · ${b.accounts} accounts`, link: `/brands/${b.id}`,
        })),
      },
    ].filter(g => g.rows.length > 0)
  }, [data, term, ready])

  const total = groups.reduce((sum, g) => sum + g.rows.length, 0)
  const onChange = e => {
    const value = e.target.value
    setSearchParams(value ? { q: value } : {}, { replace: true })
  }

  return (
    <div className="animate-fade-up">
      <Breadcrumbs />
      <PageHeader title="Search" subtitle="Find users, mailboxes, domains and brands across the workspace." />

      <Card className="mb-5">
        <CardBody className="py-4">
          <div className="relative">
            <SearchIcon size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
            <Input autoFocus value={q} onChange={onChange} placeholder="Search people, mailboxes, domains, brands…" className="pl-11 pr-32 py-3 text-base" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500 pointer-events-none">
              <Zap size={12} className="animate-pulse-dot" /> Live search
            </span>
          </div>
          <p className="text-[11px] text-muted mt-2">Results update as you type · minimum 2 characters · across users, accounts, domains and brands. Mail and notification search is planned with the backend.</p>
        </CardBody>
      </Card>

      {!ready && (
        <Card><EmptyState icon={SearchIcon} title="Start typing to search" message="Enter at least 2 characters to look across users, email accounts, domains and brands." /></Card>
      )}

      {ready && total === 0 && (
        <Card><EmptyState icon={SearchIcon} title={`No results for “${q.trim()}”`} message="Try a different name, email address, domain or brand." /></Card>
      )}

      {ready && total > 0 && (
        <>
          <p className="text-xs text-muted mb-3">{total} result{total === 1 ? '' : 's'} for <span className="font-semibold text-[var(--text)]">“{q.trim()}”</span></p>
          <div className="space-y-4">
            {groups.map(group => {
              const Icon = group.icon
              return (
                <Card key={group.key}>
                  <CardHeaderless title={group.title} count={group.rows.length} icon={Icon} />
                  <CardBody className="p-0 divide-y divide-[var(--border)]">
                    {group.rows.map(row => (
                      <Link key={`${group.key}-${row.id}`} to={row.link} className="flex items-center gap-3 px-5 py-3.5 hover:surface-2 transition-colors">
                        <div className="w-8 h-8 rounded-lg surface-2 border border-app flex items-center justify-center text-indigo-500 shrink-0"><Icon size={15} /></div>
                        <Badge variant={group.badge} className="text-[10px] shrink-0">{group.key === 'users' ? 'user' : group.key === 'accounts' ? 'account' : group.key === 'domains' ? 'domain' : 'brand'}</Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{row.label}</p>
                          <p className="text-xs text-muted truncate">{row.subtitle}</p>
                        </div>
                        <span className="text-indigo-500 text-xs font-semibold shrink-0">Open →</span>
                      </Link>
                    ))}
                  </CardBody>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function CardHeaderless({ title, count, icon: Icon }) {
  return (
    <div className="flex items-center gap-2 px-5 py-3 border-b border-app">
      <Icon size={14} className="text-indigo-500" />
      <h3 className="text-xs font-semibold uppercase tracking-wider">{title}</h3>
      <span className="text-[10px] text-muted">({count})</span>
    </div>
  )
}
