import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { navigateTo } from '../lib/navigation'
import api from '../lib/api'

const LiveCtx = createContext(null)

export function LiveProvider({ children }) {
  // The API is the only source of live state: an empty backend renders empty.
  const [mails, setMails] = useState([])
  const [notifications, setNotifications] = useState([])
  const [pulse, setPulse] = useState(0)

  useEffect(() => {
    Promise.all([api.mails(), api.notifications()]).then(([m, n]) => {
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
    api.markNotificationRead(id).catch(() => {})
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setMails(prev => prev.map(m => m.id === Number(id) ? { ...m, unread: false } : m))
  }, [])

  const markAllRead = useCallback(() => {
    api.markAllRead().catch(() => {})
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
