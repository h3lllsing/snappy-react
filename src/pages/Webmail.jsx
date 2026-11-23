import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Bell, Mail, Server, X } from 'lucide-react'
import { useToast } from '../components/ui'
import { useLive } from '../context/LiveContext'
import api from '../lib/api'

const frameDoc = (email, mails, readIds) => {
  const data = JSON.stringify({
    email,
    mails: mails.map(m => ({ ...m, unread: readIds.includes(m.id) ? false : !!m.unread })),
  }).replace(/</g, '\\u003c')

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>SnappyMail — ${email}</title>
<style>
*{box-sizing:border-box}html,body{height:100%;margin:0}
body{font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:#0b0b10;color:#e8e8f0;font-size:13px;overflow:hidden}
button{font:inherit;color:inherit;cursor:pointer}
.app{height:100%;display:flex;flex-direction:column;background:radial-gradient(1200px 400px at 20% -10%,rgba(99,102,241,.16),transparent),#0b0b10}
.top{height:49px;flex:0 0 49px;display:flex;align-items:center;gap:10px;padding:0 14px;border-bottom:1px solid #1e1e2a;background:#101018}
.logo{display:flex;align-items:center;gap:8px;font-weight:700;letter-spacing:.2px}
.logo-mark{width:24px;height:24px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#a855f7);display:grid;place-items:center;font-size:12px;color:#fff}
.addr{margin-left:auto;color:#94a3b8;font-size:11px;border:1px solid #262636;background:#16161f;border-radius:999px;padding:5px 11px}
.dot{width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.14)}
.work{flex:1;min-height:0;display:grid;grid-template-columns:174px minmax(240px,330px) 1fr}
.folders{border-right:1px solid #1e1e2a;background:#0e0e14;padding:14px 9px;overflow:auto}
.folders .cap{font-size:9px;letter-spacing:.13em;text-transform:uppercase;color:#64748b;padding:0 9px;margin:0 0 9px}
.f{display:flex;align-items:center;gap:9px;width:100%;padding:8px 10px;border-radius:9px;background:transparent;border:0;color:#94a3b8;text-align:left;margin-bottom:2px;font-size:12px}
.f:hover{background:#181822;color:#e8e8f0}
.f.on{background:linear-gradient(90deg,rgba(99,102,241,.22),rgba(168,85,247,.12));color:#c7d2fe;font-weight:600}
.f .cnt{margin-left:auto;font-size:10px;color:#818cf8;background:rgba(99,102,241,.15);border-radius:999px;padding:1px 6px}
.list{border-right:1px solid #1e1e2a;display:flex;flex-direction:column;min-height:0;background:#0c0c12}
.list-head{height:40px;flex:0 0 40px;display:flex;align-items:center;padding:0 13px;border-bottom:1px solid #1e1e2a;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#64748b}
.list-head b{color:#c7d2fe;margin-left:auto;text-transform:none;letter-spacing:0;font-size:11px}
.rows{overflow:auto;flex:1}
.row{display:block;width:100%;text-align:left;border:0;border-bottom:1px solid #16161f;background:transparent;padding:11px 13px;position:relative}
.row:hover{background:#14141d}
.row.on{background:linear-gradient(90deg,rgba(99,102,241,.16),transparent)}
.row.unread .who{font-weight:700;color:#f8fafc}
.row .u{position:absolute;left:5px;top:19px;width:5px;height:5px;border-radius:50%;background:#818cf8}
.row-top{display:flex;align-items:baseline;gap:6px}
.who{font-size:12px;color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:62%}
.when{margin-left:auto;font-size:10px;color:#64748b;white-space:nowrap}
.sub{font-size:11px;color:#cbd5e1;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row.unread .sub{color:#e2e8f0}
.prev{font-size:10.5px;color:#64748b;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.clip{color:#818cf8;font-size:10px;margin-left:5px}
.empty{padding:44px 20px;text-align:center;color:#64748b;font-size:12px}
.view{display:flex;flex-direction:column;min-height:0;background:radial-gradient(700px 260px at 90% 0%,rgba(168,85,247,.08),transparent),#0b0b10}
.view-head{padding:18px 22px;border-bottom:1px solid #1e1e2a}
.view-head h2{font-size:18px;line-height:1.35;margin:7px 0 10px;font-weight:700;letter-spacing:-.2px}
.tags{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.tag{font-size:10px;border:1px solid #2a2a3a;background:#15151f;color:#a5b4fc;border-radius:999px;padding:3px 9px}
.view-body{padding:22px;overflow:auto;flex:1;line-height:1.75;color:#cbd5e1;font-size:13px}
.view-body p{margin:0 0 14px}
.sig{margin-top:26px;padding-top:16px;border-top:1px solid #1e1e2a;color:#64748b;font-size:11px}
.placeholder{margin:auto;text-align:center;color:#64748b;padding:30px}
.placeholder .big{width:52px;height:52px;margin:0 auto 14px;border-radius:16px;background:#16161f;border:1px solid #262636;display:grid;place-items:center;font-size:22px;color:#818cf8}
.foot{height:26px;flex:0 0 26px;display:flex;align-items:center;gap:8px;padding:0 13px;border-top:1px solid #1e1e2a;background:#101018;color:#64748b;font-size:10px}
</style></head>
<body>
<div class="app">
  <div class="top">
    <div class="logo"><span class="logo-mark">S</span><span>SnappyMail</span></div>
    <span class="dot" title="Live connection"></span>
    <span style="font-size:10px;color:#64748b">Live — auto refresh</span>
    <span class="addr">${email}</span>
  </div>
  <div class="work">
    <aside class="folders">
      <p class="cap">Folders</p>
      <div id="folders"></div>
      <p class="cap" style="margin-top:18px">Labels</p>
      <button class="f" type="button" data-label="Important" aria-pressed="false"><span style="color:#f59e0b">●</span> Important</button>
      <button class="f" type="button" data-label="Follow up" aria-pressed="false"><span style="color:#38bdf8">●</span> Follow up</button>
    </aside>
    <section class="list">
      <div class="list-head"><span id="listTitle">INBOX</span><b id="listCount"></b></div>
      <div class="rows" id="rows"></div>
    </section>
    <section class="view" id="view"></section>
  </div>
  <div class="foot"><span class="dot"></span><span>IMAP sync active · ${email}</span><span style="margin-left:auto">SnappyMail 2.38.2 (mock)</span></div>
</div>
<script>
(function(){
  var DATA = ${data};
  var read = {};
  DATA.mails.forEach(function(m){ if(!m.unread) read[m.id] = true; });
  var folder = 'INBOX';
  var selected = null;
  var FOLDERS = ['INBOX','Sent','Drafts','Trash'];
  function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function unreadCount(){ return DATA.mails.filter(function(m){ return !read[m.id] && m.unread; }).length; }
  function renderFolders(){
    document.getElementById('folders').innerHTML = FOLDERS.map(function(f){
      var c = f === 'INBOX' ? unreadCount() : 0;
      return '<button class="f' + (folder === f ? ' on' : '') + '" type="button" data-folder="' + f + '">' +
        '<span>' + (f === 'INBOX' ? '▣' : f === 'Sent' ? '➤' : f === 'Drafts' ? '✎' : '♲') + '</span><span>' + f + '</span>' +
        (c ? '<span class="cnt">' + c + '</span>' : '') + '</button>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('[data-folder]'), function(el){
      el.onclick = function(){ folder = el.getAttribute('data-folder'); selected = null; render(); };
    });
  }
  function visible(){
    return folder === 'INBOX' ? DATA.mails : [];
  }
  function renderRows(){
    var items = visible();
    document.getElementById('listTitle').textContent = folder;
    document.getElementById('listCount').textContent = items.length + ' messages';
    if(!items.length){
      var notes = { Sent:'Sent messages you compose will show up here.', Drafts:'Unfinished drafts are saved here until you are ready to send.', Trash:'Deleted messages land here — this folder is empty right now.' };
      document.getElementById('rows').innerHTML = '<div class="empty"><div style="font-size:22px;margin-bottom:8px">✉</div><div style="font-weight:600;color:#94a3b8">' + esc(folder) + ' is empty</div><div style="margin-top:6px">' + esc(notes[folder] || 'No messages to display in this folder.') + '</div></div>';
      return;
    }
    document.getElementById('rows').innerHTML = items.map(function(m){
      var unread = !read[m.id] && m.unread;
      return '<button class="row' + (unread ? ' unread' : '') + (selected === m.id ? ' on' : '') + '" type="button" data-id="' + m.id + '">' +
        (unread ? '<span class="u"></span>' : '') +
        '<span class="row-top"><span class="who">' + esc(m.from_name) + '</span><span class="when">' + esc(m.time) + '</span></span>' +
        '<span class="sub">' + esc(m.subject) + (m.has_attachment ? '<span class="clip">⌕</span>' : '') + '</span>' +
        '<span class="prev">' + esc(m.preview) + '</span></button>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('[data-id]'), function(el){
      el.onclick = function(){
        var id = Number(el.getAttribute('data-id'));
        selected = id;
        read[id] = true;
        render();
        window.parent.postMessage({ source: 'snappymail-mock', type: 'open', id: id, subject: (DATA.mails.filter(function(m){return m.id === id;})[0] || {}).subject }, window.location.origin);
      };
    });
  }
  function renderView(){
    var el = document.getElementById('view');
    var m = DATA.mails.filter(function(x){ return x.id === selected; })[0];
    if(!m){
      el.innerHTML = '<div class="placeholder"><div class="big">✉</div><div style="font-weight:600;color:#94a3b8">Select a message to read</div><div style="margin-top:6px;font-size:11px">Local mirror of ' + esc(DATA.email) + '</div></div>';
      return;
    }
    el.innerHTML = '<div class="view-head">' +
      '<div class="tags"><span class="tag">' + esc(folder) + '</span><span class="tag">' + esc(m.brand) + '</span>' + (m.has_attachment ? '<span class="tag">⌕ 1 attachment</span>' : '') + '</div>' +
      '<h2>' + esc(m.subject) + '</h2>' +
      '<div style="display:flex;align-items:center;gap:9px">' +
        '<div style="width:28px;height:28px;border-radius:9px;background:linear-gradient(135deg,#6366f1,#a855f7);display:grid;place-items:center;font-size:11px;font-weight:700">' + esc(m.from_name.charAt(0)) + '</div>' +
        '<div><div style="font-size:12px;font-weight:600">' + esc(m.from_name) + '</div><div style="font-size:10px;color:#64748b">' + esc(m.from) + ' · ' + esc(m.time) + '</div></div>' +
      '</div></div>' +
      '<div class="view-body"><p>Hello team,</p><p>' + esc(m.preview) + '</p>' +
      '<p>Please review the details at your convenience and let us know if any further information is required. This message was delivered to <strong style="color:#c7d2fe">' + esc(DATA.email) + '</strong> and is being displayed from the local IMAP mirror.</p>' +
      '<p>Regards,<br/>' + esc(m.from_name) + '</p>' +
      '<div class="sig">Sent via SnappyMail · Retrieved from local mail mirror (loopback) · Message ID #' + m.id + '</div></div>';
  }
  function wireLabels(){
    Array.prototype.forEach.call(document.querySelectorAll('[data-label]'), function(el){
      el.onclick = function(){
        var label = el.getAttribute('data-label');
        var turningOn = el.getAttribute('aria-pressed') !== 'true';
        Array.prototype.forEach.call(document.querySelectorAll('[data-label]'), function(b){
          b.setAttribute('aria-pressed','false'); b.classList.remove('on');
        });
        if(turningOn){ el.setAttribute('aria-pressed','true'); el.classList.add('on'); }
        window.parent.postMessage({ source: 'snappymail-mock', type: 'label', label: label, active: turningOn }, window.location.origin);
      };
    });
  }
  function render(){ renderFolders(); renderRows(); renderView(); wireLabels(); }
  window.addEventListener('message', function(e){
    if (e.origin !== location.origin || !e.data || e.data.source !== 'portal' || e.data.type !== 'refresh') return;
    document.title = 'SnappyMail · live refresh #' + e.data.pulse;
    render();
  });
  render();
})();
</script>
</body></html>`
}

export default function Webmail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { mails, unread, pulse } = useLive()
  const [accounts, setAccounts] = useState([])
  const [activeId, setActiveId] = useState(() => Number(id) || 1)
  const [readIds, setReadIds] = useState([])
  const frameRef = useRef(null)

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
    const onMessage = e => {
      if (e.origin !== window.location.origin) return
      const d = e.data
      if (!d || (d.source !== 'snappymail-mock' && d.source !== 'snappymail')) return
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
    () => accounts.find(a => a.id === activeId) || accounts[0] || null,
    [accounts, activeId],
  )

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

  const selectAccount = a => {
    setActiveId(a.id)
    navigate(`/webmail/${a.id}`, { replace: true })
  }

  const srcDoc = account ? frameDoc(account.email, accountMails, readIds) : '<html><body style="background:#0b0b10"></body></html>'

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
          <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-xl surface-2 border border-app hover:border-indigo-400 text-muted" title={`${unread} unread alerts`}>
            <Bell size={17} />
            {unread > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unread}</span>}
          </button>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl surface-2 border border-app text-xs font-semibold text-muted hover:border-indigo-400 hover:text-[var(--text)]">
            <X size={14} /> Close
          </Link>
        </div>
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

      <div className="surface border border-app rounded-2xl overflow-hidden shadow-2xl shadow-indigo-950/20">
        <iframe
          ref={frameRef}
          key={account ? account.id : 'empty'}
          src="/webmail/"
          srcDoc={srcDoc}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          title={`SnappyMail — ${account ? account.email : 'loading'}`}
          className="w-full h-[calc(100vh-19rem)] min-h-[500px] block border-0 bg-[#0b0b10]"
        />
      </div>

      <p className="flex items-center gap-2 text-[11px] text-muted mt-2.5">
        <Server size={13} className="text-indigo-500 shrink-0" />
        Real SnappyMail 2.38.2 iframe mounts here; local mail mirror (loopback) serves the local mirror
      </p>
    </div>
  )
}
