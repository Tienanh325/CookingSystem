const { Op, fn, col, literal } = require("sequelize");

const sequelize = require("../config/database");
const db = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { sendError, sendSuccess } = require("../utils/apiResponse");
const {
    getPagination,
    getPagingMeta,
    normalizeText,
    parseIdArray,
    toPositiveInt
} = require("../utils/query");

const createHttpError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const toNonNegativeNumber = (value, fallback = 0) => {
    if (value === undefined || value === null || value === "") {
        return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const recipeDetailIncludes = () => [
    {
        model: db.DanhMuc,
        as: "danhMuc",
        attributes: ["idDanhMuc", "tenDanhMuc", "anh"]
    },
    {
        model: db.NguyenLieu,
        as: "nguyenLieus",
        attributes: ["idNguyenLieu", "tenNguyenLieu", "donViMacDinh"],
        through: {
            attributes: ["soLuong", "donVi", "ghiChu"]
        }
    },
    {
        model: db.BuocNau,
        as: "buocNaus",
        separate: true,
        order: [["soThuTu", "ASC"]]
    },
    {
        model: db.HinhAnhMonAn,
        as: "hinhAnhs",
        separate: true,
        order: [["thuTu", "ASC"]]
    }
];

const recipeListIncludes = () => [
    {
        model: db.DanhMuc,
        as: "danhMuc",
        attributes: ["idDanhMuc", "tenDanhMuc", "anh"]
    },
    {
        model: db.HinhAnhMonAn,
        as: "hinhAnhs",
        attributes: ["idHinhAnh", "duongDan", "moTa", "thuTu", "anhDaiDien"],
        separate: true,
        where: {
            anhDaiDien: 1
        },
        required: false,
        order: [["thuTu", "ASC"]]
    }
];

const fetchRecipeById = async (idMonAn, activeOnly = true) => {
    const where = {
        idMonAn
    };

    if (activeOnly) {
        where.trangThai = 1;
    }

    return db.MonAn.findOne({
        where,
        include: recipeDetailIncludes()
    });
};

const findRecipeIdsMatchingIngredients = async (ingredientIds) => {
    if (ingredientIds.length === 0) {
        return null;
    }

    const rows = await db.MonAnNguyenLieu.findAll({
        attributes: ["idMonAn"],
        where: {
            idNguyenLieu: {
                [Op.in]: ingredientIds
            }
        },
        group: ["idMonAn"],
        having: literal(`COUNT(DISTINCT idNguyenLieu) = ${ingredientIds.length}`),
        raw: true
    });

    return rows.map((row) => row.idMonAn);
};

const buildListWhere = async (query) => {
    const where = {
        trangThai: 1
    };

    const keyword = normalizeText(query.q || query.search);

    if (keyword) {
        where[Op.or] = [
            {
                tenMonAn: {
                    [Op.like]: `%${keyword}%`
                }
            },
            {
                moTa: {
                    [Op.like]: `%${keyword}%`
                }
            },
            {
                gioiThieu: {
                    [Op.like]: `%${keyword}%`
                }
            }
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
            [Op.lte]: thoiGianToiDa
        };
    }

    const ingredientIds = parseIdArray(query.nguyenLieuIds || query.ingredients);
    const matchedRecipeIds = await findRecipeIdsMatchingIngredients(ingredientIds);

    if (matchedRecipeIds && matchedRecipeIds.length === 0) {
        where.idMonAn = {
            [Op.in]: []
        };
    } else if (matchedRecipeIds) {
        where.idMonAn = {
            [Op.in]: matchedRecipeIds
        };
    }

    return where;
};

const getOrder = (sort) => {
    switch (normalizeText(sort).toLowerCase()) {
        case "popular":
            return [["luotXem", "DESC"]];
        case "rating":
            return [["diemDanhGia", "DESC"]];
        case "time":
            return [["tongThoiGian", "ASC"]];
        case "name":
            return [["tenMonAn", "ASC"]];
        case "oldest":
            return [["ngayTao", "ASC"]];
        case "newest":
        default:
            return [["ngayTao", "DESC"]];
    }
};

const buildRecipePayload = (body, currentRecipe = null) => {
    const payload = {};

    if (Object.prototype.hasOwnProperty.call(body, "idDanhMuc")) {
        const idDanhMuc = toPositiveInt(body.idDanhMuc);
        if (!idDanhMuc) {
            throw createHttpError(400, "idDanhMuc must be a positive integer");
        }
        payload.idDanhMuc = idDanhMuc;
    }

    ["tenMonAn", "moTa", "gioiThieu", "anhDaiDien", "doKho"].forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            payload[field] = normalizeText(body[field]) || null;
        }
    });

    ["thoiGianChuanBi", "thoiGianNau", "tongThoiGian"].forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            payload[field] = toNonNegativeNumber(body[field], 0);
        }
    });

    if (Object.prototype.hasOwnProperty.call(body, "khauPhan")) {
        payload.khauPhan = toPositiveInt(body.khauPhan, 1);
    }

    if (Object.prototype.hasOwnProperty.call(body, "trangThai")) {
        payload.trangThai = Number.parseInt(body.trangThai, 10);
    }

    const prep = payload.thoiGianChuanBi !== undefined
        ? payload.thoiGianChuanBi
        : currentRecipe
            ? currentRecipe.thoiGianChuanBi
            : 0;
    const cook = payload.thoiGianNau !== undefined
        ? payload.thoiGianNau
        : currentRecipe
            ? currentRecipe.thoiGianNau
            : 0;

    if (
        !Object.prototype.hasOwnProperty.call(body, "tongThoiGian")
        && (
            payload.thoiGianChuanBi !== undefined
            || payload.thoiGianNau !== undefined
            || !currentRecipe
        )
    ) {
        payload.tongThoiGian = prep + cook;
    }

    if (!currentRecipe) {
        if (!payload.idDanhMuc || !payload.tenMonAn) {
            throw createHttpError(400, "idDanhMuc and tenMonAn are required");
        }

        payload.doKho = payload.doKho || "DE";
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
            throw createHttpError(400, "Each ingredient needs idNguyenLieu and donVi");
        }

        return {
            idNguyenLieu,
            soLuong: toNonNegativeNumber(item.soLuong, 0),
            donVi,
            ghiChu: normalizeText(item.ghiChu) || null
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
            throw createHttpError(400, "Each cooking step needs huongDan");
        }

        return {
            soThuTu,
            tieuDe: normalizeText(item.tieuDe) || null,
            huongDan,
            anh: normalizeText(item.anh) || null,
            thoiGian: toNonNegativeNumber(item.thoiGian, 0),
            ghiChu: normalizeText(item.ghiChu) || null
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
            throw createHttpError(400, "Each image needs duongDan");
        }

        return {
            duongDan,
            moTa: normalizeText(item.moTa) || null,
            thuTu: toPositiveInt(item.thuTu, index + 1),
            anhDaiDien: item.anhDaiDien ? 1 : 0
        };
    });
};

