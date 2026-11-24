import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { Alert, Button, Checkbox, Field, Input, useToast } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Please enter both your email and password.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await login({ email, password, remember })
      localStorage.setItem('remember_me', remember ? 'true' : 'false')
      toast(`Welcome back, ${res.user.name.split(' ')[0]}!`, 'success', { title: 'Signed in successfully' })
      if (res.must_change_password) {
        navigate('/change-password', { replace: true })
      } else {
        navigate('/dashboard')
      }
    } catch {
      setError('Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl" />

      <div className="w-full max-w-md animate-fade-up relative">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Sparkles size={24} />
          </div>
          <p className="mt-3 font-bold tracking-tight text-lg">Alphaspace</p>
          <p className="text-xs text-muted">Operations Portal</p>
        </div>

        <div className="glass-card rounded-2xl shadow-2xl p-7 sm:p-8">
          <h1 className="text-xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted mt-1 mb-6">Sign in to continue to your workspace.</p>

          {error && <Alert type="error" className="mb-4">{error}</Alert>}

          <form onSubmit={submit} className="space-y-4">
            <Field label="Email address" required>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input type="email" autoComplete="username" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" />
              </div>
            </Field>

            <Field label="Password" required>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--text)]">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <div className="flex items-center justify-between gap-3">
              <Checkbox label="Remember me" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <Link to="/forgot-password" className="text-xs font-semibold text-indigo-500 hover:underline">Forgot password?</Link>
            </div>

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Sign in <ArrowRight size={16} />
            </Button>
          </form>

          {import.meta.env.VITE_USE_API !== 'true' && (
            <div className="mt-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 flex gap-2.5">
              <ShieldCheck size={17} className="text-indigo-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-semibold">Demo mode</p>
                <p className="text-muted mt-0.5">Any email and password will work. Try <span className="text-[var(--text)] font-medium">admin@alphaspace.io</span> / <span className="text-[var(--text)] font-medium">password</span>.</p>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-muted mt-6">
            Don't have an account? <Link to="/register" className="text-indigo-500 font-semibold hover:underline">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
