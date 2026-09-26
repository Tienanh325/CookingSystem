const { Op, fn, col, literal } = require('sequelize');

const sequelize = require('../config/database');
const db = require('../models');
const audit = require('../utils/audit');
const asyncHandler = require('../utils/asyncHandler');
const { sendError, sendSuccess } = require('../utils/apiResponse');
const {
  getPagination,
  getPagingMeta,
  normalizeText,
  parseIdArray,
  toPositiveInt,
} = require('../utils/query');

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const toNonNegativeNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const recipeDetailIncludes = (phienBan) => [
  {
    model: db.DanhMuc,
    as: 'danhMuc',
    attributes: ['idDanhMuc', 'tenDanhMuc', 'anh'],
  },
  {
    model: db.NguyenLieu,
    as: 'nguyenLieus',
    attributes: ['idNguyenLieu', 'tenNguyenLieu', 'donViMacDinh'],
    through: {
      attributes: ['soLuong', 'donVi', 'ghiChu'],
    },
  },
  {
    model: db.BuocNau,
    as: 'buocNaus',
    where: { phienBan },
    separate: true,
    order: [['soThuTu', 'ASC']],
  },
  {
    model: db.HinhAnhMonAn,
    as: 'hinhAnhs',
    separate: true,
    order: [['thuTu', 'ASC']],
  },
  {
    model: db.NguoiDung,
    as: 'tacGia',
    attributes: ['idNguoiDung', 'hoTen', 'anhDaiDien'],
    required: false,
  },
];

const recipeListIncludes = () => [
  {
    model: db.DanhMuc,
    as: 'danhMuc',
    attributes: ['idDanhMuc', 'tenDanhMuc', 'anh'],
  },
  {
    model: db.HinhAnhMonAn,
    as: 'hinhAnhs',
    attributes: ['idHinhAnh', 'duongDan', 'moTa', 'thuTu', 'anhDaiDien'],
    separate: true,
    where: {
      anhDaiDien: 1,
    },
    required: false,
    order: [['thuTu', 'ASC']],
  },
];

const fetchRecipeById = async (idMonAn, activeOnly = true) => {
  const where = {
    idMonAn,
  };

  if (activeOnly) {
    where.trangThai = 1;
    where.trangThaiDuyet = 'DA_DUYET';
  }

  const recipe = await db.MonAn.findOne({ where });
  if (!recipe) return null;
  return db.MonAn.findOne({
    where,
    include: recipeDetailIncludes(recipe.phienBan),
  });
};

const findRecipeIdsMatchingIngredients = async (ingredientIds) => {
  if (ingredientIds.length === 0) {
    return null;
  }

  const rows = await db.MonAnNguyenLieu.findAll({
    attributes: ['idMonAn'],
    where: {
      idNguyenLieu: {
        [Op.in]: ingredientIds,
      },
    },
    group: ['idMonAn'],
    having: literal(`COUNT(DISTINCT idNguyenLieu) = ${ingredientIds.length}`),
    raw: true,
  });

  return rows.map((row) => row.idMonAn);
};

