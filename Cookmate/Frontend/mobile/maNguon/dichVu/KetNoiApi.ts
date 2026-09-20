import { Platform } from 'react-native'
const cauHinh = process.env.EXPO_PUBLIC_API_URL
const DIA_CHI_GOC = (cauHinh || (Platform.OS === 'web' ? '/api' : '')).replace(/\/$/, '')
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
export const duongDanAnh = (value) =>
  !value ? '' : /^https?:\/\//i.test(value) ? value : DIA_CHI_GOC.replace(/\/api$/, '') + value
export const dinhDangNgay = (value) => (value ? new Date(value).toLocaleDateString('vi-VN') : '')
