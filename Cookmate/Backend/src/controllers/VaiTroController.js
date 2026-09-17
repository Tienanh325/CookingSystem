const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, getPagingMeta } = require('../utils/query');
const permissions = require('../utils/permissionTransaction');
const { isAdminRole } = require('../middleware/authMiddleware');
const audit = require('../utils/audit');
const error = require('../utils/httpError');
module.exports = {
  list: asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const r = await db.VaiTro.findAndCountAll({
      where: req.query.trangThai === undefined ? {} : { trangThai: Number(req.query.trangThai) },
      order: [['tenVaiTro', 'ASC']],
      limit,
      offset,
    });
    return sendSuccess(res, 200, 'Vai trò', r.rows, getPagingMeta(r.count, page, limit));
  }),
  create: asyncHandler(async (req, res) => {
    const row = await permissions(req, async ({ transaction }) => {
      const role = await db.VaiTro.create(req.body, { transaction });
      await audit(req, 'CREATE', 'VaiTro', role.idVaiTro, transaction);
      return role;
    });
    return sendSuccess(res, 201, 'Đã tạo vai trò', row);
  }),
  update: asyncHandler(async (req, res) => {
    const role = await permissions(req, async ({ transaction, roles }) => {
      const row = roles.find((r) => r.idVaiTro === Number(req.params.id));
      if (!row) throw error(404, 'Vai trò không tồn tại.');
      if (
        req.body.tenVaiTro &&
        req.body.tenVaiTro !== row.tenVaiTro &&
        (isAdminRole(row.tenVaiTro) || row.tenVaiTro === 'USER')
      )
        throw error(409, 'Không đổi tên vai trò hệ thống.');
      await row.update(req.body, { transaction });
      await audit(req, 'UPDATE', 'VaiTro', row.idVaiTro, transaction);
      return row;
    });
    return sendSuccess(res, 200, 'Đã cập nhật', role);
  }),
};
