const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('../config/database');
const { jwtSecret } = require('../config/security');
const httpError = require('../utils/httpError');
const { Op } = require('sequelize');

const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { sendError, sendSuccess } = require('../utils/apiResponse');
const { normalizeText } = require('../utils/query');
const { sanitizeUser } = require('../utils/serializers');

const DEFAULT_USER_ROLES = ['USER', 'NGUOI_DUNG', 'KHACH_HANG'];

const createToken = (user) => {
  return jwt.sign(
    {
      idNguoiDung: user.idNguoiDung,
      tokenVersion: user.tokenVersion,
    },
    jwtSecret(),
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      algorithm: 'HS256',
    },
  );
};

const findOrCreateDefaultRole = async () => {
  const role = await db.VaiTro.findOne({
    where: {
      tenVaiTro: {
        [Op.in]: DEFAULT_USER_ROLES,
      },
      trangThai: 1,
    },
  });

  if (role) {
    return role;
  }

  const [createdRole] = await db.VaiTro.findOrCreate({
    where: {
      tenVaiTro: 'USER',
    },
    defaults: {
      tenVaiTro: 'USER',
      moTa: 'Default application user',
      trangThai: 1,
    },
  });

  if (createdRole.trangThai !== 1) throw httpError(403, 'Đăng ký hiện đang tạm dừng.');
  return createdRole;
};

const buildAuthPayload = (user) => {
  return {
    user: sanitizeUser(user),
    token: createToken(user),
  };
};

const AuthController = {
  register: asyncHandler(async (req, res) => {
    const hoTen = normalizeText(req.body.hoTen);
    const email = normalizeText(req.body.email).toLowerCase();
    const matKhau = String(req.body.matKhau || '');
    const soDienThoai = normalizeText(req.body.soDienThoai);

    if (!hoTen || !email || !matKhau) {
      return sendError(res, 400, 'hoTen, email and matKhau are required');
    }

    if (matKhau.length < 6) {
      return sendError(res, 400, 'matKhau must have at least 6 characters');
    }

    const existedUser = await db.NguoiDung.findOne({
      where: {
        email,
      },
    });

    if (existedUser) {
      return sendError(res, 409, 'Email already exists');
    }

    const role = await findOrCreateDefaultRole();
    const hashedPassword = await bcrypt.hash(matKhau, 12);

    const user = await db.NguoiDung.create({
      idVaiTro: role.idVaiTro,
      hoTen,
      email,
      matKhau: hashedPassword,
      soDienThoai: soDienThoai || null,
      trangThai: 1,
    });

    const userWithRole = await db.NguoiDung.findByPk(user.idNguoiDung, {
      include: [
        {
          model: db.VaiTro,
          as: 'vaiTro',
          attributes: ['idVaiTro', 'tenVaiTro', 'moTa', 'trangThai'],
        },
      ],
    });

    return sendSuccess(res, 201, 'Register successfully', buildAuthPayload(userWithRole));
  }),

  login: asyncHandler(async (req, res) => {
    const email = normalizeText(req.body.email).toLowerCase();
    const matKhau = String(req.body.matKhau || '');

    if (!email || !matKhau) {
      return sendError(res, 400, 'email and matKhau are required');
    }

    const user = await db.NguoiDung.findOne({
      where: {
        email,
      },
      include: [
        {
          model: db.VaiTro,
          as: 'vaiTro',
          attributes: ['idVaiTro', 'tenVaiTro', 'moTa', 'trangThai'],
        },
      ],
    });

    if (!user || user.trangThai !== 1 || user.vaiTro?.trangThai !== 1) {
      return sendError(res, 401, 'Invalid email or password');
    }

    const passwordMatched = user.matKhau && (await bcrypt.compare(matKhau, user.matKhau));

    if (!passwordMatched) {
      return sendError(res, 401, 'Invalid email or password');
    }

    return sendSuccess(res, 200, 'Login successfully', buildAuthPayload(user));
  }),

  me: asyncHandler(async (req, res) => {
    return sendSuccess(res, 200, 'Profile loaded', sanitizeUser(req.user));
  }),

  updateMe: asyncHandler(async (req, res) => {
    const allowedFields = ['hoTen', 'soDienThoai', 'anhDaiDien'];
    const payload = {};

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        payload[field] = normalizeText(req.body[field]) || null;
      }
    });

    if (Object.keys(payload).length === 0) {
      return sendError(res, 400, 'No valid fields to update');
    }

    payload.ngayCapNhat = new Date();

    await req.user.update(payload);

    return sendSuccess(res, 200, 'Profile updated', sanitizeUser(req.user));
  }),

  changePassword: asyncHandler(async (req, res) => {
    const matKhauCu = String(req.body.matKhauCu || '');
    const matKhauMoi = String(req.body.matKhauMoi || '');

    if (!matKhauCu || !matKhauMoi) {
      return sendError(res, 400, 'matKhauCu and matKhauMoi are required');
    }

    if (matKhauMoi.length < 6) {
      return sendError(res, 400, 'matKhauMoi must have at least 6 characters');
    }

    const passwordMatched = req.user.matKhau && (await bcrypt.compare(matKhauCu, req.user.matKhau));

    if (!passwordMatched) {
      return sendError(res, 400, 'Current password is incorrect');
    }

    await sequelize.transaction(async (transaction) => {
      const user = await db.NguoiDung.findByPk(req.auth.idNguoiDung, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!user.matKhau || !(await bcrypt.compare(matKhauCu, user.matKhau)))
        throw httpError(400, 'Mật khẩu hiện tại không đúng.');
      await user.update(
        {
          matKhau: await bcrypt.hash(matKhauMoi, 12),
          tokenVersion: user.tokenVersion + 1,
          ngayCapNhat: new Date(),
        },
        { transaction },
      );
    });

    return sendSuccess(res, 200, 'Password changed');
  }),
  logout: asyncHandler(async (req, res) => {
    await db.NguoiDung.increment('tokenVersion', { where: { idNguoiDung: req.auth.idNguoiDung } });
    return sendSuccess(res, 200, 'Đã đăng xuất khỏi tất cả thiết bị.');
  }),
};

module.exports = AuthController;
