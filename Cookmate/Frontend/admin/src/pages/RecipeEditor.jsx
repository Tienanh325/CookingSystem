import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Upload, Image as ImageIcon, Save } from 'lucide-react'
import { all, api, imageUrl } from '../lib/api'
import { Alert, Button, Field, PageTitle, ResourceState } from '../components/ui'
const blank = {
  tenMonAn: '',
  idDanhMuc: '',
  moTa: '',
  gioiThieu: '',
  tenDauBep: '',
  videoHuongDan: '',
  capTruyCapToiThieu: 'FREE',
  anhDaiDien: '',
  doKho: 'DE',
  khauPhan: 2,
  thoiGianChuanBi: 10,
  thoiGianNau: 20,
  trangThai: 0,
  nguyenLieus: [],
  buocNaus: [{ tieuDe: '', huongDan: '', thoiGian: 0 }],
}
export default function RecipeEditor() {
  const { id } = useParams(),
    navigate = useNavigate(),
    [form, setForm] = useState(blank),
    [categories, setCategories] = useState([]),
    [ingredients, setIngredients] = useState([]),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState('')
  useEffect(() => {
    let active = true
    Promise.all([
      all('/admin/danh-muc'),
      all('/admin/nguyen-lieu'),
      id ? api(`/admin/mon-an/${id}`) : Promise.resolve(null),
    ])
      .then(([c, i, r]) => {
        if (!active) return
        setCategories(c)
        setIngredients(i)
        if (r) {
          const v = r.data
          setForm({
            ...blank,
            ...v,
            nguyenLieus: v.nguyenLieus.map((x) => ({
              idNguyenLieu: x.idNguyenLieu,
              soLuong: Number(x.MonAnNguyenLieu.soLuong),
              khoiLuongGram: Number(x.MonAnNguyenLieu.khoiLuongGram || 0),
              donVi: x.MonAnNguyenLieu.donVi,
              ghiChu: x.MonAnNguyenLieu.ghiChu || '',
            })),
            buocNaus: v.buocNaus.map((x) => ({
              tieuDe: x.tieuDe || '',
              huongDan: x.huongDan,
              thoiGian: x.thoiGian,
              anh: x.anh,
              ghiChu: x.ghiChu,
            })),
          })
        }
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])
  const update = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const updateRow = (key, index, field, value) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].map((row, n) => (n === index ? { ...row, [field]: value } : row)),
    }))
  async function upload(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const body = new FormData()
      body.append('image', file)
      const r = await api('/uploads/image', { method: 'POST', body })
      update('anhDaiDien', r.data.path)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const payload = {}
      for (const key of Object.keys(blank)) payload[key] = form[key]
      payload.idDanhMuc = Number(form.idDanhMuc)
      payload.buocNaus = form.buocNaus.map((s, i) => ({ ...s, soThuTu: i + 1 }))
      payload.nguyenLieus = form.nguyenLieus.map((x) => ({
        ...x,
        idNguyenLieu: Number(x.idNguyenLieu),
        soLuong: Number(x.soLuong),
        khoiLuongGram: Number(x.khoiLuongGram) || null,
      }))
      await api(id ? `/mon-an/${id}` : '/mon-an', { method: id ? 'PATCH' : 'POST', body: payload })
      navigate('/recipes')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  if (loading) return <ResourceState loading />
  return (
    <>
      <Link className="back-link" to="/recipes">
        <ArrowLeft size={16} />
        Danh sách công thức
      </Link>
      <PageTitle
        title={id ? 'Chỉnh sửa công thức' : 'Thêm hương vị mới'}
        description="Một công thức rõ ràng sẽ giúp mọi người tự tin vào bếp."
      />
      <form onSubmit={submit}>
        <Alert>{error}</Alert>
        <div className="editor-grid">
          <div>
            <section className="panel form-panel">
              <h2>Thông tin món ăn</h2>
              <Field
                label="Tên món ăn *"
                value={form.tenMonAn}
                onChange={(e) => update('tenMonAn', e.target.value)}
                required
                maxLength={200}
                placeholder="Ví dụ: Canh chua cá lóc"
              />
              <Field label="Mô tả ngắn">
                <textarea
                  value={form.moTa || ''}
                  onChange={(e) => update('moTa', e.target.value)}
                  rows={3}
                  placeholder="Điều gì làm món ăn này trở nên đặc biệt?"
                />
              </Field>
              <Field label="Giới thiệu">
                <textarea
                  value={form.gioiThieu || ''}
                  onChange={(e) => update('gioiThieu', e.target.value)}
                  rows={3}
                />
              </Field>
              <div className="form-grid">
                <Field label="Danh mục *">
                  <select
                    required
                    value={form.idDanhMuc}
                    onChange={(e) => update('idDanhMuc', e.target.value)}
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((c) => (
                      <option key={c.idDanhMuc} value={c.idDanhMuc} disabled={!c.trangThai}>
                        {c.tenDanhMuc}
                        {!c.trangThai ? ' (đã ẩn)' : ''}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Độ khó">
                  <select value={form.doKho} onChange={(e) => update('doKho', e.target.value)}>
                    <option value="DE">Dễ</option>
                    <option value="TRUNG_BINH">Trung bình</option>
                    <option value="KHO">Khó</option>
                  </select>
                </Field>
              </div>
              <div className="form-grid three">
                {[
                  ['thoiGianChuanBi', 'Chuẩn bị (phút)', 0],
                  ['thoiGianNau', 'Nấu (phút)', 0],
                  ['khauPhan', 'Khẩu phần', 1],
                ].map(([key, label, min]) => (
                  <Field
                    key={key}
                    label={label}
                    type="number"
                    min={min}
                    max={key === 'khauPhan' ? 100 : 10080}
                    required
                    value={form[key]}
                    onChange={(e) => update(key, Number(e.target.value))}
                  />
                ))}
              </div>
            </section>
            <section className="panel form-panel">
              <div className="panel-heading"><h2>Nội dung theo gói</h2></div>
              <Field label="Đầu bếp" name="tenDauBep" value={form.tenDauBep || ''} onChange={(e) => update('tenDauBep', e.target.value)} />
              <Field label="Video hướng dẫn" name="videoHuongDan" type="url" value={form.videoHuongDan || ''} onChange={(e) => update('videoHuongDan', e.target.value)} />
              <Field label="Cấp truy cập tối thiểu"><select value={form.capTruyCapToiThieu || 'FREE'} onChange={(e) => update('capTruyCapToiThieu', e.target.value)}><option value="FREE">Miễn phí</option><option value="BASIC">Basic</option><option value="PRO">Pro</option><option value="CHEF">Chef</option></select></Field>
            </section>
            <section className="panel form-panel">
              <div className="panel-heading">
                <h2>Nguyên liệu chuẩn bị</h2>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    update('nguyenLieus', [
                      ...form.nguyenLieus,
                      { idNguyenLieu: '', soLuong: 1, donVi: 'g', khoiLuongGram: 1 },
                    ])
                  }
                >
                  <Plus size={16} />
                  Thêm
                </Button>
              </div>
              {!form.nguyenLieus.length && (
                <p className="muted">
                  Thêm nguyên liệu và định lượng trước khi công khai công thức.
                </p>
              )}
              {form.nguyenLieus.map((row, i) => (
                <div className="ingredient-row" key={i}>
                  <select
                    aria-label={`Nguyên liệu ${i + 1}`}
                    required
                    value={row.idNguyenLieu}
                    onChange={(e) =>
                      updateRow('nguyenLieus', i, 'idNguyenLieu', Number(e.target.value))
                    }
                  >
                    <option value="">Chọn nguyên liệu</option>
                    {ingredients.map((x) => (
                      <option key={x.idNguyenLieu} value={x.idNguyenLieu} disabled={!x.trangThai}>
                        {x.tenNguyenLieu}
                        {!x.trangThai ? ' (đã ẩn)' : ''}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label={`Số lượng ${i + 1}`}
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={row.soLuong}
                    onChange={(e) => updateRow('nguyenLieus', i, 'soLuong', Number(e.target.value))}
                  />
                  <input
                    aria-label={`Đơn vị ${i + 1}`}
                    required
                    maxLength={50}
                    value={row.donVi}
                    onChange={(e) => updateRow('nguyenLieus', i, 'donVi', e.target.value)}
                  />
                  <input
                    aria-label={`Khối lượng quy đổi gram ${i + 1}`}
                    title="Khối lượng quy đổi sang gram để tính dinh dưỡng"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Gram quy đổi"
                    value={row.khoiLuongGram || ''}
                    onChange={(e) => updateRow('nguyenLieus', i, 'khoiLuongGram', Number(e.target.value))}
                  />
                  <button
                    type="button"
                    className="icon-button danger"
                    aria-label={`Xóa nguyên liệu ${i + 1}`}
                    onClick={() =>
                      update(
                        'nguyenLieus',
                        form.nguyenLieus.filter((_, n) => n !== i),
                      )
                    }
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </section>
            <section className="panel form-panel">
              <div className="panel-heading">
                <h2>Các bước thực hiện</h2>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    update('buocNaus', [
                      ...form.buocNaus,
                      { tieuDe: '', huongDan: '', thoiGian: 0 },
                    ])
                  }
                >
                  <Plus size={16} />
                  Thêm bước
                </Button>
              </div>
              {form.buocNaus.map((step, i) => (
                <div className="step-editor" key={i}>
                  <div className="step-label">
                    <span>{i + 1}</span>
                    <strong>Bước {i + 1}</strong>
                    <button
                      className="icon-button danger"
                      type="button"
                      aria-label={`Xóa bước ${i + 1}`}
                      onClick={() =>
                        update(
                          'buocNaus',
                          form.buocNaus.filter((_, n) => n !== i),
                        )
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <Field
                    label="Tiêu đề"
                    value={step.tieuDe}
                    onChange={(e) => updateRow('buocNaus', i, 'tieuDe', e.target.value)}
                    maxLength={200}
                  />
                  <Field label="Hướng dẫn *">
                    <textarea
                      required
                      rows={3}
                      value={step.huongDan}
                      onChange={(e) => updateRow('buocNaus', i, 'huongDan', e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Thời gian (phút)"
                    type="number"
                    min="0"
                    max="10080"
                    required
                    value={step.thoiGian}
                    onChange={(e) => updateRow('buocNaus', i, 'thoiGian', Number(e.target.value))}
                  />
                </div>
              ))}
            </section>
          </div>
          <aside className="editor-side">
            <section className="panel form-panel">
              <h2>Ảnh đại diện</h2>
              <div className="upload-preview">
                {form.anhDaiDien ? (
                  <img src={imageUrl(form.anhDaiDien)} alt="Ảnh món ăn" />
                ) : (
                  <ImageIcon size={48} />
                )}
              </div>
              <label className="button secondary upload-button">
                <Upload size={16} />
                {uploading ? 'Đang tải…' : 'Chọn ảnh'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={upload}
                  disabled={uploading || busy}
                />
              </label>
              <p className="small muted">JPEG, PNG hoặc WebP · tối đa 5 MB</p>
              <Field
                label="Hoặc đường dẫn ảnh"
                value={form.anhDaiDien || ''}
                onChange={(e) => update('anhDaiDien', e.target.value)}
                placeholder="https://…"
              />
            </section>
            <section className="panel form-panel">
              <h2>Hiển thị</h2>
              <Field label="Trạng thái">
                <select
                  value={form.trangThai}
                  onChange={(e) => update('trangThai', Number(e.target.value))}
                >
                  <option value="0">Bản nháp / Ẩn</option>
                  <option value="1">Công khai</option>
                </select>
              </Field>
              <p className="small muted">
                Công thức công khai cần có danh mục, nguyên liệu và hướng dẫn nấu đầy đủ.
              </p>
              <Button className="full" disabled={busy || uploading}>
                <Save size={17} />
                {busy ? 'Đang lưu…' : 'Lưu công thức'}
              </Button>
              <Link className="button ghost full" to="/recipes">
                Hủy thay đổi
              </Link>
            </section>
          </aside>
        </div>
      </form>
    </>
  )
}