const buildListWhere = async (query, admin = false) => {
  const where = admin
    ? query.trangThai === undefined
      ? {}
      : { trangThai: Number(query.trangThai) }
    : { trangThai: 1, trangThaiDuyet: 'DA_DUYET' };

  if (admin && query.trangThaiDuyet) where.trangThaiDuyet = normalizeText(query.trangThaiDuyet);

  const keyword = normalizeText(query.q || query.search);

  if (keyword) {
    where[Op.or] = [
      {
        tenMonAn: {
          [Op.like]: `%${keyword}%`,
        },
      },
      {
        moTa: {
          [Op.like]: `%${keyword}%`,
        },
      },
      {
        gioiThieu: {
          [Op.like]: `%${keyword}%`,
        },
      },
    ];
  }

  const idDanhMuc = toPositiveInt(query.idDanhMuc);
  if (idDanhMuc) {
    where.idDanhMuc = idDanhMuc;
  }

  const doKho = normalizeText(query.doKho);
  if (doKho) {
    where.doKho = doKho;
  }

  const thoiGianToiDa = toPositiveInt(query.thoiGianToiDa || query.maxTime);
  if (thoiGianToiDa) {
    where.tongThoiGian = {
      ...(where.tongThoiGian || {}),
      [Op.lte]: thoiGianToiDa,
    };
  }

  const ingredientIds = parseIdArray(query.nguyenLieuIds || query.ingredients);
  const matchedRecipeIds = await findRecipeIdsMatchingIngredients(ingredientIds);

  if (matchedRecipeIds && matchedRecipeIds.length === 0) {
    where.idMonAn = {
      [Op.in]: [],
    };
  } else if (matchedRecipeIds) {
    where.idMonAn = {
      [Op.in]: matchedRecipeIds,
    };
  }

  return where;
};

const getOrder = (sort) => {
  switch (normalizeText(sort).toLowerCase()) {
    case 'popular':
      return [['luotXem', 'DESC']];
    case 'rating':
      return [['diemDanhGia', 'DESC']];
    case 'time':
      return [['tongThoiGian', 'ASC']];
    case 'name':
      return [['tenMonAn', 'ASC']];
    case 'oldest':
      return [['ngayTao', 'ASC']];
    case 'newest':
    default:
      return [['ngayTao', 'DESC']];
  }
};

const buildRecipePayload = (body, currentRecipe = null) => {
  const payload = {};

  if (Object.prototype.hasOwnProperty.call(body, 'idDanhMuc')) {
    const idDanhMuc = toPositiveInt(body.idDanhMuc);
    if (!idDanhMuc) {
      throw createHttpError(400, 'idDanhMuc must be a positive integer');
    }
    payload.idDanhMuc = idDanhMuc;
  }

  ['tenMonAn', 'moTa', 'gioiThieu', 'anhDaiDien', 'doKho'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = normalizeText(body[field]) || null;
    }
  });

  ['thoiGianChuanBi', 'thoiGianNau', 'tongThoiGian'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      payload[field] = toNonNegativeNumber(body[field], 0);
    }
  });

  if (Object.prototype.hasOwnProperty.call(body, 'khauPhan')) {
    payload.khauPhan = toPositiveInt(body.khauPhan, 1);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'trangThai')) {
    payload.trangThai = Number.parseInt(body.trangThai, 10);
  }

  const prep =
    payload.thoiGianChuanBi !== undefined
      ? payload.thoiGianChuanBi
      : currentRecipe
        ? currentRecipe.thoiGianChuanBi
        : 0;
  const cook =
    payload.thoiGianNau !== undefined
      ? payload.thoiGianNau
      : currentRecipe
        ? currentRecipe.thoiGianNau
        : 0;

  if (
    !Object.prototype.hasOwnProperty.call(body, 'tongThoiGian') &&
    (payload.thoiGianChuanBi !== undefined || payload.thoiGianNau !== undefined || !currentRecipe)
  ) {
    payload.tongThoiGian = prep + cook;
  }

  if (!currentRecipe) {
    if (!payload.idDanhMuc || !payload.tenMonAn) {
      throw createHttpError(400, 'idDanhMuc and tenMonAn are required');
    }

    payload.doKho = payload.doKho || 'DE';
    payload.khauPhan = payload.khauPhan || 1;
    payload.trangThai = payload.trangThai === undefined ? 1 : payload.trangThai;
  }

  return payload;
};

