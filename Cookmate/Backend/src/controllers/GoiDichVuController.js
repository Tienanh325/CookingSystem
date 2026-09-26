const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { layQuyenNguoiDung } = require('../services/goiDichVu');

const toPlan = (plan) => {
  const value = plan.get({ plain: true });
  return {
    ...value,
    giaThang: Number(value.giaThang),
    hanMucCongThucMoiMoiNgay:
      value.hanMucCongThucMoiMoiNgay === null ? null : Number(value.hanMucCongThucMoiMoiNgay),
  };
};

const GoiDichVuController = {
  list: asyncHandler(async (_req, res) => {
    const [plans, goals] = await Promise.all([
      db.GoiDichVu.findAll({
        where: { trangThai: 1 },
        include: [{ model: db.MucTieuAnUong, as: 'mucTieuAnUongs', through: { attributes: [] } }],
        order: [['capDo', 'ASC']],
      }),
      db.MucTieuAnUong.findAll({ where: { trangThai: 1 }, order: [['idMucTieuAnUong', 'ASC']] }),
    ]);
    return sendSuccess(res, 200, 'Subscription catalog loaded', {
      goiDichVus: plans.map(toPlan),
      mucTieuAnUongs: goals.map((goal) => ({
        ...goal.get({ plain: true }),
        giaMuaLe: Number(goal.giaMuaLe),
      })),
    });
  }),

  mine: asyncHandler(async (req, res) => {
    const access = await layQuyenNguoiDung(req.auth.idNguoiDung);
    return sendSuccess(res, 200, 'Current entitlements loaded', {
      goiDichVu: toPlan(access.goi),
      mucTieuAnUongs: access.mucTieuAnUongs,
    });
  }),
};

module.exports = GoiDichVuController;
