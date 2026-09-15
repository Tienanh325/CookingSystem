const sequelize = require("../config/database");
const db = require("../models");
const asyncHandler = require("../utils/asyncHandler");
const { sendError, sendSuccess } = require("../utils/apiResponse");
const { getPagination, getPagingMeta } = require("../utils/query");

const parseBoolean = (value, fallback = true) => {
    if (value === undefined || value === null) {
        return fallback;
    }

    if (typeof value === "boolean") {
        return value;
    }

    return ["1", "true", "yes"].includes(String(value).toLowerCase());
};

const historyIncludes = [
    {
        model: db.MonAn,
        as: "monAn",
        attributes: ["idMonAn", "tenMonAn", "anhDaiDien", "tongThoiGian"],
        include: [
            {
                model: db.DanhMuc,
                as: "danhMuc",
                attributes: ["idDanhMuc", "tenDanhMuc"]
            }
        ]
    },
    {
        model: db.ChiTietLichSuNau,
        as: "chiTietLichSuNaus",
        include: [
            {
                model: db.BuocNau,
                as: "buocNau"
            }
        ]
    }
];

const fetchHistory = async (idLichSu) => {
    return db.LichSuNau.findByPk(idLichSu, {
        include: historyIncludes
    });
};

const canAccessHistory = (req, history) => {
    return req.auth.isAdmin || Number(history.idNguoiDung) === Number(req.auth.idNguoiDung);
};

const syncHistoryProgress = async (history) => {
    const [steps, details] = await Promise.all([
        db.BuocNau.findAll({
            where: {
                idMonAn: history.idMonAn
            },
            order: [["soThuTu", "ASC"]]
        }),
        db.ChiTietLichSuNau.findAll({
            where: {
                idLichSu: history.idLichSu
            }
        })
    ]);

    const completedStepIds = new Set(
        details
            .filter((detail) => detail.daHoanThanh === 1)
            .map((detail) => Number(detail.idBuocNau))
    );

    const firstIncompleteStep = steps.find((step) => !completedStepIds.has(Number(step.idBuocNau)));

    if (!firstIncompleteStep && steps.length > 0) {
        await history.update({
            trangThai: "HOAN_THANH",
            buocHienTai: steps[steps.length - 1].soThuTu,
            thoiGianKetThuc: history.thoiGianKetThuc || new Date()
        });
        return;
    }

    await history.update({
        trangThai: "DANG_NAU",
        buocHienTai: firstIncompleteStep ? firstIncompleteStep.soThuTu : 1,
        thoiGianKetThuc: null
    });
};