const normalizeIngredients = (items) => {
  if (!Array.isArray(items)) {
    return null;
  }

  return items.map((item) => {
    const idNguyenLieu = toPositiveInt(item.idNguyenLieu);
    const donVi = normalizeText(item.donVi);

    if (!idNguyenLieu || !donVi) {
      throw createHttpError(400, 'Each ingredient needs idNguyenLieu and donVi');
    }

    return {
      idNguyenLieu,
      soLuong: toNonNegativeNumber(item.soLuong, 0),
      donVi,
      ghiChu: normalizeText(item.ghiChu) || null,
    };
  });
};

const normalizeSteps = (items) => {
  if (!Array.isArray(items)) {
    return null;
  }

  return items.map((item, index) => {
    const soThuTu = toPositiveInt(item.soThuTu, index + 1);
    const huongDan = normalizeText(item.huongDan);

    if (!huongDan) {
      throw createHttpError(400, 'Each cooking step needs huongDan');
    }

    return {
      soThuTu,
      tieuDe: normalizeText(item.tieuDe) || null,
      huongDan,
      anh: normalizeText(item.anh) || null,
      thoiGian: toNonNegativeNumber(item.thoiGian, 0),
      ghiChu: normalizeText(item.ghiChu) || null,
    };
  });
};

const normalizeImages = (items) => {
  if (!Array.isArray(items)) {
    return null;
  }

  return items.map((item, index) => {
    const duongDan = normalizeText(item.duongDan);

    if (!duongDan) {
      throw createHttpError(400, 'Each image needs duongDan');
    }

    return {
      duongDan,
      moTa: normalizeText(item.moTa) || null,
      thuTu: toPositiveInt(item.thuTu, index + 1),
      anhDaiDien: item.anhDaiDien ? 1 : 0,
    };
  });
};

const replaceRecipeChildren = async (recipe, body, transaction) => {
  const idMonAn = recipe.idMonAn;
  const ingredients = normalizeIngredients(body.nguyenLieus);
  const steps = normalizeSteps(body.buocNaus);
  const images = normalizeImages(body.hinhAnhs);

  if (ingredients) {
    const ids = ingredients.map((i) => i.idNguyenLieu);
    if (new Set(ids).size !== ids.length) throw createHttpError(400, 'Nguyên liệu bị trùng.');
    if (
      (await db.NguyenLieu.count({
        where: { idNguyenLieu: { [Op.in]: ids }, trangThai: 1 },
        transaction,
      })) !== ids.length
    )
      throw createHttpError(400, 'Có nguyên liệu không tồn tại hoặc đã ẩn.');
    await db.MonAnNguyenLieu.destroy({
      where: {
        idMonAn,
      },
      transaction,
    });

    if (ingredients.length > 0) {
      await db.MonAnNguyenLieu.bulkCreate(
        ingredients.map((item) => ({
          ...item,
          idMonAn,
        })),
        { transaction },
      );
    }
  }

  if (steps) {
    if (new Set(steps.map((s) => s.soThuTu)).size !== steps.length)
      throw createHttpError(400, 'Thứ tự bước nấu bị trùng.');
    const phienBan = recipe.phienBan + 1;
    await recipe.update({ phienBan }, { transaction });

    if (steps.length > 0) {
      await db.BuocNau.bulkCreate(
        steps.map((item) => ({
          ...item,
          idMonAn,
          phienBan,
        })),
        { transaction },
      );
    }
  }

  if (images) {
    await db.HinhAnhMonAn.destroy({
      where: {
        idMonAn,
      },
      transaction,
    });

    if (images.length > 0) {
      await db.HinhAnhMonAn.bulkCreate(
        images.map((item) => ({
          ...item,
          idMonAn,
        })),
        { transaction },
      );
    }
  }
  if (recipe.trangThai === 1) {
    const stepCount = await db.BuocNau.count({
      where: { idMonAn, phienBan: recipe.phienBan },
      transaction,
    });
    const ingredientCount = await db.MonAnNguyenLieu.count({ where: { idMonAn }, transaction });
    if (!stepCount || !ingredientCount)
      throw createHttpError(400, 'Món công khai cần có nguyên liệu và ít nhất một bước nấu.');
  }
};

