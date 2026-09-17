const { Op } = require('sequelize');
const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, getPagingMeta } = require('../utils/query');
const { sanitizeUser } = require('../utils/serializers');
const permissions = require('../utils/permissionTransaction');
const audit = require('../utils/audit');
const error = require('../utils/httpError');
const include = [
  { model: db.VaiTro, as: 'vaiTro', attributes: ['idVaiTro', 'tenVaiTro', 'trangThai'] },
];
module.exports = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = {};
    if (req.query.q)
      where[Op.or] = ['hoTen', 'email', 'soDienThoai'].map((k) => ({
        [k]: { [Op.like]: `%${req.query.q}%` },
      }));
    if (req.query.trangThai !== undefined) where.trangThai = Number(req.query.trangThai);
    if (req.query.idVaiTro) where.idVaiTro = Number(req.query.idVaiTro);
    const r = await db.NguoiDung.findAndCountAll({
      where,
      include,
      order: [['ngayTao', 'DESC'], ['idNguoiDung', 'DESC']],
      limit,
      offset,
    });
    return sendSuccess(
      res,
      200,
      'Người dùng',
      r.rows.map(sanitizeUser),
      getPagingMeta(r.count, page, limit),
    );
  }),
  detail: asyncHandler(async (req, res) => {
    const user = await db.NguoiDung.findByPk(req.params.id, { include });
    if (!user) throw error(404, 'Không tìm thấy người dùng.');
    return sendSuccess(res, 200, 'Người dùng', sanitizeUser(user));
  }),
  update: asyncHandler(async (req, res) => {
    const id = await permissions(req, async ({ transaction, roles, users }) => {
      const user = users.find((u) => u.idNguoiDung === Number(req.params.id));
      if (!user) throw error(404, 'Không tìm thấy người dùng.');
      if (
        req.body.idVaiTro &&
        !roles.some((r) => r.idVaiTro === req.body.idVaiTro && r.trangThai === 1)
      )
        throw error(400, 'Vai trò không hợp lệ.');
      const payload = { ...req.body, ngayCapNhat: new Date() };
      if (
        (payload.trangThai !== undefined && payload.trangThai !== user.trangThai) ||
        (payload.idVaiTro !== undefined && payload.idVaiTro !== user.idVaiTro)
      )
        payload.tokenVersion = user.tokenVersion + 1;
      await user.update(payload, { transaction });
      await audit(req, 'UPDATE', 'NguoiDung', user.idNguoiDung, transaction);
      return user.idNguoiDung;
    });
    return sendSuccess(
      res,
      200,
      'Đã cập nhật',
      sanitizeUser(await db.NguoiDung.findByPk(id, { include })),
    );
  }),
};
