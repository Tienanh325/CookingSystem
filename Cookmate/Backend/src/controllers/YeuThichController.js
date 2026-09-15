const db = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { sendError, sendSuccess } = require("../utils/apiResponse");
const { getPagination, getPagingMeta } = require("../utils/query");

const favoriteInclude = [
    {
        model: db.MonAn,
        as: "monAn",
        include: [
            {
                model: db.DanhMuc,
                as: "danhMuc",
                attributes: ["idDanhMuc", "tenDanhMuc"]
            }
        ]
    }
];

const YeuThichController = {
    listMine: asyncHandler(async (req, res) => {
        const { page, limit, offset } = getPagination(req.query);
        const result = await db.YeuThich.findAndCountAll({
            where: {
                idNguoiDung: req.auth.idNguoiDung
            },
            include: favoriteInclude,
            order: [["ngayThem", "DESC"]],
            limit,
            offset
        });

        return sendSuccess(
            res,
            200,
            "Favorites loaded",
            result.rows,
            getPagingMeta(result.count, page, limit)
        );
    }),

    status: asyncHandler(async (req, res) => {
        const favorite = await db.YeuThich.findOne({
            where: {
                idNguoiDung: req.auth.idNguoiDung,
                idMonAn: req.params.idMonAn || req.params.id
            }
        });

        return sendSuccess(res, 200, "Favorite status loaded", {
            isFavorite: Boolean(favorite)
        });
    }),

    add: asyncHandler(async (req, res) => {
        const idMonAn = req.params.idMonAn || req.params.id;
        const monAn = await db.MonAn.findOne({
            where: {
                idMonAn,
                trangThai: 1
            }
        });

        if (!monAn) {
            return sendError(res, 404, "Recipe not found");
        }

        const [favorite, created] = await db.YeuThich.findOrCreate({
            where: {
                idNguoiDung: req.auth.idNguoiDung,
                idMonAn
            },
            defaults: {
                idNguoiDung: req.auth.idNguoiDung,
                idMonAn
            }
        });

        return sendSuccess(
            res,
            created ? 201 : 200,
            created ? "Recipe added to favorites" : "Recipe already in favorites",
            favorite
        );
    }),

    remove: asyncHandler(async (req, res) => {
        const idMonAn = req.params.idMonAn || req.params.id;
        const deleted = await db.YeuThich.destroy({
            where: {
                idNguoiDung: req.auth.idNguoiDung,
                idMonAn
            }
        });

        if (!deleted) {
            return sendError(res, 404, "Favorite not found");
        }

        return sendSuccess(res, 200, "Favorite removed");
    })
};

module.exports = YeuThichController;
