import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDown, Globe2, Layers, Mail, ShieldCheck, Users, UsersRound,
} from 'lucide-react'
import {
  Avatar, Badge, Button, Card, EmptyState, PageHeader, StatCard, useToast,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

export default function TeamOverview() {
  const { user } = useAuth()
  const toast = useToast()
  const [teams, setTeams] = useState([])
  const [users, setUsers] = useState([])
  const [accounts, setAccounts] = useState([])
  const [brands, setBrands] = useState([])
  const [expanded, setExpanded] = useState(() => new Set())

  const teamMembers = (leadId) => {
    const lid = Number(leadId)
    const teamIds = teams.filter(t => Number(t.lead_id) === lid).map(t => t.id)
    return users.filter(u => {
      const cand = u.lead_id ?? u.team_lead_id ?? u.manager_id ?? u.leadId ?? u.teamLeadId
      if (cand != null && Number(cand) === lid) return true
      if (u.team_id != null && teamIds.includes(Number(u.team_id))) return true
      if (u.teamId != null && teamIds.includes(Number(u.teamId))) return true
      return false
    })
  }
  useEffect(() => {
    let alive = true
    Promise.all([api.teams(), api.users(), api.accounts(), api.brands()])
      .then(([t, u, a, b]) => { if (!alive) return; setTeams(t); setUsers(u); setAccounts(a); setBrands(b) })
      .catch(() => { if (alive) toast('Could not load team overview.', 'error', { title: 'Load failed' }) })
    return () => { alive = false }
  }, [toast])

  const isAdmin = user?.role === 'super-admin' || user?.role === 'admin'
  const visibleTeams = useMemo(() => isAdmin
    ? teams
    : teams.filter(t => t.lead_id === user?.id || t.lead_name === user?.name),
  [teams, user, isAdmin])

  useEffect(() => {
    setExpanded(new Set(visibleTeams.map(t => t.id)))
  }, [teams, user])

  const allMembers = useMemo(() => {
    const ids = new Set()
    visibleTeams.forEach(t => teamMembers(t.lead_id).forEach(m => ids.add(m.id)))
    return [...ids]
  }, [visibleTeams])

  const visibleAccounts = useMemo(() => accounts.filter(a =>
    (a.assigned || []).some(id => allMembers.includes(id))
  ), [accounts, allMembers])

  const brandCount = new Set(visibleAccounts.map(a => a.brand)).size
  const suspensionCount = allMembers.filter(id => users.find(u => u.id === id)?.status === 'suspended').length

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const markAll = (open) => setExpanded(open ? new Set(visibleTeams.map(t => t.id)) : new Set())

  return (
    <div className="animate-fade-up">
      <Breadcrumbs />
      <PageHeader
        title="Team Overview"
        subtitle={isAdmin
          ? 'All teams, their members and the mailboxes each person can access.'
          : 'Your team, your members and the mailboxes you can access.'}
        actions={isAdmin && <Link to="/teams"><Button variant="secondary"><UsersRound size={15} /> Manage teams</Button></Link>}
      />

      <div className={`flex items-center gap-3 rounded-2xl border px-4 py-3 mb-5 text-sm ${isAdmin ? 'border-indigo-500/25 bg-indigo-500/10 text-indigo-500' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-500'}`}>
        <ShieldCheck size={18} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{isAdmin ? 'Administrator view' : 'Team lead view'}</p>
          <p className="text-xs opacity-80 mt-0.5">
            {isAdmin
              ? `You can see all ${teams.length} teams and every assignment in the workspace.`
              : `You can only see teams you lead (${visibleTeams.length}). Members and mailboxes are grouped by brand.`}
          </p>
        </div>
        <Badge variant={isAdmin ? 'primary' : 'success'}>{user?.role}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 mb-5">
        <StatCard label="Teams" value={visibleTeams.length} icon={UsersRound} tone="indigo" sub="In your scope" />
        <StatCard label="Members" value={allMembers.length} icon={Users} tone="sky" sub="Across these teams" />
        <StatCard label="Assigned mailboxes" value={visibleAccounts.length} icon={Mail} tone="emerald" sub={`Across ${brandCount} brands`} />
        <StatCard label="Suspended members" value={suspensionCount} icon={ShieldCheck} tone="amber" sub="Access restricted" />
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted">{visibleTeams.length} team{visibleTeams.length === 1 ? '' : 's'} · grouped by brand</p>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => markAll(true)}>Expand all</Button>
          <Button size="sm" variant="ghost" onClick={() => markAll(false)}>Collapse all</Button>
        </div>
      </div>

      {visibleTeams.length === 0 && (
        <Card><EmptyState icon={UsersRound} title="No teams assigned to you" message="Only team leads can see an overview of their own team. Contact an administrator if this looks wrong." /></Card>
      )}

      <div className="space-y-4">
        {visibleTeams.map(team => {
          const members = teamMembers(team.lead_id)
          const memberIds = members.map(m => m.id)
          const teamAccounts = accounts.filter(a => (a.assigned || []).some(id => memberIds.includes(id)))
          const brandDomains = [...new Set(teamAccounts.map(a => a.brand))]
          const open = expanded.has(team.id)
          return (
            <Card key={team.id} className="overflow-hidden">
              <button onClick={() => toggle(team.id)} className="w-full flex items-center gap-3 p-4 text-left hover:surface-2 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0"><UsersRound size={18} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{team.name}</span>
                    <Badge variant="primary"><Globe2 size={11} /> {team.brand}</Badge>
                    <Badge variant="default" className="text-[10px]">{brandDomains.length} brand{brandDomains.length === 1 ? '' : 's'}</Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar name={team.lead_name} size="sm" />
                    <span className="text-xs text-muted">{team.lead_name}</span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <div className="flex -space-x-2">
                    {members.slice(0, 4).map(m => <span key={m.id} className="rounded-full ring-2 ring-[var(--surface)]"><Avatar name={m.name} size="sm" /></span>)}
                  </div>
                  <Badge variant="info" className="text-[10px]"><Users size={11} /> {members.length}</Badge>
                  <Badge variant="success" className="text-[10px]"><Mail size={11} /> {teamAccounts.length}</Badge>
                </div>
                <ChevronDown size={17} className={`text-muted transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="border-t border-app p-4 space-y-4 animate-fade-up">
                  {brandDomains.length === 0 && (
                    <EmptyState icon={Layers} title="No assigned mailboxes" message="Assign mailboxes to this team to see them grouped here." />
                  )}
                  {brandDomains.map(domain => {
                    const brand = brands.find(b => b.domain === domain)
                    const brandAccounts = teamAccounts.filter(a => a.brand === domain)
                    const brandMembers = members.filter(m => brandAccounts.some(a => (a.assigned || []).includes(m.id)))
                    return (
                      <div key={domain} className="surface-2 border border-app rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-app bg-indigo-500/5">
                          <Globe2 size={15} className="text-indigo-500" />
                          <span className="text-sm font-semibold">{domain}</span>
                          {brand && <Badge variant={brand.status} className="text-[10px]">{brand.status}</Badge>}
                          <Badge variant="info" className="text-[10px] ml-auto"><Mail size={11} /> {brandAccounts.length} mailboxes</Badge>
                        </div>
                        <div>
                          {brandMembers.map(m => {
                            const mine = brandAccounts.filter(a => (a.assigned || []).includes(m.id))
                            return (
                              <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-app first:border-0">
                                <Avatar name={m.name} size="sm" />
                                <div className="min-w-[140px] flex-1">
                                  <p className="text-xs font-semibold truncate">{m.name}</p>
                                  <p className="text-[10px] text-muted truncate">{m.email}</p>
                                </div>
                                <Badge role={m.role} className="text-[10px]">{m.role}</Badge>
                                <Badge variant={m.status} className="text-[10px]">{m.status}</Badge>
                                <div className="flex flex-wrap gap-1.5 w-full sm:w-auto sm:max-w-[55%] sm:justify-end">
                                  {mine.map(a => <Badge key={a.id} variant="primary" className="text-[10px]"><Mail size={10} /> {a.email}</Badge>)}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
