const { Op } = require('sequelize');
const sequelize = require('../config/database');
const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, getPagingMeta } = require('../utils/query');
const error = require('../utils/httpError');
const audit = require('../utils/audit');

module.exports = (modelName, key, nameField) => {
  const Model = db[modelName];
  return {
    list: asyncHandler(async (req, res) => {
      const { page, limit, offset } = getPagination(req.query);
      const where = req.isAdminView
        ? req.query.trangThai === undefined
          ? {}
          : { trangThai: Number(req.query.trangThai) }
        : { trangThai: 1 };
      const query = String(req.query.q || req.query.search || '').trim();
      if (query) where[nameField] = { [Op.like]: `%${query}%` };
      const r = await Model.findAndCountAll({ where, order: [[nameField, 'ASC']], limit, offset });
      return sendSuccess(res, 200, 'Danh sách', r.rows, getPagingMeta(r.count, page, limit));
    }),
    detail: asyncHandler(async (req, res) => {
      const row = await Model.findOne({
        where: { [key]: req.params.id, ...(req.isAdminView ? {} : { trangThai: 1 }) },
      });
      if (!row) throw error(404, 'Không tìm thấy dữ liệu.');
      return sendSuccess(res, 200, 'Chi tiết', row);
    }),
    create: asyncHandler(async (req, res) => {
      const row = await sequelize.transaction(async (transaction) => {
        const value = await Model.create(req.body, { transaction });
        await audit(req, 'CREATE', modelName, value[key], transaction);
        return value;
      });
      return sendSuccess(res, 201, 'Đã tạo', row);
    }),
    update: asyncHandler(async (req, res) => {
      const row = await sequelize.transaction(async (transaction) => {
        const value = await Model.findByPk(req.params.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!value) throw error(404, 'Không tìm thấy dữ liệu.');
        await value.update({ ...req.body, ngayCapNhat: new Date() }, { transaction });
        await audit(req, 'UPDATE', modelName, value[key], transaction);
        return value;
      });
      return sendSuccess(res, 200, 'Đã cập nhật', row);
    }),
    remove: asyncHandler(async (req, res) => {
      await sequelize.transaction(async (transaction) => {
        const row = await Model.findByPk(req.params.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!row) throw error(404, 'Không tìm thấy dữ liệu.');
        await row.update({ trangThai: 0, ngayCapNhat: new Date() }, { transaction });
        await audit(req, 'HIDE', modelName, row[key], transaction);
      });
      return sendSuccess(res, 200, 'Đã ẩn');
    }),
  };
};
