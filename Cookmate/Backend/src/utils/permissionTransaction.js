const db = require('../models');
const sequelize = require('../config/database');
const { isAdminRole } = require('../middleware/authMiddleware');
const error = require('./httpError');
// Lock the same rows in the same order for all role/account permission mutations.
module.exports = async (req, mutate) =>
  sequelize.transaction(async (transaction) => {
    const roles = await db.VaiTro.findAll({
      order: [['idVaiTro', 'ASC']],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const users = await db.NguoiDung.findAll({
      order: [['idNguoiDung', 'ASC']],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const admins = () =>
      users.filter(
        (u) =>
          u.trangThai === 1 &&
          roles.some(
            (r) => r.idVaiTro === u.idVaiTro && r.trangThai === 1 && isAdminRole(r.tenVaiTro),
          ),
      );
    if (!admins().some((u) => u.idNguoiDung === req.auth.idNguoiDung))
      throw error(403, 'Quyền quản trị của bạn đã thay đổi.');
    const result = await mutate({ transaction, roles, users });
    if (!admins().length)
      throw error(409, 'Phải giữ lại ít nhất một quản trị viên đang hoạt động.');
    return result;
  });
