const { z } = require('zod');
const { sendError } = require('../utils/apiResponse');
const text = (max = 255) => z.string().trim().min(1, 'Không được để trống').max(max);
const optionalText = (max = 5000) => z.string().trim().max(max).nullable().optional();
const id = z.number().int().positive();
const status = z.union([z.literal(0), z.literal(1)]);
const image = z
  .string()
  .max(255)
  .refine(
    (v) => !v || /^https?:\/\//i.test(v) || /^\/uploads\/[\w.-]+$/.test(v),
    'Đường dẫn ảnh không hợp lệ',
  )
  .nullable()
  .optional();
const password = z
  .string()
  .min(8, 'Mật khẩu cần ít nhất 8 ký tự')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'Mật khẩu tối đa 72 byte');
const profile = z.object({
  hoTen: text(100).optional(),
  soDienThoai: z
    .string()
    .regex(/^[+\d ()-]{0,20}$/, 'Số điện thoại không hợp lệ')
    .nullable()
    .optional(),
  anhDaiDien: image,
});
const recipe = z.object({
  tenMonAn: text(200),
  idDanhMuc: id,
  moTa: optionalText(),
  gioiThieu: optionalText(),
  anhDaiDien: image,
  doKho: z.enum(['DE', 'TRUNG_BINH', 'KHO']).optional(),
  khauPhan: id.max(100).optional(),
  thoiGianChuanBi: z.number().int().min(0).max(10080).optional(),
  thoiGianNau: z.number().int().min(0).max(10080).optional(),
  tongThoiGian: z.number().int().min(0).max(20160).optional(),
  trangThai: status.optional(),
  nguyenLieus: z
    .array(
      z.object({
        idNguyenLieu: id,
        soLuong: z.number().positive().max(1000000),
        donVi: text(50),
        ghiChu: optionalText(255),
      }),
    )
    .max(100)
    .optional(),
  buocNaus: z
    .array(
      z.object({
        soThuTu: id.optional(),
        tieuDe: optionalText(200),
        huongDan: text(10000),
        anh: image,
        thoiGian: z.number().int().min(0).max(10080).optional(),
        ghiChu: optionalText(),
      }),
    )
    .max(100)
    .optional(),
  hinhAnhs: z
    .array(
      z.object({
        duongDan: image.refine(Boolean, 'Cần đường dẫn ảnh'),
        moTa: optionalText(255),
        thuTu: id.optional(),
        anhDaiDien: z.boolean().optional(),
      }),
    )
    .max(20)
    .optional(),
});
const category = z.object({
  tenDanhMuc: text(100),
  moTa: optionalText(),
  anh: image,
  trangThai: status.optional(),
});
const ingredient = z.object({
  tenNguyenLieu: text(100),
  donViMacDinh: optionalText(50),
  moTa: optionalText(),
  trangThai: status.optional(),
});
const role = z.object({
  tenVaiTro: text(50).regex(/^[A-Z][A-Z0-9_]*$/),
  moTa: optionalText(255),
  trangThai: status.optional(),
});
const schemas = { recipe, category, ingredient, profile, password };
function validateRequest(req, res, next) {
  const path = req.path.replace(/^\/admin(?=\/)/, '');
  for (const segment of path.split('/').filter(Boolean)) {
    if (
      /^-?\d/.test(segment) &&
      (!/^\d+$/.test(segment) || !Number.isSafeInteger(Number(segment)) || Number(segment) < 1)
    )
      return sendError(res, 400, 'ID không hợp lệ.');
  }
  for (const key of [
    'page',
    'limit',
    'idDanhMuc',
    'idVaiTro',
    'idNguoiDung',
    'maxTime',
    'thoiGianToiDa',
  ]) {
    if (
      req.query[key] !== undefined &&
      (!/^\d+$/.test(String(req.query[key])) ||
        !Number.isSafeInteger(Number(req.query[key])) ||
        Number(req.query[key]) < 1 ||
        Number(req.query[key]) > 1000000)
    )
      return sendError(res, 400, `${key} không hợp lệ.`);
  }
  for (const key of ['daDoc', 'trangThai'])
    if (
      req.query[key] !== undefined &&
      !(key === 'trangThai' && path.startsWith('/lich-su-nau')) &&
      !['0', '1'].includes(req.query[key])
    )
      return sendError(res, 400, `${key} không hợp lệ.`);
  if (req.query.doKho && !['DE', 'TRUNG_BINH', 'KHO'].includes(req.query.doKho))
    return sendError(res, 400, 'Độ khó không hợp lệ.');
  if (
    req.query.trangThaiDuyet &&
    !['NHAP', 'CHO_DUYET', 'DA_DUYET', 'TU_CHOI'].includes(req.query.trangThaiDuyet)
  )
    return sendError(res, 400, 'Trạng thái duyệt không hợp lệ.');
  if (
    path.startsWith('/lich-su-nau') &&
    req.query.trangThai &&
    !['DANG_NAU', 'HOAN_THANH', 'DA_HUY'].includes(req.query.trangThai)
  )
    return sendError(res, 400, 'Trạng thái không hợp lệ.');
  for (const key of ['ingredients', 'nguyenLieuIds'])
    if (req.query[key] !== undefined && !/^\d+(,\d+)*$/.test(req.query[key]))
      return sendError(res, 400, 'Danh sách nguyên liệu không hợp lệ.');
  if (!['POST', 'PATCH'].includes(req.method) || path.startsWith('/uploads')) return next();
  const update = req.method === 'PATCH';
  let schema;
  if (path === '/auth/register')
    schema = profile.extend({
      hoTen: text(100),
      email: z
        .email()
        .max(150)
        .transform((v) => v.toLowerCase()),
      matKhau: password,
    });
  else if (path === '/auth/login')
    schema = z.object({
      email: z
        .email()
        .max(150)
        .transform((v) => v.toLowerCase()),
      matKhau: z.string().min(1).max(200),
    });
  else if (['/auth/forgot-password', '/auth/resend-verification'].includes(path))
    schema = z.object({ email: z.email().max(150).transform((v) => v.toLowerCase()) });
  else if (path === '/auth/verify-email')
    schema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });
  else if (path === '/auth/reset-password')
    schema = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), matKhauMoi: password });
  else if (path === '/auth/me') schema = profile;
  else if (path === '/auth/change-password')
    schema = z.object({ matKhauCu: z.string().min(1).max(200), matKhauMoi: password });
  else if (/^\/mon-an(?:\/\d+)?$/.test(path)) schema = update ? recipe.partial() : recipe;
  else if (/^\/mon-an\/cua-toi(?:\/\d+)?$/.test(path))
    schema = update ? recipe.partial() : recipe;
  else if (/^\/danh-muc(?:\/\d+)?$/.test(path)) schema = update ? category.partial() : category;
  else if (/^\/nguyen-lieu(?:\/\d+)?$/.test(path))
    schema = update ? ingredient.partial() : ingredient;
  else if (/^\/vai-tro(?:\/\d+)?$/.test(path)) schema = update ? role.partial() : role;
  else if (/^\/nguoi-dung\/\d+$/.test(path))
    schema = profile.extend({ idVaiTro: id.optional(), trangThai: status.optional() });
  else if (/^\/mon-an\/\d+\/danh-gia$/.test(path))
    schema = z.object({ soSao: z.number().int().min(1).max(5), noiDung: optionalText() });
  else if (/^\/mon-an\/\d+\/binh-luan$/.test(path))
    schema = z.object({ noiDung: text(5000), idBinhLuanCha: id.nullable().optional() });
  else if (/^\/binh-luan\/\d+$/.test(path)) schema = z.object({ noiDung: text(5000) });
  else if (/\/steps\/\d+$/.test(path)) schema = z.object({ daHoanThanh: z.boolean() });
  else if (path === '/lich-su-nau') schema = z.object({ idMonAn: id });
  else if (path === '/thong-bao')
    schema = z
      .object({
        tieuDe: text(200),
        noiDung: text(5000),
        loai: optionalText(50),
        duongDan: optionalText(255),
        guiTatCa: z.boolean().optional(),
        idNguoiDungs: z.array(id).max(1000).optional(),
      })
      .refine((v) => v.guiTatCa || v.idNguoiDungs?.length, 'Cần chọn người nhận.');
  else if (path === '/thong-bao/thiet-bi')
    schema = z.object({
      token: z
        .string()
        .max(255)
        .regex(/^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/),
      nenTang: z.enum(['android', 'ios']),
      maThietBi: z.string().trim().max(191).nullable().optional(),
    });
  if (!schema) return next();
  const result = schema.safeParse(req.body);
  if (!result.success)
    return sendError(
      res,
      400,
      'Dữ liệu không hợp lệ.',
      result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    );
  if (update && !Object.keys(result.data).length)
    return sendError(res, 400, 'Chưa có dữ liệu cần cập nhật.');
  req.body = result.data;
  return next();
}
module.exports = { validateRequest, schemas };
