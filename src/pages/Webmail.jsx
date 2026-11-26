import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bell, ChevronDown, Globe2, Mail, Maximize2, Minimize2, Search, Server, Users, X } from 'lucide-react'
import { useToast } from '../components/ui'
import { useLive } from '../context/LiveContext'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

const accountDomain = acc => (acc.email || '').split('@')[1] || ''

function UnreadBadge({ count }) {
  if (!count) return null
  return (
    <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
      {count}
    </span>
  )
}

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
  const [frameSrc, setFrameSrc] = useState('/webmail/')
  const [fullscreen, setFullscreen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [switcherQuery, setSwitcherQuery] = useState('')

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
  const switcherRef = useRef(null)
  const searchRef = useRef(null)

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

  const filteredGrouped = useMemo(() => {
    const q = switcherQuery.trim().toLowerCase()
    if (!q) return grouped
    return grouped
      .map(([brand, items]) => [brand, items.filter(a =>
        (a.email || '').toLowerCase().includes(q) ||
        String(brand).toLowerCase().includes(q) ||
        accountDomain(a).toLowerCase().includes(q),
      )])
      .filter(([, items]) => items.length > 0)
  }, [grouped, switcherQuery])

  useEffect(() => {
    if (!switcherOpen) return
    searchRef.current?.focus()
    const onPointerDown = e => {
      if (!switcherRef.current?.contains(e.target)) setSwitcherOpen(false)
    }
    const onKeyDown = e => {
      if (e.key === 'Escape') setSwitcherOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [switcherOpen])

  // Portal -> SnappyMail secure SSO: request a single-use token from Laravel,
  // then POST it to the bridge which redirects the iframe into an authenticated session.
  const startSso = async (a, seq = selectionSeq.current) => {
    if (!a) return
    if (seq !== selectionSeq.current) return
    if (ssoDone.current === a.id) return
    setSsoError(null)
    try {
      const res = await api.webmailToken(a.id)
      if (seq !== selectionSeq.current) return
      const form = formRef.current
      if (!form || !res?.token) throw new Error('No SSO token')

      // Drop the live SnappyMail JS context before logout/SSO. Otherwise it can
      // keep a stale AppData System.token and fail later X-SM-Token requests
      // with "Folders error: HTTP Token mismatch".
      setFrameSrc('about:blank')
      // On a second switch frameSrc is already 'about:blank', so React would
      // not re-write the src attribute; force the navigation as well.
      try {
        frameRef.current?.contentWindow?.location.replace('about:blank')
      } catch (e) {
        // Ignore transient access errors; the state update still applies.
      }

      try {
        await fetch('/webmail/portal-sso.php?logout=1', { method: 'POST' })
      } catch (e) {
        // Ignore logout failure; the fresh SSO session replaces it.
      }
      if (seq !== selectionSeq.current) return

      form.elements.t.value = res.token
      form.submit()
      ssoDone.current = a.id
      // Do NOT reset frameSrc to '/webmail/' here: the bridge POST redirects
      // this same iframe to /webmail/?sso&hash=... and a second load would
      // race the SSO navigation.
    } catch (err) {
      if (seq === selectionSeq.current) {
        ssoDone.current = null
        setFrameSrc('/webmail/')
        setSsoError(err?.message || 'Could not start webmail session.')
        toast(err?.message || 'Could not start webmail session.', 'error', { title: 'SnappyMail SSO' })
      }
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
        <div ref={switcherRef} className="relative min-w-0 flex-1">
          <button
            type="button"
            aria-label="Switch email account"
            aria-haspopup="listbox"
            aria-expanded={switcherOpen}
            onClick={() => setSwitcherOpen(o => !o)}
            className="w-full sm:max-w-md flex items-center justify-between gap-2 rounded-xl border border-app surface-2 px-3 py-2 text-sm text-[var(--text)] hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <span className="flex items-center gap-2 min-w-0 truncate">
              <Mail size={15} className="text-indigo-500 shrink-0" />
              <span className="truncate">{account?.email || 'Select mailbox'}</span>
              <UnreadBadge count={account ? unreadFor(account) : 0} />
            </span>
            <ChevronDown size={14} className={`text-muted shrink-0 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} />
          </button>
          {switcherOpen && (
            <div className="absolute z-30 left-0 right-0 sm:w-[26rem] mt-1.5 rounded-xl border border-app surface shadow-xl shadow-black/20 overflow-hidden">
              <div className="p-2 border-b border-app">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={switcherQuery}
                    onChange={e => setSwitcherQuery(e.target.value)}
                    placeholder="Search email or domain…"
                    aria-label="Search email or domain"
                    className="w-full rounded-lg border border-app surface-2 pl-8 pr-3 py-2 text-sm text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>
              <div role="listbox" aria-label="Mailboxes" className="max-h-72 overflow-y-auto p-1.5">
                {filteredGrouped.length === 0 ? (
                  <p className="text-xs text-muted px-2 py-3 text-center">No matching mailbox</p>
                ) : filteredGrouped.map(([brand, items]) => (
                  <div key={brand} role="group" aria-label={brand} className="mb-1 last:mb-0">
                    <p className="text-[9px] uppercase tracking-widest text-muted font-semibold px-2 py-1">{brand}</p>
                    {items.map(a => {
                      const selected = account?.id === a.id
                      return (
                        <button
                          key={a.id}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => { selectAccount(a); setSwitcherOpen(false) }}
                          className={`w-full flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors ${selected ? 'bg-indigo-500/10 text-indigo-500' : 'text-[var(--text)] hover:bg-indigo-500/10'}`}
                        >
                          <span className="flex items-center gap-2 min-w-0 truncate">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <span className="truncate">{a.email}</span>
                          </span>
                          <UnreadBadge count={unreadFor(a)} />
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <span className="text-[11px] text-muted whitespace-nowrap">
          {accounts.length} mailbox{accounts.length === 1 ? '' : 'es'} · {accessData.domains.length} domain{accessData.domains.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="surface border border-app rounded-2xl mb-3 px-3 py-2.5">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative w-full sm:max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              value={switcherQuery}
              onChange={e => setSwitcherQuery(e.target.value)}
              placeholder="Search email or domain…"
              aria-label="Search mailboxes"
              className="w-full rounded-lg border border-app surface-2 pl-8 pr-3 py-1.5 text-xs text-[var(--text)] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <span className="text-[11px] text-muted whitespace-nowrap">Quick switch</span>
        </div>
        <div className="flex gap-5 overflow-x-auto pb-1">
          {filteredGrouped.map(([brand, items]) => (
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
          {grouped.length === 0
            ? <p className="text-xs text-muted py-2">No accounts available.</p>
            : filteredGrouped.length === 0 && <p className="text-xs text-muted py-2">No matching mailbox</p>}
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
          src={frameSrc}
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
