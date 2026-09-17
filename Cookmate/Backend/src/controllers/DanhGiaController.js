const { fn, col } = require('sequelize');
const sequelize = require('../config/database');
const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const error = require('../utils/httpError');
const { getPagination, getPagingMeta } = require('../utils/query');
async function updateRating(idMonAn, transaction) {
  const stats = await db.DanhGia.findOne({
    attributes: [[fn('AVG', col('soSao')), 'averageRating']],
    where: { idMonAn, trangThai: 1 },
    raw: true,
    transaction,
  });
  const averageRating = Number(Number(stats.averageRating || 0).toFixed(2));
  await db.MonAn.update({ diemDanhGia: averageRating }, { where: { idMonAn }, transaction });
  return averageRating;
}
module.exports = {
  listByRecipe: asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const idMonAn = req.params.id;
    if (!(await db.MonAn.findOne({ where: { idMonAn, trangThai: 1 } })))
      throw error(404, 'Món ăn không tồn tại.');
    const r = await db.DanhGia.findAndCountAll({
      where: { idMonAn, trangThai: 1 },
      include: [
        {
          model: db.NguoiDung,
          as: 'nguoiDung',
          attributes: ['idNguoiDung', 'hoTen', 'anhDaiDien'],
        },
      ],
      order: [['ngayDanhGia', 'DESC'], ['idDanhGia', 'DESC']],
      limit,
      offset,
    });
    return sendSuccess(res, 200, 'Đánh giá', r.rows, getPagingMeta(r.count, page, limit));
  }),
  listMine: asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const r = await db.DanhGia.findAndCountAll({
      where: { idNguoiDung: req.auth.idNguoiDung, trangThai: 1 },
      include: [
        {
          model: db.MonAn,
          as: 'monAn',
          attributes: ['idMonAn', 'tenMonAn', 'anhDaiDien', 'diemDanhGia'],
        },
      ],
      order: [['ngayDanhGia', 'DESC'], ['idDanhGia', 'DESC']],
      limit,
      offset,
    });
    return sendSuccess(res, 200, 'Đánh giá của bạn', r.rows, getPagingMeta(r.count, page, limit));
  }),
  upsertForRecipe: asyncHandler(async (req, res) => {
    const data = await sequelize.transaction(
      { isolationLevel: 'READ COMMITTED' },
      async (transaction) => {
        const idMonAn = Number(req.params.id);
        const recipe = await db.MonAn.findOne({
          where: { idMonAn, trangThai: 1 },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!recipe) throw error(404, 'Món ăn không tồn tại.');
        let review = await db.DanhGia.findOne({
          where: { idMonAn, idNguoiDung: req.auth.idNguoiDung },
          transaction,
        });
        const payload = {
          soSao: req.body.soSao,
          noiDung: req.body.noiDung || null,
          trangThai: 1,
          ngayCapNhat: new Date(),
        };
        if (review) await review.update(payload, { transaction });
        else
          review = await db.DanhGia.create(
            { ...payload, idMonAn, idNguoiDung: req.auth.idNguoiDung },
            { transaction },
          );
        return { review, averageRating: await updateRating(idMonAn, transaction) };
      },
    );
    return sendSuccess(res, 200, 'Đã lưu đánh giá', data);
  }),
  remove: asyncHandler(async (req, res) => {
    const original = await db.DanhGia.findByPk(req.params.id);
    if (!original) throw error(404, 'Đánh giá không tồn tại.');
    if (!req.auth.isAdmin && original.idNguoiDung !== req.auth.idNguoiDung)
      throw error(403, 'Bạn không có quyền xóa đánh giá này.');
    const averageRating = await sequelize.transaction(
      { isolationLevel: 'READ COMMITTED' },
      async (transaction) => {
        await db.MonAn.findByPk(original.idMonAn, { transaction, lock: transaction.LOCK.UPDATE });
        await db.DanhGia.destroy({ where: { idDanhGia: original.idDanhGia }, transaction });
        if (req.auth.isAdmin)
          await require('../utils/audit')(
            req,
            'DELETE',
            'DanhGia',
            original.idDanhGia,
            transaction,
          );
        return updateRating(original.idMonAn, transaction);
      },
    );
    return sendSuccess(res, 200, 'Đã xóa đánh giá', { averageRating });
  }),
};
