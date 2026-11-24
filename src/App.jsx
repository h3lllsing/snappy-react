import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppShell } from './components/layout/AppShell'
import { useAuth } from './context/AuthContext'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Profile from './pages/auth/Profile'
import ChangePassword from './pages/ChangePassword'
import Dashboard from './pages/Dashboard'
import Brands from './pages/Brands'
import Teams from './pages/Teams'
import TeamOverview from './pages/TeamOverview'
import Users from './pages/Users'
import UserDetail from './pages/UserDetail'
import Domains from './pages/Domains'
import DomainDetail from './pages/DomainDetail'
import Accounts from './pages/Accounts'
import AccountDetail from './pages/AccountDetail'
import Notifications from './pages/Notifications'
import Search from './pages/Search'
import Webmail from './pages/Webmail'
import ActivityLogs from './pages/ActivityLogs'
import MailActivity from './pages/MailActivity'
import LoginAudits from './pages/LoginAudits'
import QueueMonitor from './pages/QueueMonitor'
import ImapStatus from './pages/ImapStatus'
import NotFound from './pages/NotFound'
import OpsConsole from './pages/OpsConsole'

function Protected({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <AppShell><Forbidden /></AppShell>
  return <AppShell>{children}</AppShell>
}
function Forbidden() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="text-5xl font-bold text-red-500">403</div>
      <h1 className="text-xl font-semibold mt-3">Access denied</h1>
      <p className="text-sm text-muted mt-1">Your role does not have permission to view this module.</p>
      <a href="/dashboard" className="mt-5 text-indigo-500 text-sm font-semibold hover:underline">Back to dashboard →</a>
    </div>
  )
}
function Guest({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>
  return user ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Guest><Login /></Guest>} />
      <Route path="/register" element={<Guest><Register /></Guest>} />
      <Route path="/forgot-password" element={<Guest><ForgotPassword /></Guest>} />
      <Route path="/reset-password" element={<Guest><ResetPassword /></Guest>} />

      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/brands" element={<Protected roles={['super-admin', 'admin']}><Brands /></Protected>} />
      <Route path="/brands/:id" element={<Protected roles={['super-admin', 'admin']}><Brands /></Protected>} />
      <Route path="/teams" element={<Protected roles={['super-admin', 'admin', 'team-lead']}><Teams /></Protected>} />
      <Route path="/team-overview" element={<Protected roles={['super-admin', 'admin', 'team-lead']}><TeamOverview /></Protected>} />
      <Route path="/users" element={<Protected roles={['super-admin', 'admin']}><Users /></Protected>} />
      <Route path="/users/:id" element={<Protected roles={['super-admin', 'admin']}><UserDetail /></Protected>} />
      <Route path="/domains" element={<Protected roles={['super-admin', 'admin', 'team-lead']}><Domains /></Protected>} />
      <Route path="/domains/:id" element={<Protected roles={['super-admin', 'admin', 'team-lead']}><DomainDetail /></Protected>} />
      <Route path="/accounts" element={<Protected roles={['super-admin', 'admin']}><Accounts /></Protected>} />
      <Route path="/accounts/:id" element={<Protected roles={['super-admin', 'admin']}><AccountDetail /></Protected>} />
      <Route path="/notifications" element={<Protected><Notifications /></Protected>} />
      <Route path="/search" element={<Protected><Search /></Protected>} />
      <Route path="/webmail" element={<Protected><Webmail /></Protected>} />
      <Route path="/webmail/:id" element={<Protected><Webmail /></Protected>} />
      <Route path="/activity-logs" element={<Protected roles={['super-admin']}><ActivityLogs /></Protected>} />
      <Route path="/mail-activity" element={<Protected roles={['super-admin', 'admin']}><MailActivity /></Protected>} />
      <Route path="/login-audits" element={<Protected roles={['super-admin']}><LoginAudits /></Protected>} />
      <Route path="/queue-monitor" element={<Protected roles={['super-admin']}><QueueMonitor /></Protected>} />
      <Route path="/imap-status" element={<Protected roles={['super-admin']}><ImapStatus /></Protected>} />
      <Route path="/profile" element={<Protected><Profile /></Protected>} />
      <Route path="/change-password" element={<Protected><ChangePassword /></Protected>} />
      <Route path="/ops" element={<Protected roles={['super-admin','admin']}><OpsConsole /></Protected>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
