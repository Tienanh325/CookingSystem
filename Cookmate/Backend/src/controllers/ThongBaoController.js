const { Op, fn, col } = require('sequelize');
const sequelize = require('../config/database');
const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, getPagingMeta } = require('../utils/query');
const audit = require('../utils/audit');
const error = require('../utils/httpError');
const { guiThongBaoDay } = require('../services/thongBaoDay');
module.exports = {
  listMine: asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = { idNguoiDung: req.auth.idNguoiDung };
    if (req.query.daDoc !== undefined) where.daDoc = Number(req.query.daDoc);
    const r = await db.ThongBaoNguoiDung.findAndCountAll({
      where,
      include: [{ model: db.ThongBao, as: 'thongBao' }],
      order: [[{ model: db.ThongBao, as: 'thongBao' }, 'ngayTao', 'DESC'], ['idThongBao', 'DESC']],
      limit,
      offset,
    });
    return sendSuccess(res, 200, 'Thông báo', r.rows, getPagingMeta(r.count, page, limit));
  }),
  listSent: asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const r = await db.ThongBao.findAndCountAll({ order: [['ngayTao', 'DESC'], ['idThongBao', 'DESC']], limit, offset });
    const counts = await db.ThongBaoNguoiDung.findAll({
      attributes: [
        'idThongBao',
        [fn('COUNT', col('idNguoiDung')), 'recipients'],
        [fn('SUM', col('daDoc')), 'read'],
      ],
      where: { idThongBao: { [Op.in]: r.rows.map((x) => x.idThongBao) } },
      group: ['idThongBao'],
      raw: true,
    });
    return sendSuccess(
      res,
      200,
      'Thông báo đã gửi',
      r.rows.map((row) => ({
        ...row.toJSON(),
        ...counts.find((c) => c.idThongBao === row.idThongBao),
      })),
      getPagingMeta(r.count, page, limit),
    );
  }),
  markRead: asyncHandler(async (req, res) => {
    const row = await db.ThongBaoNguoiDung.findOne({
      where: { idNguoiDung: req.auth.idNguoiDung, idThongBao: req.params.id },
    });
    if (!row) throw error(404, 'Thông báo không tồn tại.');
    if (!row.daDoc) await row.update({ daDoc: 1, thoiGianDoc: new Date() });
    return sendSuccess(res, 200, 'Đã đọc', row);
  }),
  markAllRead: asyncHandler(async (req, res) => {
    await db.ThongBaoNguoiDung.update(
      { daDoc: 1, thoiGianDoc: new Date() },
      { where: { idNguoiDung: req.auth.idNguoiDung, daDoc: 0 } },
    );
    return sendSuccess(res, 200, 'Đã đọc tất cả');
  }),
  registerDevice: asyncHandler(async (req, res) => {
    const [thietBi, daTao] = await db.ThietBiThongBao.findOrCreate({
      where: { token: req.body.token },
      defaults: {
        idNguoiDung: req.auth.idNguoiDung,
        token: req.body.token,
        nenTang: req.body.nenTang,
        maThietBi: req.body.maThietBi || null,
      },
    });
    if (!daTao)
      await thietBi.update({
        idNguoiDung: req.auth.idNguoiDung,
        nenTang: req.body.nenTang,
        maThietBi: req.body.maThietBi || null,
        hoatDong: 1,
        ngayCapNhat: new Date(),
      });
    return sendSuccess(res, daTao ? 201 : 200, 'Đã đăng ký thiết bị nhận thông báo.', thietBi);
  }),
  unregisterDevices: asyncHandler(async (req, res) => {
    await db.ThietBiThongBao.update(
      { hoatDong: 0, ngayCapNhat: new Date() },
      { where: { idNguoiDung: req.auth.idNguoiDung, hoatDong: 1 } },
    );
    return sendSuccess(res, 200, 'Đã tắt push notification trên các thiết bị.');
  }),
  create: asyncHandler(async (req, res) => {
    const result = await sequelize.transaction(async (transaction) => {
      const selected = [...new Set(req.body.idNguoiDungs || [])];
      const users = await db.NguoiDung.findAll({
        where: {
          trangThai: 1,
          ...(req.body.guiTatCa ? {} : { idNguoiDung: { [Op.in]: selected } }),
        },
        attributes: ['idNguoiDung'],
        transaction,
      });
      if (!users.length) throw error(400, 'Không có người nhận đang hoạt động.');
      if (!req.body.guiTatCa && users.length !== selected.length)
        throw error(400, 'Có người nhận không tồn tại hoặc bị khóa.');
      const thongBao = await db.ThongBao.create(
        {
          tieuDe: req.body.tieuDe,
          noiDung: req.body.noiDung,
          loai: req.body.loai || null,
          duongDan: req.body.duongDan || null,
        },
        { transaction },
      );
      await db.ThongBaoNguoiDung.bulkCreate(
        users.map((u) => ({ idThongBao: thongBao.idThongBao, idNguoiDung: u.idNguoiDung })),
        { transaction },
      );
      await audit(req, 'CREATE', 'ThongBao', thongBao.idThongBao, transaction);
      return {
        thongBao,
        soNguoiNhan: users.length,
        idNguoiDungs: users.map((user) => user.idNguoiDung),
      };
    });
    let push = { daGui: 0, thatBai: 0 };
    try {
      push = await guiThongBaoDay(result.idNguoiDungs, result.thongBao);
    } catch (pushError) {
      console.error('Không gửi được Expo Push:', pushError.message);
      push = { daGui: 0, thatBai: result.idNguoiDungs.length, loi: 'PUSH_PROVIDER_ERROR' };
    }
    const { idNguoiDungs, ...duLieu } = result;
    return sendSuccess(res, 201, 'Đã gửi thông báo', { ...duLieu, push });
  }),
};
