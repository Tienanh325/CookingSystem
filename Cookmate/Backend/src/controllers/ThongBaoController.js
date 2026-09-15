const sequelize = require("../config/database");
const db = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { sendError, sendSuccess } = require("../utils/apiResponse");
const { getPagination, getPagingMeta, normalizeText, parseIdArray } = require("../utils/query");

const ThongBaoController = {
    listMine: asyncHandler(async (req, res) => {
        const { page, limit, offset } = getPagination(req.query);
        const where = {
            idNguoiDung: req.auth.idNguoiDung
        };

        if (req.query.daDoc !== undefined) {
            where.daDoc = Number.parseInt(req.query.daDoc, 10);
        }

        const result = await db.ThongBaoNguoiDung.findAndCountAll({
            where,
            include: [
                {
                    model: db.ThongBao,
                    as: "thongBao"
                }
            ],
            order: [[{ model: db.ThongBao, as: "thongBao" }, "ngayTao", "DESC"]],
            limit,
            offset
        });

        return sendSuccess(
            res,
            200,
            "Notifications loaded",
            result.rows,
            getPagingMeta(result.count, page, limit)
        );
    }),

    markRead: asyncHandler(async (req, res) => {
        const notification = await db.ThongBaoNguoiDung.findOne({
            where: {
                idNguoiDung: req.auth.idNguoiDung,
                idThongBao: req.params.id
            }
        });

        if (!notification) {
            return sendError(res, 404, "Notification not found");
        }

        await notification.update({
            daDoc: 1,
            thoiGianDoc: new Date()
        });

        return sendSuccess(res, 200, "Notification marked as read", notification);
    }),

    markAllRead: asyncHandler(async (req, res) => {
        await db.ThongBaoNguoiDung.update(
            {
                daDoc: 1,
                thoiGianDoc: new Date()
            },
            {
                where: {
                    idNguoiDung: req.auth.idNguoiDung,
                    daDoc: 0
                }
            }
        );

        return sendSuccess(res, 200, "All notifications marked as read");
    }),

    create: asyncHandler(async (req, res) => {
        const tieuDe = normalizeText(req.body.tieuDe);
        const noiDung = normalizeText(req.body.noiDung);

        if (!tieuDe || !noiDung) {
            return sendError(res, 400, "tieuDe and noiDung are required");
        }

        let recipientIds = parseIdArray(req.body.idNguoiDungs);

        if (req.body.guiTatCa === true || String(req.body.guiTatCa).toLowerCase() === "true") {
            const users = await db.NguoiDung.findAll({
                attributes: ["idNguoiDung"],
                where: {
                    trangThai: 1
                },
                raw: true
            });

            recipientIds = users.map((user) => user.idNguoiDung);
        }

        const transaction = await sequelize.transaction();

        try {
            const thongBao = await db.ThongBao.create(
                {
                    tieuDe,
                    noiDung,
                    loai: normalizeText(req.body.loai) || null,
                    duongDan: normalizeText(req.body.duongDan) || null
                },
                { transaction }
            );

            if (recipientIds.length > 0) {
                await db.ThongBaoNguoiDung.bulkCreate(
                    recipientIds.map((idNguoiDung) => ({
                        idThongBao: thongBao.idThongBao,
                        idNguoiDung
                    })),
                    {
                        ignoreDuplicates: true,
                        transaction
                    }
                );
            }

            await transaction.commit();

            return sendSuccess(res, 201, "Notification created", {
                thongBao,
                soNguoiNhan: recipientIds.length
            });
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    })
};

module.exports = ThongBaoController;
