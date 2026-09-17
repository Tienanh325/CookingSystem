import { Platform } from 'react-native'
const configured = process.env.EXPO_PUBLIC_API_URL
const BASE = (configured || (Platform.OS === 'web' ? '/api' : '')).replace(/\/$/, '')
let token = null,
  unauthorized = null
export const setToken = (value) => {
  token = value
}
export const setUnauthorizedHandler = (handler) => {
  unauthorized = handler
}
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
    if (e.name === 'AbortError' && !signal?.aborted)
      throw new Error('Kết nối quá thời gian. Vui lòng thử lại.')
    if (e instanceof TypeError)
      throw new Error('Không kết nối được máy chủ. Hãy kiểm tra mạng và thử lại.')
    throw e
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
export const imageUrl = (value) =>
  !value ? '' : /^https?:\/\//i.test(value) ? value : BASE.replace(/\/api$/, '') + value
export const date = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '')
