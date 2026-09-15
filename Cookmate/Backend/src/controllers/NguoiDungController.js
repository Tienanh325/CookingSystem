const { Op } = require("sequelize");

const db = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { sendError, sendSuccess } = require("../utils/apiResponse");
const { getPagination, getPagingMeta, normalizeText, toPositiveInt } = require("../utils/query");
const { sanitizeUser } = require("../utils/serializers");

const userInclude = [
    {
        model: db.VaiTro,
        as: "vaiTro",
        attributes: ["idVaiTro", "tenVaiTro", "moTa"]
    }
];

const NguoiDungController = {
    list: asyncHandler(async (req, res) => {
        const { page, limit, offset } = getPagination(req.query);
        const where = {};
        const keyword = normalizeText(req.query.q || req.query.search);

        if (keyword) {
            where[Op.or] = [
                {
                    hoTen: {
                        [Op.like]: `%${keyword}%`
                    }
                },
                {
                    email: {
                        [Op.like]: `%${keyword}%`
                    }
                },
                {
                    soDienThoai: {
                        [Op.like]: `%${keyword}%`
                    }
                }
            ];
        }

        if (req.query.trangThai !== undefined) {
            where.trangThai = Number.parseInt(req.query.trangThai, 10);
        }

        if (req.query.idVaiTro !== undefined) {
            where.idVaiTro = Number.parseInt(req.query.idVaiTro, 10);
        }

        const result = await db.NguoiDung.findAndCountAll({
            where,
            include: userInclude,
            order: [["ngayTao", "DESC"]],
            limit,
            offset
        });

        return sendSuccess(
            res,
            200,
            "Users loaded",
            result.rows.map(sanitizeUser),
            getPagingMeta(result.count, page, limit)
        );
    }),

    detail: asyncHandler(async (req, res) => {
        const user = await db.NguoiDung.findByPk(req.params.id, {
            include: userInclude
        });

        if (!user) {
            return sendError(res, 404, "User not found");
        }

        return sendSuccess(res, 200, "User loaded", sanitizeUser(user));
    }),

    update: asyncHandler(async (req, res) => {
        const user = await db.NguoiDung.findByPk(req.params.id, {
            include: userInclude
        });

        if (!user) {
            return sendError(res, 404, "User not found");
        }

        const payload = {};

        ["hoTen", "soDienThoai", "anhDaiDien"].forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                payload[field] = normalizeText(req.body[field]) || null;
            }
        });

        if (Object.prototype.hasOwnProperty.call(req.body, "idVaiTro")) {
            const idVaiTro = toPositiveInt(req.body.idVaiTro);
            if (!idVaiTro) {
                return sendError(res, 400, "idVaiTro must be a positive integer");
            }

            const role = await db.VaiTro.findOne({
                where: {
                    idVaiTro,
                    trangThai: 1
                }
            });

            if (!role) {
                return sendError(res, 400, "Role does not exist");
            }

            payload.idVaiTro = idVaiTro;
        }

        if (Object.prototype.hasOwnProperty.call(req.body, "trangThai")) {
            payload.trangThai = Number.parseInt(req.body.trangThai, 10);
        }

        if (Object.keys(payload).length === 0) {
            return sendError(res, 400, "No valid fields to update");
        }

        payload.ngayCapNhat = new Date();

        await user.update(payload);
        await user.reload({ include: userInclude });

        return sendSuccess(res, 200, "User updated", sanitizeUser(user));
    })
};

module.exports = NguoiDungController;
