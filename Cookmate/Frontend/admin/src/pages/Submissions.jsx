import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Alert, Button, PageTitle, ResourceState } from '../components/ui'

export default function Submissions() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [reasons, setReasons] = useState({})

  const load = () => {
    setLoading(true)
    api('/admin/mon-an?trangThaiDuyet=CHO_DUYET&limit=100')
      .then((result) => setItems(result.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

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
    </>
  )
}
