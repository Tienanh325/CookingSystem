import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { api, all, date } from '../lib/api'
import useResource from '../lib/useResource'
import {
  Alert,
  Button,
  Field,
  Modal,
  PageTitle,
  Pagination,
  ResourceState,
  SearchBox,
  Status,
} from '../components/ui'
const configs = {
  categories: {
    title: 'Danh mục món ăn',
    description: 'Sắp xếp công thức để mỗi món ngon đều dễ tìm.',
    path: '/danh-muc',
    read: '/admin/danh-muc',
    id: 'idDanhMuc',
    name: 'tenDanhMuc',
    fields: [
      ['tenDanhMuc', 'Tên danh mục'],
      ['moTa', 'Mô tả'],
    ],
    columns: [
      ['tenDanhMuc', 'Tên danh mục'],
      ['moTa', 'Mô tả'],
      ['trangThai', 'Trạng thái'],
    ],
    create: true,
  },
  ingredients: {
    title: 'Nguyên liệu',
    description: 'Quản lý những nguyên liệu làm nên bữa ăn ngon.',
    path: '/nguyen-lieu',
    read: '/admin/nguyen-lieu',
    id: 'idNguyenLieu',
    name: 'tenNguyenLieu',
    fields: [
      ['tenNguyenLieu', 'Tên nguyên liệu'],
      ['donViMacDinh', 'Đơn vị mặc định'],
      ['moTa', 'Mô tả'],
      ['nangLuongKcal', 'Năng lượng (kcal/100 g)'],
      ['proteinG', 'Protein (g/100 g)'],
      ['carbG', 'Carb (g/100 g)'],
      ['chatBeoG', 'Chất béo (g/100 g)'],
      ['chatXoG', 'Chất xơ (g/100 g)'],
      ['natriMg', 'Natri (mg/100 g)'],
    ],
    columns: [
      ['tenNguyenLieu', 'Tên nguyên liệu'],
      ['donViMacDinh', 'Đơn vị'],
      ['nangLuongKcal', 'kcal/100 g'],
      ['trangThai', 'Trạng thái'],
    ],
    create: true,
  },
  users: {
    title: 'Người dùng',
    description: 'Quản lý tài khoản và quyền truy cập Cookmate.',
    path: '/nguoi-dung',
    id: 'idNguoiDung',
    name: 'hoTen',
    fields: [
      ['hoTen', 'Họ và tên'],
      ['soDienThoai', 'Số điện thoại'],
    ],
    columns: [
      ['hoTen', 'Họ tên'],
      ['email', 'Email'],
      ['vaiTro.tenVaiTro', 'Vai trò'],
      ['trangThai', 'Trạng thái'],
    ],
  },
  roles: {
    title: 'Vai trò',
    description: 'Phân quyền rõ ràng, vận hành an toàn.',
    path: '/vai-tro',
    id: 'idVaiTro',
    name: 'tenVaiTro',
    fields: [
      ['tenVaiTro', 'Mã vai trò (chữ in hoa)'],
      ['moTa', 'Mô tả'],
    ],
    columns: [
      ['tenVaiTro', 'Vai trò'],
      ['moTa', 'Mô tả'],
      ['trangThai', 'Trạng thái'],
    ],
    create: true,
  },
  comments: {
    title: 'Bình luận',
    description: 'Theo dõi phản hồi và giữ không gian nấu ăn tích cực.',
    path: '/binh-luan',
    read: '/admin/binh-luan',
    id: 'idBinhLuan',
    name: 'noiDung',
    columns: [
      ['nguoiDung.hoTen', 'Người viết'],
      ['monAn.tenMonAn', 'Món ăn'],
      ['noiDung', 'Nội dung'],
      ['ngayBinhLuan', 'Thời gian'],
    ],
    remove: true,
  },
  reviews: {
    title: 'Đánh giá',
    description: 'Lắng nghe trải nghiệm của người nấu.',
    path: '/danh-gia',
    read: '/admin/danh-gia',
    id: 'idDanhGia',
    name: 'noiDung',
    columns: [
      ['nguoiDung.hoTen', 'Người đánh giá'],
      ['monAn.tenMonAn', 'Món ăn'],
      ['soSao', 'Số sao'],
      ['noiDung', 'Nội dung'],
    ],
    remove: true,
  },
  logs: {
    title: 'Nhật ký hoạt động',
    description: 'Lịch sử thao tác quản trị được ghi nhận trong hệ thống.',
    path: '/nhat-ky-he-thong',
    id: 'idNhatKy',
    columns: [
      ['nguoiDung.hoTen', 'Người thực hiện'],
      ['hanhDong', 'Thao tác'],
      ['bangDuLieu', 'Đối tượng'],
      ['noiDung', 'Nội dung'],
      ['thoiGian', 'Thời gian'],
    ],
    readonly: true,
  },
}
const get = (row, key) =>
  key.split('.').reduce((value, part) => value?.[part], row)
