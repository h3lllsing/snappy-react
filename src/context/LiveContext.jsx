import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { navigateTo } from '../lib/navigation'
import api from '../lib/api'

const LiveCtx = createContext(null)

const mailKey = (mail) => String(mail?.mail_id ?? mail?.id ?? '')
const notificationKey = (notification) => String(notification?.id ?? notification?.notification_id ?? '')

// Merge server rows into any rows already delivered live without duplicating
// either side; live rows keep their place at the head of the list.
const mergeRows = (current, incoming, keyOf) => {
  const byKey = new Map()
  current.forEach(row => byKey.set(keyOf(row), row))
  incoming.forEach(row => {
    const key = keyOf(row)
    if (!key) return
    byKey.set(key, byKey.has(key) ? { ...byKey.get(key), ...row } : row)
  })
  return [...byKey.values()]
}

export function LiveProvider({ children }) {
  // The API is the only source of live state: an empty backend renders empty.
  const [mails, setMails] = useState([])
  const [notifications, setNotifications] = useState([])
  const [pulse, setPulse] = useState(0)
  const seenMailRef = useRef(new Set())

  useEffect(() => {
    let alive = true
    Promise.all([api.mails(), api.notifications()]).then(([m, n]) => {
      if (!alive) return
      const mailRows = Array.isArray(m) ? m : []
      const notificationRows = Array.isArray(n) ? n : []
      mailRows.forEach(row => seenMailRef.current.add(mailKey(row)))
      setMails(prev => mergeRows(prev, mailRows, mailKey))
      setNotifications(prev => mergeRows(prev, notificationRows, notificationKey))
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  const unread = useMemo(() => notifications.filter(n => !n.read && !n.deleted).length, [notifications])
  const inboxUnread = useMemo(() => mails.filter(m => m.unread).length, [mails])

  // `notificationId` is the real server row id when the caller has one, so
  // markRead() can PUT to that row instead of a synthetic local id.
  const addIncoming = useCallback((mail, notificationId) => {
    if (!mail) return
    const key = mailKey(mail)
    if (!key || key === 'undefined' || key === 'null' || seenMailRef.current.has(key)) return
    seenMailRef.current.add(key)

    const id = mail.mail_id ?? mail.id ?? key
    const normalized = { ...mail, id, mail_id: id }
    const serverId = notificationId ?? mail.notification_id ?? mail.notificationId
    const stableId = String(serverId ?? `live-${key}`)

    setMails(prev => [normalized, ...prev.filter(row => mailKey(row) !== key)])
    setNotifications(prev => {
      const notification = {
        id: stableId,
        ...(serverId != null ? { notification_id: serverId } : {}),
        mail_id: id,
        type: 'new_email',
        read: false,
        title: `New mail in ${normalized.account || 'mailbox'}`,
        detail: `${normalized.subject || ''} — ${normalized.from || ''}`,
        time: 'just now',
        account_id: normalized.account_id || 1,
        brand: normalized.brand,
      }
      if (prev.some(row => notificationKey(row) === stableId)) return prev
      return [notification, ...prev]
    })
    setPulse(p => p + 1)
  }, [])

  const markRead = useCallback((id) => {
    const key = String(id)
    api.markNotificationRead(id).catch(() => {})
    setNotifications(prev => prev.map(n => notificationKey(n) === key ? { ...n, read: true } : n))
    setMails(prev => prev.map(m => {
      const rowKey = mailKey(m)
      return rowKey === key || String(m.id) === key ? { ...m, unread: false } : m
    }))
  }, [])

  const markAllRead = useCallback(() => {
    api.markAllRead().catch(() => {})
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setMails(prev => prev.map(m => ({ ...m, unread: false })))
  }, [])

  const toggleDeleted = useCallback((id) => {
    const key = String(id)
    setNotifications(prev => prev.map(n => notificationKey(n) === key ? { ...n, deleted: !n.deleted } : n))
  }, [])

  const openWebmail = useCallback((accountId) => navigateTo(`/webmail/${accountId || 1}`), [])

  // Stable object identity keeps AuthContext's poll effect from being torn
  // down and recreated on every mail that arrives.
  const value = useMemo(() => ({
    mails, notifications, unread, inboxUnread, pulse,
    addIncoming, markRead, markAllRead, toggleDeleted, openWebmail,
  }), [mails, notifications, pulse, unread, inboxUnread, addIncoming, markRead, markAllRead, toggleDeleted, openWebmail])

  return <LiveCtx.Provider value={value}>{children}</LiveCtx.Provider>
}

export const useLive = () => useContext(LiveCtx)
