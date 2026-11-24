import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, Lock, Save, ShieldCheck } from 'lucide-react'
import { Alert, Button, Card, CardBody, CardHeader, Field, Input, PageHeader, useToast } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import api from '../lib/api'

export default function ChangePassword() {
  const { logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  })
  const [show, setShow] = useState({ current: false, password: false, confirmation: false })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))
  const toggleShow = (key) => () => setShow(s => ({ ...s, [key]: !s[key] }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.current_password) {
      setError('Current password is required.')
      toast('Current password is required.', 'error', { title: 'Missing field' })
      return
    }
    if (form.password.length < 12) {
      setError('New password must be at least 12 characters.')
      toast('New password must be at least 12 characters.', 'error', { title: 'Password too short' })
      return
    }
    if (form.password !== form.password_confirmation) {
      setError('New passwords do not match.')
      toast('New passwords do not match.', 'error', { title: 'Check your passwords' })
      return
    }

    setLoading(true)
    try {
      await api.changePassword({
        current_password: form.current_password,
        password: form.password,
        password_confirmation: form.password_confirmation,
      })
      toast('Your password has been changed. Please sign in again.', 'success', { title: 'Password updated' })
      await logout()
      navigate('/login?password_changed=1', { replace: true })
    } catch (err) {
      const message = err?.message || 'Unable to change password. Please try again.'
      setError(message)
      toast(message, 'error', { title: 'Change failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-up">
      <PageHeader title="Change password" subtitle="You must rotate your password before continuing." />

      <div className="max-w-xl">
        <Card>
          <CardHeader title="Rotate password" subtitle="All other actions are blocked until this is complete." />
          <CardBody>
            {error && <Alert type="error" className="mb-4">{error}</Alert>}
            <form onSubmit={submit} className="space-y-5">
              <Field label="Current password" required>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <Input
                    type={show.current ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={form.current_password}
                    onChange={set('current_password')}
                    className="pl-10 pr-10"
                  />
                  <button type="button" onClick={toggleShow('current')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--text)]">
                    {show.current ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <Field label="New password" required hint="At least 12 characters.">
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <Input
                    type={show.password ? 'text' : 'password'}
                    autoComplete="new-password"
                    minLength={12}
                    placeholder="••••••••••••"
                    value={form.password}
                    onChange={set('password')}
                    className="pl-10 pr-10"
                  />
                  <button type="button" onClick={toggleShow('password')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--text)]">
                    {show.password ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <Field label="Confirm new password" required>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <Input
                    type={show.confirmation ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={form.password_confirmation}
                    onChange={set('password_confirmation')}
                    className="pl-10 pr-10"
                  />
                  <button type="button" onClick={toggleShow('confirmation')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--text)]">
                    {show.confirmation ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>

              <div className="flex items-center gap-3 pt-1">
                <ShieldCheck size={16} className="text-indigo-500" />
                <p className="text-xs text-muted">Choose a strong password you have not used before.</p>
              </div>

              <div className="flex justify-end">
                <Button type="submit" loading={loading}>
                  <Save size={16} /> Update password
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}