export default function Records({ kind }) {
  const c = configs[kind],
    [page, setPage] = useState(1),
    [limit, setLimit] = useState(10),
    [q, setQ] = useState(''),
    [edit, setEdit] = useState(null),
    [confirm, setConfirm] = useState(null),
    [error, setError] = useState(''),
    [formError, setFormError] = useState(''),
    [busy, setBusy] = useState(false),
    [roles, setRoles] = useState([])
  const r = useResource(
    `${c.read || c.path}?page=${page}&limit=${limit}&q=${encodeURIComponent(q)}`,
  )
  useEffect(() => {
    if (kind === 'users')
      all('/vai-tro')
        .then(setRoles)
        .catch((e) => setError(e.message))
  }, [kind])
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setFormError('')
    try {
      const body = Object.fromEntries(new FormData(e.currentTarget))
      body.trangThai = Number(body.trangThai)
      if (body.idVaiTro) body.idVaiTro = Number(body.idVaiTro)
      for (const key of ['nangLuongKcal', 'proteinG', 'carbG', 'chatBeoG', 'chatXoG', 'natriMg'])
        if (body[key] !== undefined) body[key] = Number(body[key] || 0)
      await api(`${c.path}${edit[c.id] ? `/${edit[c.id]}` : ''}`, {
        method: edit[c.id] ? 'PATCH' : 'POST',
        body,
      })
      setEdit(null)
      r.reload()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }
  async function action() {
    setBusy(true)
    setError('')
    try {
      await api(
        `${c.path}/${confirm[c.id]}`,
        c.remove
          ? { method: 'DELETE' }
          : { method: 'PATCH', body: { trangThai: confirm.trangThai ? 0 : 1 } },
      )
      r.reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      setConfirm(null)
    }
  }
  return (
    <>
      <PageTitle title={c.title} description={c.description}>
        {c.create && (
          <Button
            onClick={() => {
              setFormError('')
              setEdit({ trangThai: 1 })
            }}
          >
            <Plus size={18} />
            Thêm mới
          </Button>
        )}
      </PageTitle>
      <section className="panel">
        <div className="toolbar">
          {!c.remove && !c.readonly && kind !== 'roles' && (
            <SearchBox
              value={q}
              onChange={(v) => {
                setQ(v)
                setPage(1)
              }}
              placeholder="Tìm kiếm theo tên…"
            />
          )}
          <span className="muted">{r.meta?.totalItems || 0} kết quả</span>
        </div>
        <Alert>{error}</Alert>
        <ResourceState {...r} empty={!r.data?.length} reload={r.reload} />
        {!r.loading && !r.error && !!r.data?.length && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {c.columns.map(([key, label]) => (
                    <th key={key}>{label}</th>
                  ))}
                  {!c.readonly && <th>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {r.data.map((row) => (
                  <tr key={row[c.id]}>
                    {c.columns.map(([key]) => (
                      <td key={key}>
                        {key === 'trangThai' ? (
                          <Status active={row.trangThai === 1} />
                        ) : ['ngayBinhLuan', 'thoiGian'].includes(key) ? (
                          date(get(row, key))
                        ) : key === 'soSao' ? (
                          `${row.soSao} / 5`
                        ) : (
                          String(get(row, key) ?? '—')
                        )}
                      </td>
                    ))}
                    {!c.readonly && (
                      <td>
                        <div className="row-actions">
                          {c.fields && (
                            <button
                              className="icon-button"
                              aria-label="Chỉnh sửa"
                              onClick={() => {
                                setFormError('')
                                setEdit(row)
                              }}
                            >
                              <Pencil size={17} />
                            </button>
                          )}
                          <button
                            className="icon-button danger"
                            aria-label={
                              c.remove
                                ? 'Xóa'
                                : row.trangThai
                                  ? 'Ẩn / khóa'
                                  : 'Khôi phục'
                            }
                            onClick={() => setConfirm(row)}
                          >
                            {c.remove ? (
                              <Trash2 size={17} />
                            ) : row.trangThai ? (
                              <EyeOff size={17} />
                            ) : (
                              <Eye size={17} />
                            )}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          meta={r.meta}
          page={page}
          onChange={setPage}
          limit={limit}
          onLimitChange={setLimit}
        />
      </section>
      {edit && (
        <Modal
          title={edit[c.id] ? 'Chỉnh sửa' : 'Thêm mới'}
          onClose={() => setEdit(null)}
          busy={busy}
        >
          <form onSubmit={submit}>
            {c.fields.map(([name, label], i) => (
              <Field
                key={name}
                label={label}
                name={name}
                defaultValue={edit[name] || ''}
                required={i === 0}
                maxLength={name === 'moTa' ? 5000 : 100}
                type={['nangLuongKcal', 'proteinG', 'carbG', 'chatBeoG', 'chatXoG', 'natriMg'].includes(name) ? 'number' : 'text'}
                min={name === 'moTa' ? undefined : 0}
                step="0.01"
              />
            ))}
            {kind === 'users' && (
              <Field label="Vai trò">
                <select name="idVaiTro" defaultValue={edit.idVaiTro} required>
                  {roles.map((role) => (
                    <option
                      key={role.idVaiTro}
                      value={role.idVaiTro}
                      disabled={!role.trangThai}
                    >
                      {role.tenVaiTro}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Trạng thái">
              <select name="trangThai" defaultValue={edit.trangThai ?? 1}>
                <option value="1">Đang hoạt động</option>
                <option value="0">Ẩn / Khóa</option>
              </select>
            </Field>
            <Alert>{formError}</Alert>
            <div className="form-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setEdit(null)}
              >
                Hủy
              </Button>
              <Button disabled={busy}>
                {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {confirm && (
        <Modal
          title="Xác nhận thay đổi"
          onClose={() => setConfirm(null)}
          busy={busy}
        >
          <p>
            Bạn muốn{' '}
            {c.remove ? 'xóa' : confirm.trangThai ? 'ẩn / khóa' : 'khôi phục'} “
            {confirm[c.name] || `#${confirm[c.id]}`}”?
          </p>
          <Alert>
            {c.remove && kind === 'comments'
              ? 'Các trả lời của bình luận này cũng sẽ được ẩn.'
              : ''}
          </Alert>
          <div className="form-actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              Quay lại
            </Button>
            <Button disabled={busy} onClick={action}>
              {busy ? 'Đang xử lý…' : 'Xác nhận'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
