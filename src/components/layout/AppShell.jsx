import { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Activity, Bell, BookOpen, Boxes, ChevronDown, Command, CreditCard, FolderKanban, Globe2,
  Inbox, LayoutDashboard, LogOut, Mail, Menu, Moon, Search, Server, Settings2,
  ShieldCheck, Sun, Users, UsersRound, X, Zap,
} from 'lucide-react'
import { Avatar, Badge } from '../ui'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useLive } from '../../context/LiveContext'
import { setNavigator } from '../../lib/navigation'

const NAV = [
  { group: 'Workspace', items: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: '*' },
    { to: '/webmail', label: 'Webmail', icon: Mail, roles: '*' },
    { to: '/notifications', label: 'Notifications', icon: Bell, roles: '*', badge: true },
    { to: '/search', label: 'Search', icon: Search, roles: '*' },
  ]},
  { group: 'Brands & Teams', items: [
    { to: '/brands', label: 'Brand & Access Matrix', icon: Boxes, roles: ['super-admin','admin'] },
    { to: '/teams', label: 'Teams', icon: UsersRound, roles: ['super-admin','admin','team-lead'] },
    { to: '/team-overview', label: 'Team Overview', icon: FolderKanban, roles: ['super-admin','admin','team-lead'] },
  ]},
  { group: 'Management', items: [
    { to: '/domains', label: 'Domains', icon: Globe2, roles: ['super-admin','admin','team-lead'] },
    { to: '/accounts', label: 'Email Accounts', icon: CreditCard, roles: ['super-admin','admin'] },
    { to: '/users', label: 'Users', icon: Users, roles: ['super-admin','admin'] },
  ]},
  { group: 'Administration', items: [
    { to: '/ops', label: 'Live Operations', icon: Activity, roles: ['super-admin','admin'] },
    { to: '/imap-status', label: 'IMAP Status', icon: Server, roles: ['super-admin'] },
    { to: '/activity-logs', label: 'Activity Logs', icon: Activity, roles: ['super-admin'] },
    { to: '/mail-activity', label: 'Mail Activity', icon: Activity, roles: ['super-admin','admin'] },
    { to: '/login-audits', label: 'Login History', icon: ShieldCheck, roles: ['super-admin'] },
    { to: '/queue-monitor', label: 'Queue Monitor', icon: Zap, roles: ['super-admin'] },
    { to: '/workflow', label: 'Portal Workflow', icon: BookOpen, roles: ['super-admin'] },
    { to: '/qa', label: 'Q&A Audit', icon: ShieldCheck, roles: ['super-admin'] },
    { to: '/qa2', label: 'Q&A Audit 2', icon: ShieldCheck, roles: ['super-admin'] },
    { to: '/qa3', label: 'Q&A Audit 3', icon: ShieldCheck, roles: ['super-admin'] },
    { to: '/qa4', label: 'Q&A Audit 4', icon: ShieldCheck, roles: ['super-admin'] },
    { to: '/qa5', label: 'Q&A Audit 5', icon: ShieldCheck, roles: ['super-admin'] },
    { to: '/qa6', label: 'Q&A Audit 6', icon: ShieldCheck, roles: ['super-admin'] },
    { to: '/qa7', label: 'Q&A Audit 7', icon: ShieldCheck, roles: ['super-admin'] },
    { to: '/qa8', label: 'Q&A Audit 8', icon: ShieldCheck, roles: ['super-admin'] },
    { to: '/qa9', label: 'Q&A Audit 9', icon: ShieldCheck, roles: ['super-admin'] },
    { to: '/qa10', label: 'Q&A Audit 10', icon: ShieldCheck, roles: ['super-admin'] },
    { to: '/qa11', label: 'Q&A Audit 11', icon: ShieldCheck, roles: ['super-admin'] },
    { to: '/qa12', label: 'Q&A Audit 12', icon: ShieldCheck, roles: ['super-admin'] },
    { to: '/qa13', label: 'Q&A Audit 13', icon: ShieldCheck, roles: ['super-admin'] },
  ]},
]

const ALL_PAGES = NAV.flatMap(g => g.items).concat([{ to: '/profile', label: 'My Profile', icon: Settings2, roles: '*' }])

