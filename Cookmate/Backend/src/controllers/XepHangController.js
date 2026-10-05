const { Op, fn, col } = require('sequelize');
const db = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const error = require('../utils/httpError');
const { sendSuccess } = require('../utils/apiResponse');
const { getPagination, getPagingMeta } = require('../utils/query');

const LOAI_XEP_HANG = {
  cooked_most: { source: 'cook', direction: 'desc', donVi: 'lượt nấu' },
  cooked_least: { source: 'cook', direction: 'asc', donVi: 'lượt nấu' },
  rating_high: { source: 'rating', direction: 'desc', donVi: 'sao' },
  rating_low: { source: 'rating', direction: 'asc', donVi: 'sao' },
  favorite_most: { source: 'favorite', direction: 'desc', donVi: 'lượt yêu thích' },
  comments_most: { source: 'comment', direction: 'desc', donVi: 'bình luận' },
  comments_least: { source: 'comment', direction: 'asc', donVi: 'bình luận' },
};

function ngayBatDau(period) {
  if (period === 'all') return null;
  const now = new Date();
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

async function thongKeTheoMon(source, since) {
  if (source === 'cook') {
    const where = { trangThai: 'HOAN_THANH' };
    if (since) where.thoiGianKetThuc = { [Op.gte]: since };
    return db.LichSuNau.findAll({
      attributes: ['idMonAn', [fn('COUNT', col('idLichSu')), 'giaTri']],
      where,
      group: ['idMonAn'],
      raw: true,
    });
  }
  if (source === 'favorite') {
    const where = {};
    if (since) where.ngayThem = { [Op.gte]: since };
    return db.YeuThich.findAll({
      attributes: ['idMonAn', [fn('COUNT', col('idNguoiDung')), 'giaTri']],
      where,
      group: ['idMonAn'],
      raw: true,
    });
  }
  if (source === 'comment') {
    const where = { trangThai: 1 };
    if (since) where.ngayBinhLuan = { [Op.gte]: since };
    return db.BinhLuan.findAll({
      attributes: ['idMonAn', [fn('COUNT', col('idBinhLuan')), 'giaTri']],
      where,
      group: ['idMonAn'],
      raw: true,
    });
  }
  const where = { trangThai: 1 };
  if (since) where.ngayDanhGia = { [Op.gte]: since };
  return db.DanhGia.findAll({
    attributes: [
      'idMonAn',
      [fn('AVG', col('soSao')), 'giaTri'],
      [fn('COUNT', col('idDanhGia')), 'soDanhGia'],
    ],
    where,
    group: ['idMonAn'],
    raw: true,
  });
}

const list = asyncHandler(async (req, res) => {
  const type = req.query.type || 'cooked_most';
  const period = req.query.period || 'all';
  const config = LOAI_XEP_HANG[type];
  if (!config) throw error(400, 'Loại xếp hạng không hợp lệ.');
  if (!['all', 'month', 'day'].includes(period))
    throw error(400, 'Bộ lọc thời gian không hợp lệ.');
  const { page, limit, offset } = getPagination(req.query);
  const [recipes, statistics] = await Promise.all([
    db.MonAn.findAll({
      where: { trangThai: 1, trangThaiDuyet: 'DA_DUYET' },
      attributes: ['idMonAn', 'tenMonAn', 'anhDaiDien', 'diemDanhGia'],
      include: [{ model: db.DanhMuc, as: 'danhMuc', attributes: ['idDanhMuc', 'tenDanhMuc'] }],
    }),
    thongKeTheoMon(config.source, ngayBatDau(period)),
  ]);
  const statisticByRecipe = new Map(
    statistics.map((item) => [Number(item.idMonAn), item]),
  );
  const ranked = recipes
    .map((recipe) => {
      const statistic = statisticByRecipe.get(Number(recipe.idMonAn));
      return {
        ...recipe.toJSON(),
        giaTri: Number(Number(statistic?.giaTri || 0).toFixed(2)),
        soDanhGia: Number(statistic?.soDanhGia || 0),
      };
    })
    .filter((item) => config.source !== 'rating' || item.soDanhGia > 0)
    .sort((a, b) => {
      const metricDifference = a.giaTri - b.giaTri;
      if (metricDifference) return config.direction === 'asc' ? metricDifference : -metricDifference;
      if (config.source === 'rating' && a.soDanhGia !== b.soDanhGia)
        return b.soDanhGia - a.soDanhGia;
      return a.tenMonAn.localeCompare(b.tenMonAn, 'vi');
    });
  const rows = ranked.slice(offset, offset + limit).map((item, index) => ({
    ...item,
    xepHang: offset + index + 1,
  }));
  return sendSuccess(
    res,
    200,
    'Đã tải bảng xếp hạng công thức.',
    {
      loaiXepHang: type,
      thoiGian: period,
      donVi: config.donVi,
      items: rows,
    },
    getPagingMeta(ranked.length, page, limit),
  );
});

module.exports = { list, LOAI_XEP_HANG };
