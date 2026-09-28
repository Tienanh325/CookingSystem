const crypto = require('crypto');
const { Op } = require('sequelize');
const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const error = require('../utils/httpError');
const { sendSuccess } = require('../utils/apiResponse');
const { kichHoatThanhToan } = require('../services/thanhToan');
const vnpay = require('../services/vnpay');

const includes = [
  { model: db.NguoiDung, as: 'nguoiDung', attributes: ['idNguoiDung', 'hoTen', 'email'] },
  { model: db.GoiDichVu, as: 'goiDichVu' },
  { model: db.MucTieuAnUong, as: 'mucTieuAnUong' },
];

async function resolveProduct(body) {
  if (body.loaiSanPham === 'GOI_DICH_VU') {
    const product = await db.GoiDichVu.findOne({
      where: { idGoiDichVu: Number(body.idGoiDichVu), trangThai: 1, giaThang: { [Op.gt]: 0 } },
    });
    return product
      ? { payload: { idGoiDichVu: product.idGoiDichVu }, amount: Number(product.giaThang) }
      : null;
  }
  if (body.loaiSanPham === 'MUC_TIEU') {
    const product = await db.MucTieuAnUong.findOne({
      where: { idMucTieuAnUong: Number(body.idMucTieuAnUong), trangThai: 1 },
    });
    return product
      ? { payload: { idMucTieuAnUong: product.idMucTieuAnUong }, amount: Number(product.giaMuaLe) }
      : null;
  }
  return null;
}

const create = asyncHandler(async (req, res) => {
  const resolved = await resolveProduct(req.body);
  if (!resolved) throw error(400, 'Sản phẩm thanh toán không hợp lệ.');
  const row = await db.YeuCauThanhToan.create({
    idNguoiDung: req.auth.idNguoiDung,
    loaiSanPham: req.body.loaiSanPham,
    ...resolved.payload,
    soTien: resolved.amount,
    maThamChieu: `CM-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
  });
  return sendSuccess(res, 201, 'Đã tạo yêu cầu thanh toán chờ xác nhận.', row);
});

const createVnpay = asyncHandler(async (req, res) => {
  const resolved = await resolveProduct(req.body);
  if (!resolved) throw error(400, 'Sản phẩm thanh toán không hợp lệ.');
  const reference = `CM${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const { paymentUrl, expiresAt } = vnpay.createPaymentUrl({
    reference,
    amount: resolved.amount,
    ipAddress: req.socket.remoteAddress || req.ip,
  });
  const row = await db.YeuCauThanhToan.create({
    idNguoiDung: req.auth.idNguoiDung,
    loaiSanPham: req.body.loaiSanPham,
    ...resolved.payload,
    soTien: resolved.amount,
    nhaCungCap: 'VNPAY',
    maThamChieu: reference,
    trangThai: 'CHO_THANH_TOAN',
    ngayHetHanThanhToan: expiresAt,
  });
  return sendSuccess(res, 201, 'Đã tạo giao dịch VNPAY.', {
    idYeuCauThanhToan: row.idYeuCauThanhToan,
    maThamChieu: row.maThamChieu,
    soTien: Number(row.soTien),
    trangThai: row.trangThai,
    paymentUrl,
    expiresAt,
  });
});

const mine = asyncHandler(async (req, res) =>
  sendSuccess(res, 200, 'Lịch sử thanh toán.', await db.YeuCauThanhToan.findAll({
    where: { idNguoiDung: req.auth.idNguoiDung },
    include: includes.slice(1),
    order: [['ngayTao', 'DESC']],
  })),
);

const detail = asyncHandler(async (req, res) => {
  const row = await db.YeuCauThanhToan.findOne({
    where: { idYeuCauThanhToan: req.params.id, idNguoiDung: req.auth.idNguoiDung },
    include: includes.slice(1),
  });
  if (!row) throw error(404, 'Không tìm thấy giao dịch.');
  return sendSuccess(res, 200, 'Trạng thái giao dịch.', row);
});

const list = asyncHandler(async (_req, res) =>
  sendSuccess(res, 200, 'Yêu cầu thanh toán.', await db.YeuCauThanhToan.findAll({
    include: includes,
    order: [['ngayTao', 'DESC']],
  })),
);

const confirm = asyncHandler(async (req, res) => {
  const payment = await db.YeuCauThanhToan.findByPk(req.params.id);
  if (!payment) throw error(404, 'Không tìm thấy yêu cầu thanh toán.');
  if (payment.nhaCungCap === 'VNPAY')
    throw error(409, 'Giao dịch VNPAY chỉ được xác nhận bằng IPN có chữ ký hợp lệ.');
  const result = await kichHoatThanhToan(payment.idYeuCauThanhToan, {
    idNguoiXacNhan: req.auth.idNguoiDung,
  });
  return sendSuccess(res, 200, 'Đã xác nhận và kích hoạt quyền 30 ngày.', result.payment);
});

const ipn = asyncHandler(async (req, res) => {
  const verified = vnpay.verifyCallback(req.query);
  if (!verified.valid) return res.status(200).json({ RspCode: '97', Message: 'Invalid checksum' });
  const params = verified.params;
  if (params.vnp_TmnCode !== verified.settings.tmnCode)
    return res.status(200).json({ RspCode: '97', Message: 'Invalid terminal' });
  const payment = await db.YeuCauThanhToan.findOne({
    where: { maThamChieu: params.vnp_TxnRef, nhaCungCap: 'VNPAY' },
  });
  if (!payment) return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
  if (Number(params.vnp_Amount) !== Number(payment.soTien) * 100)
    return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
  if (payment.trangThai === 'DA_THANH_TOAN')
    return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });
  if (!['CHO_THANH_TOAN', 'CHO_XAC_NHAN'].includes(payment.trangThai))
    return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });

  const callbackData = {
    maGiaoDichNhaCungCap: params.vnp_TransactionNo || null,
    maPhanHoi: params.vnp_ResponseCode || null,
    duLieuPhanHoi: params,
  };
  if (params.vnp_ResponseCode === '00' && params.vnp_TransactionStatus === '00') {
    await kichHoatThanhToan(payment.idYeuCauThanhToan, callbackData);
  } else if (['CHO_THANH_TOAN', 'CHO_XAC_NHAN'].includes(payment.trangThai)) {
    await payment.update({ trangThai: 'THAT_BAI', ...callbackData });
  }
  return res.status(200).json({ RspCode: '00', Message: 'Confirm success' });
});

const returnFromVnpay = asyncHandler(async (req, res) => {
  const verified = vnpay.verifyCallback(req.query);
  const reference = String(verified.params.vnp_TxnRef || '');
  const payment = reference
    ? await db.YeuCauThanhToan.findOne({ where: { maThamChieu: reference, nhaCungCap: 'VNPAY' } })
    : null;
  const target = new URL(verified.settings.appReturnUrl);
  if (payment) target.searchParams.set('id', payment.idYeuCauThanhToan);
  if (reference) target.searchParams.set('ref', reference);
  target.searchParams.set('valid', verified.valid ? '1' : '0');
  target.searchParams.set('responseCode', String(verified.params.vnp_ResponseCode || ''));
  return res.redirect(302, target.toString());
});

module.exports = { confirm, create, createVnpay, detail, ipn, list, mine, returnFromVnpay };
