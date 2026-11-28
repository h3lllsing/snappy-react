import { lazy, Suspense } from 'react'
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
import Notifications from './pages/Notifications'
import Search from './pages/Search'
import Webmail from './pages/Webmail'
import NotFound from './pages/NotFound'

// Admin-only surfaces are loaded on demand so the daily-use bundle stays small.
const Brands = lazy(() => import('./pages/Brands'))
const Teams = lazy(() => import('./pages/Teams'))
const TeamOverview = lazy(() => import('./pages/TeamOverview'))
const Users = lazy(() => import('./pages/Users'))
const UserDetail = lazy(() => import('./pages/UserDetail'))
const Domains = lazy(() => import('./pages/Domains'))
const DomainDetail = lazy(() => import('./pages/DomainDetail'))
const Accounts = lazy(() => import('./pages/Accounts'))
const AccountDetail = lazy(() => import('./pages/AccountDetail'))
const ActivityLogs = lazy(() => import('./pages/ActivityLogs'))
const MailActivity = lazy(() => import('./pages/MailActivity'))
const LoginAudits = lazy(() => import('./pages/LoginAudits'))
const QueueMonitor = lazy(() => import('./pages/QueueMonitor'))
const ImapStatus = lazy(() => import('./pages/ImapStatus'))
const OpsConsole = lazy(() => import('./pages/OpsConsole'))
const WorkflowGuide = lazy(() => import('./pages/WorkflowGuide'))
const QaAudit = lazy(() => import('./pages/QaAudit'))
const QaAudit2 = lazy(() => import('./pages/QaAudit2'))
const QaAudit3 = lazy(() => import('./pages/QaAudit3'))
const QaAudit4 = lazy(() => import('./pages/QaAudit4'))
const QaAudit5 = lazy(() => import('./pages/QaAudit5'))
const QaAudit6 = lazy(() => import('./pages/QaAudit6'))
const QaAudit7 = lazy(() => import('./pages/QaAudit7'))
const QaAudit8 = lazy(() => import('./pages/QaAudit8'))
const QaAudit9 = lazy(() => import('./pages/QaAudit9'))
const QaAudit10 = lazy(() => import('./pages/QaAudit10'))
const QaAudit11 = lazy(() => import('./pages/QaAudit11'))
const QaAudit12 = lazy(() => import('./pages/QaAudit12'))
const QaAudit13 = lazy(() => import('./pages/QaAudit13'))
const QaAudit14 = lazy(() => import('./pages/QaAudit14'))
const QaAudit15 = lazy(() => import('./pages/QaAudit15'))
const QaAudit16 = lazy(() => import('./pages/QaAudit16'))
const QaAudit17 = lazy(() => import('./pages/QaAudit17'))
const QaAudit18 = lazy(() => import('./pages/QaAudit18'))
const QaAudit19 = lazy(() => import('./pages/QaAudit19'))
const QaAudit20 = lazy(() => import('./pages/QaAudit20'))
const QaAudit21 = lazy(() => import('./pages/QaAudit21'))

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
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>}>
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
        <Route path="/workflow" element={<Protected roles={['super-admin']}><WorkflowGuide /></Protected>} />
        <Route path="/qa" element={<Protected roles={['super-admin']}><QaAudit /></Protected>} />
        <Route path="/qa2" element={<Protected roles={['super-admin']}><QaAudit2 /></Protected>} />
        <Route path="/qa3" element={<Protected roles={['super-admin']}><QaAudit3 /></Protected>} />
        <Route path="/qa4" element={<Protected roles={['super-admin']}><QaAudit4 /></Protected>} />
        <Route path="/qa5" element={<Protected roles={['super-admin']}><QaAudit5 /></Protected>} />
        <Route path="/qa6" element={<Protected roles={['super-admin']}><QaAudit6 /></Protected>} />
        <Route path="/qa7" element={<Protected roles={['super-admin']}><QaAudit7 /></Protected>} />
        <Route path="/qa8" element={<Protected roles={['super-admin']}><QaAudit8 /></Protected>} />
        <Route path="/qa9" element={<Protected roles={['super-admin']}><QaAudit9 /></Protected>} />
        <Route path="/qa10" element={<Protected roles={['super-admin']}><QaAudit10 /></Protected>} />
        <Route path="/qa11" element={<Protected roles={['super-admin']}><QaAudit11 /></Protected>} />
        <Route path="/qa12" element={<Protected roles={['super-admin']}><QaAudit12 /></Protected>} />
        <Route path="/qa13" element={<Protected roles={['super-admin']}><QaAudit13 /></Protected>} />
        <Route path="/qa14" element={<Protected roles={['super-admin']}><QaAudit14 /></Protected>} />
        <Route path="/qa15" element={<Protected roles={['super-admin']}><QaAudit15 /></Protected>} />
        <Route path="/qa16" element={<Protected roles={['super-admin']}><QaAudit16 /></Protected>} />
        <Route path="/qa17" element={<Protected roles={['super-admin']}><QaAudit17 /></Protected>} />
        <Route path="/qa18" element={<Protected roles={['super-admin']}><QaAudit18 /></Protected>} />
        <Route path="/qa19" element={<Protected roles={['super-admin']}><QaAudit19 /></Protected>} />
        <Route path="/qa20" element={<Protected roles={['super-admin']}><QaAudit20 /></Protected>} />
        <Route path="/qa21" element={<Protected roles={['super-admin']}><QaAudit21 /></Protected>} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