const MonAnController = {
  listMine: asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const result = await db.MonAn.findAndCountAll({
      where: { idTacGia: req.auth.idNguoiDung },
      include: recipeListIncludes(),
      order: [['ngayCapNhat', 'DESC'], ['idMonAn', 'DESC']],
      distinct: true,
      limit,
      offset,
    });
    return sendSuccess(
      res,
      200,
      'Your recipes loaded',
      result.rows,
      getPagingMeta(result.count, page, limit),
    );
  }),

  detailMine: asyncHandler(async (req, res) => {
    const monAn = await fetchRecipeById(req.params.id, false);
    if (!monAn || Number(monAn.idTacGia) !== Number(req.auth.idNguoiDung))
      return sendError(res, 404, 'Không tìm thấy công thức của bạn.');
    return sendSuccess(res, 200, 'Your recipe loaded', monAn);
  }),

  createMine: asyncHandler(async (req, res) => {
    const payload = {
      ...buildRecipePayload(req.body),
      idTacGia: req.auth.idNguoiDung,
      nguonNoiDung: 'NGUOI_DUNG',
      trangThaiDuyet: 'NHAP',
      trangThai: 0,
    };
    if (!(await db.DanhMuc.findOne({ where: { idDanhMuc: payload.idDanhMuc, trangThai: 1 } })))
      return sendError(res, 400, 'Danh mục không tồn tại.');
    const transaction = await sequelize.transaction();
    try {
      const monAn = await db.MonAn.create(payload, { transaction });
      await replaceRecipeChildren(monAn, req.body, transaction);
      await audit(req, 'CREATE_DRAFT', 'MonAn', monAn.idMonAn, transaction);
      await transaction.commit();
      return sendSuccess(res, 201, 'Đã lưu bản nháp.', await fetchRecipeById(monAn.idMonAn, false));
    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      throw error;
    }
  }),

  updateMine: asyncHandler(async (req, res) => {
    const monAn = await db.MonAn.findOne({
      where: { idMonAn: req.params.id, idTacGia: req.auth.idNguoiDung },
    });
    if (!monAn) return sendError(res, 404, 'Không tìm thấy công thức của bạn.');
    if (!['NHAP', 'TU_CHOI'].includes(monAn.trangThaiDuyet))
      return sendError(res, 409, 'Chỉ có thể sửa bản nháp hoặc bài bị từ chối.');
    const transaction = await sequelize.transaction();
    try {
      await monAn.update(
        {
          ...buildRecipePayload(req.body, monAn),
          trangThai: 0,
          trangThaiDuyet: 'NHAP',
          lyDoTuChoi: null,
          ngayCapNhat: new Date(),
        },
        { transaction },
      );
      await replaceRecipeChildren(monAn, req.body, transaction);
      await audit(req, 'UPDATE_DRAFT', 'MonAn', monAn.idMonAn, transaction);
      await transaction.commit();
      return sendSuccess(res, 200, 'Đã cập nhật bản nháp.', await fetchRecipeById(monAn.idMonAn, false));
    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      throw error;
    }
  }),

  submitMine: asyncHandler(async (req, res) => {
    const monAn = await db.MonAn.findOne({
      where: { idMonAn: req.params.id, idTacGia: req.auth.idNguoiDung },
    });
    if (!monAn) return sendError(res, 404, 'Không tìm thấy công thức của bạn.');
    if (!['NHAP', 'TU_CHOI'].includes(monAn.trangThaiDuyet))
      return sendError(res, 409, 'Công thức không ở trạng thái có thể gửi duyệt.');
    const [ingredientCount, stepCount] = await Promise.all([
      db.MonAnNguyenLieu.count({ where: { idMonAn: monAn.idMonAn } }),
      db.BuocNau.count({ where: { idMonAn: monAn.idMonAn, phienBan: monAn.phienBan } }),
    ]);
    if (!ingredientCount || !stepCount)
      return sendError(res, 400, 'Cần có nguyên liệu và ít nhất một bước nấu trước khi gửi duyệt.');
    await sequelize.transaction(async (transaction) => {
      await monAn.update(
        { trangThaiDuyet: 'CHO_DUYET', ngayGuiDuyet: new Date(), lyDoTuChoi: null },
        { transaction },
      );
      await audit(req, 'SUBMIT_REVIEW', 'MonAn', monAn.idMonAn, transaction);
    });
    return sendSuccess(res, 200, 'Công thức đã được gửi duyệt.', monAn);
  }),

  reviewSubmission: asyncHandler(async (req, res) => {
    const monAn = await db.MonAn.findByPk(req.params.id);
    if (!monAn) return sendError(res, 404, 'Không tìm thấy công thức.');
    if (monAn.trangThaiDuyet !== 'CHO_DUYET')
      return sendError(res, 409, 'Công thức không ở trạng thái chờ duyệt.');
    const approved = req.body.quyetDinh === 'DUYET';
    if (!approved && !req.body.lyDoTuChoi)
      return sendError(res, 400, 'Cần nhập lý do từ chối.');
    if (approved) {
      const [ingredientCount, stepCount] = await Promise.all([
        db.MonAnNguyenLieu.count({ where: { idMonAn: monAn.idMonAn } }),
        db.BuocNau.count({ where: { idMonAn: monAn.idMonAn, phienBan: monAn.phienBan } }),
      ]);
      if (!ingredientCount || !stepCount)
        return sendError(res, 400, 'Không thể duyệt công thức thiếu nguyên liệu hoặc bước nấu.');
    }
    await sequelize.transaction(async (transaction) => {
      await monAn.update(
        {
          trangThaiDuyet: approved ? 'DA_DUYET' : 'TU_CHOI',
          trangThai: approved ? 1 : 0,
          idNguoiDuyet: req.auth.idNguoiDung,
          ngayDuyet: new Date(),
          lyDoTuChoi: approved ? null : req.body.lyDoTuChoi,
          ngayCapNhat: new Date(),
        },
        { transaction },
      );
      await audit(
        req,
        approved ? 'APPROVE_SUBMISSION' : 'REJECT_SUBMISSION',
        'MonAn',
        monAn.idMonAn,
        transaction,
      );
    });
    return sendSuccess(
      res,
      200,
      approved ? 'Đã duyệt và công khai công thức.' : 'Đã từ chối công thức.',
      await fetchRecipeById(monAn.idMonAn, false),
    );
  }),

  list: asyncHandler(async (req, res) => {
    const { page, limit, offset } = getPagination(req.query);
    const where = await buildListWhere(req.query, req.isAdminView);

    const result = await db.MonAn.findAndCountAll({
      where,
      include: recipeListIncludes(),
      order: [...getOrder(req.query.sort), ['idMonAn', 'DESC']],
      distinct: true,
      limit,
      offset,
    });

    return sendSuccess(
      res,
      200,
      'Recipes loaded',
      result.rows,
      getPagingMeta(result.count, page, limit),
    );
  }),

  detail: asyncHandler(async (req, res) => {
    const monAn = await fetchRecipeById(req.params.id, !req.isAdminView);

    if (!monAn) {
      return sendError(res, 404, 'Recipe not found');
    }

    if (!req.isAdminView) {
      await monAn.increment('luotXem');
      monAn.setDataValue('luotXem', Number(monAn.luotXem || 0) + 1);
    }

    return sendSuccess(res, 200, 'Recipe loaded', monAn);
  }),

  create: asyncHandler(async (req, res) => {
    const payload = {
      ...buildRecipePayload(req.body),
      idTacGia: req.auth.idNguoiDung,
      idNguoiDuyet: req.auth.idNguoiDung,
      nguonNoiDung: 'BIEN_TAP',
      trangThaiDuyet: 'DA_DUYET',
      ngayDuyet: new Date(),
    };

    const danhMuc = await db.DanhMuc.findOne({
      where: {
        idDanhMuc: payload.idDanhMuc,
        trangThai: 1,
      },
    });

    if (!danhMuc) {
      return sendError(res, 400, 'Category does not exist');
    }

    const transaction = await sequelize.transaction();

    try {
      const monAn = await db.MonAn.create(payload, { transaction });
      await replaceRecipeChildren(monAn, req.body, transaction);
      await audit(req, 'CREATE', 'MonAn', monAn.idMonAn, transaction);
      await transaction.commit();

      return sendSuccess(res, 201, 'Recipe created', await fetchRecipeById(monAn.idMonAn, false));
    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      throw error;
    }
  }),

  update: asyncHandler(async (req, res) => {
    const monAn = await db.MonAn.findByPk(req.params.id);

    if (!monAn) {
      return sendError(res, 404, 'Recipe not found');
    }

    const payload = buildRecipePayload(req.body, monAn);

    if (payload.idDanhMuc) {
      const danhMuc = await db.DanhMuc.findOne({
        where: {
          idDanhMuc: payload.idDanhMuc,
          trangThai: 1,
        },
      });

      if (!danhMuc) {
        return sendError(res, 400, 'Category does not exist');
      }
    }

    payload.ngayCapNhat = new Date();

    const transaction = await sequelize.transaction();

    try {
      await monAn.reload({ transaction, lock: transaction.LOCK.UPDATE });
      const lockedPayload = { ...buildRecipePayload(req.body, monAn), ngayCapNhat: new Date() };
      if (Object.keys(lockedPayload).length > 0) {
        await monAn.update(lockedPayload, { transaction });
      }

      await replaceRecipeChildren(monAn, req.body, transaction);
      await audit(req, 'UPDATE', 'MonAn', monAn.idMonAn, transaction);
      await transaction.commit();

      return sendSuccess(res, 200, 'Recipe updated', await fetchRecipeById(monAn.idMonAn, false));
    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      throw error;
    }
  }),

  remove: asyncHandler(async (req, res) => {
    const monAn = await db.MonAn.findByPk(req.params.id);

    if (!monAn) {
      return sendError(res, 404, 'Recipe not found');
    }

    await sequelize.transaction(async (transaction) => {
      await monAn.update({ trangThai: 0, ngayCapNhat: new Date() }, { transaction });
      await audit(req, 'HIDE', 'MonAn', monAn.idMonAn, transaction);
    });

    return sendSuccess(res, 200, 'Recipe disabled');
  }),

  stats: asyncHandler(async (req, res) => {
    const idMonAn = req.params.id;
    if (!(await db.MonAn.findOne({ where: { idMonAn, trangThai: 1 } })))
      return sendError(res, 404, 'Món ăn không tồn tại.');

    const [reviewStats, commentCount, favoriteCount] = await Promise.all([
      db.DanhGia.findOne({
        attributes: [
          [fn('AVG', col('soSao')), 'diemTrungBinh'],
          [fn('COUNT', col('idDanhGia')), 'soDanhGia'],
        ],
        where: {
          idMonAn,
          trangThai: 1,
        },
        raw: true,
      }),
      db.BinhLuan.count({
        where: {
          idMonAn,
          trangThai: 1,
        },
      }),
      db.YeuThich.count({
        where: {
          idMonAn,
        },
      }),
    ]);

    return sendSuccess(res, 200, 'Recipe stats loaded', {
      diemTrungBinh: Number(reviewStats.diemTrungBinh || 0),
      soDanhGia: Number(reviewStats.soDanhGia || 0),
      soBinhLuan: commentCount,
      soYeuThich: favoriteCount,
    });
  }),
};

module.exports = MonAnController;
