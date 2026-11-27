import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import api, { describeApiError } from '../lib/api'
import { connectEcho, disconnectEcho, startDemoStream } from '../lib/echo'
import { useToast } from '../components/ui'
import { useLive } from './LiveContext'
import { setBearerToken } from '../lib/http'

const AuthCtx = createContext(null)
const POLL_LIMIT = 50
const MAX_SEEN = 5000

const recordOf = (value) => {
  if (!value) return {}
  if (typeof value === 'string') {
    try { return JSON.parse(value) || {} } catch { return {} }
  }
  return typeof value === 'object' ? value : {}
}

// Map a real notification row to the mail shape consumed by LiveContext.
const mailFromNotification = (notification) => {
  const data = recordOf(notification?.data)
  const mailId = data.mail_id ?? notification?.mail_id
    ?? (notification?.type === 'new_email' ? notification?.id : undefined)
  if (mailId === undefined || mailId === null || mailId === '') return null
  const title = String(notification?.title || 'New notification')
  const account = data.account ?? notification?.account ?? (title.match(/in\s+([^\s@]+)/)?.[1] || 'mailbox')
  return {
    id: String(mailId),
    notificationId: notification?.id ?? notification?.notification_id,
    mail: {
      mail_id: mailId,
      account,
      account_id: data.account_id ?? notification?.account_id,
      brand: data.brand ?? notification?.brand,
      from: data.from ?? notification?.detail ?? '',
      subject: data.subject ?? title,
      unread: true,
    },
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const toast = useToast()
  const live = useLive()

  // Refs are created once: no mail arrival or re-render may reset the cursor
  // or the dedupe set. The latest context values are read through refs so the
  // polling effect only depends on the user id.
  const userRef = useRef(user)
  const toastRef = useRef(toast)
  const liveRef = useRef(live)
  userRef.current = user
  toastRef.current = toast
  liveRef.current = live
  const cursorRef = useRef(-1) // -1 means backfill (no cursor yet)
  const seenRef = useRef(new Set())
  const inFlightRef = useRef(false)
  const aliveRef = useRef(true)
  const timerRef = useRef(null)
  const failuresRef = useRef(0)

  useEffect(() => {
    api.me()
      .then(setUser)
      .catch(err => {
        if (err?.status === 401) return
        toastRef.current(describeApiError(err, 'Could not restore session.'), 'error', { title: 'Session check failed' })
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (credentials) => {
    const res = await api.login(credentials)
    setUser(res.user)
    return res
  }, [])

  const logout = useCallback(async () => {
    // Clear every queued notification before the session is discarded.
    toastRef.current.dismissAll?.()
    try {
      await api.logout()
    } catch {
      // even if the server call fails, clear the local session
    }
    aliveRef.current = false
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    inFlightRef.current = false
    cursorRef.current = -1
    seenRef.current = new Set()
    setBearerToken(null)
    setUser(null)
    disconnectEcho()
  }, [])

  useEffect(() => {
    if (!user?.id) return undefined

    aliveRef.current = true
    cursorRef.current = -1
    seenRef.current = new Set()
    inFlightRef.current = false
    failuresRef.current = 0
    if (timerRef.current) clearTimeout(timerRef.current)

    // The session token now exists: retry the initial live fetch that ran
    // before this provider mounted and may have been rejected with a 401.
    liveRef.current?.reload?.()

    const clearTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const remember = (entry) => {
      seenRef.current.add(entry)
      if (seenRef.current.size <= MAX_SEEN) return
      const excess = seenRef.current.size - MAX_SEEN
      const iterator = seenRef.current.values()
      for (let i = 0; i < excess; i += 1) seenRef.current.delete(iterator.next().value)
    }

    const raiseToast = (mail) => {
      toastRef.current(`${mail.from || ''} — ${mail.subject || ''}`, 'info', {
        title: `New mail in ${mail.account || 'mailbox'}`,
        duration: 8000,
        dedupeKey: `mail:${String(mail.mail_id)}`,
        action: {
          label: 'Open in SnappyMail',
          onClick: () => liveRef.current.openWebmail(mail.account_id),
        },
      })
    }

    const onEchoMail = (mail) => {
      if (!mail || mail.mail_id === undefined || mail.mail_id === null) return
      const mailKey = `mail:${String(mail.mail_id)}`
      if (seenRef.current.has(mailKey)) return
      remember(mailKey)
      liveRef.current.addIncoming(mail)
      raiseToast(mail)
    }

    const nextDelay = () => {
      const base = typeof document !== 'undefined' && document.hidden ? 15000 : 2000
      const failures = failuresRef.current
      return failures > 0 ? Math.min(base * (2 ** (failures - 1)), 30000) : base
    }

    async function runTick({ once = false } = {}) {
      if (!aliveRef.current) return
      if (inFlightRef.current) return
      inFlightRef.current = true
      let expired = false
      try {
        const cursor = cursorRef.current === -1 ? null : cursorRef.current
        const res = await api.notificationsPoll(cursor, { limit: POLL_LIMIT })
        if (!aliveRef.current) return
        const items = Array.isArray(res?.notifications) ? res.notifications : []
        const backfill = cursorRef.current === -1

        items.forEach(notification => {
          const entry = mailFromNotification(notification)
          if (!entry) return
          const { id, notificationId, mail } = entry
          const mailKey = `mail:${id}`
          const notifKey = notificationId != null ? `notif:${String(notificationId)}` : null
          const duplicate = seenRef.current.has(mailKey) || (notifKey && seenRef.current.has(notifKey))

          if (backfill || duplicate) {
            // Backfill seeds state and the dedupe set but never raises a toast.
            remember(mailKey)
            if (notifKey) remember(notifKey)
            if (!duplicate) liveRef.current.addIncoming(mail, notificationId ?? undefined)
            return
          }

          remember(mailKey)
          if (notifKey) remember(notifKey)
          liveRef.current.addIncoming(mail, notificationId ?? undefined)
          raiseToast(mail)
        })

        const next = res?.cursor ?? res?.next_cursor ?? res?.after
        cursorRef.current = next === undefined || next === null || next === '' ? -1 : next
        failuresRef.current = 0
      } catch (err) {
        if (!aliveRef.current) return
        expired = err?.status === 410
          || err?.response?.data?.error === 'cursor_expired'
          || err?.message === 'cursor_expired'
        if (expired) {
          cursorRef.current = -1
          failuresRef.current = 0
        } else {
          failuresRef.current = Math.min(failuresRef.current + 1, 10)
        }
      } finally {
        inFlightRef.current = false
        if (!aliveRef.current) return
        if (expired) {
          // Re-backfill immediately; no toast is raised for the replayed rows.
          timerRef.current = setTimeout(() => { timerRef.current = null; runTick({ once }) }, 0)
        } else if (!once) {
          const delay = nextDelay()
          const jitter = 0.8 + Math.random() * 0.4
          timerRef.current = setTimeout(() => { timerRef.current = null; runTick() }, Math.max(250, Math.round(delay * jitter)))
        }
      }
    }

    const onVisibilityChange = () => {
      clearTimer()
      if (!aliveRef.current) return
      // A hidden tab stops the repeating timer and gets one tick on the
      // visibility change; becoming visible resumes the fast cadence.
      runTick({ once: document.hidden })
    }

    const echo = connectEcho(userRef.current, { onNewEmail: onEchoMail })
    if (echo) {
      return () => { aliveRef.current = false; clearTimer(); disconnectEcho() }
    }
    if (import.meta.env.VITE_USE_API !== 'true') {
      const stopDemo = startDemoStream(onEchoMail)
      return () => { aliveRef.current = false; clearTimer(); stopDemo?.() }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    runTick({ once: document.hidden })
    return () => {
      aliveRef.current = false
      clearTimer()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [user?.id])

  const value = useMemo(() => ({ user, loading, login, logout, setUser }),
    [user, loading, login, logout])

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
