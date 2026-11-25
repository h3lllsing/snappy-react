import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bell, ChevronDown, Globe2, Mail, Maximize2, Minimize2, Server, Users, X } from 'lucide-react'
import { useToast } from '../components/ui'
import { useLive } from '../context/LiveContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

export default function Webmail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { mails, unread, pulse } = useLive()
  const [accounts, setAccounts] = useState([])
  const [activeId, setActiveId] = useState(() => Number(id) || 1)
  const [readIds, setReadIds] = useState([])
  const [accessData, setAccessData] = useState({ scope: 'assigned', domains: [] })
  const [unavailable, setUnavailable] = useState(false)
  const [ssoError, setSsoError] = useState(null)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    if (!fullscreen) return
    const onKey = e => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])
  const frameRef = useRef(null)
  const formRef = useRef(null)
  const ssoDone = useRef(null)
  const selectionSeq = useRef(0)

  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage(
      { source: 'portal', type: 'refresh', pulse },
      window.location.origin,
    )
  }, [pulse])

  useEffect(() => { if (id) setActiveId(Number(id) || 1) }, [id])

  useEffect(() => {
    let alive = true
    api.accounts()
      .then(a => { if (alive) setAccounts(a) })
      .catch(() => { if (alive) toast('Could not load the mailbox.', 'error', { title: 'Webmail' }) })
    return () => { alive = false }
  }, [toast])

  useEffect(() => {
    api.domainAccess()
      .then(d => { if (d) setAccessData(d) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onMessage = e => {
      if (e.origin !== window.location.origin) return
      const d = e.data
      if (!d || d.source !== 'snappymail') return
      if (d.type === 'open') {
        setReadIds(prev => (prev.includes(d.id) ? prev : [...prev, d.id]))
        toast('Opened in SnappyMail', 'success', { title: d.subject || 'Message opened' })
      }
      if (d.type === 'label') {
        toast(d.active ? `Label "${d.label}" applied.` : `Label "${d.label}" removed.`, 'success', { title: 'SnappyMail label' })
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [toast])

  const account = useMemo(
    () => accounts.find(a => a.id === activeId) || null,
    [accounts, activeId],
  )

  useEffect(() => {
    if (accounts.length === 0) {
      setUnavailable(false)
      return
    }
    const exists = accounts.some(a => a.id === activeId)
    if (!exists) {
      setUnavailable(true)
      const first = accounts[0]
      if (first) {
        setActiveId(first.id)
        navigate(`/webmail/${first.id}`, { replace: true })
      }
    } else {
      setUnavailable(false)
    }
  }, [accounts, activeId, navigate])

  const accountMails = useMemo(
    () => (account ? mails.filter(m => m.account === account.email) : []),
    [mails, account],
  )

  const unreadFor = useCallback(acc =>
    Math.max(0, (acc.unread || 0) - mails.filter(m =>
      m.account === acc.email && m.unread && readIds.includes(m.id),
    ).length), [mails, readIds])

  const grouped = useMemo(() => {
    const map = new Map()
    accounts.forEach(a => {
      const key = a.brand || 'Other'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(a)
    })
    return Array.from(map.entries())
  }, [accounts])

  // Portal -> SnappyMail secure SSO: request a single-use token from Laravel,
  // then POST it to the bridge which redirects the iframe into an authenticated session.
  const startSso = async (a, seq = selectionSeq.current) => {
    if (!a) return
    if (ssoDone.current === a.id) return
    setSsoError(null)
    try {
      const res = await api.webmailToken(a.id)
      if (seq !== selectionSeq.current) return
      const form = formRef.current
      if (!form || !res?.token) throw new Error('No SSO token')
      try {
        await fetch('/webmail/portal-sso.php?logout=1', { method: 'POST' })
      } catch (e) {
        // ignore failure
      }
      if (seq !== selectionSeq.current) return
      form.elements.t.value = res.token
      form.submit()
      ssoDone.current = a.id
      setSsoError(null)
    } catch (err) {
      if (seq === selectionSeq.current) {
        ssoDone.current = null
        setSsoError(err?.message || 'Could not start webmail session.')
      }
      toast(err?.message || 'Could not start webmail session.', 'error', { title: 'SnappyMail SSO' })
    }
  }

  const selectAccount = a => {
    selectionSeq.current += 1
    const seq = selectionSeq.current
    setActiveId(a.id)
    navigate(`/webmail/${a.id}`, { replace: true })
    startSso(a, seq)
  }

  useEffect(() => {
    if (account && !unavailable && ssoDone.current !== account.id) startSso(account, selectionSeq.current)
  }, [account, unavailable])

  // Real SnappyMail 2.38.2 is mounted at /webmail/ (served by nginx + PHP-FPM).

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link to="/dashboard" className="text-muted hover:text-indigo-500"><ArrowLeft size={15} /></Link>
            <h1 className="text-xl font-bold tracking-tight">Webmail</h1>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-dot" /> Live — auto refresh
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-500">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse-dot" /> live · {pulse} new events
            </span>
          </div>
          <p className="text-xs text-muted mt-1 truncate">
            {account ? <><Mail size={12} className="inline mr-1" />{account.email} <span className="mx-1.5">·</span></> : 'Loading accounts…'}
            {account && <span className="text-muted">{account.brand} · IMAP {account.imap_host}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFullscreen(f => !f)}
            className="p-2 rounded-xl surface-2 border border-app hover:border-indigo-400 text-muted"
            title={fullscreen ? 'Exit full screen' : 'Full screen webmail (best for composing)'}
          >
            {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
          <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-xl surface-2 border border-app hover:border-indigo-400 text-muted" title={`${unread} unread alerts`}>
            <Bell size={17} />
            {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>}
          </button>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl surface-2 border border-app text-xs font-semibold text-muted hover:border-indigo-400 hover:text-[var(--text)]">
            <X size={14} /> Close
          </Link>
        </div>
      </div>

      {unavailable && (
        <div className="surface border border-app rounded-2xl mb-3 px-4 py-3 text-sm text-muted">
          Account unavailable
        </div>
      )}

      {!unavailable && (
      <>
      <div className="surface border border-app rounded-2xl mb-3 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Mail size={15} className="text-indigo-500 shrink-0" />
          <select
            aria-label="Switch email account"
            value={account?.id ?? ''}
            onChange={e => {
              const acc = accounts.find(a => String(a.id) === e.target.value)
              if (acc) selectAccount(acc)
            }}
            className="w-full sm:max-w-md rounded-xl border border-app surface-2 px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {grouped.map(([brand, items]) => (
              <optgroup key={brand} label={brand}>
                {items.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.email}{unreadFor(a) ? ` (${unreadFor(a)} unread)` : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown size={14} className="text-muted shrink-0 -ml-6 pointer-events-none" />
        </div>
        <span className="text-[11px] text-muted whitespace-nowrap">
          {accounts.length} mailbox{accounts.length === 1 ? '' : 'es'} · {accessData.domains.length} domain{accessData.domains.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="surface border border-app rounded-2xl mb-3 px-3 py-2.5">
        <div className="flex gap-5 overflow-x-auto pb-1">
          {grouped.map(([brand, items]) => (
            <div key={brand} className="shrink-0">
              <p className="text-[9px] uppercase tracking-widest text-muted font-semibold mb-1.5 px-1">{brand}</p>
              <div className="flex gap-1.5">
                {items.map(a => {
                  const active = account && a.id === account.id
                  const unread = unreadFor(a)
                  return (
                    <button key={a.id} onClick={() => selectAccount(a)}
                      className={`relative inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all ${active ? 'border-indigo-500/70 bg-indigo-500/10 text-indigo-500 shadow-lg shadow-indigo-500/10' : 'border-app surface-2 text-muted hover:border-indigo-400 hover:text-[var(--text)]'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {a.email}
                      {unread > 0 && <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">{unread}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {grouped.length === 0 && <p className="text-xs text-muted py-2">No accounts available.</p>}
        </div>
      </div>
      </>
      )}

      <details className="surface border border-app rounded-2xl mb-3 px-3 py-2.5 group">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Globe2 size={15} className="text-indigo-500" /> Domains &amp; assigned users
          </span>
          <span className="text-[11px] text-muted flex items-center gap-2">
            {accessData.scope === 'all' && <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-semibold">Super admin: full access</span>}
            {accessData.domains.length} domain{accessData.domains.length === 1 ? '' : 's'}
            <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
          </span>
        </summary>
        <div className="mt-3 overflow-x-auto">
          {accessData.domains.length === 0 ? (
            <p className="text-xs text-muted py-2">No domains visible for your role.</p>
          ) : (
            <table className="w-full text-xs min-w-[620px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted border-b border-app">
                  <th className="py-2 pr-3">Domain</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Mailboxes</th>
                  <th className="py-2 pr-3">Lead</th>
                  <th className="py-2">Assigned users</th>
                </tr>
              </thead>
              <tbody>
                {accessData.domains.map(d => (
                  <tr key={d.id} className="border-b border-app/60 last:border-0">
                    <td className="py-2 pr-3 font-semibold">{d.name}</td>
                    <td className="py-2 pr-3"><span className={`px-2 py-0.5 rounded-full ${d.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{d.status}</span></td>
                    <td className="py-2 pr-3">{d.accounts}</td>
                    <td className="py-2 pr-3">{d.lead?.name || '—'}</td>
                    <td className="py-2">
                      {d.users.length === 0 ? <span className="text-muted">none</span> : (
                        <div className="flex flex-wrap gap-1.5">
                          {d.users.map(u => (
                            <span key={u.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full surface-2 border border-app">
                              <Users size={10} className="text-indigo-500" /> {u.name} <span className="text-muted">({u.role})</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </details>

      <form ref={formRef} method="post" action="/webmail/portal-sso.php" target="snappyFrame" className="hidden">
        <input type="hidden" name="t" value="" />
      </form>

      {ssoError && (
        <div className="surface border border-red-500/30 bg-red-500/10 rounded-2xl mb-3 px-4 py-3 text-sm text-red-500">
          {ssoError}
        </div>
      )}

      {!unavailable && (
      <div className={fullscreen
        ? 'fixed inset-0 z-50 bg-[#0b0b10] p-2'
        : 'surface border border-app rounded-2xl overflow-hidden shadow-2xl shadow-indigo-950/20'}>
        <iframe
          ref={frameRef}
          name="snappyFrame"
          key={account ? account.id : 'empty'}
          src="/webmail/"
          title={`SnappyMail — ${account ? account.email : 'real webmail'}`}
          className={fullscreen
            ? 'w-full h-full block border-0 bg-[#0b0b10]'
            : 'w-full h-[calc(100vh-9rem)] min-h-[700px] block border-0 bg-[#0b0b10]'}
        />
      </div>
      )}

      <p className="flex items-center gap-2 text-[11px] text-muted mt-2.5">
        <Server size={13} className="text-indigo-500 shrink-0" />
        Real SnappyMail 2.38.2 iframe mounts here; local mail mirror (loopback) serves the local mirror
      </p>
    </div>
  )
}
