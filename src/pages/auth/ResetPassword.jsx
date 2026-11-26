import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Alert } from '../../components/ui'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const hasToken = Boolean(params.get('token'))

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl" />

      <div className="w-full max-w-md animate-fade-up relative">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <ShieldCheck size={24} />
          </div>
          <p className="mt-3 font-bold tracking-tight text-lg">Alphaspace</p>
          <p className="text-xs text-muted">Operations Portal</p>
        </div>

        <div className="glass-card rounded-2xl shadow-2xl p-7 sm:p-8">
          <h1 className="text-xl font-bold tracking-tight">Reset your password</h1>
          <p className="text-sm text-muted mt-1 mb-6">This page does not change passwords.</p>

          <Alert type="info" title="Administrator-issued reset">
            Password reset links are issued by the administrator; this page is not used.
            {hasToken && (
              <span className="block mt-2">
                A reset token is present in this link. Ask your administrator to arrange the password reset; no password has been changed.
              </span>
            )}
          </Alert>

          <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-muted hover:text-[var(--text)]">
            <ArrowLeft size={14} /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