const replaceRecipeChildren = async (idMonAn, body, transaction) => {
    const ingredients = normalizeIngredients(body.nguyenLieus);
    const steps = normalizeSteps(body.buocNaus);
    const images = normalizeImages(body.hinhAnhs);

    if (ingredients) {
        await db.MonAnNguyenLieu.destroy({
            where: {
                idMonAn
            },
            transaction
        });

        if (ingredients.length > 0) {
            await db.MonAnNguyenLieu.bulkCreate(
                ingredients.map((item) => ({
                    ...item,
                    idMonAn
                })),
                { transaction }
            );
        }
    }

    if (steps) {
        await db.BuocNau.destroy({
            where: {
                idMonAn
            },
            transaction
        });

        if (steps.length > 0) {
            await db.BuocNau.bulkCreate(
                steps.map((item) => ({
                    ...item,
                    idMonAn
                })),
                { transaction }
            );
        }
    }

    if (images) {
        await db.HinhAnhMonAn.destroy({
            where: {
                idMonAn
            },
            transaction
        });

        if (images.length > 0) {
            await db.HinhAnhMonAn.bulkCreate(
                images.map((item) => ({
                    ...item,
                    idMonAn
                })),
                { transaction }
            );
        }
    }
};

const MonAnController = {
    list: asyncHandler(async (req, res) => {
        const { page, limit, offset } = getPagination(req.query);
        const where = await buildListWhere(req.query);

        const result = await db.MonAn.findAndCountAll({
            where,
            include: recipeListIncludes(),
            order: getOrder(req.query.sort),
            distinct: true,
            limit,
            offset
        });

        return sendSuccess(
            res,
            200,
            "Recipes loaded",
            result.rows,
            getPagingMeta(result.count, page, limit)
        );
    }),

    detail: asyncHandler(async (req, res) => {
        const monAn = await fetchRecipeById(req.params.id, true);

        if (!monAn) {
            return sendError(res, 404, "Recipe not found");
        }

        await monAn.increment("luotXem");
        monAn.setDataValue("luotXem", Number(monAn.luotXem || 0) + 1);

        return sendSuccess(res, 200, "Recipe loaded", monAn);
    }),

    create: asyncHandler(async (req, res) => {
        const payload = buildRecipePayload(req.body);

        const danhMuc = await db.DanhMuc.findOne({
            where: {
                idDanhMuc: payload.idDanhMuc,
                trangThai: 1
            }
        });

        if (!danhMuc) {
            return sendError(res, 400, "Category does not exist");
        }

        const transaction = await sequelize.transaction();

        try {
            const monAn = await db.MonAn.create(payload, { transaction });
            await replaceRecipeChildren(monAn.idMonAn, req.body, transaction);
            await transaction.commit();

            return sendSuccess(
                res,
                201,
                "Recipe created",
                await fetchRecipeById(monAn.idMonAn, false)
            );
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    update: asyncHandler(async (req, res) => {
        const monAn = await db.MonAn.findByPk(req.params.id);

        if (!monAn) {
            return sendError(res, 404, "Recipe not found");
        }

        const payload = buildRecipePayload(req.body, monAn);

        if (payload.idDanhMuc) {
            const danhMuc = await db.DanhMuc.findOne({
                where: {
                    idDanhMuc: payload.idDanhMuc,
                    trangThai: 1
                }
            });

            if (!danhMuc) {
                return sendError(res, 400, "Category does not exist");
            }
        }

        payload.ngayCapNhat = new Date();

        const transaction = await sequelize.transaction();

        try {
            if (Object.keys(payload).length > 0) {
                await monAn.update(payload, { transaction });
            }

            await replaceRecipeChildren(monAn.idMonAn, req.body, transaction);
            await transaction.commit();

            return sendSuccess(
                res,
                200,
                "Recipe updated",
                await fetchRecipeById(monAn.idMonAn, false)
            );
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    remove: asyncHandler(async (req, res) => {
        const monAn = await db.MonAn.findByPk(req.params.id);

        if (!monAn) {
            return sendError(res, 404, "Recipe not found");
        }

        await monAn.update({
            trangThai: 0,
            ngayCapNhat: new Date()
        });

        return sendSuccess(res, 200, "Recipe disabled");
    }),

    stats: asyncHandler(async (req, res) => {
        const idMonAn = req.params.id;

        const [reviewStats, commentCount, favoriteCount] = await Promise.all([
            db.DanhGia.findOne({
                attributes: [
                    [fn("AVG", col("soSao")), "diemTrungBinh"],
                    [fn("COUNT", col("idDanhGia")), "soDanhGia"]
                ],
                where: {
                    idMonAn,
                    trangThai: 1
                },
                raw: true
            }),
            db.BinhLuan.count({
                where: {
                    idMonAn,
                    trangThai: 1
                }
            }),
            db.YeuThich.count({
                where: {
                    idMonAn
                }
            })
        ]);

        return sendSuccess(res, 200, "Recipe stats loaded", {
            diemTrungBinh: Number(reviewStats.diemTrungBinh || 0),
            soDanhGia: Number(reviewStats.soDanhGia || 0),
            soBinhLuan: commentCount,
            soYeuThich: favoriteCount
        });
    })
};

module.exports = MonAnController;
