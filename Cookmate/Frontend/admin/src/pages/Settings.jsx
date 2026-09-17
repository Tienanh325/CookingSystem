import { useState } from 'react'
import { useAuth } from '../context/auth'
import { api, session } from '../lib/api'
import { Alert, Button, Field, PageTitle } from '../components/ui'
export default function Settings() {
  const { user, setUser } = useAuth(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState('')
  async function save(e, password = false) {
    e.preventDefault()
    const body = Object.fromEntries(new FormData(e.currentTarget))
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      if (password) {
        if (body.matKhauMoi !== body.confirm) throw new Error('Mật khẩu xác nhận chưa khớp.')
        delete body.confirm
        await api('/auth/change-password', { method: 'PATCH', body })
        session.set(null)
        setUser(null)
      } else {
        const r = await api('/auth/me', { method: 'PATCH', body })
        setUser(r.data)
        setSuccess('Đã cập nhật thông tin tài khoản.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageTitle title="Cài đặt tài khoản" description="Thông tin cá nhân và bảo mật của bạn." />
      <Alert>{error}</Alert>
      <Alert success>{success}</Alert>
      <div className="dashboard-grid">
        <section className="panel form-panel">
          <h2>Thông tin cá nhân</h2>
          <form onSubmit={save}>
            <Field
              label="Họ và tên"
              name="hoTen"
              required
              defaultValue={user.hoTen}
              maxLength={100}
            />
            <Field label="Email" type="email" value={user.email} readOnly />
            <Field
              label="Số điện thoại"
              name="soDienThoai"
              defaultValue={user.soDienThoai || ''}
              maxLength={20}
            />
            <Button disabled={busy}>Lưu thông tin</Button>
          </form>
        </section>
        <section className="panel form-panel">
          <h2>Đổi mật khẩu</h2>
          <p className="muted">Bạn sẽ đăng xuất khỏi mọi thiết bị sau khi đổi mật khẩu.</p>
          <form onSubmit={(e) => save(e, true)}>
            <Field
              label="Mật khẩu hiện tại"
              type="password"
              name="matKhauCu"
              autoComplete="current-password"
              required
            />
            <Field
              label="Mật khẩu mới"
              type="password"
              name="matKhauMoi"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <Field
              label="Xác nhận mật khẩu mới"
              type="password"
              name="confirm"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <Button disabled={busy}>Đổi mật khẩu</Button>
          </form>
        </section>
      </div>
    </>
  )
}
