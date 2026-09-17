const db = require('../models');
const sequelize = require('../config/database');
const audit = require('../utils/audit');
const asyncHandler = require('../utils/asyncHandler');
const { sendError, sendSuccess } = require('../utils/apiResponse');
const { getPagination, getPagingMeta, normalizeText } = require('../utils/query');

const userInclude = () => ({
  model: db.NguoiDung,
  as: 'nguoiDung',
  attributes: ['idNguoiDung', 'hoTen', 'anhDaiDien'],
});

const canModifyComment = (req, comment) => {
  return req.auth.isAdmin || Number(comment.idNguoiDung) === Number(req.auth.idNguoiDung);
};

const BinhLuanController = {
  listByRecipe: asyncHandler(async (req, res) => {
    if (!(await db.MonAn.findOne({ where: { idMonAn: req.params.id, trangThai: 1 } })))
      return sendError(res, 404, 'Món ăn không tồn tại.');
    const { page, limit, offset } = getPagination(req.query);
    const result = await db.BinhLuan.findAndCountAll({
      where: {
        idMonAn: req.params.idMonAn || req.params.id,
        idBinhLuanCha: null,
        trangThai: 1,
      },
      include: [
        userInclude(),
        {
          model: db.BinhLuan,
          as: 'binhLuanCon',
          where: {
            trangThai: 1,
          },
          required: false,
          include: [userInclude()],
        },
      ],
      order: [
        ['ngayBinhLuan', 'DESC'],
        ['idBinhLuan', 'DESC'],
        [{ model: db.BinhLuan, as: 'binhLuanCon' }, 'ngayBinhLuan', 'ASC'],
      ],
      distinct: true,
      limit,
      offset,
    });

    return sendSuccess(
      res,
      200,
      'Comments loaded',
      result.rows,
      getPagingMeta(result.count, page, limit),
    );
  }),

  createForRecipe: asyncHandler(async (req, res) => {
    const idMonAn = req.params.idMonAn || req.params.id;
    const noiDung = normalizeText(req.body.noiDung);

    if (!noiDung) {
      return sendError(res, 400, 'noiDung is required');
    }

    const monAn = await db.MonAn.findOne({
      where: {
        idMonAn,
        trangThai: 1,
      },
    });

    if (!monAn) {
      return sendError(res, 404, 'Recipe not found');
    }

    const idBinhLuanCha = req.body.idBinhLuanCha
      ? Number.parseInt(req.body.idBinhLuanCha, 10)
      : null;

    if (idBinhLuanCha) {
      const parent = await db.BinhLuan.findOne({
        where: {
          idBinhLuan: idBinhLuanCha,
          idMonAn,
          trangThai: 1,
        },
      });

      if (!parent || parent.idBinhLuanCha !== null) {
        return sendError(res, 400, 'Parent comment does not exist');
      }
    }

    const comment = await db.BinhLuan.create({
      idNguoiDung: req.auth.idNguoiDung,
      idMonAn,
      idBinhLuanCha,
      noiDung,
      trangThai: 1,
    });

    const loadedComment = await db.BinhLuan.findByPk(comment.idBinhLuan, {
      include: [userInclude()],
    });

    return sendSuccess(res, 201, 'Comment created', loadedComment);
  }),

  update: asyncHandler(async (req, res) => {
    const comment = await db.BinhLuan.findByPk(req.params.id);

    if (!comment || comment.trangThai !== 1) {
      return sendError(res, 404, 'Comment not found');
    }

    if (!canModifyComment(req, comment)) {
      return sendError(res, 403, 'You cannot update this comment');
    }

    const noiDung = normalizeText(req.body.noiDung);

    if (!noiDung) {
      return sendError(res, 400, 'noiDung is required');
    }

    await sequelize.transaction(async (transaction) => {
      await comment.update({ noiDung, ngayCapNhat: new Date() }, { transaction });
      if (req.auth.isAdmin) await audit(req, 'UPDATE', 'BinhLuan', comment.idBinhLuan, transaction);
    });

    return sendSuccess(res, 200, 'Comment updated', comment);
  }),

  remove: asyncHandler(async (req, res) => {
    const comment = await db.BinhLuan.findByPk(req.params.id);

    if (!comment || comment.trangThai !== 1) {
      return sendError(res, 404, 'Comment not found');
    }

    if (!canModifyComment(req, comment)) {
      return sendError(res, 403, 'You cannot delete this comment');
    }

    await sequelize.transaction(async (transaction) => {
      await comment.update({ trangThai: 0, ngayCapNhat: new Date() }, { transaction });
      await db.BinhLuan.update(
        { trangThai: 0, ngayCapNhat: new Date() },
        { where: { idBinhLuanCha: comment.idBinhLuan }, transaction },
      );
      if (req.auth.isAdmin) await audit(req, 'DELETE', 'BinhLuan', comment.idBinhLuan, transaction);
    });

    return sendSuccess(res, 200, 'Comment deleted');
  }),
};

module.exports = BinhLuanController;
