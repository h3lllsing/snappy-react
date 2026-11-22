import { useState } from 'react'
import { Eye, EyeOff, KeyRound, Lock, Moon, Save, ShieldCheck, Sun, User } from 'lucide-react'
import { Alert, Avatar, Badge, Button, Card, CardBody, CardHeader, Divider, Field, Input, PageHeader, useToast } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

export default function Profile() {
  const { user, setUser } = useAuth()
  const { dark, toggle } = useTheme()
  const toast = useToast()
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    current_password: '',
    password: '',
    password_confirmation: '',
  })
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState({ current: false, password: false, confirmation: false })

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))
  const toggleShow = (key) => () => setShow(s => ({ ...s, [key]: !s[key] }))

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      toast('Name and email are required.', 'error', { title: 'Missing fields' })
      return
    }
    const changingPassword = Boolean(form.password || form.password_confirmation)
    if (changingPassword) {
      if (!form.current_password) {
        toast('Current password is required to change your password.', 'error', { title: 'Current password needed' })
        return
      }
      if (form.password.length < 8) {
        toast('New password must be at least 8 characters.', 'error', { title: 'Password too short' })
        return
      }
      if (form.password !== form.password_confirmation) {
        toast('New passwords do not match.', 'error', { title: 'Check your passwords' })
        return
      }
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 400))
    setUser(u => ({ ...u, name: form.name.trim(), email: form.email.trim() }))
    setForm(f => ({ ...f, current_password: '', password: '', password_confirmation: '' }))
    setLoading(false)
    toast('Your profile has been updated.', 'success', { title: 'Changes saved' })
    if (changingPassword) toast('Password updated (local reference)', 'success', { title: 'Password changed' })
  }

  return (
    <div className="animate-fade-up">
      <PageHeader title="My Profile" subtitle="Manage your account details, password and preferences." />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader title="Account information" subtitle="Update your personal details." />
            <CardBody>
              <form onSubmit={save} className="space-y-5">
                <input type="hidden" name="updated_at" value="local-reference" />
                <div className="flex items-center gap-3 pb-1">
                  <Avatar name={form.name} size="lg" />
                  <div>
                    <p className="font-semibold">{form.name || user?.name}</p>
                    <Badge role={user?.role} className="mt-1">{user?.role}</Badge>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" required>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <Input value={form.name} onChange={set('name')} className="pl-10" />
                    </div>
                  </Field>
                  <Field label="Email address" required>
                    <div className="relative">
                      <ShieldCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <Input type="email" value={form.email} onChange={set('email')} className="pl-10" />
                    </div>
                  </Field>
                </div>

                <Alert type="info">
                  Reference to BE optimistic lock (hidden updated_at field) — the backend will use it to prevent conflicting updates. Local demo only.
                </Alert>

                <Divider label="Change password" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Current password" hint="Required only when changing your password.">
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <Input type={show.current ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={form.current_password} onChange={set('current_password')} className="pl-10 pr-10" />
                      <button type="button" onClick={toggleShow('current')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--text)]">
                        {show.current ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>
                  <Field label="New password" hint="Leave blank to keep your current password.">
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <Input type={show.password ? 'text' : 'password'} autoComplete="new-password" minLength={8} placeholder="••••••••" value={form.password} onChange={set('password')} className="pl-10 pr-10" />
                      <button type="button" onClick={toggleShow('password')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--text)]">
                        {show.password ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirm new password">
                    <div className="relative">
                      <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <Input type={show.confirmation ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" value={form.password_confirmation} onChange={set('password_confirmation')} className="pl-10 pr-10" />
                      <button type="button" onClick={toggleShow('confirmation')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[var(--text)]">
                        {show.confirmation ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" loading={loading}><Save size={16} /> Save changes</Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Appearance" subtitle="Customize how the portal looks." />
            <CardBody>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl surface-2 border border-app flex items-center justify-center text-indigo-500">
                    {dark ? <Moon size={18} /> : <Sun size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Dark mode</p>
                    <p className="text-xs text-muted">{dark ? 'Currently enabled' : 'Currently disabled'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={toggle}
                  role="switch"
                  aria-checked={dark}
                  aria-label="Toggle dark mode"
                  className={`relative w-12 h-7 rounded-full transition-colors ${dark ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'surface-2 border border-app'}`}
                >
                  <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Account" subtitle="A quick summary of your account." />
            <CardBody className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted">User ID</span><span className="font-semibold">#{user?.id}</span></div>
              <Divider />
              <div className="flex justify-between"><span className="text-muted">Role</span><Badge role={user?.role}>{user?.role}</Badge></div>
              <Divider />
              <div className="flex justify-between"><span className="text-muted">Status</span><Badge variant="active" dot>Active</Badge></div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
