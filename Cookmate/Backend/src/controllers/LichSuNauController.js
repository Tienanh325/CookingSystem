const sequelize = require('../config/database');
const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const error = require('../utils/httpError');
const { getPagination, getPagingMeta } = require('../utils/query');
const includes = [
  {
    model: db.MonAn,
    as: 'monAn',
    attributes: ['idMonAn', 'tenMonAn', 'anhDaiDien', 'tongThoiGian'],
  },
  {
    model: db.ChiTietLichSuNau,
    as: 'chiTietLichSuNaus',
    include: [{ model: db.BuocNau, as: 'buocNau' }],
  },
];
const fetchHistory = (id) => db.LichSuNau.findByPk(id, { include: includes });
function access(req, history) {
  if (!history) throw error(404, 'Không tìm thấy lịch sử nấu.');
  if (!req.auth.isAdmin && Number(history.idNguoiDung) !== req.auth.idNguoiDung)
    throw error(403, 'Bạn không có quyền truy cập lịch sử này.');
}
async function mutate(req, action) {
  await sequelize.transaction(async (transaction) => {
    const history = await db.LichSuNau.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    access(req, history);
    if (history.trangThai !== 'DANG_NAU')
      throw error(409, 'Phiên nấu đã kết thúc, không thể thay đổi.');
    const details = await db.ChiTietLichSuNau.findAll({
      where: { idLichSu: history.idLichSu },
      include: [{ model: db.BuocNau, as: 'buocNau' }],
      transaction,
    });
    details.sort((a, b) => a.buocNau.soThuTu - b.buocNau.soThuTu);
    if (action === 'cancel') {
      await history.update({ trangThai: 'DA_HUY', thoiGianKetThuc: new Date() }, { transaction });
      return;
    }
    if (action === 'step') {
      const detail = details.find((d) => d.idBuocNau === Number(req.params.idBuocNau));
      if (!detail) throw error(404, 'Bước nấu không thuộc phiên này.');
      await detail.update(
        {
          daHoanThanh: req.body.daHoanThanh ? 1 : 0,
          thoiGianHoanThanh: req.body.daHoanThanh ? new Date() : null,
        },
        { transaction },
      );
    }
    const incomplete = details.find((d) => d.daHoanThanh !== 1);
    if (action === 'finish' && incomplete)
      throw error(409, 'Hãy hoàn thành các bước trước khi kết thúc.');
    const done = details.length > 0 && !incomplete;
    await history.update(
      {
        trangThai: done ? 'HOAN_THANH' : 'DANG_NAU',
        buocHienTai: incomplete?.buocNau.soThuTu || details.at(-1)?.buocNau.soThuTu || 1,
        thoiGianKetThuc: done ? new Date() : null,
      },
      { transaction },
    );
  });
  return fetchHistory(req.params.id);
}
module.exports = {
  listMine: asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = { idNguoiDung: req.auth.idNguoiDung };
    if (req.query.trangThai) where.trangThai = req.query.trangThai;
    const result = await db.LichSuNau.findAndCountAll({
      where,
      include: [includes[0]],
      order: [
        ['thoiGianBatDau', 'DESC'],
        ['idLichSu', 'DESC'],
      ],
      limit,
      offset,
    });
    return sendSuccess(
      res,
      200,
      'Lịch sử nấu ăn',
      result.rows,
      getPagingMeta(result.count, page, limit),
    );
  }),
  detail: asyncHandler(async (req, res) => {
    const history = await fetchHistory(req.params.id);
    access(req, history);
    return sendSuccess(res, 200, 'Chi tiết phiên nấu', history);
  }),
  start: asyncHandler(async (req, res) => {
    const idMonAn = Number(req.params.id || req.body?.idMonAn);
    if (!Number.isSafeInteger(idMonAn) || idMonAn < 1) throw error(400, 'ID món ăn không hợp lệ.');
    const id = await sequelize.transaction(async (transaction) => {
      const recipe = await db.MonAn.findOne({
        where: { idMonAn, trangThai: 1 },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!recipe) throw error(404, 'Món ăn không tồn tại.');
      const steps = await db.BuocNau.findAll({
        where: { idMonAn, phienBan: recipe.phienBan },
        order: [['soThuTu', 'ASC']],
        transaction,
      });
      if (!steps.length) throw error(409, 'Món ăn chưa có hướng dẫn nấu.');
      const ingredients = await db.MonAnNguyenLieu.findAll({
        where: { idMonAn },
        include: [{ model: db.NguyenLieu, as: 'nguyenLieu' }],
        transaction,
      });
      const history = await db.LichSuNau.create(
        {
          idNguoiDung: req.auth.idNguoiDung,
          idMonAn,
          trangThai: 'DANG_NAU',
          buocHienTai: steps[0].soThuTu,
          congThucSnapshot: {
            ...recipe.toJSON(),
            buocNaus: steps.map((s) => s.toJSON()),
            nguyenLieus: ingredients.map((i) => i.toJSON()),
          },
        },
        { transaction },
      );
      await db.ChiTietLichSuNau.bulkCreate(
        steps.map((s) => ({ idLichSu: history.idLichSu, idBuocNau: s.idBuocNau, daHoanThanh: 0 })),
        { transaction },
      );
      return history.idLichSu;
    });
    return sendSuccess(res, 201, 'Đã bắt đầu nấu', await fetchHistory(id));
  }),
  updateStep: asyncHandler(async (req, res) =>
    sendSuccess(res, 200, 'Đã cập nhật bước nấu', await mutate(req, 'step')),
  ),
  finish: asyncHandler(async (req, res) =>
    sendSuccess(res, 200, 'Đã hoàn thành', await mutate(req, 'finish')),
  ),
  cancel: asyncHandler(async (req, res) =>
    sendSuccess(res, 200, 'Đã hủy phiên nấu', await mutate(req, 'cancel')),
  ),
};
