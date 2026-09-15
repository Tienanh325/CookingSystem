const { Op } = require("sequelize");

const db = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { sendError, sendSuccess } = require("../utils/apiResponse");
const { getPagination, getPagingMeta, normalizeText } = require("../utils/query");

const buildWhere = (query) => {
    const where = {};

    if (query.trangThai !== undefined) {
        where.trangThai = Number.parseInt(query.trangThai, 10);
    } else {
        where.trangThai = 1;
    }

    const keyword = normalizeText(query.q || query.search);

    if (keyword) {
        where[Op.or] = [
            {
                tenNguyenLieu: {
                    [Op.like]: `%${keyword}%`
                }
            },
            {
                moTa: {
                    [Op.like]: `%${keyword}%`
                }
            }
        ];
    }

    return where;
};

const NguyenLieuController = {
    list: asyncHandler(async (req, res) => {
        const { page, limit, offset } = getPagination(req.query);
        const result = await db.NguyenLieu.findAndCountAll({
            where: buildWhere(req.query),
            order: [["tenNguyenLieu", "ASC"]],
            limit,
            offset
        });

        return sendSuccess(
            res,
            200,
            "Ingredients loaded",
            result.rows,
            getPagingMeta(result.count, page, limit)
        );
    }),

    detail: asyncHandler(async (req, res) => {
        const nguyenLieu = await db.NguyenLieu.findOne({
            where: {
                idNguyenLieu: req.params.id,
                trangThai: 1
            }
        });

        if (!nguyenLieu) {
            return sendError(res, 404, "Ingredient not found");
        }

        return sendSuccess(res, 200, "Ingredient loaded", nguyenLieu);
    }),

    create: asyncHandler(async (req, res) => {
        const tenNguyenLieu = normalizeText(req.body.tenNguyenLieu);

        if (!tenNguyenLieu) {
            return sendError(res, 400, "tenNguyenLieu is required");
        }

        const nguyenLieu = await db.NguyenLieu.create({
            tenNguyenLieu,
            donViMacDinh: normalizeText(req.body.donViMacDinh) || null,
            moTa: normalizeText(req.body.moTa) || null,
            trangThai: req.body.trangThai === undefined ? 1 : Number.parseInt(req.body.trangThai, 10)
        });

        return sendSuccess(res, 201, "Ingredient created", nguyenLieu);
    }),

    update: asyncHandler(async (req, res) => {
        const nguyenLieu = await db.NguyenLieu.findByPk(req.params.id);

        if (!nguyenLieu) {
            return sendError(res, 404, "Ingredient not found");
        }

        const payload = {};
        ["tenNguyenLieu", "donViMacDinh", "moTa"].forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                payload[field] = normalizeText(req.body[field]) || null;
            }
        });

        if (Object.prototype.hasOwnProperty.call(req.body, "trangThai")) {
            payload.trangThai = Number.parseInt(req.body.trangThai, 10);
        }

        if (Object.keys(payload).length === 0) {
            return sendError(res, 400, "No valid fields to update");
        }

        payload.ngayCapNhat = new Date();

        await nguyenLieu.update(payload);

        return sendSuccess(res, 200, "Ingredient updated", nguyenLieu);
    }),

    remove: asyncHandler(async (req, res) => {
        const nguyenLieu = await db.NguyenLieu.findByPk(req.params.id);

        if (!nguyenLieu) {
            return sendError(res, 404, "Ingredient not found");
        }

        await nguyenLieu.update({
            trangThai: 0,
            ngayCapNhat: new Date()
        });

        return sendSuccess(res, 200, "Ingredient disabled");
    })
};

module.exports = NguyenLieuController;
