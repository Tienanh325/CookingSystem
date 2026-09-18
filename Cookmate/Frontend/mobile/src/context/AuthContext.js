import { createContext, useContext, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { api, setToken, setUnauthorizedHandler } from '../services/api'
const AuthContext = createContext(null)
const KEY = 'cookmate.session'
const BIO = 'cookmate.biometric'
const storage = {
  get: () =>
    Platform.OS === 'web'
      ? Promise.resolve(sessionStorage.getItem(KEY))
      : SecureStore.getItemAsync(KEY),
  set: (value) =>
    Platform.OS === 'web'
      ? Promise.resolve(value ? sessionStorage.setItem(KEY, value) : sessionStorage.removeItem(KEY))
      : value
        ? SecureStore.setItemAsync(KEY, value)
        : SecureStore.deleteItemAsync(KEY),
}
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [sessionError, setSessionError] = useState('')
  const clear = async () => {
    setToken(null)
    setUser(null)
    await storage.set(null)
    if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(BIO)
  }
  useEffect(() => {
    let active = true
    setUnauthorizedHandler(() => {
      clear().catch(() => {})
      setSessionError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
    })
    Promise.resolve()
      .then(async () => {
        if (Platform.OS !== 'web' && (await SecureStore.getItemAsync(BIO)) === '1') {
          // Remove the retired protected session without prompting for biometrics.
          await SecureStore.deleteItemAsync(KEY)
          await SecureStore.deleteItemAsync(BIO)
          return null
        }
        return storage.get()
      })
      .then(async (token) => {
        if (token) {
          setToken(token)
          const result = await api('/auth/me')
          if (active) setUser(result.data)
        }
      })
      .catch((e) => {
        if (active) setSessionError(e.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      setUnauthorizedHandler(null)
    }
  }, [])
  async function authenticate(body, register = false) {
    const r = await api(register ? '/auth/register' : '/auth/login', { method: 'POST', body })
    await acceptSession(r.data)
  }
  async function acceptSession(data) {
    // Clear legacy storage before saving a fresh session.
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(KEY)
      await SecureStore.deleteItemAsync(BIO)
    }
    await storage.set(data.token)
    setToken(data.token)
    setUser(data.user)
    setSessionError('')
  }
  async function logout() {
    await api('/auth/logout', { method: 'POST', body: {} })
    await clear()
  }
  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        authenticate,
        acceptSession,
        logout,
        clear,
        sessionError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
export const useAuth = () => useContext(AuthContext)
