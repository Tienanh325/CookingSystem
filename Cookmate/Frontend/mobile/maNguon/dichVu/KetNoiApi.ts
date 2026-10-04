import { Platform } from 'react-native'
import Constants from 'expo-constants'

const cauHinh = process.env.EXPO_PUBLIC_API_URL
const laDiaChiNoiBo = (hostname: string) =>
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  /^10\./.test(hostname) ||
  /^192\.168\./.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)

const layHostname = (value?: string | null) => {
  if (!value) return ''
  try {
    return new URL(value.includes('://') ? value : `http://${value}`).hostname
  } catch {
    return ''
  }
}

// Expo cung cap IP cua may dang chay Metro. Dung IP nay cho backend giup
// dien thoai qua Wi-Fi goi duoc may tinh qua LAN, ke ca khi DHCP doi IP.
const hostnameMayPhatTrien = () => {
  if (Platform.OS === 'web') return ''
  const constants = Constants as typeof Constants & {
    manifest?: { debuggerHost?: string }
    manifest2?: { extra?: { expoClient?: { hostUri?: string } } }
  }
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
    constants.manifest2?.extra?.expoClient?.hostUri,
    constants.manifest?.debuggerHost,
  ]
  for (const candidate of candidates) {
    const hostname = layHostname(candidate)
    if (hostname && laDiaChiNoiBo(hostname) && hostname !== 'localhost' && hostname !== '127.0.0.1')
      return hostname
  }
  return ''
}

const diaChiWebNoiBo = () => {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !laDiaChiNoiBo(window.location.hostname))
    return ''
  if (cauHinh) {
    try {
      const url = new URL(cauHinh)
      url.hostname = window.location.hostname
      return url.toString()
    } catch {}
  }
  return `${window.location.protocol}//${window.location.hostname}:8080/api`
}

const diaChiNative = () => {
  if (Platform.OS === 'web') return ''
  const hostname = hostnameMayPhatTrien()
  if (cauHinh) {
    try {
      const url = new URL(cauHinh)
      if (hostname && laDiaChiNoiBo(url.hostname)) url.hostname = hostname
      return url.toString()
    } catch {
      return cauHinh
    }
  }
  return hostname ? `http://${hostname}:8080/api` : ''
}

const DIA_CHI_GOC = (diaChiWebNoiBo() || diaChiNative() || (Platform.OS === 'web' ? '/api' : '')).replace(
  /\/$/,
  '',
)
let token = null,
  unauthorized = null
export const datMaTruyCap = (value) => {
  token = value
}
export const datXuLyChuaXacThuc = (handler) => {
  unauthorized = handler
}
type TuyChonApi = {
  method?: string
  body?: unknown
  signal?: AbortSignal
}

const laLoiHuyYeuCau = (error: any) =>
  error?.name === 'AbortError' ||
  /FetchRequestCanceledException|request (?:has been )?cancel(?:ed|led)|aborted/i.test(
    error?.message || '',
  )

const laLoiMang = (error: any) =>
  error instanceof TypeError || /Network request failed|Failed to fetch|Load failed/i.test(error?.message || '')

export async function goiApi(
  path: string,
  { method = 'GET', body, signal }: TuyChonApi = {},
) {
  if (!DIA_CHI_GOC)
    throw new Error('Chưa có địa chỉ máy chủ. Cấu hình EXPO_PUBLIC_API_URL trong .env của app.')
  const controller = new AbortController(),
    timeout = setTimeout(() => controller.abort(), 15000)
  const abort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  signal?.addEventListener('abort', abort)
  try {
    const response = await fetch(DIA_CHI_GOC + path, {
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
  } catch (e: any) {
    if (laLoiHuyYeuCau(e) && !signal?.aborted)
      throw new Error(`Kết nối máy chủ ${DIA_CHI_GOC} quá thời gian. Vui lòng thử lại.`)
    if (laLoiMang(e))
      throw new Error(`Không kết nối được máy chủ ${DIA_CHI_GOC}. Hãy kiểm tra mạng LAN/Wi-Fi.`)
    throw e
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
export const duongDanAnh = (value) =>
  !value ? '' : /^https?:\/\//i.test(value) ? value : DIA_CHI_GOC.replace(/\/api$/, '') + value
export const dinhDangNgay = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '')
