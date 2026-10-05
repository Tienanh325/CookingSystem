const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/security');

const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { sendError } = require('../utils/apiResponse');

const normalizeRole = (roleName) =>
  String(roleName || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]/g, '_');

const isAdminRole = (roleName) => {
  const role = normalizeRole(roleName);

  return ['ADMIN', 'QUAN_TRI', 'ADMINISTRATOR'].includes(role);
};

const getToken = (req) => {
  const header = req.headers.authorization || '';

  if (!header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice(7).trim();
};

const loadUserFromToken = async (token) => {
  const payload = jwt.verify(token, jwtSecret(), { algorithms: ['HS256'] });

  const user = await db.NguoiDung.findOne({
    where: {
      idNguoiDung: payload.idNguoiDung,
      trangThai: 1,
    },
    include: [
      {
        model: db.VaiTro,
        as: 'vaiTro',
        attributes: ['idVaiTro', 'tenVaiTro', 'moTa', 'trangThai'],
      },
    ],
  });

  if (!user || user.vaiTro?.trangThai !== 1 || payload.tokenVersion !== user.tokenVersion) {
    return null;
  }

  return user;
};

const authenticate = asyncHandler(async (req, res, next) => {
  const token = getToken(req);

  if (!token) {
    return sendError(res, 401, 'Vui lòng đăng nhập để tiếp tục.');
  }

  try {
    const user = await loadUserFromToken(token);

    if (!user) {
      return sendError(res, 401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }

    req.user = user;
    req.auth = {
      idNguoiDung: user.idNguoiDung,
      idVaiTro: user.idVaiTro,
      tenVaiTro: user.vaiTro ? user.vaiTro.tenVaiTro : null,
      isAdmin: isAdminRole(user.vaiTro ? user.vaiTro.tenVaiTro : null),
    };

    return next();
  } catch (error) {
    if (!['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name))
      return next(error);
    return sendError(res, 401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  }
});

const optionalAuthenticate = asyncHandler(async (req, res, next) => {
  const token = getToken(req);

  if (!token) {
    return next();
  }

  try {
    const user = await loadUserFromToken(token);

    if (user) {
      req.user = user;
      req.auth = {
        idNguoiDung: user.idNguoiDung,
        idVaiTro: user.idVaiTro,
        tenVaiTro: user.vaiTro ? user.vaiTro.tenVaiTro : null,
        isAdmin: isAdminRole(user.vaiTro ? user.vaiTro.tenVaiTro : null),
      };
    }
  } catch (error) {
    req.user = null;
    req.auth = null;
  }

  return next();
});

const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user || !req.auth) {
      return sendError(res, 401, 'Vui lòng đăng nhập để tiếp tục.');
    }

    const normalizedAllowedRoles = allowedRoles.map(normalizeRole);
    const userRole = normalizeRole(req.auth.tenVaiTro);

    if (normalizedAllowedRoles.includes(userRole)) {
      return next();
    }

    return sendError(res, 403, 'Bạn không có quyền truy cập chức năng này.');
  };

const authorizeAdmin = (req, res, next) => {
  if (!req.user || !req.auth) {
    return sendError(res, 401, 'Vui lòng đăng nhập để tiếp tục.');
  }

  if (!req.auth.isAdmin) {
    return sendError(res, 403, 'Chức năng này yêu cầu quyền quản trị viên.');
  }

  return next();
};

module.exports = {
  authenticate,
  authorize,
  authorizeAdmin,
  isAdminRole,
  optionalAuthenticate,
};
