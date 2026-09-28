const sequelize = require('../config/database');
const db = require('../models');
const error = require('../utils/httpError');

async function kichHoatThanhToan(idYeuCauThanhToan, metadata = {}) {
  return sequelize.transaction(async (transaction) => {
    const payment = await db.YeuCauThanhToan.findByPk(idYeuCauThanhToan, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!payment) throw error(404, 'Không tìm thấy giao dịch.');
    if (payment.trangThai === 'DA_THANH_TOAN') return { payment, alreadyConfirmed: true };
    if (!['CHO_XAC_NHAN', 'CHO_THANH_TOAN'].includes(payment.trangThai))
      throw error(409, 'Giao dịch không còn ở trạng thái chờ thanh toán.');

    const end = new Date();
    end.setDate(end.getDate() + 30);
    if (payment.loaiSanPham === 'GOI_DICH_VU') {
      await db.DangKyDichVu.update(
        { trangThai: 'HET_HAN' },
        { where: { idNguoiDung: payment.idNguoiDung, trangThai: 'HOAT_DONG' }, transaction },
      );
      await db.DangKyDichVu.create(
        {
          idNguoiDung: payment.idNguoiDung,
          idGoiDichVu: payment.idGoiDichVu,
          thoiGianKetThuc: end,
          nguon: payment.nhaCungCap === 'VNPAY' ? 'VNPAY' : 'THANH_TOAN',
        },
        { transaction },
      );
    } else {
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
        ...metadata,
      },
      { transaction },
    );
    return { payment, alreadyConfirmed: false };
  });
}

module.exports = { kichHoatThanhToan };
