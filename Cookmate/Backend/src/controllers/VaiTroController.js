const db = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { sendError, sendSuccess } = require("../utils/apiResponse");
const { getPagination, getPagingMeta, normalizeText } = require("../utils/query");

const VaiTroController = {
    list: asyncHandler(async (req, res) => {
        const { page, limit, offset } = getPagination(req.query);
        const where = {};

        if (req.query.trangThai !== undefined) {
            where.trangThai = Number.parseInt(req.query.trangThai, 10);
        }

        const result = await db.VaiTro.findAndCountAll({
            where,
            order: [["tenVaiTro", "ASC"]],
            limit,
            offset
        });

        return sendSuccess(
            res,
            200,
            "Roles loaded",
            result.rows,
            getPagingMeta(result.count, page, limit)
        );
    }),

    create: asyncHandler(async (req, res) => {
        const tenVaiTro = normalizeText(req.body.tenVaiTro);

        if (!tenVaiTro) {
            return sendError(res, 400, "tenVaiTro is required");
        }

        const role = await db.VaiTro.create({
            tenVaiTro,
            moTa: normalizeText(req.body.moTa) || null,
            trangThai: req.body.trangThai === undefined ? 1 : Number.parseInt(req.body.trangThai, 10)
        });

        return sendSuccess(res, 201, "Role created", role);
    }),

    update: asyncHandler(async (req, res) => {
        const role = await db.VaiTro.findByPk(req.params.id);

        if (!role) {
            return sendError(res, 404, "Role not found");
        }

        const payload = {};

        ["tenVaiTro", "moTa"].forEach((field) => {
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

        await role.update(payload);

        return sendSuccess(res, 200, "Role updated", role);
    })
};

module.exports = VaiTroController;
