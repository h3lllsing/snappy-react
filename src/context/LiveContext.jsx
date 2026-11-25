import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as mock from '../data/mock'
import { navigateTo } from '../lib/navigation'
import api from '../lib/api'

const LiveCtx = createContext(null)
const USE_API = import.meta.env.VITE_USE_API === 'true'

export function LiveProvider({ children }) {
  // In real API mode never seed the UI with demo data: an empty DB must render
  // empty, otherwise stale mock mails/notifications keep showing forever.
  const [mails, setMails] = useState(USE_API ? [] : mock.mails)
  const [notifications, setNotifications] = useState(USE_API ? [] : mock.notifications)
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    if (!USE_API) return
    Promise.all([api.mails(), api.notifications()]).then(([m, n]) => {
      // Always replace, including with empty arrays — otherwise a fresh DB
      // leaves the initial demo rows visible.
      setMails(Array.isArray(m) ? m : [])
      setNotifications(Array.isArray(n) ? n : [])
    }).catch(() => {})
  }, [])

  const unread = useMemo(() => notifications.filter(n => !n.read && !n.deleted).length, [notifications])
  const inboxUnread = useMemo(() => mails.filter(m => m.unread).length, [mails])

  const addIncoming = useCallback((mail) => {
    setMails(prev => [mail, ...prev])
    setNotifications(prev => [{
      id: 'live-' + mail.mail_id,
      type: 'new_email',
      read: false,
      title: `New mail in ${mail.account}`,
      detail: `${mail.subject} — ${mail.from}`,
      time: 'just now',
      account_id: mail.account_id || 1,
      brand: mail.brand,
    }, ...prev])
    setPulse(p => p + 1)
  }, [])

  const markRead = useCallback((id) => {
    if (import.meta.env.VITE_USE_API === 'true') api.markNotificationRead(id).catch(() => {})
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setMails(prev => prev.map(m => m.id === Number(id) ? { ...m, unread: false } : m))
  }, [])

  const markAllRead = useCallback(() => {
    if (import.meta.env.VITE_USE_API === 'true') api.markAllRead().catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setMails(prev => prev.map(m => ({ ...m, unread: false })))
  }, [])

  const toggleDeleted = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, deleted: !n.deleted } : n))
  }, [])

  const openWebmail = useCallback((accountId) => navigateTo(`/webmail/${accountId || 1}`), [])

  return (
    <LiveCtx.Provider value={{ mails, notifications, unread, inboxUnread, pulse, addIncoming, markRead, markAllRead, toggleDeleted, openWebmail }}>
      {children}
    </LiveCtx.Provider>
  )
}

export const useLive = () => useContext(LiveCtx)
