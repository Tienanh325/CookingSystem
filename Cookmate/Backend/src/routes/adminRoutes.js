const express = require('express');
const { Op, fn, col } = require('sequelize');
const db = require('../models');
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');
const asyncHandler = require('../utils/asyncHandler');
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
    const since = new Date();
    since.setDate(since.getDate() - 29);
    since.setHours(0, 0, 0, 0);
    const [recipes, users, cooks, categories, hidden, recent, activity] = await Promise.all([
      db.MonAn.count({ where: { trangThai: 1 } }),
      db.NguoiDung.count(),
      db.LichSuNau.count({ where: { trangThai: 'HOAN_THANH' } }),
      db.DanhMuc.count({ where: { trangThai: 1 } }),
      db.MonAn.count({ where: { trangThai: 0 } }),
      db.MonAn.findAll({
        order: [['ngayTao', 'DESC']],
        limit: 5,
        include: [{ model: db.DanhMuc, as: 'danhMuc' }],
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
    return sendSuccess(res, 200, 'Tổng quan', {
      recipes,
      users,
      cooks,
      categories,
      hidden,
      recent,
      activity,
    });
  }),
);
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
module.exports = router;
