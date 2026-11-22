import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronRight, GitBranch, Globe2,
  Inbox, Layers, Loader2, Mail, Plus, Search, ShieldCheck, Sparkles, UsersRound, X,
} from 'lucide-react'
import {
  Avatar, Badge, Button, Card, CardBody, CardHeader, CodeBlock, EmptyState, Field,
  Input, Modal, PageHeader, Select, Table, Tabs, Td, Th, Tr, useToast,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import api from '../lib/api'
import { accountsForBrand, leadById, teamMembers } from '../data/mock'

const emptyForm = { domain: '', name: '', lead_id: '', status: 'active' }

function PermBadge({ ok, label }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${ok ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500' : 'border-red-500/20 bg-red-500/10 text-red-500'}`}>
      {ok ? <Check size={10} /> : <X size={10} />} {label}
    </span>
  )
}

export default function Brands() {
  const toast = useToast()
  const [brands, setBrands] = useState([])
  const [teams, setTeams] = useState([])
  const [users, setUsers] = useState([])
  const [accounts, setAccounts] = useState([])
  const [tab, setTab] = useState('matrix')
  const [expanded, setExpanded] = useState(() => new Set([1]))
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [previewAccountId, setPreviewAccountId] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([api.brands(), api.teams(), api.users(), api.accounts()])
      .then(([b, t, u, a]) => { if (!alive) return; setBrands(b); setTeams(t); setUsers(u); setAccounts(a) })
      .catch(() => { if (alive) toast('Could not load the access matrix.', 'error', { title: 'Load failed' }) })
    return () => { alive = false }
  }, [toast])

  const leads = useMemo(() => users.filter(u => u.role === 'team-lead'), [users])
  const filtered = useMemo(() => brands.filter(b =>
    !query || `${b.domain} ${b.name} ${b.lead_name}`.toLowerCase().includes(query.toLowerCase())
  ), [brands, query])

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const addBrand = async (e) => {
    e.preventDefault()
    if (!form.domain.trim() || !form.name.trim() || !form.lead_id) {
      toast('Domain, name and a team lead are required.', 'error', { title: 'Missing fields' })
      return
    }
    setSaving(true)
    const leadId = Number(form.lead_id)
    const lead = leadById(leadId)
    const created = await api.createBrand({
      domain: form.domain.trim(), name: form.name.trim(), lead_id: leadId,
      lead_name: lead?.name || '', status: form.status,
      team_id: teams.find(t => t.lead_id === leadId)?.id ?? null,
      accounts: 0, users: teamMembers(leadId).length,
    })
    setBrands(prev => [...prev, created])
    setExpanded(prev => new Set(prev).add(created.id))
    setSaving(false)
    setAddOpen(false)
    setForm(emptyForm)
    setTab('brands')
    toast(`${created.domain} is now part of the access matrix.`, 'success', { title: 'Brand added' })
  }

  const showMatrix = (id) => {
    setExpanded(prev => new Set(prev).add(id))
    setTab('matrix')
  }

  const runPreview = async (account) => {
    if (!account) { setPreview(null); return }
    setPreviewLoading(true)
    const res = await api.autoAssignPreview(account)
    setPreview(res)
    setPreviewLoading(false)
  }

  useEffect(() => {
    if (accounts.length && !previewAccountId) {
      setPreviewAccountId(String(accounts[0].id))
      runPreview(accounts[0])
    }
  }, [accounts])

  const teamFor = (brand) => teams.find(t => t.id === brand.team_id || t.lead_id === brand.lead_id)
  const firstAccountId = (brand) => accounts.find(a => a.brand === brand.domain)?.id
  const canSend = (brand, account) => brand.status === 'active' && account.status === 'active'
  const canReceive = (brand, account) => brand.status === 'active' && account.sync_enabled

  return (
    <div className="animate-fade-up">
      <Breadcrumbs />
      <PageHeader
        title="Brands & Access Matrix"
        subtitle="One view of who can see what: domain → team lead → team → mailboxes."
        actions={<>
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter matrix…" className="pl-9 w-56" />
          </div>
          <Button onClick={() => setAddOpen(true)}><Plus size={16} /> Add Brand</Button>
        </>}
      />

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'matrix', label: 'Matrix', count: brands.length },
          { key: 'brands', label: 'Brands', count: brands.length },
          { key: 'rules', label: 'Auto-assign Rules' },
        ]}
      />

      {tab === 'matrix' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 surface-2 border border-app rounded-xl px-4 py-2.5 text-[11px] text-muted">
            <span className="flex items-center gap-1.5"><GitBranch size={13} className="text-indigo-500" /> Access flows left to right</span>
            <span className="flex items-center gap-1.5"><PermBadge ok label="can_send" /> <PermBadge ok label="can_receive" /></span>
            <span className="flex items-center gap-1.5"><Badge variant="primary">Lead</Badge> inherits all mailboxes</span>
          </div>

          {filtered.length === 0 && <Card><EmptyState icon={Search} title="No brands found" message="Try a different domain, name or team lead." /></Card>}

          {filtered.map(brand => {
            const members = teamMembers(brand.lead_id)
            const accs = accountsForBrand(brand.domain)
            const open = expanded.has(brand.id)
            return (
              <Card key={brand.id} className="overflow-hidden">
                <button onClick={() => toggle(brand.id)} className="w-full flex items-center gap-3 p-4 text-left hover:surface-2 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-500 shrink-0">
                    <Globe2 size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{brand.domain}</span>
                      <Badge variant="info">Lead: {brand.lead_name}</Badge>
                      <Badge variant={brand.status} dot>{brand.status}</Badge>
                    </div>
                    <p className="text-xs text-muted mt-0.5 truncate">{brand.name}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-2 shrink-0">
                    <ArrowRight size={15} className="text-muted" />
                    <div className="flex -space-x-2">
                      {members.slice(0, 4).map(m => (
                        <span key={m.id} className="rounded-full ring-2 ring-[var(--surface)]"><Avatar name={m.name} size="sm" /></span>
                      ))}
                    </div>
                    <span className="text-[11px] text-muted whitespace-nowrap">{members.length} members</span>
                  </div>
                  <div className="hidden lg:flex items-center gap-2 shrink-0 max-w-[260px]">
                    <ArrowRight size={15} className="text-muted" />
                    <div className="flex flex-wrap gap-1 max-w-[210px]">
                      {accs.slice(0, 3).map(a => (
                        <span key={a.id} className="text-[10px] surface-2 border border-app rounded-md px-1.5 py-0.5 truncate max-w-[120px]">{a.email}</span>
                      ))}
                      {accs.length > 3 && <span className="text-[10px] text-muted">+{accs.length - 3}</span>}
                    </div>
                  </div>
                  <ChevronDown size={17} className={`text-muted transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div className="border-t border-app p-4 grid gap-4 lg:grid-cols-2">
                    <div className="surface-2 border border-app rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Access path</p>
                        <Badge variant="primary"><ShieldCheck size={11} /> Auto-inherited</Badge>
                      </div>
                      <div className="flex items-center gap-3 pb-3 border-b border-app">
                        <Avatar name={brand.lead_name} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">{brand.lead_name}</p>
                          <p className="text-[11px] text-muted truncate">{leadById(brand.lead_id)?.email}</p>
                        </div>
                        <Badge role="team-lead">team-lead</Badge>
                      </div>
                      <div className="flex items-center gap-2 py-2 text-[11px] text-indigo-500 font-semibold">
                        <ArrowRight size={13} className="rotate-90" /> whole team inherits every mailbox
                      </div>
                      <div className="space-y-1.5">
                        {members.map(m => (
                          <div key={m.id} className="flex items-center gap-2.5 rounded-lg hover:surface-2 px-1.5 py-1.5">
                            <Avatar name={m.name} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium truncate">{m.name}</p>
                              <p className="text-[10px] text-muted truncate">{m.email}</p>
                            </div>
                            <Badge role={m.role} className="text-[10px]">{m.role}</Badge>
                            <Badge variant={m.status} className="text-[10px]">{m.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="surface-2 border border-app rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Assigned mailboxes</p>
                        <Badge variant="info"><Mail size={11} /> {accs.length}</Badge>
                      </div>
                      {accs.length === 0 ? (
                        <EmptyState icon={Inbox} title="No mailboxes yet" message="Add an email account on this domain to populate the matrix." />
                      ) : (
                        <div className="space-y-2">
                          {accs.map(a => {
                            const names = (a.assigned || []).map(id => leadById(id)?.name).filter(Boolean)
                            return (
                              <div key={a.id} className="rounded-lg surface border border-app p-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0"><Mail size={14} /></div>
                                  <span className="text-xs font-semibold truncate flex-1">{a.email}</span>
                                  <Badge variant={a.status} className="text-[10px]">{a.status}</Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                  <PermBadge ok={canSend(brand, a)} label="can_send" />
                                  <PermBadge ok={canReceive(brand, a)} label="can_receive" />
                                  <span className="text-[10px] text-muted ml-auto truncate max-w-[150px]" title={names.join(', ')}>{names.length} assigned · {names.slice(0, 2).join(', ')}{names.length > 2 ? '…' : ''}</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                    <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
                      <span className="flex items-center gap-1.5"><Sparkles size={12} className="text-indigo-500" /> Rule: {brand.domain} → {brand.lead_name} → {brand.lead_name.split(' ')[0]}’s whole team gets all {brand.domain} mailboxes automatically.</span>
                      {firstAccountId(brand) && <Link to={`/webmail/${firstAccountId(brand)}`} className="font-semibold text-indigo-500 hover:underline">Open Webmail →</Link>}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'brands' && (
        <Card className="overflow-hidden">
          <CardHeader title="All brands" subtitle="Domain ownership and assignment summary." />
          <CardBody className="p-0">
            <Table>
              <thead>
                <tr>
                  <Th>Domain</Th><Th>Lead</Th><Th>Team</Th><Th>Accounts</Th><Th>Users</Th><Th>Status</Th><Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(brand => (
                  <Tr key={brand.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0"><Globe2 size={15} /></div>
                        <div><p className="font-semibold">{brand.domain}</p><p className="text-[11px] text-muted">{brand.name}</p></div>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2"><Avatar name={brand.lead_name} size="sm" /><span className="text-xs font-medium">{brand.lead_name}</span></div>
                    </Td>
                    <Td><Badge variant="default"><UsersRound size={11} /> {teamFor(brand)?.name || '—'}</Badge></Td>
                    <Td className="font-medium">{brand.accounts}</Td>
                    <Td className="font-medium">{brand.users}</Td>
                    <Td><Badge variant={brand.status} dot>{brand.status}</Badge></Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => showMatrix(brand.id)}>Matrix <ChevronRight size={13} /></Button>
                        {firstAccountId(brand) && <Link to={`/webmail/${firstAccountId(brand)}`} title="Open Webmail"><Button size="icon" variant="secondary"><ArrowUpRight size={14} /></Button></Link>}
                      </div>
                    </Td>
                  </Tr>
                ))}
                {filtered.length === 0 && <EmptyState icon={Search} title="No brands found" colspan={7} />}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      {tab === 'rules' && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardBody>
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3"><Globe2 size={18} /></div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Step 1 · Domain</p>
              <p className="text-sm font-semibold mt-1">A brand domain is registered</p>
              <p className="text-xs text-muted mt-1.5">Add a domain such as xuz.com and pick the team lead who owns it.</p>
            </CardBody></Card>
            <Card><CardBody>
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3"><ShieldCheck size={18} /></div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Step 2 · Lead</p>
              <p className="text-sm font-semibold mt-1">The lead is linked to the domain</p>
              <p className="text-xs text-muted mt-1.5">Ali becomes the owner of every mailbox created on that domain.</p>
            </CardBody></Card>
            <Card><CardBody>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3"><UsersRound size={18} /></div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Step 3 · Whole team</p>
              <p className="text-sm font-semibold mt-1">Access is inherited automatically</p>
              <p className="text-xs text-muted mt-1.5">No manual assignments — the entire team receives every mailbox on the domain.</p>
            </CardBody></Card>
          </div>

          <Card>
            <CardHeader title="The rule" subtitle="This is the exact access rule the system applies." actions={<Badge variant="primary"><GitBranch size={11} /> Active</Badge>} />
            <CardBody>
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                <CodeBlock>xuz.com → Ali → Ali&apos;s whole team gets all xuz.com mailboxes automatically</CodeBlock>
              </div>
              <div className="mt-4 space-y-2">
                {brands.map(b => (
                  <div key={b.id} className="flex flex-wrap items-center gap-2 text-xs surface-2 border border-app rounded-lg px-3 py-2">
                    <Badge variant="primary">{b.domain}</Badge><ArrowRight size={13} className="text-muted" />
                    <Avatar name={b.lead_name} size="sm" /><span className="font-medium">{b.lead_name}</span><ArrowRight size={13} className="text-muted" />
                    <span className="text-muted">{teamMembers(b.lead_id).length} team members inherit {accountsForBrand(b.domain).length} mailboxes</span>
                    <Badge variant={b.status} className="ml-auto">{b.status}</Badge>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Live preview" subtitle="Simulate the rule against any configured mailbox." actions={<Badge variant="success" dot="live">Preview</Badge>} />
            <CardBody className="space-y-4">
              <Field label="Email account" required hint="Changing the selection re-runs the auto-assign preview.">
                <Select value={previewAccountId} onChange={e => {
                  const id = e.target.value
                  setPreviewAccountId(id)
                  runPreview(accounts.find(a => String(a.id) === id))
                }}>
                  <option value="">Choose a mailbox…</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.email}</option>)}
                </Select>
              </Field>

              {previewLoading && <div className="flex items-center gap-2 text-sm text-muted py-6 justify-center"><Loader2 size={16} className="animate-spin text-indigo-500" /> Simulating auto-assign…</div>}
              {!previewLoading && !preview && <EmptyState icon={Layers} title="No account selected" message="Pick a mailbox above to see who would receive access." />}
              {!previewLoading && preview && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="surface-2 border border-app rounded-xl p-4">
                    <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Domain</p>
                    <div className="flex items-center gap-2 mt-2"><Globe2 size={16} className="text-indigo-500" /><span className="text-sm font-semibold">{preview.brand || '—'}</span></div>
                    <p className="text-[11px] text-muted mt-2">Every new mailbox on this domain follows the rule.</p>
                  </div>
                  <div className="surface-2 border border-app rounded-xl p-4">
                    <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Lead</p>
                    {preview.lead ? (
                      <div className="flex items-center gap-2.5 mt-2"><Avatar name={preview.lead.name} /><div className="min-w-0"><p className="text-sm font-semibold truncate">{preview.lead.name}</p><p className="text-[11px] text-muted truncate">{preview.lead.email}</p></div></div>
                    ) : <p className="text-sm text-muted mt-2">No lead configured</p>}
                  </div>
                  <div className="surface-2 border border-app rounded-xl p-4">
                    <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Assigned users</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(preview.assigned || []).map(id => <Badge key={id} variant="success" className="text-[10px]">{leadById(id)?.name || `#${id}`}</Badge>)}
                      {!(preview.assigned || []).length && <span className="text-xs text-muted">None</span>}
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <p className="text-[11px] uppercase tracking-wider text-muted font-semibold mb-2">Team members who get access ({preview.members?.length || 0})</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {(preview.members || []).map(m => (
                        <div key={m.id} className="flex items-center gap-2.5 rounded-xl surface border border-app p-2.5">
                          <Avatar name={m.name} size="sm" />
                          <div className="min-w-0 flex-1"><p className="text-xs font-semibold truncate">{m.name}</p><p className="text-[10px] text-muted truncate">{m.email}</p></div>
                          <Badge role={m.role} className="text-[10px]">{m.role}</Badge>
                        </div>
                      ))}
                      {!(preview.members || []).length && <EmptyState icon={UsersRound} title="No team members" message="Assign users to this lead to populate the team." />}
                    </div>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add brand"
        footer={<>
          <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button onClick={addBrand} loading={saving}><Plus size={15} /> Add brand</Button>
        </>}
      >
        <form onSubmit={addBrand} className="space-y-4">
          <Field label="Domain" required hint="e.g. xuz.com — mailboxes on this domain follow the auto-assign rule.">
            <Input value={form.domain} onChange={set('domain')} placeholder="newbrand.com" />
          </Field>
          <Field label="Brand name" required>
            <Input value={form.name} onChange={set('name')} placeholder="New Brand Publishing" />
          </Field>
          <Field label="Team lead" required hint="Only users with the team-lead role can own a brand.">
            <Select value={form.lead_id} onChange={set('lead_id')}>
              <option value="">Select a team lead…</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.name} · {l.email}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={set('status')}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </Select>
          </Field>
        </form>
      </Modal>
    </div>
  )
}
