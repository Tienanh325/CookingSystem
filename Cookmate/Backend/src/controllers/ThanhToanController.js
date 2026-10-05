const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const error = require('../utils/httpError');
const { sendSuccess } = require('../utils/apiResponse');
const { kichHoatThanhToan } = require('../services/thanhToan');
const { guiThongBaoDay } = require('../services/thongBaoDay');
const vietqr = require('../services/vietqr');

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
      ? {
          payload: { idGoiDichVu: product.idGoiDichVu },
          amount: Number(product.giaThang),
          productCode: product.maGoi,
        }
      : null;
  }
  if (body.loaiSanPham === 'MUC_TIEU') {
    const product = await db.MucTieuAnUong.findOne({
      where: { idMucTieuAnUong: Number(body.idMucTieuAnUong), trangThai: 1 },
    });
    return product
      ? {
          payload: { idMucTieuAnUong: product.idMucTieuAnUong },
          amount: Number(product.giaMuaLe),
          productCode: product.maMucTieu,
        }
      : null;
  }
  return null;
}

const paymentReference = (productCode) => {
  const code = String(productCode || 'PAY').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  return `CM ${code} ${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
};

function serializePayment(row) {
  const payment = typeof row?.toJSON === 'function' ? row.toJSON() : row;
  if (!payment || payment.nhaCungCap !== 'VIETQR') return payment;
  const settings = vietqr.config();
  return {
    ...payment,
    qrUrl: vietqr.createQrUrl({ amount: Number(payment.soTien), addInfo: payment.maThamChieu }),
    nganHang: settings.bankName,
    soTaiKhoan: settings.accountNo,
    nguoiThuHuong: settings.accountName,
    noiDungChuyenKhoan: payment.maThamChieu,
    tenSanPham: payment.goiDichVu?.tenGoi || payment.mucTieuAnUong?.tenMucTieu || null,
  };
}

const pushSafely = (ids, notification) => {
  if (!ids.length || !notification) return;
  guiThongBaoDay(ids, notification).catch((pushError) =>
    console.error('Không gửi được Expo Push thanh toán:', pushError.message),
  );
};

const createVietQr = asyncHandler(async (req, res) => {
  const resolved = await resolveProduct(req.body);
  if (!resolved) throw error(400, 'Sản phẩm thanh toán không hợp lệ.');
  const reference = paymentReference(resolved.productCode);
  const row = await db.YeuCauThanhToan.create({
    idNguoiDung: req.auth.idNguoiDung,
    loaiSanPham: req.body.loaiSanPham,
    ...resolved.payload,
    soTien: resolved.amount,
    nhaCungCap: 'VIETQR',
    maThamChieu: reference,
    trangThai: 'CHO_THANH_TOAN',
  });
  return sendSuccess(res, 201, 'Đã tạo mã VietQR.', serializePayment(row));
});

const customerConfirm = asyncHandler(async (req, res) => {
  const result = await sequelize.transaction(async (transaction) => {
    const payment = await db.YeuCauThanhToan.findOne({
      where: {
        idYeuCauThanhToan: req.params.id,
        idNguoiDung: req.auth.idNguoiDung,
        nhaCungCap: 'VIETQR',
      },
      include: includes.slice(1),
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!payment) throw error(404, 'Không tìm thấy giao dịch.');
    if (payment.trangThai === 'CHO_XAC_NHAN') return { payment, adminIds: [], notification: null };
    if (payment.trangThai !== 'CHO_THANH_TOAN')
      throw error(409, 'Giao dịch không còn ở trạng thái chờ khách hàng xác nhận.');

    await payment.update(
      { trangThai: 'CHO_XAC_NHAN', ngayKhachXacNhan: new Date() },
      { transaction },
    );
    const admins = await db.NguoiDung.findAll({
      where: { trangThai: 1 },
      include: [{
        model: db.VaiTro,
        as: 'vaiTro',
        where: { tenVaiTro: 'ADMIN', trangThai: 1 },
        attributes: [],
      }],
      attributes: ['idNguoiDung'],
      transaction,
    });
    const adminIds = admins.map((admin) => admin.idNguoiDung);
    let notification = null;
    if (adminIds.length) {
      const productName = payment.goiDichVu?.tenGoi || payment.mucTieuAnUong?.tenMucTieu || 'sản phẩm';
      notification = await db.ThongBao.create({
        tieuDe: 'Yêu cầu xác nhận thanh toán',
        noiDung: `${req.user.hoTen} đã báo chuyển ${Number(payment.soTien).toLocaleString('vi-VN')}đ cho ${productName}. Mã ${payment.maThamChieu}.`,
        loai: 'YEU_CAU_THANH_TOAN',
        duongDan: `/payments?payment=${payment.idYeuCauThanhToan}`,
      }, { transaction });
      await db.ThongBaoNguoiDung.bulkCreate(
        adminIds.map((idNguoiDung) => ({ idThongBao: notification.idThongBao, idNguoiDung })),
        { transaction },
      );
    }
    return { payment, adminIds, notification };
  });

  pushSafely(result.adminIds, result.notification);
  return sendSuccess(
    res,
    200,
    'Đã gửi yêu cầu đến quản trị viên. Vui lòng chờ kiểm tra giao dịch.',
    serializePayment(result.payment),
  );
});

const mine = asyncHandler(async (req, res) => {
  const rows = await db.YeuCauThanhToan.findAll({
    where: { idNguoiDung: req.auth.idNguoiDung },
    include: includes.slice(1),
    order: [['ngayTao', 'DESC']],
  });
  return sendSuccess(res, 200, 'Lịch sử thanh toán.', rows.map(serializePayment));
});

const detail = asyncHandler(async (req, res) => {
  const row = await db.YeuCauThanhToan.findOne({
    where: { idYeuCauThanhToan: req.params.id, idNguoiDung: req.auth.idNguoiDung },
    include: includes.slice(1),
  });
  if (!row) throw error(404, 'Không tìm thấy giao dịch.');
  return sendSuccess(res, 200, 'Trạng thái giao dịch.', serializePayment(row));
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
  if (payment.trangThai !== 'CHO_XAC_NHAN')
    throw error(409, 'Chỉ có thể duyệt yêu cầu mà khách hàng đã xác nhận thanh toán.');
  const result = await kichHoatThanhToan(payment.idYeuCauThanhToan, {
    idNguoiXacNhan: req.auth.idNguoiDung,
  });
  return sendSuccess(res, 200, 'Đã xác nhận và kích hoạt quyền 30 ngày.', result.payment);
});

const reject = asyncHandler(async (req, res) => {
  const reason = String(req.body?.lyDoTuChoi || '').trim()
    || 'Không phát hiện giao dịch thành công sau khi kiểm tra số dư tài khoản.';
  if (reason.length > 500) throw error(400, 'Lý do từ chối không được quá 500 ký tự.');
  const result = await sequelize.transaction(async (transaction) => {
    const payment = await db.YeuCauThanhToan.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!payment) throw error(404, 'Không tìm thấy yêu cầu thanh toán.');
    if (payment.trangThai !== 'CHO_XAC_NHAN')
      throw error(409, 'Chỉ có thể từ chối yêu cầu đang chờ phê duyệt.');
    await payment.update({
      trangThai: 'TU_CHOI',
      ngayTuChoi: new Date(),
      lyDoTuChoi: reason,
      idNguoiXacNhan: req.auth.idNguoiDung,
    }, { transaction });
    const notification = await db.ThongBao.create({
      tieuDe: 'Thanh toán chưa được xác nhận',
      noiDung: `${reason} Vui lòng kiểm tra lại giao dịch và tạo yêu cầu thanh toán mới nếu cần.`,
      loai: 'THANH_TOAN_TU_CHOI',
      duongDan: `cookmate://thanh-toan?id=${payment.idYeuCauThanhToan}`,
    }, { transaction });
    await db.ThongBaoNguoiDung.create({
      idThongBao: notification.idThongBao,
      idNguoiDung: payment.idNguoiDung,
    }, { transaction });
    return { payment, notification };
  });
  pushSafely([result.payment.idNguoiDung], result.notification);
  return sendSuccess(res, 200, 'Đã từ chối yêu cầu và thông báo cho khách hàng.', result.payment);
});

module.exports = { confirm, createVietQr, customerConfirm, detail, list, mine, reject };
