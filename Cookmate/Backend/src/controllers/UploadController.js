const path = require('path');
const fs = require('fs/promises');
const { randomUUID } = require('crypto');
const sharp = require('sharp');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const error = require('../utils/httpError');
module.exports = {
  image: asyncHandler(async (req, res) => {
    if (!req.file) throw error(400, 'Vui lòng chọn ảnh.');
    let buffer;
    try {
      const decoder = sharp(req.file.buffer, { limitInputPixels: 25_000_000, failOn: 'warning' });
      const meta = await decoder.metadata();
      if (!['jpeg', 'png', 'webp'].includes(meta.format)) throw new Error('Invalid format');
      buffer = await decoder
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      throw error(400, 'Nội dung ảnh không hợp lệ hoặc ảnh quá lớn.');
    }
    const directory = path.join(__dirname, '../../uploads');
    await fs.mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.webp`;
    await fs.writeFile(path.join(directory, filename), buffer, { flag: 'wx' });
    return sendSuccess(res, 201, 'Đã tải ảnh', {
      filename,
      mimetype: 'image/webp',
      size: buffer.length,
      path: `/uploads/${filename}`,
      url: `/uploads/${filename}`,
    });
  }),
};