export function AppShell({ children }) {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const loc = useLocation()
  const [collapsed, setCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === '1')
  const [mobileOpen, setMobileOpen] = useState(false)
  const { unread } = useLive()
  const [cmdOpen, setCmdOpen] = useState(false)
  const [cmdQuery, setCmdQuery] = useState('')

  useEffect(() => { setNavigator(navigate) }, [navigate])
  useEffect(() => { localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0') }, [collapsed])
  useEffect(() => { setMobileOpen(false) }, [loc.pathname])

  const pages = useMemo(() => ALL_PAGES.filter(p => p.roles === '*' || p.roles.includes(user?.role)), [user])
  const results = cmdQuery ? pages.filter(p => p.label.toLowerCase().includes(cmdQuery.toLowerCase())) : pages

  useEffect(() => {
    const h = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCmdOpen(o => !o) }
      if (e.key === 'Escape') setCmdOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <div className="min-h-screen bg-grid">
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-50 surface border-r border-app flex flex-col transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-16 flex items-center gap-3 px-4 border-b border-app shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shrink-0">A</div>
          {!collapsed && <div className="min-w-0"><div className="font-bold leading-tight truncate">Alphaspace</div><div className="text-[10px] text-muted truncate">Operations Portal</div></div>}
          <button className="ml-auto lg:hidden text-muted" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>

        {!collapsed && (
          <button onClick={() => setCmdOpen(true)} className="mx-3 mt-3 flex items-center gap-2 surface-2 border border-app rounded-xl px-3 py-2 text-xs text-muted hover:border-indigo-400">
            <Search size={14} /><span className="flex-1 text-left">Search pages…</span><kbd className="text-[9px] border border-app rounded px-1">⌘K</kbd>
          </button>
        )}

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV.map(group => {
            const items = group.items.filter(p => p.roles === '*' || p.roles.includes(user?.role))
            if (!items.length) return null
            return (
              <div key={group.group}>
                {!collapsed && <div className="px-3 pb-1.5 text-[10px] uppercase tracking-widest text-muted font-semibold">{group.group}</div>}
                <div className="space-y-0.5">
                  {items.map(item => (
                    <NavLink key={item.to} to={item.to} title={collapsed ? item.label : undefined}
                      className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all relative ${isActive ? 'bg-indigo-500/10 text-indigo-500' : 'text-muted hover:text-[var(--text)] hover:surface-2'}`}>
                      {({ isActive }) => <>
                        {isActive && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />}
                        <item.icon size={17} className="shrink-0" />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {!collapsed && item.badge && unread > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{unread > 9 ? '9+' : unread}</span>}
                      </>}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        <div className="p-2 border-t border-app shrink-0">
          <NavLink to="/profile" className="flex items-center gap-2.5 p-2 rounded-xl hover:surface-2">
            <Avatar name={user?.name} size="sm" />
            {!collapsed && <div className="min-w-0 flex-1"><div className="text-xs font-semibold truncate">{user?.name}</div><Badge role={user?.role} className="mt-0.5">{user?.role}</Badge></div>}
          </NavLink>
          <button onClick={async () => { await logout(); navigate('/login', { replace: true }) }} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted hover:text-red-500 hover:bg-red-500/5 ${collapsed ? 'justify-center' : ''}`}>
            <LogOut size={17} />{!collapsed && 'Logout'}
          </button>
        </div>
      </aside>

      <div className={`transition-all duration-200 ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        <header className="sticky top-0 z-30 h-16 surface/90 backdrop-blur border-b border-app flex items-center gap-3 px-4 sm:px-6">
          <button className="lg:hidden text-muted" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <button className="hidden lg:block text-muted hover:text-indigo-500" onClick={() => setCollapsed(c => !c)}><Menu size={19} /></button>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">{NAV.flatMap(g => g.items).concat([{ to: '/profile', label: 'My Profile' }]).find(i => loc.pathname.startsWith(i.to))?.label || 'Alphaspace'}</div>
          </div>
          <button onClick={() => setCmdOpen(true)} className="hidden sm:flex items-center gap-2 surface-2 border border-app rounded-lg px-3 py-1.5 text-xs text-muted hover:border-indigo-400"><Command size={13} /> Quick search</button>
          <button onClick={toggle} className="p-2 rounded-lg text-muted hover:surface-2" title="Toggle theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
          <NavLink to="/notifications" className="relative p-2 rounded-lg text-muted hover:surface-2"><Bell size={18} />{unread > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[var(--surface)]" />}</NavLink>
          <NavLink to="/profile" title="My Profile"><Avatar name={user?.name} size="sm" /></NavLink>
        </header>
        <main className="p-4 sm:p-6 max-w-[1600px] mx-auto">{children}</main>
      </div>

      {cmdOpen && (
        <div className="fixed inset-0 z-[250] flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm" onMouseDown={e => e.target === e.currentTarget && setCmdOpen(false)}>
          <div className="surface border border-app rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-up">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-app">
              <Search size={17} className="text-muted" />
              <input autoFocus value={cmdQuery} onChange={e => setCmdQuery(e.target.value)} placeholder="Type a page name…" className="flex-1 bg-transparent outline-none text-sm" />
              <kbd className="text-[10px] text-muted border border-app rounded px-1.5 py-0.5">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {results.length === 0 && <div className="text-center text-sm text-muted py-8">No pages found</div>}
              {results.map(p => (
                <button key={p.to} onClick={() => { navigate(p.to); setCmdOpen(false); setCmdQuery('') }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:surface-2 text-sm">
                  <p.icon size={16} className="text-indigo-500" />{p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function Breadcrumbs({ title }) {
  const loc = useLocation()
  return <div className="text-[11px] text-muted mb-4">Home <span className="mx-1.5">/</span> {loc.pathname.split('/').filter(Boolean).map(s => s.replace(/-/g,' ')).join(' / ') || 'Dashboard'}{title && <> <span className="mx-1.5">/</span> {title}</>}</div>
}
