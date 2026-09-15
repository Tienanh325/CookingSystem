const { fn, col } = require("sequelize");

const db = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { sendError, sendSuccess } = require("../utils/apiResponse");
const { getPagination, getPagingMeta, normalizeText } = require("../utils/query");

const updateRecipeRating = async (idMonAn) => {
    const stats = await db.DanhGia.findOne({
        attributes: [
            [fn("AVG", col("soSao")), "averageRating"]
        ],
        where: {
            idMonAn,
            trangThai: 1
        },
        raw: true
    });

    const averageRating = Number(stats.averageRating || 0).toFixed(2);

    await db.MonAn.update(
        {
            diemDanhGia: averageRating,
            ngayCapNhat: new Date()
        },
        {
            where: {
                idMonAn
            }
        }
    );

    return Number(averageRating);
};

const canModifyReview = (req, review) => {
    return req.auth.isAdmin || Number(review.idNguoiDung) === Number(req.auth.idNguoiDung);
};

const DanhGiaController = {
    listByRecipe: asyncHandler(async (req, res) => {
        const { page, limit, offset } = getPagination(req.query);
        const result = await db.DanhGia.findAndCountAll({
            where: {
                idMonAn: req.params.idMonAn || req.params.id,
                trangThai: 1
            },
            include: [
                {
                    model: db.NguoiDung,
                    as: "nguoiDung",
                    attributes: ["idNguoiDung", "hoTen", "anhDaiDien"]
                }
            ],
            order: [["ngayDanhGia", "DESC"]],
            limit,
            offset
        });

        return sendSuccess(
            res,
            200,
            "Reviews loaded",
            result.rows,
            getPagingMeta(result.count, page, limit)
        );
    }),

    listMine: asyncHandler(async (req, res) => {
        const { page, limit, offset } = getPagination(req.query);
        const result = await db.DanhGia.findAndCountAll({
            where: {
                idNguoiDung: req.auth.idNguoiDung
            },
            include: [
                {
                    model: db.MonAn,
                    as: "monAn",
                    attributes: ["idMonAn", "tenMonAn", "anhDaiDien", "diemDanhGia"]
                }
            ],
            order: [["ngayDanhGia", "DESC"]],
            limit,
            offset
        });

        return sendSuccess(
            res,
            200,
            "My reviews loaded",
            result.rows,
            getPagingMeta(result.count, page, limit)
        );
    }),

    upsertForRecipe: asyncHandler(async (req, res) => {
        const idMonAn = req.params.idMonAn || req.params.id;
        const soSao = Number.parseInt(req.body.soSao, 10);

        if (!Number.isInteger(soSao) || soSao < 1 || soSao > 5) {
            return sendError(res, 400, "soSao must be between 1 and 5");
        }

        const monAn = await db.MonAn.findOne({
            where: {
                idMonAn,
                trangThai: 1
            }
        });

        if (!monAn) {
            return sendError(res, 404, "Recipe not found");
        }

        const [review, created] = await db.DanhGia.findOrCreate({
            where: {
                idNguoiDung: req.auth.idNguoiDung,
                idMonAn
            },
            defaults: {
                idNguoiDung: req.auth.idNguoiDung,
                idMonAn,
                soSao,
                noiDung: normalizeText(req.body.noiDung) || null,
                trangThai: 1
            }
        });

        if (!created) {
            await review.update({
                soSao,
                noiDung: normalizeText(req.body.noiDung) || null,
                trangThai: 1,
                ngayCapNhat: new Date()
            });
        }

        const averageRating = await updateRecipeRating(idMonAn);

        return sendSuccess(
            res,
            created ? 201 : 200,
            created ? "Review created" : "Review updated",
            {
                review,
                averageRating
            }
        );
    }),

    remove: asyncHandler(async (req, res) => {
        const review = await db.DanhGia.findByPk(req.params.id);

        if (!review) {
            return sendError(res, 404, "Review not found");
        }

        if (!canModifyReview(req, review)) {
            return sendError(res, 403, "You cannot delete this review");
        }

        const idMonAn = review.idMonAn;
        await review.destroy();
        const averageRating = await updateRecipeRating(idMonAn);

        return sendSuccess(res, 200, "Review deleted", {
            averageRating
        });
    })
};

module.exports = DanhGiaController;
