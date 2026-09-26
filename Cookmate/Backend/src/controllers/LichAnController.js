const { Op } = require('sequelize');
const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const error = require('../utils/httpError');
const { sendSuccess } = require('../utils/apiResponse');
const { tinhDinhDuong } = require('../services/dinhDuong');
const { layGoiHienTai } = require('../services/goiDichVu');

const LOAI_BUA = ['SANG', 'TRUA', 'TOI', 'PHU'];
const dinhDuongInclude = {
  model: db.MonAn,
  as: 'monAn',
  attributes: ['idMonAn', 'tenMonAn', 'khauPhan', 'anhDaiDien'],
  include: [{
    model: db.NguyenLieu,
    as: 'nguyenLieus',
    attributes: ['idNguyenLieu', 'tenNguyenLieu', 'nangLuongKcal', 'proteinG', 'carbG', 'chatBeoG', 'chatXoG', 'natriMg'],
    through: { attributes: ['soLuong', 'donVi', 'khoiLuongGram'] },
  }],
};

async function layLich(id, userId) {
  const row = await db.LichAn.findOne({
    where: { idLichAn: id, idNguoiDung: userId, trangThai: 1 },
    include: [{
      model: db.BuaAnTrongLich,
      as: 'buaAns',
      separate: true,
      include: [dinhDuongInclude],
      order: [['ngay', 'ASC'], ['loaiBua', 'ASC'], ['thuTu', 'ASC']],
    }],
  });
  if (!row) throw error(404, 'Không tìm thấy lịch ăn.');
  return row;
}

function kiemTraNgay(lich, ngay) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ngay)) || ngay < lich.tuNgay || ngay > lich.denNgay)
    throw error(400, 'Ngày của bữa ăn phải nằm trong khoảng lịch.');
}

const list = asyncHandler(async (req, res) => {
  const rows = await db.LichAn.findAll({ where: { idNguoiDung: req.auth.idNguoiDung, trangThai: 1 }, include: [{ model: db.BuaAnTrongLich, as: 'buaAns', include: [{ model: db.MonAn, as: 'monAn', attributes: ['idMonAn', 'tenMonAn', 'anhDaiDien'] }] }], order: [['tuNgay', 'DESC']] });
  return sendSuccess(res, 200, 'Đã tải lịch ăn.', rows);
});

const create = asyncHandler(async (req, res) => {
  const { tenLich, tuNgay, denNgay, mucTieuKcalMoiNgay } = req.body;
  if (!tenLich || !/^\d{4}-\d{2}-\d{2}$/.test(String(tuNgay)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(denNgay)) || tuNgay > denNgay)
    throw error(400, 'Tên lịch và khoảng ngày không hợp lệ.');
  const row = await db.LichAn.create({ idNguoiDung: req.auth.idNguoiDung, tenLich: String(tenLich).trim(), tuNgay, denNgay, mucTieuKcalMoiNgay: mucTieuKcalMoiNgay ? Number(mucTieuKcalMoiNgay) : null });
  return sendSuccess(res, 201, 'Đã tạo lịch ăn.', row);
});

const detail = asyncHandler(async (req, res) => sendSuccess(res, 200, 'Chi tiết lịch ăn.', await layLich(req.params.id, req.auth.idNguoiDung)));

const addMeal = asyncHandler(async (req, res) => {
  const lich = await layLich(req.params.id, req.auth.idNguoiDung);
  const { idMonAn, ngay, loaiBua = 'TRUA', soKhauPhan = 1, ghiChu } = req.body;
  kiemTraNgay(lich, ngay);
  if (!LOAI_BUA.includes(loaiBua) || Number(soKhauPhan) <= 0) throw error(400, 'Loại bữa hoặc khẩu phần không hợp lệ.');
  const monAn = await db.MonAn.findOne({ where: { idMonAn: Number(idMonAn), trangThai: 1, trangThaiDuyet: 'DA_DUYET' } });
  if (!monAn) throw error(404, 'Không tìm thấy món ăn.');
  const row = await db.BuaAnTrongLich.create({ idLichAn: lich.idLichAn, idMonAn: monAn.idMonAn, ngay, loaiBua, soKhauPhan: Number(soKhauPhan), ghiChu: ghiChu || null });
  return sendSuccess(res, 201, 'Đã thêm bữa ăn.', row);
});

const removeMeal = asyncHandler(async (req, res) => {
  const row = await db.BuaAnTrongLich.findOne({ where: { idBuaAnTrongLich: req.params.mealId }, include: [{ model: db.LichAn, as: 'lichAn', where: { idNguoiDung: req.auth.idNguoiDung } }] });
  if (!row) throw error(404, 'Không tìm thấy bữa ăn.');
  await row.destroy();
  return sendSuccess(res, 200, 'Đã xóa bữa ăn.');
});

