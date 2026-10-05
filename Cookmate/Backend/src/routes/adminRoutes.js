const express = require('express');
const { Op, fn, col } = require('sequelize');
const db = require('../models');
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
const error = require('../utils/httpError');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, getPagingMeta } = require('../utils/query');
const router = express.Router();
router.use(authenticate, authorizeAdmin, (req, res, next) => {
  req.isAdminView = true;
  next();
});
for (const [path, controller] of [
  ['mon-an', 'MonAnController'],
  ['danh-muc', 'DanhMucController'],
  ['nguyen-lieu', 'NguyenLieuController'],
]) {
  const c = require(`../controllers/${controller}`);
  router.get(`/${path}`, c.list);
  router.get(`/${path}/:id`, c.detail);
}
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const period = req.query.period || 'all';
    if (!['all', 'month', 'day'].includes(period))
      throw error(400, 'Bộ lọc xếp hạng không hợp lệ.');
    const now = new Date();
    let rankingSince = null;
    if (period === 'month') rankingSince = new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === 'day') {
      rankingSince = new Date(now);
      rankingSince.setHours(0, 0, 0, 0);
    }
    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);
    const rankingWhere = { trangThai: 'HOAN_THANH' };
    if (rankingSince) rankingWhere.thoiGianKetThuc = { [Op.gte]: rankingSince };
    const [recipes, users, cooks, categories, hidden, rankingCounts, activityRows] = await Promise.all([
      db.MonAn.count({ where: { trangThai: 1 } }),
      db.NguoiDung.count(),
      db.LichSuNau.count({ where: { trangThai: 'HOAN_THANH' } }),
      db.DanhMuc.count({ where: { trangThai: 1 } }),
      db.MonAn.count({ where: { trangThai: 0 } }),
      db.LichSuNau.findAll({
        attributes: ['idMonAn', [fn('COUNT', col('idLichSu')), 'soLuotNau']],
        where: rankingWhere,
        group: ['idMonAn'],
        order: [[fn('COUNT', col('idLichSu')), 'DESC'], ['idMonAn', 'ASC']],
        limit: 5,
        raw: true,
      }),
      db.LichSuNau.findAll({
        attributes: [
          [fn('DATE', col('thoiGianBatDau')), 'date'],
          [fn('COUNT', col('idLichSu')), 'count'],
        ],
        where: { thoiGianBatDau: { [Op.gte]: since } },
        group: [fn('DATE', col('thoiGianBatDau'))],
        order: [[fn('DATE', col('thoiGianBatDau')), 'ASC']],
        raw: true,
      }),
    ]);
    const rankedRecipes = rankingCounts.length
      ? await db.MonAn.findAll({
          where: { idMonAn: { [Op.in]: rankingCounts.map((item) => item.idMonAn) } },
          attributes: ['idMonAn', 'tenMonAn', 'anhDaiDien', 'diemDanhGia', 'trangThai'],
          include: [{ model: db.DanhMuc, as: 'danhMuc', attributes: ['tenDanhMuc'] }],
        })
      : [];
    const recipeById = new Map(rankedRecipes.map((item) => [Number(item.idMonAn), item]));
    const ranking = rankingCounts
      .map((item, index) => {
        const recipe = recipeById.get(Number(item.idMonAn));
        if (!recipe) return null;
        recipe.setDataValue('soLuotNau', Number(item.soLuotNau));
        recipe.setDataValue('xepHang', index + 1);
        return recipe;
      })
      .filter(Boolean);
    const activityByDate = new Map(
      activityRows.map((item) => [String(item.date), Number(item.count)]),
    );
    const activity = [];
    for (let index = 0; index < 30; index += 1) {
      const day = new Date(since);
      day.setDate(since.getDate() + index);
      const date = [
        day.getFullYear(),
        String(day.getMonth() + 1).padStart(2, '0'),
        String(day.getDate()).padStart(2, '0'),
      ].join('-');
      activity.push({ date, count: activityByDate.get(date) || 0 });
    }
    return sendSuccess(res, 200, 'Tổng quan', {
      recipes,
      users,
      cooks,
      categories,
      hidden,
      rankingPeriod: period,
      ranking,
      activity,
    });
  }),
);
router.get('/xep-hang', require('../controllers/XepHangController').list);
router.get(
  '/binh-luan',
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const r = await db.BinhLuan.findAndCountAll({
      where: { trangThai: 1 },
      include: [
        { model: db.NguoiDung, as: 'nguoiDung', attributes: ['idNguoiDung', 'hoTen'] },
        { model: db.MonAn, as: 'monAn', attributes: ['idMonAn', 'tenMonAn'] },
      ],
      order: [['ngayBinhLuan', 'DESC'], ['idBinhLuan', 'DESC']],
      limit,
      offset,
    });
    return sendSuccess(res, 200, 'Bình luận', r.rows, getPagingMeta(r.count, page, limit));
  }),
);
router.get(
  '/danh-gia',
  asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const r = await db.DanhGia.findAndCountAll({
      where: { trangThai: 1 },
      include: [
        { model: db.NguoiDung, as: 'nguoiDung', attributes: ['idNguoiDung', 'hoTen'] },
        { model: db.MonAn, as: 'monAn', attributes: ['idMonAn', 'tenMonAn'] },
      ],
      order: [['ngayDanhGia', 'DESC'], ['idDanhGia', 'DESC']],
      limit,
      offset,
    });
    return sendSuccess(res, 200, 'Đánh giá', r.rows, getPagingMeta(r.count, page, limit));
  }),
);
router.get('/thong-bao', require('../controllers/ThongBaoController').listSent);
router.patch('/bai-dang/:id/kiem-duyet', require('../controllers/MonAnController').reviewSubmission);
router.get('/thanh-toan', require('../controllers/ThanhToanController').list);
router.patch('/thanh-toan/:id/xac-nhan', require('../controllers/ThanhToanController').confirm);
router.patch('/thanh-toan/:id/tu-choi', require('../controllers/ThanhToanController').reject);
module.exports = router;
