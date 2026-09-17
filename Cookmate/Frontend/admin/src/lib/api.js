const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
export const session = {
  get: () => sessionStorage.getItem('cookmate.admin.token'),
  set: (token) =>
    token
      ? sessionStorage.setItem('cookmate.admin.token', token)
      : sessionStorage.removeItem('cookmate.admin.token'),
}
export async function api(path, { method = 'GET', body, signal } = {}) {
  const token = session.get()
  let response
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      signal,
      headers: {
        ...(body instanceof FormData
          ? {}
          : body !== undefined
            ? { 'Content-Type': 'application/json' }
            : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new Error('Không kết nối được máy chủ. Vui lòng thử lại.')
  }
  const result = await response
    .json()
    .catch(() => ({ message: 'Máy chủ trả về dữ liệu không hợp lệ.' }))
  if (!response.ok) {
    if (response.status === 401 && token) {
      session.set(null)
      window.dispatchEvent(new Event('session-expired'))
    }
    throw new Error(result.details?.join('\n') || result.message || 'Thao tác không thành công.')
  }
  return result
}
export async function all(path) {
  let page = 1,
    rows = [],
    result
  do {
    result = await api(`${path}${path.includes('?') ? '&' : '?'}limit=100&page=${page++}`)
    rows = rows.concat(result.data)
  } while (page <= result.meta.totalPages)
  return rows
}
export function imageUrl(value) {
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return BASE.replace(/\/api$/, '') + value
}
export const date = (value) =>
  value
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—'
