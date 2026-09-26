const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const error = require('../utils/httpError');
const { sendSuccess } = require('../utils/apiResponse');

const includes = [
  { model: db.NguoiDung, as: 'nguoiDung', attributes: ['idNguoiDung', 'hoTen', 'email'] },
  { model: db.GoiDichVu, as: 'goiDichVu' },
  { model: db.MucTieuAnUong, as: 'mucTieuAnUong' },
];

const create = asyncHandler(async (req, res) => {
  const { loaiSanPham } = req.body;
  let product, payload;
  if (loaiSanPham === 'GOI_DICH_VU') {
    product = await db.GoiDichVu.findOne({ where: { idGoiDichVu: Number(req.body.idGoiDichVu), trangThai: 1, giaThang: { [Op.gt]: 0 } } });
    payload = { idGoiDichVu: product?.idGoiDichVu };
  } else if (loaiSanPham === 'MUC_TIEU') {
    product = await db.MucTieuAnUong.findOne({ where: { idMucTieuAnUong: Number(req.body.idMucTieuAnUong), trangThai: 1 } });
    payload = { idMucTieuAnUong: product?.idMucTieuAnUong };
  }
  if (!product) throw error(400, 'Sản phẩm thanh toán không hợp lệ.');
  const soTien = Number(product.giaThang ?? product.giaMuaLe);
  const row = await db.YeuCauThanhToan.create({ idNguoiDung: req.auth.idNguoiDung, loaiSanPham, ...payload, soTien, maThamChieu: `CM-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}` });
  return sendSuccess(res, 201, 'Đã tạo yêu cầu thanh toán chờ xác nhận.', row);
});

const mine = asyncHandler(async (req, res) => sendSuccess(res, 200, 'Lịch sử thanh toán.', await db.YeuCauThanhToan.findAll({ where: { idNguoiDung: req.auth.idNguoiDung }, include: includes.slice(1), order: [['ngayTao', 'DESC']] })));
const list = asyncHandler(async (_req, res) => sendSuccess(res, 200, 'Yêu cầu thanh toán.', await db.YeuCauThanhToan.findAll({ include: includes, order: [['ngayTao', 'DESC']] })));

const confirm = asyncHandler(async (req, res) => {
  const row = await sequelize.transaction(async (transaction) => {
    const payment = await db.YeuCauThanhToan.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!payment) throw error(404, 'Không tìm thấy yêu cầu thanh toán.');
    if (payment.trangThai !== 'CHO_XAC_NHAN') throw error(409, 'Yêu cầu này đã được xử lý.');
    const end = new Date(); end.setDate(end.getDate() + 30);
    if (payment.loaiSanPham === 'GOI_DICH_VU') {
      await db.DangKyDichVu.update({ trangThai: 'HET_HAN' }, { where: { idNguoiDung: payment.idNguoiDung, trangThai: 'HOAT_DONG' }, transaction });
      await db.DangKyDichVu.create({ idNguoiDung: payment.idNguoiDung, idGoiDichVu: payment.idGoiDichVu, thoiGianKetThuc: end, nguon: 'THANH_TOAN' }, { transaction });
    } else {
      await db.NguoiDungMucTieu.create({ idNguoiDung: payment.idNguoiDung, idMucTieuAnUong: payment.idMucTieuAnUong, thoiGianKetThuc: end, nguonQuyen: 'THANH_TOAN' }, { transaction });
    }
    await payment.update({ trangThai: 'DA_THANH_TOAN', ngayXacNhan: new Date(), idNguoiXacNhan: req.auth.idNguoiDung }, { transaction });
    return payment;
  });
  return sendSuccess(res, 200, 'Đã xác nhận và kích hoạt quyền 30 ngày.', row);
});

module.exports = { create, mine, list, confirm };
