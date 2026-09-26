const { Op } = require('sequelize');
const sequelize = require('../config/database');
const db = require('../models');
const error = require('../utils/httpError');
const { layGoiHienTai } = require('./goiDichVu');

const CAP_DO = { FREE: 0, BASIC: 1, PRO: 2, CHEF: 3 };

async function kiemTraMoCongThuc(idNguoiDung, monAn) {
  const goi = await layGoiHienTai(idNguoiDung);
  const required = CAP_DO[monAn.capTruyCapToiThieu] ?? 0;
  if ((Number(goi?.capDo) || 0) < required)
    throw error(403, `Công thức này cần gói ${monAn.capTruyCapToiThieu}.`);
  if (!idNguoiDung || !goi?.hanMucCongThucMoiMoiNgay) return { goi, laCongThucMoi: false };

  return sequelize.transaction(async (transaction) => {
    await db.NguoiDung.findByPk(idNguoiDung, { transaction, lock: transaction.LOCK.UPDATE });
    const daMo = await db.CongThucDaMo.findOne({ where: { idNguoiDung, idMonAn: monAn.idMonAn }, transaction });
    if (daMo) return { goi, laCongThucMoi: false };
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    const count = await db.CongThucDaMo.count({ where: { idNguoiDung, ngayMoDauTien: { [Op.gte]: start, [Op.lt]: end } }, transaction });
    if (count >= Number(goi.hanMucCongThucMoiMoiNgay))
      throw error(429, `Bạn đã mở đủ ${goi.hanMucCongThucMoiMoiNgay} công thức mới hôm nay.`);
    await db.CongThucDaMo.create({ idNguoiDung, idMonAn: monAn.idMonAn }, { transaction });
    return { goi, laCongThucMoi: true, conLai: Number(goi.hanMucCongThucMoiMoiNgay) - count - 1 };
  });
}

module.exports = { CAP_DO, kiemTraMoCongThuc };
