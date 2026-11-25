import { createContext, useContext, useEffect, useRef, useState } from 'react'
import api from '../lib/api'
import { connectEcho, disconnectEcho, startDemoStream } from '../lib/echo'
import { useToast } from '../components/ui'
import { useLive } from './LiveContext'
import { setBearerToken } from '../lib/http'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const live = useLive()

  useEffect(() => {
    api.me().then(setUser).catch(() => {}).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!user) return
    const seen = new Set()
    const onMail = (mail) => {
      if (!mail || !mail.mail_id) return
      const key = String(mail.mail_id)
      if (seen.has(key)) return
      seen.add(key)
      live.addIncoming(mail)
      toast(`${mail.from || ''} — ${mail.subject || ''}`, 'info', {
        title: `New mail in ${mail.account || 'mailbox'}`,
        duration: 8000,
        action: { label: 'Open in SnappyMail', onClick: () => live.openWebmail(mail.account_id) },
      })
    }
    const liveEcho = connectEcho(user, { onNewEmail: onMail })
    if (liveEcho) return () => disconnectEcho()
    if (import.meta.env.VITE_USE_API !== 'true') return startDemoStream(onMail)

    // Live demo against the real DB: poll the notification cursor endpoint.
    let alive = true
    let cursor = null
    const tick = async () => {
      try {
        const res = await api.notificationsPoll(cursor)
        if (!alive || !res) return
        const items = res.notifications || []
        if (cursor !== null && items.length) {
          items.forEach(n => onMail({
            mail_id: Number(n.data?.mail_id ?? n.mail_id ?? n.id) || Date.now(),
            account: (n.title || '').match(/in\s+([^\s]+)/)?.[1] || 'mailbox',
            account_id: n.data?.account_id ?? n.account_id,
            brand: (n.title || '').match(/in\s+([^\s]+)/)?.[1]?.split('@')[1] || 'portal',
            from: n.detail || '',
            subject: n.title || 'New notification',
            time: 'just now',
            unread: true,
          }))
        }
        cursor = res.cursor ?? cursor ?? 0
      } catch { /* keep polling */ }
    }
    tick()
    // Fast poll so a newly synced mail raises `pulse` within ~2s; the webmail
    // iframe then forces an immediate SnappyMail list refresh via postMessage.
    const id = setInterval(tick, 2000)
    return () => { alive = false; clearInterval(id) }
  }, [user, toast, live])

  const login = async (credentials) => {
    const res = await api.login(credentials)
    setUser(res.user)
    return res
  }
  const logout = async () => {
    try {
      await api.logout()
    } catch {
      // even if the server call fails, clear the local session
    }
    setBearerToken(null)
    setUser(null)
    disconnectEcho()
  }

  return <AuthCtx.Provider value={{ user, loading, login, logout, setUser }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
