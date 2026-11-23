import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight, ChevronDown, Globe2, Mail, Plus, Search, UsersRound,
} from 'lucide-react'
import {
  Avatar, Badge, Button, Card, CardBody, EmptyState, Field, Input, Modal,
  PageHeader, Select, useToast,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import api from '../lib/api'

const emptyForm = { name: '', brand_id: '', lead_id: '' }

export default function Teams() {
  const toast = useToast()
  const [teams, setTeams] = useState([])
  const [brands, setBrands] = useState([])
  const [users, setUsers] = useState([])
  const [accounts, setAccounts] = useState([])
  const [expanded, setExpanded] = useState(() => new Set())
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const leadById = (id) => users.find(u => u.id === Number(id) || u.id === id)
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
    Promise.all([api.teams(), api.brands(), api.users(), api.accounts()])
      .then(([t, b, u, a]) => { if (!alive) return; setTeams(t); setBrands(b); setUsers(u); setAccounts(a) })
      .catch(() => { if (alive) toast('Could not load teams.', 'error', { title: 'Load failed' }) })
    return () => { alive = false }
  }, [toast])

  const leads = useMemo(() => users.filter(u => u.role === 'team-lead'), [users])
  const filtered = useMemo(() => teams.filter(t =>
    !query || `${t.name} ${t.brand} ${t.lead_name}`.toLowerCase().includes(query.toLowerCase())
  ), [teams, query])

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const addTeam = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.brand_id || !form.lead_id) {
      toast('Name, brand and team lead are required.', 'error', { title: 'Missing fields' })
      return
    }
    setSaving(true)
    const brand = brands.find(b => String(b.id) === form.brand_id)
    const leadId = Number(form.lead_id)
    const created = await api.createTeam({
      name: form.name.trim(), brand_id: Number(form.brand_id),
      brand: brand?.domain || '', lead_id: leadId,
      lead_name: leadById(leadId)?.name || '',
      members: teamMembers(leadId).length, accounts: brand?.accounts || 0,
    })
    setTeams(prev => [...prev, created])
    setExpanded(prev => new Set(prev).add(created.id))
    setSaving(false)
    setAddOpen(false)
    setForm(emptyForm)
    toast(`${created.name} created with ${created.members} members.`, 'success', { title: 'Team added' })
  }

  return (
    <div className="animate-fade-up">
      <Breadcrumbs />
      <PageHeader
        title="Teams"
        subtitle="Each team is tied to one brand, led by a team lead, and inherits its mailboxes."
        actions={<>
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search teams…" className="pl-9 w-56" />
          </div>
          <Link to="/team-overview"><Button variant="secondary">Team Overview <ArrowUpRight size={15} /></Button></Link>
          <Button onClick={() => setAddOpen(true)}><Plus size={16} /> Add Team</Button>
        </>}
      />

      {filtered.length === 0 && <Card><EmptyState icon={UsersRound} title="No teams found" message="Create a team or try a different search." /></Card>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map(team => {
          const members = teamMembers(team.lead_id)
          const open = expanded.has(team.id)
          const teamAccounts = accounts.filter(a =>
            (a.assigned || []).some(id => members.some(m => m.id === id))
          )
          return (
            <Card key={team.id} className="overflow-hidden card-hover">
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
                    <UsersRound size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{team.name}</p>
                      <Badge variant="primary"><Globe2 size={11} /> {team.brand}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Avatar name={team.lead_name} size="sm" />
                      <span className="text-xs text-muted">Led by <span className="font-semibold text-[var(--text)]">{team.lead_name}</span></span>
                      <Badge role="team-lead" className="text-[10px]">lead</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="surface-2 border border-app rounded-xl p-3">
                    <p className="text-[11px] text-muted">Members</p>
                    <p className="text-xl font-bold mt-0.5">{members.length}</p>
                  </div>
                  <div className="surface-2 border border-app rounded-xl p-3">
                    <p className="text-[11px] text-muted">Mailboxes</p>
                    <p className="text-xl font-bold mt-0.5">{teamAccounts.length || team.accounts}</p>
                  </div>
                </div>

                <button onClick={() => toggle(team.id)} className="w-full flex items-center justify-between mt-4 pt-3 border-t border-app text-xs font-semibold text-indigo-500 hover:text-indigo-400">
                  <span className="flex items-center gap-2">
                    <span className="flex -space-x-2">
                      {members.slice(0, 4).map(m => (
                        <span key={m.id} className="rounded-full ring-2 ring-[var(--surface)]"><Avatar name={m.name} size="sm" /></span>
                      ))}
                    </span>
                    {open ? 'Hide members' : 'Show members'}
                  </span>
                  <ChevronDown size={15} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div className="mt-3 space-y-1.5 animate-fade-up">
                    {members.map(m => {
                      const assigned = accounts.filter(a => (a.assigned || []).includes(m.id) && teamAccounts.some(t => t.id === a.id))
                      return (
                        <div key={m.id} className="flex items-center gap-2.5 rounded-lg surface-2 border border-app px-2.5 py-2">
                          <Avatar name={m.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">{m.name}</p>
                            <p className="text-[10px] text-muted truncate">{m.email}</p>
                          </div>
                          <Badge role={m.role} className="text-[10px]">{m.role}</Badge>
                          <Badge variant={m.status} className="text-[10px]">{m.status}</Badge>
                          <span className="text-[10px] text-muted flex items-center gap-1 whitespace-nowrap" title={assigned.map(a => a.email).join(', ')}><Mail size={11} /> {assigned.length}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-5 py-3 surface-2 border-t border-app">
                <Badge variant={team.accounts > 0 ? 'success' : 'default'} dot>{team.accounts > 0 ? 'Active' : 'No accounts'}</Badge>
                <Link to="/team-overview" className="text-xs font-semibold text-indigo-500 hover:underline">Team Overview →</Link>
              </div>
            </Card>
          )
        })}
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add team"
        footer={<>
          <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button onClick={addTeam} loading={saving}><Plus size={15} /> Create team</Button>
        </>}
      >
        <form onSubmit={addTeam} className="space-y-4">
          <Field label="Team name" required>
            <Input value={form.name} onChange={set('name')} placeholder="e.g. XUZ Team" />
          </Field>
          <Field label="Brand" required hint="The team inherits every mailbox on this domain.">
            <Select value={form.brand_id} onChange={set('brand_id')}>
              <option value="">Select a brand…</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.domain} · {b.name}</option>)}
            </Select>
          </Field>
          <Field label="Team lead" required>
            <Select value={form.lead_id} onChange={set('lead_id')}>
              <option value="">Select a team lead…</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.name} · {l.email}</option>)}
            </Select>
          </Field>
        </form>
      </Modal>
    </div>
  )
}
