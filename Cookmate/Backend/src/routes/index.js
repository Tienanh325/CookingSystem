const express = require('express');

const authRoutes = require('./authRoutes');
const binhLuanRoutes = require('./binhLuanRoutes');
const danhGiaRoutes = require('./danhGiaRoutes');
const danhMucRoutes = require('./danhMucRoutes');
const lichSuNauRoutes = require('./lichSuNauRoutes');
const monAnRoutes = require('./monAnRoutes');
const nguoiDungRoutes = require('./nguoiDungRoutes');
const nguyenLieuRoutes = require('./nguyenLieuRoutes');
const nhatKyHeThongRoutes = require('./nhatKyHeThongRoutes');
const thongBaoRoutes = require('./thongBaoRoutes');
const uploadRoutes = require('./uploadRoutes');
const vaiTroRoutes = require('./vaiTroRoutes');
const yeuThichRoutes = require('./yeuThichRoutes');
const goiDichVuRoutes = require('./goiDichVuRoutes');

const router = express.Router();
router.use('/admin', require('./adminRoutes'));

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Cookmate API is running',
  });
});

router.use('/auth', authRoutes);
router.use('/danh-muc', danhMucRoutes);
router.use('/nguyen-lieu', nguyenLieuRoutes);
router.use('/mon-an', monAnRoutes);
router.use('/yeu-thich', yeuThichRoutes);
router.use('/danh-gia', danhGiaRoutes);
router.use('/binh-luan', binhLuanRoutes);
router.use('/lich-su-nau', lichSuNauRoutes);
router.use('/thong-bao', thongBaoRoutes);
router.use('/uploads', uploadRoutes);
router.use('/nguoi-dung', nguoiDungRoutes);
router.use('/vai-tro', vaiTroRoutes);
router.use('/nhat-ky-he-thong', nhatKyHeThongRoutes);
router.use('/goi-dich-vu', goiDichVuRoutes);
router.use('/lich-an', require('./lichAnRoutes'));

module.exports = router;
