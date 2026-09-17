import { useEffect, useState } from 'react'
import { api, session } from '../lib/api'
import { AuthContext, isAdmin } from './auth'
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(() => Boolean(session.get()))
  useEffect(() => {
    let active = true
    const expire = () => setUser(null)
    window.addEventListener('session-expired', expire)
    if (session.get())
      api('/auth/me')
        .then((r) => {
          if (active) setUser(r.data)
        })
        .catch(() => {})
        .finally(() => {
          if (active) setLoading(false)
        })
    return () => {
      active = false
      window.removeEventListener('session-expired', expire)
    }
  }, [])
  async function login(body) {
    const r = await api('/auth/login', { method: 'POST', body })
    if (!isAdmin(r.data.user))
      throw new Error(
        'Tài khoản chưa có quyền quản trị. Hãy đăng nhập trên ứng dụng khách hàng hoặc liên hệ quản trị viên.',
      )
    session.set(r.data.token)
    setUser(r.data.user)
  }
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST', body: {} })
    } finally {
      session.set(null)
      setUser(null)
    }
  }
  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
