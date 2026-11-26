import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react'
import { Alert, Button, Field, Input, useToast } from '../../components/ui'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const toast = useToast()
  const [form, setForm] = useState({ email: '', password: '', password_confirmation: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.email.trim() || !form.password || !form.password_confirmation) {
      setError('Please complete all fields.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (form.password !== form.password_confirmation) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))
    setLoading(false)
    setDone(true)
    toast('Your password has been reset.', 'success', { title: 'All set' })
  }

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
          {done ? (
            <div className="text-center animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h1 className="text-xl font-bold tracking-tight mt-4">Password reset</h1>
              <p className="text-sm text-muted mt-2">You can now sign in with your new password.</p>
              <Link to="/login" className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:from-indigo-500 hover:to-purple-500">
                Go to sign in <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold tracking-tight">Reset your password</h1>
              <p className="text-sm text-muted mt-1 mb-6">Choose a strong new password for your account.</p>

              {error && <Alert type="error" className="mb-4">{error}</Alert>}

              <form onSubmit={submit} className="space-y-4">
                <input type="hidden" name="token" value={token || ''} />
                <p className="text-[11px] text-muted">
                  Reset token: <span className="font-mono text-[var(--text)]">{token ? `${token.slice(0, 16)}${token.length > 16 ? '…' : ''}` : 'not provided'}</span>
                </p>
                <Field label="Email address" required>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <Input type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} className="pl-10" />
                  </div>
                </Field>
                <Field label="New password" required hint="Use 8+ characters with a mix of letters, numbers & symbols.">
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <Input type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} placeholder="••••••••" value={form.password} onChange={set('password')} className="pl-10 pr-10" />
                    <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--text)]">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirm new password" required>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <Input type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" value={form.password_confirmation} onChange={set('password_confirmation')} className="pl-10" />
                  </div>
                </Field>
                <Button type="submit" size="lg" className="w-full" loading={loading}>
                  Reset password <ArrowRight size={16} />
                </Button>
              </form>

              <Link to="/login" className="mt-6 flex items-center justify-center gap-2 text-xs font-semibold text-muted hover:text-[var(--text)]">
                <ArrowLeft size={14} /> Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
