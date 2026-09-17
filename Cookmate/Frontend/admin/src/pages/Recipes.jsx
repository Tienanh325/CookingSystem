import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Pencil, EyeOff, Eye, ChefHat, Clock, Users } from 'lucide-react'
import { api, imageUrl } from '../lib/api'
import useResource from '../lib/useResource'
import {
  Alert,
  Button,
  PageTitle,
  Pagination,
  ResourceState,
  SearchBox,
  Status,
  Modal,
} from '../components/ui'
export default function Recipes() {
  const [params, setParams] = useSearchParams(),
    [page, setPage] = useState(1),
    [limit, setLimit] = useState(10),
    [status, setStatus] = useState(''),
    [error, setError] = useState(''),
    [pending, setPending] = useState(null),
    [busy, setBusy] = useState(false)
  const q = params.get('q') || '',
    r = useResource(
      `/admin/mon-an?page=${page}&limit=${limit}&q=${encodeURIComponent(q)}${status !== '' ? `&trangThai=${status}` : ''}`,
    )
  async function toggle() {
    setBusy(true)
    try {
      await api(`/mon-an/${pending.idMonAn}`, {
        method: 'PATCH',
        body: { trangThai: pending.trangThai ? 0 : 1 },
      })
      setPending(null)
      r.reload()
    } catch (e) {
      setError(e.message)
      setPending(null)
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <PageTitle
        title="Công thức món ăn"
        description="Chăm chút từng công thức, lan tỏa cảm hứng vào bếp."
      >
        <Link className="button" to="/recipes/new">
          <Plus size={18} />
          Thêm công thức
        </Link>
      </PageTitle>
      <div className="toolbar">
        <SearchBox
          value={q}
          onChange={(v) => {
            setParams(v ? { q: v } : {})
            setPage(1)
          }}
          placeholder="Tìm tên món ăn…"
        />
        <select
          aria-label="Lọc trạng thái"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="1">Đang công khai</option>
          <option value="0">Đã ẩn / bản nháp</option>
        </select>
        <span className="muted">{r.meta?.totalItems || 0} công thức</span>
      </div>
      <Alert>{error}</Alert>
      <ResourceState {...r} empty={!r.data?.length} reload={r.reload} />
      {!r.loading && !r.error && (
        <div className="recipe-grid">
          {r.data?.map((item) => (
            <article className="recipe-card" key={item.idMonAn}>
              <div className="recipe-cover">
                {item.anhDaiDien ? (
                  <img
                    loading="lazy"
                    src={imageUrl(item.anhDaiDien)}
                    alt={item.tenMonAn}
                  />
                ) : (
                  <div className="image-placeholder">
                    <ChefHat size={48} />
                    <span>Cookmate kitchen</span>
                  </div>
                )}
                <span className="category-tag">{item.danhMuc?.tenDanhMuc}</span>
              </div>
              <div className="recipe-card-body">
                <Status active={item.trangThai === 1} />
                <h2>
                  <Link to={`/recipes/${item.idMonAn}/edit`}>
                    {item.tenMonAn}
                  </Link>
                </h2>
                <p className="line-clamp muted">
                  {item.moTa || 'Chưa có mô tả cho món ăn này.'}
                </p>
                <div className="recipe-meta">
                  <span>
                    <Clock size={15} />
                    {item.tongThoiGian} phút
                  </span>
                  <span>
                    <Users size={15} />
                    {item.khauPhan} người
                  </span>
                  <span>★ {Number(item.diemDanhGia).toFixed(1)}</span>
                </div>
                <div className="card-actions">
                  <Link
                    className="button secondary"
                    to={`/recipes/${item.idMonAn}/edit`}
                  >
                    <Pencil size={15} />
                    Chỉnh sửa
                  </Link>
                  <button
                    className="icon-button"
                    aria-label={
                      item.trangThai ? 'Ẩn món ăn' : 'Công khai món ăn'
                    }
                    onClick={() => setPending(item)}
                  >
                    {item.trangThai ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Pagination
        meta={r.meta}
        page={page}
        onChange={setPage}
        limit={limit}
        onLimitChange={setLimit}
      />
      {pending && (
        <Modal
          title={pending.trangThai ? 'Ẩn công thức?' : 'Công khai công thức?'}
          onClose={() => setPending(null)}
          busy={busy}
        >
          <p>
            “{pending.tenMonAn}” sẽ{' '}
            {pending.trangThai
              ? 'không còn xuất hiện trong danh sách của khách hàng.'
              : 'xuất hiện trong ứng dụng khách hàng nếu đủ nguyên liệu và bước nấu.'}
          </p>
          <div className="form-actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setPending(null)}
            >
              Quay lại
            </Button>
            <Button disabled={busy} onClick={toggle}>
              {busy ? 'Đang lưu…' : 'Xác nhận'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
