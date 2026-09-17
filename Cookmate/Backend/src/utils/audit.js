const db = require('../models');
module.exports = async (req, action, table, id, transaction) => {
  await db.NhatKyHeThong.create(
    {
      idNguoiDung: req.auth.idNguoiDung,
      hanhDong: action,
      bangDuLieu: table,
      idBanGhi: Number(id) || null,
      noiDung: `${action} ${table}${id ? ` #${id}` : ''}`,
    },
    { transaction },
  );
};
