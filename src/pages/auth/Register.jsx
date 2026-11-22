import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, Mail, User, UserPlus } from 'lucide-react'
import { Alert, Button, Field, Input, useToast } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

export default function Register() {
  const { setUser } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password || !form.password_confirmation) {
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
    setUser({ id: Date.now(), name: form.name.trim(), email: form.email.trim(), role: 'user' })
    toast('Your account is ready!', 'success', { title: 'Welcome to Alphaspace' })
    navigate('/dashboard')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl" />

      <div className="w-full max-w-md animate-fade-up relative">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <UserPlus size={24} />
          </div>
          <p className="mt-3 font-bold tracking-tight text-lg">Alphaspace</p>
          <p className="text-xs text-muted">Operations Portal</p>
        </div>

        <div className="glass-card rounded-2xl shadow-2xl p-7 sm:p-8">
          <h1 className="text-xl font-bold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted mt-1 mb-6">Get started with your workspace in seconds.</p>

          {error && <Alert type="error" className="mb-4">{error}</Alert>}

          <form onSubmit={submit} className="space-y-4">
            <Field label="Full name" required>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input autoComplete="name" placeholder="Jane Doe" value={form.name} onChange={set('name')} className="pl-10" />
              </div>
            </Field>

            <Field label="Email address" required>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} className="pl-10" />
              </div>
            </Field>

            <Field label="Password" required hint="Use 8+ characters with a mix of letters, numbers & symbols.">
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" value={form.password} onChange={set('password')} className="pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--text)]">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <Field label="Confirm password" required>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <Input type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" value={form.password_confirmation} onChange={set('password_confirmation')} className="pl-10 pr-10" />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--text)]">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
            </Field>

            <Button type="submit" size="lg" className="w-full" loading={loading}>
              Create account <ArrowRight size={16} />
            </Button>
          </form>

          <p className="text-center text-xs text-muted mt-6">
            Already have an account? <Link to="/login" className="text-indigo-500 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
