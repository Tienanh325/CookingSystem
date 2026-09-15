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
                tenDanhMuc: {
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

const DanhMucController = {
    list: asyncHandler(async (req, res) => {
        const { page, limit, offset } = getPagination(req.query);
        const result = await db.DanhMuc.findAndCountAll({
            where: buildWhere(req.query),
            order: [["tenDanhMuc", "ASC"]],
            limit,
            offset
        });

        return sendSuccess(
            res,
            200,
            "Categories loaded",
            result.rows,
            getPagingMeta(result.count, page, limit)
        );
    }),

    detail: asyncHandler(async (req, res) => {
        const danhMuc = await db.DanhMuc.findOne({
            where: {
                idDanhMuc: req.params.id,
                trangThai: 1
            }
        });

        if (!danhMuc) {
            return sendError(res, 404, "Category not found");
        }

        return sendSuccess(res, 200, "Category loaded", danhMuc);
    }),

    create: asyncHandler(async (req, res) => {
        const tenDanhMuc = normalizeText(req.body.tenDanhMuc);

        if (!tenDanhMuc) {
            return sendError(res, 400, "tenDanhMuc is required");
        }

        const danhMuc = await db.DanhMuc.create({
            tenDanhMuc,
            moTa: normalizeText(req.body.moTa) || null,
            anh: normalizeText(req.body.anh) || null,
            trangThai: req.body.trangThai === undefined ? 1 : Number.parseInt(req.body.trangThai, 10)
        });

        return sendSuccess(res, 201, "Category created", danhMuc);
    }),

    update: asyncHandler(async (req, res) => {
        const danhMuc = await db.DanhMuc.findByPk(req.params.id);

        if (!danhMuc) {
            return sendError(res, 404, "Category not found");
        }

        const payload = {};
        ["tenDanhMuc", "moTa", "anh"].forEach((field) => {
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

        await danhMuc.update(payload);

        return sendSuccess(res, 200, "Category updated", danhMuc);
    }),

    remove: asyncHandler(async (req, res) => {
        const danhMuc = await db.DanhMuc.findByPk(req.params.id);

        if (!danhMuc) {
            return sendError(res, 404, "Category not found");
        }

        await danhMuc.update({
            trangThai: 0,
            ngayCapNhat: new Date()
        });

        return sendSuccess(res, 200, "Category disabled");
    })
};

module.exports = DanhMucController;
