import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import {
  ChefHat,
  LayoutDashboard,
  UtensilsCrossed,
  Layers3,
  Carrot,
  Users,
  ShieldCheck,
  MessageSquare,
  Star,
  Bell,
  History,
  Settings,
  LogOut,
  Menu,
  Search,
  X,
  ListChecks,
  CreditCard,
} from 'lucide-react'
import { useAuth } from '../context/auth'
import useResource from '../lib/useResource'
const groups = [
  ['TỔNG QUAN', [['/', 'Bảng điều khiển', LayoutDashboard]]],
  [
    'QUẢN LÝ NỘI DUNG',
    [
      ['/recipes', 'Công thức món ăn', UtensilsCrossed],
      ['/submissions', 'Kiểm duyệt bài đăng', ListChecks],
      ['/categories', 'Danh mục', Layers3],
      ['/ingredients', 'Nguyên liệu', Carrot],
    ],
  ],
  [
    'CỘNG ĐỒNG & HỆ THỐNG',
    [
      ['/users', 'Người dùng', Users],
      ['/payments', 'Thanh toán', CreditCard],
      ['/roles', 'Vai trò', ShieldCheck],
      ['/comments', 'Bình luận', MessageSquare],
      ['/reviews', 'Đánh giá', Star],
      ['/notifications', 'Thông báo', Bell],
      ['/logs', 'Nhật ký hoạt động', History],
    ],
  ],
]
export default function Layout() {
  const { user, logout } = useAuth(),
    [open, setOpen] = useState(false),
    [search, setSearch] = useState(''),
    navigate = useNavigate(),
    unread = useResource('/thong-bao?daDoc=0&limit=1')
  useEffect(() => {
    const timer = window.setInterval(unread.reload, 15000)
    return () => window.clearInterval(timer)
  }, [unread.reload])
  return (
    <div className="admin-layout">
      {open && (
        <button className="sidebar-overlay" aria-label="Đóng menu" onClick={() => setOpen(false)} />
      )}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Link className="brand" to="/">
          <span className="brand-mark">
            <ChefHat />
          </span>
          Cookmate<span className="brand-dot">.</span>
        </Link>
        <span className="workspace-label">ADMIN WORKSPACE</span>
        <button
          className="icon-button mobile-close"
          aria-label="Đóng menu"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <nav>
          {groups.map(([title, links]) => (
            <div className="nav-group" key={title}>
              <p>{title}</p>
              {links.map(([to, label, Icon]) => (
                <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>
                  <Icon size={19} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink to="/settings">
            <Settings size={18} />
            Cài đặt tài khoản
          </NavLink>
          <button onClick={() => logout().catch(() => {})}>
            <LogOut size={18} />
            Đăng xuất
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Mở menu"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <form
            className="top-search"
            onSubmit={(e) => {
              e.preventDefault()
              navigate(`/recipes?q=${encodeURIComponent(search)}`)
            }}
          >
            <Search size={18} />
            <input
              aria-label="Tìm công thức"
              placeholder="Tìm công thức trong bếp của bạn…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          <div className="topbar-actions">
            <Link className="icon-button notification-bell" to="/notifications" aria-label={`Thông báo${unread.meta?.totalItems ? `, ${unread.meta.totalItems} chưa đọc` : ''}`}>
              <Bell size={21} />
              {!!unread.meta?.totalItems && <span>{Math.min(unread.meta.totalItems, 99)}</span>}
            </Link>
            <span className="divider" />
            <Link className="user-chip" to="/settings">
              <span className="avatar">{user.hoTen?.charAt(0)}</span>
              <span>
                <strong>{user.hoTen}</strong>
                <small>Quản trị viên</small>
              </span>
            </Link>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          © {new Date().getFullYear()} Cookmate <span>Mang niềm vui vào từng căn bếp.</span>
        </footer>
      </div>
    </div>
  )
}
