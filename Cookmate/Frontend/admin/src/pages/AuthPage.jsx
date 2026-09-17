import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ChefHat, ArrowRight, Leaf, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { useAuth, isAdmin } from '../context/auth'
import { api } from '../lib/api'
import { Alert, Button, Field } from '../components/ui'
export default function AuthPage({ register = false }) {
  const { user, login } = useAuth(),
    navigate = useNavigate()
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [visible, setVisible] = useState(false)
  if (isAdmin(user)) return <Navigate to="/" replace />
  async function submit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setBusy(true)
    const data = Object.fromEntries(new FormData(e.currentTarget))
    try {
      if (register) {
        if (data.matKhau !== data.confirm) throw new Error('Mật khẩu xác nhận chưa khớp.')
        delete data.confirm
        await api('/auth/register', { method: 'POST', body: data })
        setSuccess(
          'Đã tạo tài khoản khách hàng. Quyền quản trị cần được quản trị viên hiện có cấp.',
        )
      } else {
        await login(data)
        navigate('/')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="auth-layout">
      <section className="auth-story">
        <Link className="brand" to="/login">
          <span className="brand-mark">
            <ChefHat />
          </span>
          Cookmate<span className="brand-dot">.</span>
        </Link>
        <div>
          <span className="pill">
            <Leaf size={14} /> MỖI BỮA ĂN, MỘT NIỀM VUI
          </span>
          <h1>
            Chăm chút công thức.
            <br />
            <em>Gắn kết bữa cơm.</em>
          </h1>
          <p>Một không gian để bạn nuôi dưỡng kho công thức và mang cảm hứng nấu ăn đến mọi nhà.</p>
          <div className="auth-art">
            <ChefHat size={92} strokeWidth={1} />
            <span>made with care</span>
          </div>
        </div>
        <p className="auth-foot">Cookmate · Không gian quản trị nội dung</p>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <span className="section-icon">
            <ShieldCheck />
          </span>
          <p className="eyebrow">CHÀO MỪNG ĐẾN COOKMATE</p>
          <h2>{register ? 'Tạo tài khoản mới' : 'Mừng bạn trở lại'}</h2>
          <p className="muted">
            {register
              ? 'Bắt đầu hành trình nấu ăn của bạn.'
              : 'Đăng nhập để chăm sóc không gian bếp của bạn.'}
          </p>
          <form onSubmit={submit}>
            {register && (
              <Field
                label="Họ và tên"
                name="hoTen"
                autoComplete="name"
                required
                maxLength={100}
                placeholder="Nhập họ và tên"
              />
            )}
            <Field
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="ban@example.com"
            />
            <Field label="Mật khẩu">
              <div className="password-input">
                <input
                  name="matKhau"
                  type={visible ? 'text' : 'password'}
                  required
                  minLength={register ? 8 : 1}
                  autoComplete={register ? 'new-password' : 'current-password'}
                  placeholder={register ? 'Ít nhất 8 ký tự' : 'Nhập mật khẩu'}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>
            {register && (
              <Field
                label="Xác nhận mật khẩu"
                name="confirm"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu"
              />
            )}
            <Alert>{error}</Alert>
            <Alert success>{success}</Alert>
            <Button className="full" disabled={busy}>
              {busy ? 'Đang xử lý…' : register ? 'Đăng ký' : 'Đăng nhập'}
              <ArrowRight size={18} />
            </Button>
          </form>
          <p className="auth-switch">
            {register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
            <Link to={register ? '/login' : '/register'}>{register ? 'Đăng nhập' : 'Đăng ký'}</Link>
          </p>
          <p className="small muted">
            Chỉ tài khoản được cấp quyền quản trị mới truy cập được bảng điều khiển.
          </p>
        </div>
      </section>
    </div>
  )
}
