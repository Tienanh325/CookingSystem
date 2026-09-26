import { useState } from 'react'
import useResource from '../lib/useResource'
import { api, date } from '../lib/api'
import { Alert, Button, PageTitle, ResourceState, Status } from '../components/ui'

export default function Payments() {
  const r = useResource('/admin/thanh-toan')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  async function confirm(id) {
    setBusy(id); setError('')
    try { await api(`/admin/thanh-toan/${id}/xac-nhan`, { method: 'PATCH', body: {} }); r.reload() }
    catch (e) { setError(e.message) } finally { setBusy(null) }
  }
  return <><PageTitle title="Thanh toán" description="Xác nhận yêu cầu và kích hoạt quyền sử dụng 30 ngày." /><section className="panel"><Alert>{error}</Alert><ResourceState {...r} empty={!r.data?.length} reload={r.reload} />
    {!!r.data?.length && <div className="table-scroll"><table><thead><tr><th>Người dùng</th><th>Sản phẩm</th><th>Số tiền</th><th>Mã tham chiếu</th><th>Ngày tạo</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{r.data.map((row) => <tr key={row.idYeuCauThanhToan}><td>{row.nguoiDung?.hoTen}<br/><small>{row.nguoiDung?.email}</small></td><td>{row.goiDichVu?.tenGoi || row.mucTieuAnUong?.tenMucTieu}</td><td>{Number(row.soTien).toLocaleString('vi-VN')}đ</td><td>{row.maThamChieu}</td><td>{date(row.ngayTao)}</td><td><Status active={row.trangThai === 'DA_THANH_TOAN'} label={row.trangThai} /></td><td>{row.trangThai === 'CHO_XAC_NHAN' && <Button disabled={busy === row.idYeuCauThanhToan} onClick={() => confirm(row.idYeuCauThanhToan)}>Xác nhận</Button>}</td></tr>)}</tbody></table></div>}
  </section></>
}