const LichSuNauController = {
    listMine: asyncHandler(async (req, res) => {
        const { page, limit, offset } = getPagination(req.query);
        const where = {
            idNguoiDung: req.auth.idNguoiDung
        };

        if (req.query.trangThai) {
            where.trangThai = req.query.trangThai;
        }

        const result = await db.LichSuNau.findAndCountAll({
            where,
            include: [
                {
                    model: db.MonAn,
                    as: "monAn",
                    attributes: ["idMonAn", "tenMonAn", "anhDaiDien", "tongThoiGian"]
                }
            ],
            order: [["thoiGianBatDau", "DESC"]],
            limit,
            offset
        });

        return sendSuccess(
            res,
            200,
            "Cooking history loaded",
            result.rows,
            getPagingMeta(result.count, page, limit)
        );
    }),

    detail: asyncHandler(async (req, res) => {
        const history = await fetchHistory(req.params.id);

        if (!history) {
            return sendError(res, 404, "Cooking history not found");
        }

        if (!canAccessHistory(req, history)) {
            return sendError(res, 403, "You cannot access this cooking history");
        }

        return sendSuccess(res, 200, "Cooking history loaded", history);
    }),

    start: asyncHandler(async (req, res) => {
        const idMonAn = req.body.idMonAn || req.params.idMonAn || req.params.id;

        if (!idMonAn) {
            return sendError(res, 400, "idMonAn is required");
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

        const steps = await db.BuocNau.findAll({
            where: {
                idMonAn
            },
            order: [["soThuTu", "ASC"]]
        });

        const transaction = await sequelize.transaction();

        try {
            const history = await db.LichSuNau.create(
                {
                    idNguoiDung: req.auth.idNguoiDung,
                    idMonAn,
                    trangThai: "DANG_NAU",
                    buocHienTai: steps.length > 0 ? steps[0].soThuTu : 1
                },
                { transaction }
            );

            if (steps.length > 0) {
                await db.ChiTietLichSuNau.bulkCreate(
                    steps.map((step) => ({
                        idLichSu: history.idLichSu,
                        idBuocNau: step.idBuocNau,
                        daHoanThanh: 0
                    })),
                    { transaction }
                );
            }

            await transaction.commit();

            return sendSuccess(
                res,
                201,
                "Cooking started",
                await fetchHistory(history.idLichSu)
            );
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }),

    updateStep: asyncHandler(async (req, res) => {
        const history = await db.LichSuNau.findByPk(req.params.id);

        if (!history) {
            return sendError(res, 404, "Cooking history not found");
        }

        if (!canAccessHistory(req, history)) {
            return sendError(res, 403, "You cannot update this cooking history");
        }

        const step = await db.BuocNau.findOne({
            where: {
                idBuocNau: req.params.idBuocNau,
                idMonAn: history.idMonAn
            }
        });

        if (!step) {
            return sendError(res, 404, "Cooking step not found in this recipe");
        }

        const daHoanThanh = parseBoolean(req.body.daHoanThanh, true);

        const [detail] = await db.ChiTietLichSuNau.findOrCreate({
            where: {
                idLichSu: history.idLichSu,
                idBuocNau: step.idBuocNau
            },
            defaults: {
                idLichSu: history.idLichSu,
                idBuocNau: step.idBuocNau
            }
        });

        await detail.update({
            daHoanThanh: daHoanThanh ? 1 : 0,
            thoiGianHoanThanh: daHoanThanh ? new Date() : null
        });

        await syncHistoryProgress(history);

        return sendSuccess(
            res,
            200,
            "Cooking step updated",
            await fetchHistory(history.idLichSu)
        );
    }),

    finish: asyncHandler(async (req, res) => {
        const history = await db.LichSuNau.findByPk(req.params.id);

        if (!history) {
            return sendError(res, 404, "Cooking history not found");
        }

        if (!canAccessHistory(req, history)) {
            return sendError(res, 403, "You cannot update this cooking history");
        }

        const steps = await db.BuocNau.findAll({
            where: {
                idMonAn: history.idMonAn
            }
        });

        if (steps.length > 0) {
            await db.ChiTietLichSuNau.bulkCreate(
                steps.map((step) => ({
                    idLichSu: history.idLichSu,
                    idBuocNau: step.idBuocNau,
                    daHoanThanh: 0
                })),
                {
                    ignoreDuplicates: true
                }
            );

            await db.ChiTietLichSuNau.update(
                {
                    daHoanThanh: 1,
                    thoiGianHoanThanh: new Date()
                },
                {
                    where: {
                        idLichSu: history.idLichSu
                    }
                }
            );
        }

        const lastStepOrder = steps.reduce((max, step) => Math.max(max, step.soThuTu), 1);

        await history.update({
            trangThai: "HOAN_THANH",
            thoiGianKetThuc: new Date(),
            buocHienTai: lastStepOrder
        });

        return sendSuccess(res, 200, "Cooking finished", await fetchHistory(history.idLichSu));
    }),

    cancel: asyncHandler(async (req, res) => {
        const history = await db.LichSuNau.findByPk(req.params.id);

        if (!history) {
            return sendError(res, 404, "Cooking history not found");
        }

        if (!canAccessHistory(req, history)) {
            return sendError(res, 403, "You cannot update this cooking history");
        }

        await history.update({
            trangThai: "DA_HUY",
            thoiGianKetThuc: new Date()
        });

        return sendSuccess(res, 200, "Cooking cancelled", await fetchHistory(history.idLichSu));
    })
};

module.exports = LichSuNauController;
