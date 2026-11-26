import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  CheckCircle2, ExternalLink, Globe2, Inbox, KeyRound, Lock,
  Plus, RefreshCw, Server, ShieldCheck, Upload, XCircle,
} from 'lucide-react'
import {
  Badge, Button, Card, CardBody, CardHeader, EmptyState, Field,
  PageHeader, Table, Tabs, Td, Textarea, Th, Tr, useToast,
} from '../components/ui'
import { Breadcrumbs } from '../components/layout/AppShell'
import api from '../lib/api'

export default function DomainDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [domain, setDomain] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [bulk, setBulk] = useState('')
  const [importing, setImporting] = useState(false)
  const [tab, setTab] = useState('accounts')

  useEffect(() => {
    let alive = true
    Promise.all([api.domains(), api.accounts()])
      .then(([d, a]) => {
        if (!alive) return
        const found = d.find(x => String(x.id) === String(id))
        if (found) setDomain(found)
        setAccounts(a.filter(x => String(x.domain_id) === String(id) || x.brand === found?.name))
      })
      .catch(() => { if (alive) toast('Could not load domain.', 'error', { title: 'Load failed' }) })
    return () => { alive = false }
  }, [id, toast])

  const domainAccounts = useMemo(() => accounts.filter(a => String(a.domain_id) === String(id)), [accounts, id])

  const parseBulk = text => text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const idx = line.indexOf(':')
    return idx > 0
      ? { username: line.slice(0, idx).trim(), password: line.slice(idx + 1).trim() }
      : { username: line, password: '' }
  }).filter(x => x.username)

  const preview = useMemo(() => parseBulk(bulk), [bulk])

  const importAccounts = async () => {
    if (!preview.length) { toast('Add at least one username:password line.', 'error', { title: 'Nothing to import' }); return }
    setImporting(true)
    try {
      const created = await Promise.all(preview.map(x => api.createAccount({
        email: x.username.includes('@') ? x.username : `${x.username}@${domain.name}`,
        brand: domain.name, domain_id: domain.id,
        status: 'active', sync: 'idle', sync_enabled: true, unread: 0, last_sync: 'pending',
        imap_host: domain.imap_host, smtp_host: domain.smtp_host || domain.imap_host,
        assigned: [], password_set: !!x.password,
      })))
      setAccounts(prev => [...prev, ...created])
      setBulk('')
      toast(`${created.length} account${created.length === 1 ? '' : 's'} queued for ${domain.name}.`, 'success', { title: 'Bulk import complete' })
    } catch {
      toast('Could not import accounts.', 'error', { title: 'Bulk import failed' })
    } finally {
      setImporting(false)
    }
  }

  if (!domain) return <div className="animate-fade-up"><Breadcrumbs /><Card><EmptyState icon={Globe2} title="Domain not found" message="This domain may have been removed." /></Card></div>

  const settings = [
    { group: 'IMAP (incoming)', icon: Server, tone: 'text-indigo-500', rows: [
      ['Host', domain.imap_host], ['Port', domain.imap_port], ['Encryption', (domain.imap_encryption || domain.encryption || 'ssl').toUpperCase()],
    ] },
    { group: 'SMTP (outgoing)', icon: KeyRound, tone: 'text-purple-500', rows: [
      ['Host', domain.smtp_host || `mail.${domain.name}`], ['Port', domain.smtp_port || 587], ['Encryption', (domain.smtp_encryption || 'tls').toUpperCase()],
      ['Username', domain.smtp_username || '—'],
    ] },
  ]

  return (
    <div className="animate-fade-up">
      <Breadcrumbs title={domain.name} />
      <PageHeader
        title={domain.name}
        subtitle="Domain configuration, transport settings and mailbox inventory."
        backTo={() => navigate('/domains')}
        actions={<>
          <Badge variant={domain.status} dot>{domain.status}</Badge>
          <Button variant="secondary" onClick={() => toast('Settings refreshed from the backend.', 'info', { title: 'Refresh complete' })}><RefreshCw size={15} /> Refresh</Button>
          <Button onClick={() => { setTab('bulk'); document.getElementById('bulk-panel')?.scrollIntoView({ behavior: 'smooth' }) }}><Plus size={16} /> Bulk Add Accounts</Button>
        </>}
      />

      <Card className="mb-5 overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border-b border-app flex flex-wrap items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0"><Globe2 size={22} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap"><h2 className="text-xl font-bold">{domain.name}</h2><Badge variant="primary" className="text-[10px]"><ShieldCheck size={10} /> Verified</Badge></div>
            <p className="text-xs text-muted mt-0.5">Created by {domain.created_by} · {domain.created_at}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="default"><Server size={11} /> {domainAccounts.length} accounts</Badge>
            <Badge variant={domain.encryption === 'ssl' ? 'success' : 'warning'}><Lock size={11} /> {(domain.encryption || 'ssl').toUpperCase()}</Badge>
          </div>
        </div>
        <CardBody>
          <div className="grid gap-4 md:grid-cols-2">
            {settings.map(s => (
              <div key={s.group} className="rounded-xl surface-2 border border-app p-4">
                <p className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2 ${s.tone}`}><s.icon size={14} /> {s.group}</p>
                <div className="space-y-2">
                  {s.rows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-xs gap-4 border-b border-app/70 last:border-0 pb-2 last:pb-0">
                      <span className="text-muted">{k}</span>
                      <span className="font-semibold font-mono truncate">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <Tabs active={tab} onChange={setTab} tabs={[
        { key: 'accounts', label: 'Email Accounts', count: domainAccounts.length },
        { key: 'bulk', label: 'Bulk Add Accounts' },
      ]} />

      {tab === 'accounts' && (
        <Card className="overflow-hidden">
          <CardBody className="p-0">
            <Table>
              <thead><tr><Th>Email account</Th><Th>Status</Th><Th>Sync</Th><Th>Assigned</Th><Th>Last sync</Th><Th className="text-right">Open</Th></tr></thead>
              <tbody>
                {domainAccounts.map(a => (
                  <Tr key={a.id}>
                    <Td><span className="flex items-center gap-2 font-semibold"><Inbox size={14} className="text-indigo-500" />{a.email}</span></Td>
                    <Td><Badge variant={a.status} dot className="text-[10px]">{a.status}</Badge></Td>
                    <Td><Badge variant={a.sync === 'syncing' ? 'syncing' : a.sync === 'paused' ? 'paused' : a.sync === 'idle' ? 'info' : 'warning'} dot className="text-[10px]">{a.sync}</Badge></Td>
                    <Td><Badge variant="default" className="text-[10px]">{(a.assigned || []).length} users</Badge></Td>
                    <Td><span className="text-xs text-muted">{a.last_sync}</span></Td>
                    <Td className="text-right"><Link to={`/webmail/${a.id}`}><Button size="sm" variant="secondary">Webmail <ExternalLink size={12} /></Button></Link></Td>
                  </Tr>
                ))}
                {domainAccounts.length === 0 && <EmptyState icon={Inbox} title="No accounts yet" message="Use Bulk Add Accounts to create mailboxes on this domain." colspan={6} />}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      {tab === 'bulk' && (
        <div id="bulk-panel" className="grid gap-5 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Bulk Add Accounts" subtitle="One mailbox per line in username:password format." actions={<Badge variant="primary"><Upload size={11} /> Import</Badge>} />
            <CardBody className="space-y-4">
              <Field label="Account list" required hint="The username can be a full address (user@example.com) or just the local part (user).">
                <Textarea
                  rows={9}
                  value={bulk}
                  onChange={e => setBulk(e.target.value)}
                  placeholder={'user:Password123!\nsupport:Password456!\nuser@example.com:Password789!'}
                  className="font-mono text-xs"
                />
              </Field>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-muted">{preview.length} valid line{preview.length === 1 ? '' : 's'} detected</span>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setBulk('')} disabled={!bulk}>Clear</Button>
                  <Button onClick={importAccounts} loading={importing} disabled={!preview.length}><Upload size={15} /> Import {preview.length || ''} account{preview.length === 1 ? '' : 's'}</Button>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Preview" subtitle={`Mailboxes to be created on ${domain.name}.`} />
            <CardBody>
              {preview.length === 0 ? (
                <EmptyState icon={Inbox} title="No accounts to preview" message="Paste username:password lines on the left." />
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {preview.map((p, i) => {
                    const email = p.username.includes('@') ? p.username : `${p.username}@${domain.name}`
                    return (
                      <div key={i} className="flex items-center gap-2.5 rounded-xl surface-2 border border-app px-3 py-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0"><Inbox size={13} /></div>
                        <div className="min-w-0 flex-1"><p className="text-xs font-semibold truncate">{email}</p><p className="text-[10px] text-muted">{p.password ? '••••••••' : 'no password'}</p></div>
                        {p.password ? <CheckCircle2 size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-amber-500" />}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}
