const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, getPagingMeta } = require('../utils/query');

const NhatKyHeThongController = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = {};

    if (req.query.idNguoiDung) {
      where.idNguoiDung = Number.parseInt(req.query.idNguoiDung, 10);
    }

    if (req.query.bangDuLieu) {
      where.bangDuLieu = req.query.bangDuLieu;
    }

    const result = await db.NhatKyHeThong.findAndCountAll({
      where,
      include: [
        {
          model: db.NguoiDung,
          as: 'nguoiDung',
          attributes: ['idNguoiDung', 'hoTen', 'email'],
        },
      ],
      order: [['thoiGian', 'DESC'], ['idNhatKy', 'DESC']],
      limit,
      offset,
    });

    return sendSuccess(
      res,
      200,
      'System logs loaded',
      result.rows,
      getPagingMeta(result.count, page, limit),
    );
  }),
};

module.exports = NhatKyHeThongController;
