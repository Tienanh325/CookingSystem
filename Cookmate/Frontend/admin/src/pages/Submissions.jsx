import { useEffect, useState } from 'react'
import { Eye } from 'lucide-react'
import { api, imageUrl } from '../lib/api'
import { Alert, Button, Modal, PageTitle, ResourceState } from '../components/ui'

export default function Submissions() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [reasons, setReasons] = useState({})
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = () => {
    api('/admin/mon-an?trangThaiDuyet=CHO_DUYET&limit=100')
      .then((result) => setItems(result.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  async function openDetail(item) {
    setDetailLoading(true)
    setError('')
    try {
      const result = await api(`/admin/mon-an/${item.idMonAn}`)
      setDetail(result.data)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setDetailLoading(false)
    }
  }

  async function review(item, decision) {
    setBusy(item.idMonAn)
    setError('')
    try {
      await api(`/admin/bai-dang/${item.idMonAn}/kiem-duyet`, {
        method: 'PATCH',
        body: {
          quyetDinh: decision,
          ...(decision === 'TU_CHOI' ? { lyDoTuChoi: reasons[item.idMonAn] || '' } : {}),
        },
      })
      setItems((current) => current.filter((value) => value.idMonAn !== item.idMonAn))
      if (detail?.idMonAn === item.idMonAn) setDetail(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageTitle
        title="Kiểm duyệt bài đăng"
        description="Duyệt công thức do cộng đồng Cookmate gửi lên."
      />
      <Alert>{error}</Alert>
      <ResourceState loading={loading} empty={!items.length} emptyText="Không có công thức chờ duyệt." />
      <div className="records-list">
        {items.map((item) => (
          <section className="panel form-panel" key={item.idMonAn}>
            <div className="panel-heading">
              <div>
                <h2>{item.tenMonAn}</h2>
                <p className="muted">Gửi lúc {new Date(item.ngayGuiDuyet).toLocaleString('vi-VN')}</p>
              </div>
              <span className="badge">Chờ duyệt</span>
            </div>
            <p>{item.moTa || 'Không có mô tả.'}</p>
            <Button variant="secondary" disabled={detailLoading} onClick={() => openDetail(item)}>
              <Eye size={17} />
              {detailLoading ? 'Đang tải…' : 'Xem đầy đủ bài đăng'}
            </Button>
            <textarea
              aria-label={`Lý do từ chối ${item.tenMonAn}`}
              rows="2"
              placeholder="Lý do từ chối nếu công thức cần chỉnh sửa"
              value={reasons[item.idMonAn] || ''}
              onChange={(event) =>
                setReasons((current) => ({ ...current, [item.idMonAn]: event.target.value }))
              }
            />
            <div className="form-actions">
              <Button
                disabled={busy === item.idMonAn || !reasons[item.idMonAn]?.trim()}
                variant="secondary"
                onClick={() => review(item, 'TU_CHOI')}
              >
                Từ chối
              </Button>
              <Button disabled={busy === item.idMonAn} onClick={() => review(item, 'DUYET')}>
                Duyệt công thức
              </Button>
            </div>
          </section>
        ))}
      </div>
      {detail && (
        <Modal title={`Chi tiết: ${detail.tenMonAn}`} onClose={() => setDetail(null)} busy={busy === detail.idMonAn} wide>
          <div className="submission-detail">
            {(detail.anhDaiDien || detail.hinhAnhs?.[0]?.duongDan) && (
              <img src={imageUrl(detail.anhDaiDien || detail.hinhAnhs[0].duongDan)} alt={detail.tenMonAn} />
            )}
            <div className="submission-meta">
              <span>Danh mục: <strong>{detail.danhMuc?.tenDanhMuc || '—'}</strong></span>
              <span>Tác giả: <strong>{detail.tacGia?.hoTen || 'Người dùng Cookmate'}</strong></span>
              <span>Khẩu phần: <strong>{detail.khauPhan} người</strong></span>
              <span>Thời gian: <strong>{detail.tongThoiGian || 0} phút</strong></span>
            </div>
            <section>
              <h3>Mô tả</h3>
              <p>{detail.moTa || 'Không có mô tả.'}</p>
            </section>
            <section>
              <h3>Nguyên liệu</h3>
              <ul>{detail.nguyenLieus?.map((item) => (
                <li key={item.idNguyenLieu}>{item.tenNguyenLieu}: <strong>{item.MonAnNguyenLieu?.soLuong} {item.MonAnNguyenLieu?.donVi}</strong></li>
              ))}</ul>
            </section>
            <section>
              <h3>Các bước thực hiện</h3>
              <ol>{detail.buocNaus?.map((step, index) => (
                <li key={step.idBuocNau || index}><strong>{step.tieuDe || `Bước ${index + 1}`}:</strong> {step.huongDan}{step.thoiGian ? ` (${step.thoiGian} phút)` : ''}</li>
              ))}</ol>
            </section>
            <textarea
              aria-label={`Lý do từ chối ${detail.tenMonAn}`}
              rows="3"
              placeholder="Lý do từ chối nếu công thức cần chỉnh sửa"
              value={reasons[detail.idMonAn] || ''}
              onChange={(event) => setReasons((current) => ({ ...current, [detail.idMonAn]: event.target.value }))}
            />
            <div className="form-actions">
              <Button disabled={busy === detail.idMonAn || !reasons[detail.idMonAn]?.trim()} variant="secondary" onClick={() => review(detail, 'TU_CHOI')}>Từ chối</Button>
              <Button disabled={busy === detail.idMonAn} onClick={() => review(detail, 'DUYET')}>Duyệt công thức</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
