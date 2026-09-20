const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const db = require('../models');
const httpError = require('../utils/httpError');
const { guiEmail } = require('./guiEmail');

const XAC_MINH_EMAIL = 'EMAIL_VERIFY';
const DAT_LAI_MAT_KHAU = 'PASSWORD_RESET';
const bam = (value) => crypto.createHash('sha256').update(value).digest('hex');
const taoToken = () => crypto.randomBytes(32).toString('hex');
const maHoaHtml = (value) =>
  String(value || '').replace(/[&<>"']/g, (kyTu) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[kyTu]);

const taoDuongDan = (duongDan, token) => {
  const cauHinh = String(process.env.APP_PUBLIC_URL || 'cookmate://');
  const goc = cauHinh.endsWith('://') ? cauHinh : `${cauHinh.replace(/\/$/, '')}/`;
  return `${goc}${duongDan}?token=${encodeURIComponent(token)}`;
};

const taoThuThach = async (loai, nguoiDung, soPhut) => {
  const token = taoToken();
  await db.AuthChallenge.create({
    id: crypto.randomUUID(),
    kind: loai,
    subject: bam(token),
    payload: { idNguoiDung: nguoiDung.idNguoiDung, email: nguoiDung.email },
    expiresAt: new Date(Date.now() + soPhut * 60 * 1000),
  });
  return token;
};

const guiThuXacMinh = async (nguoiDung) => {
  const token = await taoThuThach(
    XAC_MINH_EMAIL,
    nguoiDung,
    Number(process.env.EMAIL_VERIFY_EXPIRES_MINUTES || 1440),
  );
  const duongDan = taoDuongDan('xac-minh-email', token);
  await guiEmail({
    den: nguoiDung.email,
    tieuDe: 'Xác minh email Cookmate',
    vanBan: `Xin chào ${nguoiDung.hoTen}. Xác minh email tại: ${duongDan}`,
    html: `<p>Xin chào <strong>${maHoaHtml(nguoiDung.hoTen)}</strong>,</p><p>Nhấn vào liên kết để xác minh email Cookmate:</p><p><a href="${duongDan}">Xác minh email</a></p>`,
    thongTinKiemThu: { loai: XAC_MINH_EMAIL, token, duongDan },
  });
};

const guiThuDatLaiMatKhau = async (nguoiDung) => {
  const token = await taoThuThach(
    DAT_LAI_MAT_KHAU,
    nguoiDung,
    Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 30),
  );
  const duongDan = taoDuongDan('dat-lai-mat-khau', token);
  await guiEmail({
    den: nguoiDung.email,
    tieuDe: 'Đặt lại mật khẩu Cookmate',
    vanBan: `Đặt lại mật khẩu tại: ${duongDan}. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
    html: `<p>Nhấn vào liên kết để đặt lại mật khẩu Cookmate:</p><p><a href="${duongDan}">Đặt lại mật khẩu</a></p><p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`,
    thongTinKiemThu: { loai: DAT_LAI_MAT_KHAU, token, duongDan },
  });
};

const layThuThach = async (loai, token, transaction) => {
  if (!/^[a-f0-9]{64}$/.test(String(token || '')))
    throw httpError(400, 'Liên kết không hợp lệ hoặc đã hết hạn.');
  const thuThach = await db.AuthChallenge.findOne({
    where: { kind: loai, subject: bam(token), consumed: false },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!thuThach || new Date(thuThach.expiresAt).getTime() <= Date.now()) {
    if (thuThach) await thuThach.update({ consumed: true }, { transaction });
    throw httpError(400, 'Liên kết không hợp lệ hoặc đã hết hạn.');
  }
  return thuThach;
};

const xacMinhEmail = async (token) =>
  sequelize.transaction(async (transaction) => {
    const thuThach = await layThuThach(XAC_MINH_EMAIL, token, transaction);
    const nguoiDung = await db.NguoiDung.findByPk(thuThach.payload.idNguoiDung, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!nguoiDung || nguoiDung.email !== thuThach.payload.email)
      throw httpError(400, 'Email của tài khoản đã thay đổi.');
    await nguoiDung.update(
      { emailDaXacMinh: 1, thoiGianXacMinhEmail: new Date(), ngayCapNhat: new Date() },
      { transaction },
    );
    await thuThach.update({ consumed: true }, { transaction });
    return nguoiDung;
  });

const datLaiMatKhau = async (token, matKhauMoi) =>
  sequelize.transaction(async (transaction) => {
    const thuThach = await layThuThach(DAT_LAI_MAT_KHAU, token, transaction);
    const nguoiDung = await db.NguoiDung.findByPk(thuThach.payload.idNguoiDung, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!nguoiDung || nguoiDung.email !== thuThach.payload.email)
      throw httpError(400, 'Tài khoản không còn hợp lệ.');
    await nguoiDung.update(
      {
        matKhau: await bcrypt.hash(matKhauMoi, 12),
        tokenVersion: nguoiDung.tokenVersion + 1,
        ngayCapNhat: new Date(),
      },
      { transaction },
    );
    const cacThuThach = await db.AuthChallenge.findAll({
      where: {
        kind: DAT_LAI_MAT_KHAU,
        consumed: false,
        expiresAt: { [Op.gt]: new Date() },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const ids = cacThuThach
      .filter((item) => item.payload.idNguoiDung === nguoiDung.idNguoiDung)
      .map((item) => item.id);
    if (ids.length)
      await db.AuthChallenge.update(
        { consumed: true },
        { where: { id: { [Op.in]: ids } }, transaction },
      );
    if (db.ThietBiThongBao)
      await db.ThietBiThongBao.update(
        { hoatDong: 0, ngayCapNhat: new Date() },
        { where: { idNguoiDung: nguoiDung.idNguoiDung }, transaction },
      );
  });

module.exports = {
  DAT_LAI_MAT_KHAU,
  XAC_MINH_EMAIL,
  datLaiMatKhau,
  guiThuDatLaiMatKhau,
  guiThuXacMinh,
  xacMinhEmail,
};
