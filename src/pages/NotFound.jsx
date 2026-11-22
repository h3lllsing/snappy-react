import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, LayoutDashboard, LogIn, Compass } from 'lucide-react'
import { Button } from '../components/ui'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl" />

      <div className="glass-card rounded-2xl shadow-2xl p-8 sm:p-10 max-w-md w-full text-center animate-fade-up relative">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 mx-auto">
          <Compass size={26} />
        </div>
        <p className="mt-5 text-5xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">404</p>
        <h1 className="text-xl font-bold tracking-tight mt-2">Page not found</h1>
        <p className="text-sm text-muted mt-2">We couldn't find the page you're looking for. It may have moved or no longer exists.</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-7">
          <Link to="/dashboard"><Button className="w-full"><LayoutDashboard size={16} /> Dashboard</Button></Link>
          <Link to="/login"><Button variant="secondary" className="w-full"><LogIn size={16} /> Login</Button></Link>
        </div>

        <button onClick={() => navigate(-1)} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-[var(--text)]">
          <ArrowLeft size={14} /> Go back
        </button>
      </div>
    </div>
  )
}