const evaluate = asyncHandler(async (req, res) => {
  const lich = await layLich(req.params.id, req.auth.idNguoiDung);
  const theoNgay = {};
  for (const bua of lich.buaAns) {
    const dd = tinhDinhDuong(bua.monAn).moiKhauPhan;
    const factor = Number(bua.soKhauPhan) || 1;
    const day = theoNgay[bua.ngay] ||= { nangLuongKcal: 0, proteinG: 0, carbG: 0, chatBeoG: 0, chatXoG: 0, natriMg: 0, soBua: 0 };
    for (const key of ['nangLuongKcal', 'proteinG', 'carbG', 'chatBeoG', 'chatXoG', 'natriMg']) day[key] = Math.round((day[key] + dd[key] * factor) * 100) / 100;
    day.soBua += 1;
  }
  const target = Number(lich.mucTieuKcalMoiNgay) || 2000;
  const danhGia = Object.entries(theoNgay).map(([ngay, value]) => ({ ngay, ...value, mucTieuKcal: target, chenhlechKcal: Math.round(value.nangLuongKcal - target), deXuat: value.soBua < 3 ? 'Nên bổ sung đủ bữa sáng, trưa và tối.' : value.nangLuongKcal > target * 1.15 ? 'Năng lượng cao hơn mục tiêu; cân nhắc giảm khẩu phần.' : value.nangLuongKcal < target * 0.85 ? 'Năng lượng thấp hơn mục tiêu; cân nhắc thêm bữa phụ lành mạnh.' : 'Năng lượng đang gần mục tiêu.' }));
  return sendSuccess(res, 200, 'Đã đánh giá lịch ăn.', { mucTieuKcalMoiNgay: target, theoNgay: danhGia });
});

const shopping = asyncHandler(async (req, res) => {
  const plan = await layLich(req.params.id, req.auth.idNguoiDung);
  const goi = await layGoiHienTai(req.auth.idNguoiDung);
  if (!goi?.xuatDanhSachMuaSam) throw error(403, 'Danh sách mua sắm cần gói Pro hoặc Chef.');
  const grouped = new Map();
  for (const meal of plan.buaAns) for (const item of meal.monAn.nguyenLieus || []) {
    const join = item.MonAnNguyenLieu;
    const key = `${item.idNguyenLieu}:${join.donVi}`;
    const current = grouped.get(key) || { idNguyenLieu: item.idNguyenLieu, tenNguyenLieu: item.tenNguyenLieu, donVi: join.donVi, soLuong: 0 };
    current.soLuong = Math.round((current.soLuong + Number(join.soLuong) * Number(meal.soKhauPhan) / Math.max(1, Number(meal.monAn.khauPhan))) * 100) / 100;
    grouped.set(key, current);
  }
  return sendSuccess(res, 200, 'Đã tạo danh sách mua sắm.', [...grouped.values()]);
});

const autoGenerate = asyncHandler(async (req, res) => {
  const plan = await layLich(req.params.id, req.auth.idNguoiDung);
  const goi = await layGoiHienTai(req.auth.idNguoiDung);
  if (!goi?.lapThucDonTuDong) throw error(403, 'Lập thực đơn tự động cần gói Pro hoặc Chef.');
  const recipes = await db.MonAn.findAll({ where: { trangThai: 1, trangThaiDuyet: 'DA_DUYET' }, order: [['diemDanhGia', 'DESC'], ['idMonAn', 'ASC']], limit: 21 });
  if (!recipes.length) throw error(409, 'Chưa có công thức phù hợp để lập lịch.');
  await db.BuaAnTrongLich.destroy({ where: { idLichAn: plan.idLichAn } });
  const rows = [];
  for (let date = new Date(`${plan.tuNgay}T00:00:00Z`), end = new Date(`${plan.denNgay}T00:00:00Z`); date <= end; date.setUTCDate(date.getUTCDate() + 1)) {
    const ngay = date.toISOString().slice(0, 10);
    for (const loaiBua of ['SANG', 'TRUA', 'TOI']) rows.push({ idLichAn: plan.idLichAn, idMonAn: recipes[rows.length % recipes.length].idMonAn, ngay, loaiBua, soKhauPhan: 1 });
  }
  await db.BuaAnTrongLich.bulkCreate(rows);
  return sendSuccess(res, 200, 'Đã lập thực đơn tự động.', await layLich(plan.idLichAn, req.auth.idNguoiDung));
});

const remove = asyncHandler(async (req, res) => {
  const plan = await layLich(req.params.id, req.auth.idNguoiDung);
  await plan.update({ trangThai: 0, ngayCapNhat: new Date() });
  return sendSuccess(res, 200, 'Đã xóa lịch ăn.');
});

module.exports = { list, create, detail, addMeal, removeMeal, evaluate, shopping, autoGenerate, remove };
