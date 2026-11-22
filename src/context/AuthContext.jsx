import { createContext, useContext, useEffect, useState } from 'react'
import api from '../lib/api'
import { disconnectEcho, startDemoStream } from '../lib/echo'
import { useToast } from '../components/ui'
import { useLive } from './LiveContext'

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
    return startDemoStream((mail) => {
      live.addIncoming(mail)
      toast(`${mail.from} — ${mail.subject}`, 'info', {
        title: `New mail in ${mail.account} · ${mail.brand}`,
        duration: 8000,
        action: { label: 'Open in SnappyMail', onClick: () => live.openWebmail(mail.account_id) },
      })
    })
  }, [user, toast, live])

  const login = async (credentials) => {
    const res = await api.login(credentials)
    setUser(res.user)
    return res
  }
  const logout = () => { setUser(null); disconnectEcho() }

  return <AuthCtx.Provider value={{ user, loading, login, logout, setUser }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
