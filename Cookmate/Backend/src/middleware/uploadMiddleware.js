const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
      return cb(
        Object.assign(new Error('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.'), { statusCode: 400 }),
      );
    cb(null, true);
  },
});
const uploadLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Bạn tải ảnh quá nhanh. Hãy thử lại sau.' },
});
module.exports = { uploadImage, uploadLimit };
