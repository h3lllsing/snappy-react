import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Mail } from 'lucide-react'
import { Alert, Button, Field, Input, useToast } from '../../components/ui'

export default function ForgotPassword() {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))
    setLoading(false)
    setSent(true)
    toast('Check your inbox for the reset link.', 'success', { title: 'Reset link sent' })
  }

  return (
    <div className="min-h-screen bg-grid flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl" />

      <div className="w-full max-w-md animate-fade-up relative">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <KeyRound size={24} />
          </div>
          <p className="mt-3 font-bold tracking-tight text-lg">Alphaspace</p>
          <p className="text-xs text-muted">Operations Portal</p>
        </div>

        <div className="glass-card rounded-2xl shadow-2xl p-7 sm:p-8">
          {sent ? (
            <div className="text-center animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h1 className="text-xl font-bold tracking-tight mt-4">Check your email</h1>
              <p className="text-sm text-muted mt-2">
                We've sent a password reset link to <span className="text-[var(--text)] font-medium">{email}</span>. It will expire soon.
              </p>
              <div className="mt-6 flex flex-col items-center gap-3">
                <Link to="/reset-password" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:from-indigo-500 hover:to-purple-500">
                  I have a reset link <ArrowRight size={16} />
                </Link>
                <Link to="/login" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-[var(--text)]">
                  <ArrowLeft size={14} /> Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold tracking-tight">Forgot your password?</h1>
              <p className="text-sm text-muted mt-1 mb-6">Enter your email and we'll send you a link to reset it.</p>

              {error && <Alert type="error" className="mb-4">{error}</Alert>}

              <form onSubmit={submit} className="space-y-4">
                <Field label="Email address" required>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <Input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" />
                  </div>
                </Field>
                <Button type="submit" size="lg" className="w-full" loading={loading}>
                  Email password reset link <ArrowRight size={16} />
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
