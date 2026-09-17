import { createContext, useContext, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import Constants from 'expo-constants'
import { api, setToken, setUnauthorizedHandler } from '../services/api'
const AuthContext = createContext(null)
const KEY = 'cookmate.session'
const BIO = 'cookmate.biometric'
const protectedOptions = {
  requireAuthentication: true,
  authenticationPrompt: 'Mở khóa Cookmate',
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}
const storage = {
  get: (biometric = false) =>
    Platform.OS === 'web'
      ? Promise.resolve(sessionStorage.getItem(KEY))
      : SecureStore.getItemAsync(KEY, biometric ? protectedOptions : {}),
  set: (value, biometric = false) =>
    Platform.OS === 'web'
      ? Promise.resolve(value ? sessionStorage.setItem(KEY, value) : sessionStorage.removeItem(KEY))
      : value
        ? SecureStore.setItemAsync(KEY, value, biometric ? protectedOptions : {})
        : SecureStore.deleteItemAsync(KEY),
}
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [sessionError, setSessionError] = useState('')
  const [biometricEnabled, setBiometricEnabled] = useState(false)
  const clear = async () => {
    setToken(null)
    setUser(null)
    await storage.set(null)
    if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(BIO)
    setBiometricEnabled(false)
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
          if (active) setBiometricEnabled(true)
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
    // A fresh sign-in may belong to a different person; opt in again for that session.
    if (Platform.OS !== 'web') {
      await SecureStore.deleteItemAsync(KEY)
      await SecureStore.deleteItemAsync(BIO)
    }
    setBiometricEnabled(false)
    await storage.set(data.token)
    setToken(data.token)
    setUser(data.user)
    setSessionError('')
  }
  async function unlockBiometric() {
    if (!biometricEnabled) throw new Error('Hãy đăng nhập và bật sinh trắc học trong hồ sơ trước.')
    const token = await storage.get(true)
    if (!token)
      throw new Error('Phiên đã hết hạn hoặc sinh trắc học đã thay đổi. Hãy đăng nhập lại.')
    setToken(token)
    try {
      const r = await api('/auth/me')
      setUser(r.data)
      setSessionError('')
    } catch (e) {
      setToken(null)
      throw e
    }
  }
  async function enableBiometric() {
    if (Platform.OS === 'web' || Constants.executionEnvironment === 'storeClient')
      throw new Error('Tính năng này cần bản development build trên điện thoại.')
    if (
      !user ||
      !(await LocalAuthentication.hasHardwareAsync()) ||
      !(await LocalAuthentication.isEnrolledAsync()) ||
      !SecureStore.canUseBiometricAuthentication()
    )
      throw new Error('Hãy thiết lập Face ID hoặc vân tay trong cài đặt điện thoại trước.')
    const auth = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Bật mở khóa Cookmate',
      disableDeviceFallback: true,
      biometricsSecurityLevel: 'strong',
    })
    if (!auth.success) throw new Error('Chưa xác nhận sinh trắc học.')
    const token = await storage.get()
    if (!token) throw new Error('Hãy đăng nhập lại trước khi bật sinh trắc học.')
    await SecureStore.deleteItemAsync(KEY)
    try {
      await storage.set(token, true)
      await SecureStore.setItemAsync(BIO, '1')
      setBiometricEnabled(true)
    } catch (e) {
      await storage.set(token)
      throw e
    }
  }
  function lock() {
    setToken(null)
    setUser(null)
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
        biometricEnabled,
        enableBiometric,
        unlockBiometric,
        lock,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
export const useAuth = () => useContext(AuthContext)
