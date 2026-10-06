const sequelize = require('../config/database');
const { Op } = require('sequelize');
const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const error = require('../utils/httpError');
const { sendSuccess } = require('../utils/apiResponse');
const { tinhDinhDuong } = require('../services/dinhDuong');
const { layGoiHienTai } = require('../services/goiDichVu');
const { CAP_DO, kiemTraMoCongThuc } = require('../services/truyCapCongThuc');
const {
  CHI_SO,
  chonThucDonTrongNgay,
  danhGiaDinhDuong,
  taoMucTieuDinhDuong,
} = require('../services/lapThucDon');

const LOAI_BUA = ['SANG', 'TRUA', 'TOI', 'PHU'];
const MOT_NGAY_MS = 24 * 60 * 60 * 1000;
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

function xuatLichAn(lich) {
  const result = typeof lich?.toJSON === 'function' ? lich.toJSON() : { ...lich };
  result.buaAns = (result.buaAns || []).map((meal) => {
    if (!meal.monAn) return meal;
    const monAn = { ...meal.monAn };
    delete monAn.nguyenLieus;
    return { ...meal, monAn };
  });
  return result;
}

async function layLichDeGhi(id, userId, transaction) {
  const row = await db.LichAn.findOne({
    where: { idLichAn: id, idNguoiDung: userId, trangThai: 1 },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!row) throw error(404, 'Không tìm thấy lịch ăn.');
  return row;
}

function laNgayHopLe(ngay) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ngay))) return false;
  const parsed = new Date(`${ngay}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === ngay;
}

function kiemTraKhoangLich(tuNgay, denNgay) {
  if (!laNgayHopLe(tuNgay) || !laNgayHopLe(denNgay) || tuNgay > denNgay)
    throw error(400, 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
  const duration = Date.parse(`${denNgay}T00:00:00.000Z`)
    - Date.parse(`${tuNgay}T00:00:00.000Z`);
  if (duration > 30 * MOT_NGAY_MS)
    throw error(400, 'Lịch ăn không được dài quá 31 ngày.');
}

function kiemTraNgay(lich, ngay) {
  if (!laNgayHopLe(ngay) || ngay < lich.tuNgay || ngay > lich.denNgay)
    throw error(400, 'Ngày của bữa ăn phải nằm trong khoảng lịch.');
}

function danhSachNgay(tuNgay, denNgay) {
  const result = [];
  for (
    let date = new Date(`${tuNgay}T00:00:00Z`), end = new Date(`${denNgay}T00:00:00Z`);
    date <= end;
    date.setUTCDate(date.getUTCDate() + 1)
  )
    result.push(date.toISOString().slice(0, 10));
  return result;
}

function danhGiaLich(lich) {
  const target = Number(lich.mucTieuKcalMoiNgay) || 2000;
  const theoNgay = Object.fromEntries(
    danhSachNgay(lich.tuNgay, lich.denNgay).map((ngay) => [
      ngay,
      {
        ...Object.fromEntries(CHI_SO.map((key) => [key, 0])),
        soBua: 0,
        loaiBuas: [],
        dayDuDuLieu: true,
      },
    ]),
  );
  for (const bua of lich.buaAns) {
    const result = tinhDinhDuong(bua.monAn);
    const factor = Number(bua.soKhauPhan) || 1;
    const day = theoNgay[bua.ngay];
    if (!day) continue;
    for (const key of CHI_SO)
      day[key] = Math.round((day[key] + result.moiKhauPhan[key] * factor) * 100) / 100;
    day.soBua += 1;
    if (!day.loaiBuas.includes(bua.loaiBua)) day.loaiBuas.push(bua.loaiBua);
    day.dayDuDuLieu = day.dayDuDuLieu && result.dayDuDuLieu;
  }
  return Object.entries(theoNgay).map(([ngay, value]) => {
    const danhGia = danhGiaDinhDuong(
      value,
      target,
      value.loaiBuas,
      value.dayDuDuLieu && value.soBua > 0,
    );
    return {
      ngay,
      ...value,
      mucTieuKcal: target,
      chenhlechKcal: Math.round(value.nangLuongKcal - target),
      ...danhGia,
      deXuat: danhGia.datMucTieu
        ? 'Đạt mục tiêu năng lượng và các chỉ số dinh dưỡng đang theo dõi.'
        : danhGia.chuaDat.join(' '),
    };
  });
}

const list = asyncHandler(async (req, res) => {
  const rows = await db.LichAn.findAll({ where: { idNguoiDung: req.auth.idNguoiDung, trangThai: 1 }, include: [{ model: db.BuaAnTrongLich, as: 'buaAns', include: [{ model: db.MonAn, as: 'monAn', attributes: ['idMonAn', 'tenMonAn', 'anhDaiDien'] }] }], order: [['tuNgay', 'DESC']] });
  return sendSuccess(res, 200, 'Đã tải lịch ăn.', rows);
});

const create = asyncHandler(async (req, res) => {
  const { tenLich, tuNgay, denNgay, mucTieuKcalMoiNgay } = req.body;
  if (!tenLich) throw error(400, 'Tên lịch không hợp lệ.');
  kiemTraKhoangLich(tuNgay, denNgay);
  const row = await db.LichAn.create({ idNguoiDung: req.auth.idNguoiDung, tenLich: String(tenLich).trim(), tuNgay, denNgay, mucTieuKcalMoiNgay: mucTieuKcalMoiNgay ? Number(mucTieuKcalMoiNgay) : null });
  return sendSuccess(res, 201, 'Đã tạo lịch ăn.', row);
});

const update = asyncHandler(async (req, res) => {
  const planId = await sequelize.transaction(async (transaction) => {
    const plan = await layLichDeGhi(req.params.id, req.auth.idNguoiDung, transaction);
    const next = {
      tenLich: req.body.tenLich ?? plan.tenLich,
      tuNgay: req.body.tuNgay ?? plan.tuNgay,
      denNgay: req.body.denNgay ?? plan.denNgay,
      mucTieuKcalMoiNgay: req.body.mucTieuKcalMoiNgay ?? plan.mucTieuKcalMoiNgay,
    };
    kiemTraKhoangLich(next.tuNgay, next.denNgay);
    const meals = await db.BuaAnTrongLich.findAll({
      where: { idLichAn: plan.idLichAn },
      attributes: ['ngay'],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const excludedMeal = meals.find(
      (meal) => meal.ngay < next.tuNgay || meal.ngay > next.denNgay,
    );
    if (excludedMeal)
      throw error(
        409,
        `Không thể cập nhật khoảng ngày vì bữa ăn ngày ${excludedMeal.ngay} sẽ nằm ngoài lịch.`,
      );
    await plan.update({ ...next, ngayCapNhat: new Date() }, { transaction });
    return plan.idLichAn;
  });
  return sendSuccess(
    res,
    200,
    'Đã cập nhật lịch ăn.',
    xuatLichAn(await layLich(planId, req.auth.idNguoiDung)),
  );
});

const detail = asyncHandler(async (req, res) => sendSuccess(
  res,
  200,
  'Chi tiết lịch ăn.',
  xuatLichAn(await layLich(req.params.id, req.auth.idNguoiDung)),
));

const addMeal = asyncHandler(async (req, res) => {
  const lich = await layLich(req.params.id, req.auth.idNguoiDung);
  const { idMonAn, ngay, loaiBua, soKhauPhan, ghiChu } = req.body;
  kiemTraNgay(lich, ngay);
  if (!LOAI_BUA.includes(loaiBua) || !Number.isFinite(Number(soKhauPhan)) || Number(soKhauPhan) <= 0 || Number(soKhauPhan) > 100)
    throw error(400, 'Loại bữa hoặc khẩu phần không hợp lệ.');
  const monAn = await db.MonAn.findOne({ where: { idMonAn: Number(idMonAn), trangThai: 1, trangThaiDuyet: 'DA_DUYET' } });
  if (!monAn) throw error(404, 'Không tìm thấy món ăn.');
  await kiemTraMoCongThuc(req.auth.idNguoiDung, monAn);
  const row = await sequelize.transaction(async (transaction) => {
    const lockedPlan = await layLichDeGhi(
      lich.idLichAn,
      req.auth.idNguoiDung,
      transaction,
    );
    kiemTraNgay(lockedPlan, ngay);
    return db.BuaAnTrongLich.create(
      {
        idLichAn: lockedPlan.idLichAn,
        idMonAn: monAn.idMonAn,
        ngay,
        loaiBua,
        soKhauPhan: Number(soKhauPhan),
        ghiChu: ghiChu || null,
      },
      { transaction },
    );
  });
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
  const target = Number(lich.mucTieuKcalMoiNgay) || 2000;
  return sendSuccess(res, 200, 'Đã đánh giá lịch ăn.', {
    mucTieuKcalMoiNgay: target,
    mucTieuDinhDuong: taoMucTieuDinhDuong(target),
    theoNgay: danhGiaLich(lich),
  });
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
  const goi = await layGoiHienTai(req.auth.idNguoiDung);
  if (!goi?.lapThucDonTuDong) throw error(403, 'Lập thực đơn tự động cần gói Pro hoặc Chef.');
  const planId = await sequelize.transaction(async (transaction) => {
    const plan = await layLichDeGhi(req.params.id, req.auth.idNguoiDung, transaction);
    const currentLevel = Number(goi.capDo) || 0;
    const accessibleLevels = Object.entries(CAP_DO)
      .filter(([, level]) => level <= currentLevel)
      .map(([code]) => code);
    const recipes = await db.MonAn.findAll({
      where: {
        trangThai: 1,
        trangThaiDuyet: 'DA_DUYET',
        capTruyCapToiThieu: { [Op.in]: accessibleLevels },
      },
      include: [dinhDuongInclude.include[0]],
      order: [['diemDanhGia', 'DESC'], ['idMonAn', 'ASC']],
      distinct: true,
      limit: 40,
      transaction,
    });
    const candidates = recipes
      .map((recipe) => {
        const result = tinhDinhDuong(recipe);
        return result.dayDuDuLieu && result.moiKhauPhan.nangLuongKcal > 0
          ? { idMonAn: recipe.idMonAn, dinhDuong: result.moiKhauPhan }
          : null;
      })
      .filter(Boolean);
    if (candidates.length < 3)
      throw error(
        409,
        'Cần ít nhất 3 công thức bạn có quyền truy cập, có đầy đủ khối lượng quy đổi và dữ liệu dinh dưỡng để tạo lịch.',
      );
    const target = Number(plan.mucTieuKcalMoiNgay) || 2000;
    const rows = [];
    const soLanDung = new Map();
    for (const ngay of danhSachNgay(plan.tuNgay, plan.denNgay)) {
      const selected = chonThucDonTrongNgay(candidates, target, soLanDung);
      if (!selected)
        throw error(
          409,
          `Không tìm được thực đơn cho ${ngay} đạt đồng thời mục tiêu kcal, protein, carbohydrate, chất béo, chất xơ và natri. Lịch cũ được giữ nguyên.`,
        );
      for (const meal of selected.items) {
        rows.push({
          idLichAn: plan.idLichAn,
          idMonAn: meal.idMonAn,
          ngay,
          loaiBua: meal.loaiBua,
          soKhauPhan: meal.soKhauPhan,
          ghiChu: 'Tự động cân bằng theo mục tiêu dinh dưỡng của lịch.',
        });
        soLanDung.set(meal.idMonAn, (soLanDung.get(meal.idMonAn) || 0) + 1);
      }
    }
    await db.BuaAnTrongLich.destroy({ where: { idLichAn: plan.idLichAn }, transaction });
    await db.BuaAnTrongLich.bulkCreate(rows, { transaction });
    return plan.idLichAn;
  });
  const generated = await layLich(planId, req.auth.idNguoiDung);
  generated.setDataValue('danhGiaDinhDuong', danhGiaLich(generated));
  return sendSuccess(res, 200, 'Đã lập thực đơn đạt mục tiêu dinh dưỡng.', xuatLichAn(generated));
});

const remove = asyncHandler(async (req, res) => {
  const plan = await layLich(req.params.id, req.auth.idNguoiDung);
  await plan.update({ trangThai: 0, ngayCapNhat: new Date() });
  return sendSuccess(res, 200, 'Đã xóa lịch ăn.');
});

module.exports = { list, create, update, detail, addMeal, removeMeal, evaluate, shopping, autoGenerate, remove };
