import { cloneElement, isValidElement, useEffect, useRef } from 'react'
import {
  X,
  Search,
  Inbox,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from 'lucide-react'
export function Button({ children, variant = '', className = '', ...props }) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  )
}
export function Alert({ children, success = false }) {
  return children ? (
    <div
      className={`alert ${success ? 'success' : ''}`}
      role={success ? 'status' : 'alert'}
    >
      {children}
    </div>
  ) : null
}
export function PageTitle({
  eyebrow = 'KHÔNG GIAN QUẢN TRỊ',
  title,
  description,
  children,
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {children}
    </div>
  )
}
export function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children ? (
        isValidElement(children) &&
        ['select', 'textarea', 'input'].includes(children.type) ? (
          cloneElement(children, { 'aria-label': label })
        ) : (
          children
        )
      ) : (
        <input aria-label={label} {...props} />
      )}
    </label>
  )
}
export function Status({ active }) {
  return (
    <span className={`badge ${active ? 'green' : 'gray'}`}>
      <i />
      {active ? 'Đang hoạt động' : 'Đã ẩn / khóa'}
    </span>
  )
}
export function SearchBox({ value, onChange, placeholder = 'Tìm kiếm…' }) {
  return (
    <div className="searchbox">
      <Search size={18} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
export function ResourceState({ loading, error, empty, reload }) {
  if (loading)
    return (
      <div className="empty">
        <LoaderCircle className="spin" size={28} />
        <p>Đang tải dữ liệu…</p>
      </div>
    )
  if (error)
    return (
      <div className="empty">
        <Alert>{error}</Alert>
        <Button variant="secondary" onClick={reload}>
          Thử lại
        </Button>
      </div>
    )
  if (empty)
    return (
      <div className="empty">
        <Inbox size={38} />
        <h3>Chưa có dữ liệu</h3>
        <p>Nội dung mới sẽ xuất hiện tại đây.</p>
      </div>
    )
  return null
}
export function Pagination({ meta, page, onChange, limit, onLimitChange }) {
  useEffect(() => {
    if (meta && page > meta.totalPages) onChange(Math.max(1, meta.totalPages))
  }, [meta, page, onChange])
  if (!meta) return null
  const total = Math.max(1, meta.totalPages)
  const pages = [...new Set([1, page - 1, page, page + 1, total])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b)
  const start = meta.totalItems ? (page - 1) * meta.limit + 1 : 0
  return (
    <nav className="pagination" aria-label="Phân trang">
      <span aria-live="polite">
        {start}–{Math.min(page * meta.limit, meta.totalItems)} /{' '}
        {meta.totalItems} kết quả · Trang {page}/{total}
      </span>
      {onLimitChange && (
        <label className="page-size">
          Số mục/trang
          <select
            aria-label="Số mục mỗi trang"
            value={limit}
            onChange={(e) => {
              onLimitChange(Number(e.target.value))
              onChange(1)
            }}
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
      <Button
        variant="secondary"
        aria-label="Trang trước"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeft size={18} />
      </Button>
      {pages.map((n, i) => (
        <span key={n} className="page-number">
          {i > 0 && n > pages[i - 1] + 1 && <span aria-hidden="true">…</span>}
          <Button
            variant={page === n ? '' : 'secondary'}
            aria-label={`Trang ${n}`}
            aria-current={page === n ? 'page' : undefined}
            onClick={() => onChange(n)}
          >
            {n}
          </Button>
        </span>
      ))}
      <Button
        variant="secondary"
        aria-label="Trang sau"
        disabled={page >= meta.totalPages}
        onClick={() => onChange(page + 1)}
      >
        <ChevronRight size={18} />
      </Button>
    </nav>
  )
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
  busy = false,
}) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    d.showModal()
    return () => d.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'wide' : ''}`}
      onCancel={(e) => {
        e.preventDefault()
        if (!busy) onClose()
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Đóng"
          disabled={busy}
          onClick={onClose}
        >
          <X size={22} />
        </button>
      </div>
      {children}
    </dialog>
  )
}
