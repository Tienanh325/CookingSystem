const sequelize = require('../config/database');
const db = require('../models');
const error = require('../utils/httpError');
const { guiThongBaoDay } = require('./thongBaoDay');

async function kichHoatThanhToan(idYeuCauThanhToan, metadata = {}) {
  const result = await sequelize.transaction(async (transaction) => {
    const payment = await db.YeuCauThanhToan.findByPk(idYeuCauThanhToan, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!payment) throw error(404, 'Không tìm thấy giao dịch.');
    if (payment.trangThai === 'DA_THANH_TOAN') return { payment, alreadyConfirmed: true };
    if (payment.trangThai !== 'CHO_XAC_NHAN')
      throw error(409, 'Khách hàng chưa gửi xác nhận đã thanh toán hoặc giao dịch không còn chờ duyệt.');

    const end = new Date();
    end.setDate(end.getDate() + 30);
    let productName;
    if (payment.loaiSanPham === 'GOI_DICH_VU') {
      const plan = await db.GoiDichVu.findByPk(payment.idGoiDichVu, { transaction });
      if (!plan) throw error(409, 'Gói dịch vụ của giao dịch không còn tồn tại.');
      productName = `gói ${plan.tenGoi}`;
      await db.DangKyDichVu.update(
        { trangThai: 'HET_HAN' },
        { where: { idNguoiDung: payment.idNguoiDung, trangThai: 'HOAT_DONG' }, transaction },
      );
      await db.DangKyDichVu.create(
        {
          idNguoiDung: payment.idNguoiDung,
          idGoiDichVu: payment.idGoiDichVu,
          thoiGianKetThuc: end,
          nguon: payment.nhaCungCap === 'VIETQR' ? 'VIETQR' : 'THANH_TOAN',
        },
        { transaction },
      );
    } else {
      const goal = await db.MucTieuAnUong.findByPk(payment.idMucTieuAnUong, { transaction });
      if (!goal) throw error(409, 'Mục tiêu ăn uống của giao dịch không còn tồn tại.');
      productName = `mục tiêu ${goal.tenMucTieu}`;
      const [access] = await db.NguoiDungMucTieu.findOrCreate({
        where: {
          idNguoiDung: payment.idNguoiDung,
          idMucTieuAnUong: payment.idMucTieuAnUong,
          nguonQuyen: 'THANH_TOAN',
        },
        defaults: { thoiGianKetThuc: end, trangThai: 1 },
        transaction,
      });
      await access.update({ thoiGianBatDau: new Date(), thoiGianKetThuc: end, trangThai: 1 }, { transaction });
    }
    await payment.update(
      {
        trangThai: 'DA_THANH_TOAN',
        ngayXacNhan: new Date(),
        quyenHetHanLuc: end,
        ...metadata,
      },
      { transaction },
    );
    const notification = await db.ThongBao.create(
      {
        tieuDe: 'Thanh toán thành công',
        noiDung: `Cookmate đã nhận ${Number(payment.soTien).toLocaleString('vi-VN')}đ cho ${productName}. Quyền sử dụng đã được kích hoạt 30 ngày.`,
        loai: 'THANH_TOAN_THANH_CONG',
        duongDan: `cookmate://thanh-toan?id=${payment.idYeuCauThanhToan}`,
      },
      { transaction },
    );
    await db.ThongBaoNguoiDung.create(
      { idThongBao: notification.idThongBao, idNguoiDung: payment.idNguoiDung },
      { transaction },
    );
    return { payment, notification, alreadyConfirmed: false };
  });

  if (result.notification)
    guiThongBaoDay([result.payment.idNguoiDung], result.notification).catch((pushError) =>
      console.error('Không gửi được Expo Push thanh toán:', pushError.message),
    );
  return result;
}

module.exports = { kichHoatThanhToan };
