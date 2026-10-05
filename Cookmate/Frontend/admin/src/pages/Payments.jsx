import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock3, Hourglass, XCircle } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import useResource from '../lib/useResource'
import { api, date } from '../lib/api'
import { Alert, Button, PageTitle, ResourceState } from '../components/ui'

const productName = (row) => row.goiDichVu?.tenGoi || row.mucTieuAnUong?.tenMucTieu || 'Sản phẩm'
const money = (value) => `${Number(value).toLocaleString('vi-VN')}đ`
const pad = (value) => String(value).padStart(2, '0')

function countdown(end, now) {
  if (!end) return 'Không giới hạn'
  const remaining = Math.max(0, new Date(end).getTime() - now)
  if (!remaining) return 'Đã hết hạn'
  const days = Math.floor(remaining / 86_400_000)
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000)
  const minutes = Math.floor((remaining % 3_600_000) / 60_000)
  const seconds = Math.floor((remaining % 60_000) / 1_000)
  return `${days} ngày ${pad(hours)} giờ ${pad(minutes)} phút ${pad(seconds)} giây`
}

function EmptyRow({ columns, children }) {
  return <tr><td className="payment-empty" colSpan={columns}>{children}</td></tr>
}

export default function Payments() {
  const resource = useResource('/admin/thanh-toan')
  const [searchParams] = useSearchParams()
  const selectedId = Number(searchParams.get('payment')) || null
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState('')
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!selectedId || !resource.data?.length) return
    document.getElementById(`payment-${selectedId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [resource.data, selectedId])

  const groups = useMemo(() => {
    const rows = resource.data || []
    return {
      pending: rows.filter((row) => row.trangThai === 'CHO_XAC_NHAN'),
      approved: rows.filter((row) => row.trangThai === 'DA_THANH_TOAN'),
      rejected: rows.filter((row) => row.trangThai === 'TU_CHOI'),
      awaitingCustomer: rows.filter((row) => row.trangThai === 'CHO_THANH_TOAN'),
    }
  }, [resource.data])

  async function review(id, action) {
    const label = action === 'xac-nhan' ? 'xác nhận đã nhận đúng tiền' : 'từ chối vì chưa phát hiện tiền vào'
    if (!window.confirm(`Bạn chắc chắn muốn ${label} cho giao dịch này?`)) return
    setBusy(`${action}-${id}`)
    setError('')
    setSuccess('')
    try {
      await api(`/admin/thanh-toan/${id}/${action}`, { method: 'PATCH', body: {} })
      setSuccess(action === 'xac-nhan'
        ? 'Đã kích hoạt gói 30 ngày và gửi thông báo thành công cho khách hàng.'
        : 'Đã từ chối yêu cầu và gửi lý do cho khách hàng.')
      resource.reload()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  const rowClass = (row) => selectedId === row.idYeuCauThanhToan ? 'target-row' : ''
  const rowId = (row) => `payment-${row.idYeuCauThanhToan}`

  return <>
    <PageTitle
      title="Quản lý giao dịch mua gói"
      description="Kiểm tra số dư Techcombank trước khi phê duyệt. Chỉ giao dịch đã duyệt mới kích hoạt quyền sử dụng."
    />
    <Alert>{error}</Alert>
    <Alert success>{success}</Alert>
    <ResourceState {...resource} empty={!resource.data?.length} reload={resource.reload} />
    {!!resource.data?.length && <div className="payment-sections">
      <section className="panel payment-section">
        <div className="panel-heading">
          <div><h2>Đang đợi phê duyệt</h2><p>Khách hàng đã bấm “Xác nhận đã thanh toán”.</p></div>
          <span className="payment-count"><Hourglass size={16} />{groups.pending.length}</span>
        </div>
        <div className="table-scroll"><table><thead><tr><th>Khách hàng</th><th>Gói / mục tiêu</th><th>Số tiền</th><th>Nội dung CK</th><th>Khách xác nhận lúc</th><th>Thao tác</th></tr></thead>
          <tbody>{groups.pending.length ? groups.pending.map((row) => <tr id={rowId(row)} className={rowClass(row)} key={row.idYeuCauThanhToan}>
            <td>{row.nguoiDung?.hoTen}<br/><small>{row.nguoiDung?.email}</small></td>
            <td>{productName(row)}</td><td>{money(row.soTien)}</td><td><code>{row.maThamChieu}</code></td><td>{date(row.ngayKhachXacNhan)}</td>
            <td><div className="payment-actions"><Button disabled={!!busy} onClick={() => review(row.idYeuCauThanhToan, 'xac-nhan')}>{busy === `xac-nhan-${row.idYeuCauThanhToan}` ? 'Đang duyệt…' : 'Xác nhận'}</Button><Button variant="danger" disabled={!!busy} onClick={() => review(row.idYeuCauThanhToan, 'tu-choi')}>{busy === `tu-choi-${row.idYeuCauThanhToan}` ? 'Đang từ chối…' : 'Từ chối'}</Button></div></td>
          </tr>) : <EmptyRow columns={6}>Không có yêu cầu nào đang chờ phê duyệt.</EmptyRow>}</tbody>
        </table></div>
      </section>

      <section className="panel payment-section">
        <div className="panel-heading">
          <div><h2>Giao dịch thành công</h2><p>Gói đã được kích hoạt; thời gian còn lại được cập nhật mỗi giây.</p></div>
          <span className="payment-count success"><CheckCircle2 size={16} />{groups.approved.length}</span>
        </div>
        <div className="table-scroll"><table><thead><tr><th>Khách hàng</th><th>Gói / mục tiêu</th><th>Số tiền</th><th>Phê duyệt lúc</th><th>Hết hạn lúc</th><th>Thời gian còn lại</th></tr></thead>
          <tbody>{groups.approved.length ? groups.approved.map((row) => <tr id={rowId(row)} className={rowClass(row)} key={row.idYeuCauThanhToan}>
            <td>{row.nguoiDung?.hoTen}<br/><small>{row.nguoiDung?.email}</small></td><td>{productName(row)}</td><td>{money(row.soTien)}</td><td>{date(row.ngayXacNhan)}</td><td>{date(row.quyenHetHanLuc)}</td><td><strong className="payment-countdown">{countdown(row.quyenHetHanLuc, now)}</strong></td>
          </tr>) : <EmptyRow columns={6}>Chưa có giao dịch thành công.</EmptyRow>}</tbody>
        </table></div>
      </section>

      <section className="panel payment-section">
        <div className="panel-heading">
          <div><h2>Yêu cầu đã từ chối</h2><p>Không phát hiện giao dịch thành công sau khi quản trị viên kiểm tra số dư.</p></div>
          <span className="payment-count rejected"><XCircle size={16} />{groups.rejected.length}</span>
        </div>
        <div className="table-scroll"><table><thead><tr><th>Khách hàng</th><th>Gói / mục tiêu</th><th>Số tiền</th><th>Nội dung CK</th><th>Từ chối lúc</th><th>Lý do</th></tr></thead>
          <tbody>{groups.rejected.length ? groups.rejected.map((row) => <tr id={rowId(row)} className={rowClass(row)} key={row.idYeuCauThanhToan}>
            <td>{row.nguoiDung?.hoTen}<br/><small>{row.nguoiDung?.email}</small></td><td>{productName(row)}</td><td>{money(row.soTien)}</td><td><code>{row.maThamChieu}</code></td><td>{date(row.ngayTuChoi)}</td><td>{row.lyDoTuChoi}</td>
          </tr>) : <EmptyRow columns={6}>Chưa có yêu cầu bị từ chối.</EmptyRow>}</tbody>
        </table></div>
      </section>

      <section className="panel payment-section compact">
        <div className="panel-heading">
          <div><h2>Chưa gửi xác nhận</h2><p>Mã QR đã được tạo nhưng khách hàng chưa báo đã chuyển khoản.</p></div>
          <span className="payment-count neutral"><Clock3 size={16} />{groups.awaitingCustomer.length}</span>
        </div>
        {!!groups.awaitingCustomer.length && <div className="table-scroll"><table><thead><tr><th>Khách hàng</th><th>Gói / mục tiêu</th><th>Số tiền</th><th>Nội dung CK</th><th>Tạo lúc</th></tr></thead><tbody>{groups.awaitingCustomer.map((row) => <tr id={rowId(row)} className={rowClass(row)} key={row.idYeuCauThanhToan}><td>{row.nguoiDung?.hoTen}<br/><small>{row.nguoiDung?.email}</small></td><td>{productName(row)}</td><td>{money(row.soTien)}</td><td><code>{row.maThamChieu}</code></td><td>{date(row.ngayTao)}</td></tr>)}</tbody></table></div>}
      </section>
    </div>}
  </>
}
