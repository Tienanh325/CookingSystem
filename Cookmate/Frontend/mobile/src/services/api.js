import { Platform } from 'react-native'
import Constants from 'expo-constants'

const configured = process.env.EXPO_PUBLIC_API_URL
const isLocalAddress = (hostname) =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  /^10\./.test(hostname) ||
  /^192\.168\./.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)

const hostnameFrom = (value) => {
  if (!value) return ''
  try {
    return new URL(value.includes('://') ? value : `http://${value}`).hostname
  } catch {
    return ''
  }
}

const developmentHost = () => {
  if (Platform.OS === 'web') return ''
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    Constants.manifest2?.extra?.expoClient?.hostUri,
    Constants.manifest?.debuggerHost,
  ]
  for (const candidate of candidates) {
    const hostname = hostnameFrom(candidate)
    if (hostname && isLocalAddress(hostname) && hostname !== 'localhost' && hostname !== '127.0.0.1')
      return hostname
  }
  return ''
}

const localWebApi = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !isLocalAddress(window.location.hostname))
    return ''
  if (configured) {
    try {
      const url = new URL(configured)
      url.hostname = window.location.hostname
      return url.toString()
    } catch {}
  }
  return `${window.location.protocol}//${window.location.hostname}:8080/api`
}

const nativeApi = () => {
  if (Platform.OS === 'web') return ''
  const hostname = developmentHost()
  if (configured) {
    try {
      const url = new URL(configured)
      if (hostname && isLocalAddress(url.hostname)) url.hostname = hostname
      return url.toString()
    } catch {
      return configured
    }
  }
  return hostname ? `http://${hostname}:8080/api` : ''
}

const BASE = (localWebApi() || nativeApi() || (Platform.OS === 'web' ? '/api' : '')).replace(/\/$/, '')
let token = null,
  unauthorized = null
export const setToken = (value) => {
  token = value
}
export const setUnauthorizedHandler = (handler) => {
  unauthorized = handler
}
const isCanceledRequest = (error) =>
  error?.name === 'AbortError' ||
  /FetchRequestCanceledException|request (?:has been )?cancel(?:ed|led)|aborted/i.test(
    error?.message || '',
  )
const isNetworkError = (error) =>
  error instanceof TypeError || /Network request failed|Failed to fetch|Load failed/i.test(error?.message || '')
export async function api(path, { method = 'GET', body, signal } = {}) {
  if (!BASE)
    throw new Error('Chưa có địa chỉ máy chủ. Cấu hình EXPO_PUBLIC_API_URL trong .env của app.')
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 15000)
  const abort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', abort)
  try {
    const response = await fetch(BASE + path, {
      method,
      signal: controller.signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined || method === 'GET' ? {} : { body: JSON.stringify(body) }),
    })
    const result = await response
      .json()
      .catch(() => ({ message: 'Máy chủ trả về dữ liệu không hợp lệ.' }))
    if (!response.ok) {
      if (response.status === 401 && token) unauthorized?.()
      throw Object.assign(
        new Error(result.details?.join('\n') || result.message || 'Thao tác không thành công.'),
        { status: response.status },
      )
    }
    return result
  } catch (e) {
    if (isCanceledRequest(e) && !signal?.aborted)
      throw new Error(`Kết nối máy chủ ${BASE} quá thời gian. Vui lòng thử lại.`)
    if (isNetworkError(e))
      throw new Error(`Không kết nối được máy chủ ${BASE}. Hãy kiểm tra mạng LAN/Wi-Fi.`)
    throw e
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
export const imageUrl = (value) =>
  !value ? '' : /^https?:\/\//i.test(value) ? value : BASE.replace(/\/api$/, '') + value
export const date = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '')
