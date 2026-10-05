import { useState } from 'react'
import { Send, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api, date } from '../lib/api'
import useResource from '../lib/useResource'
import {
  Alert,
  Button,
  Field,
  PageTitle,
  Pagination,
  ResourceState,
} from '../components/ui'
export default function Notifications() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1),
    [limit, setLimit] = useState(10),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [everyone, setEveryone] = useState(true),
    r = useResource(`/admin/thong-bao?page=${page}&limit=${limit}`),
    inbox = useResource('/thong-bao?limit=50')
  const paymentRequests = (inbox.data || []).filter(
    (item) => item.thongBao?.loai === 'YEU_CAU_THANH_TOAN',
  )

  async function openNotification(item) {
    try {
      if (!item.daDoc)
        await api(`/thong-bao/${item.idThongBao}/read`, { method: 'PATCH', body: {} })
      inbox.reload()
      navigate(item.thongBao?.duongDan || '/payments')
    } catch (err) {
      setError(err.message)
    }
  }
  async function submit(e) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const body = {
        tieuDe: data.tieuDe,
        noiDung: data.noiDung,
        guiTatCa: everyone,
      }
      if (!everyone)
        body.idNguoiDungs = data.ids.split(',').map((s) => Number(s.trim()))
      const response = await api('/thong-bao', { method: 'POST', body })
      setSuccess(
        `Đã gửi thông báo đến ${response.data.soNguoiNhan} người dùng.`,
      )
      form.reset()
      r.reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageTitle
        title="Thông báo"
        description="Gửi một lời nhắn, mang cảm hứng đến mọi căn bếp."
      />
      <section className="panel admin-inbox">
        <div className="panel-heading">
          <div>
            <h2>Yêu cầu thanh toán cần xử lý</h2>
            <p>Bấm vào thông báo để mở đúng giao dịch trong trang quản lý mua gói.</p>
          </div>
          <Bell size={20} />
        </div>
        <ResourceState {...inbox} empty={!paymentRequests.length} reload={inbox.reload} />
        {paymentRequests.map((item) => (
          <button
            type="button"
            key={`${item.idThongBao}-${item.idNguoiDung}`}
            className={`notification-item actionable ${item.daDoc ? 'read' : 'unread'}`}
            onClick={() => openNotification(item)}
          >
            <span>
              <strong>{item.thongBao.tieuDe}</strong>
              <small>{item.daDoc ? 'Đã đọc' : 'Mới'}</small>
            </span>
            <p>{item.thongBao.noiDung}</p>
            <time>{date(item.thongBao.ngayTao)}</time>
          </button>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel form-panel">
          <h2>Soạn thông báo</h2>
          <form onSubmit={submit}>
            <Field
              label="Tiêu đề *"
              name="tieuDe"
              required
              maxLength={200}
              placeholder="Hôm nay cùng vào bếp nhé!"
            />
            <Field label="Nội dung *">
              <textarea
                name="noiDung"
                rows={5}
                required
                maxLength={5000}
                placeholder="Viết nội dung gửi đến người dùng…"
              />
            </Field>
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={everyone}
                onChange={(e) => setEveryone(e.target.checked)}
              />
              Gửi đến tất cả người dùng đang hoạt động
            </label>
            {!everyone && (
              <Field
                label="ID người nhận (ngăn cách bằng dấu phẩy)"
                name="ids"
                required
                pattern="\d+(\s*,\s*\d+)*"
                placeholder="2, 3, 5"
              />
            )}
            <Alert>{error}</Alert>
            <Alert success>{success}</Alert>
            <Button disabled={busy}>
              <Send size={17} />
              {busy ? 'Đang gửi…' : 'Gửi thông báo'}
            </Button>
            <p className="small muted">
              Thông báo xuất hiện trong hộp thư của ứng dụng khách hàng.
            </p>
          </form>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Thông báo đã gửi</h2>
            <Bell size={20} />
          </div>
          <ResourceState {...r} empty={!r.data?.length} reload={r.reload} />
          {r.data?.map((item) => (
            <article key={item.idThongBao} className="notification-item">
              <h3>{item.tieuDe}</h3>
              <p>{item.noiDung}</p>
              <small>
                {date(item.ngayTao)} · {item.recipients || 0} người nhận ·{' '}
                {item.read || 0} đã đọc
              </small>
            </article>
          ))}
          <Pagination
            meta={r.meta}
            page={page}
            onChange={setPage}
            limit={limit}
            onLimitChange={setLimit}
          />
        </section>
      </div>
    </>
  )
}
