const multer = require('multer');
const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');

const { sendError } = require('../utils/apiResponse');

const multerMessages = {
  LIMIT_PART_COUNT: 'Dữ liệu tải lên có quá nhiều phần.',
  LIMIT_FILE_SIZE: 'Tệp tải lên vượt quá dung lượng cho phép.',
  LIMIT_FILE_COUNT: 'Số lượng tệp tải lên vượt quá giới hạn.',
  LIMIT_FIELD_KEY: 'Tên trường tải lên quá dài.',
  LIMIT_FIELD_VALUE: 'Nội dung trường tải lên quá dài.',
  LIMIT_FIELD_COUNT: 'Số lượng trường tải lên vượt quá giới hạn.',
  LIMIT_UNEXPECTED_FILE: 'Trường tệp tải lên không hợp lệ.',
};

const notFound = (req, res) => {
  return sendError(res, 404, `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}.`);
};

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof UniqueConstraintError) {
    return sendError(
      res,
      409,
      'Thông tin này đã tồn tại.',
      error.errors.map(() => 'Vui lòng kiểm tra lại trường dữ liệu bị trùng.'),
    );
  }

  if (error instanceof ValidationError) {
    return sendError(
      res,
      400,
      'Dữ liệu không hợp lệ.',
      error.errors.map(() => 'Vui lòng kiểm tra lại thông tin đã nhập.'),
    );
  }

  if (error instanceof ForeignKeyConstraintError) {
    return sendError(res, 400, 'Dữ liệu liên quan không tồn tại hoặc vẫn đang được sử dụng.');
  }

  if (error instanceof multer.MulterError) {
    return sendError(res, 400, multerMessages[error.code] || 'Tệp tải lên không hợp lệ.');
  }

  const status = error.statusCode || error.status || 500;
  if (status >= 500) console.error(error);
  return sendError(
    res,
    status,
    status >= 500 && error.expose !== true
      ? 'Máy chủ đang gặp sự cố. Vui lòng thử lại.'
      : error.message,
  );
};

module.exports = {
  errorHandler,
  notFound,
};
