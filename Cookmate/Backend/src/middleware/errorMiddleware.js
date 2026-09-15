const multer = require("multer");
const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require("sequelize");

const { sendError } = require("../utils/apiResponse");

const notFound = (req, res) => {
    return sendError(res, 404, `Route ${req.method} ${req.originalUrl} not found`);
};

const errorHandler = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    if (error instanceof UniqueConstraintError) {
        return sendError(res, 409, "Duplicate data", error.errors.map((item) => item.message));
    }

    if (error instanceof ValidationError) {
        return sendError(res, 400, "Invalid data", error.errors.map((item) => item.message));
    }

    if (error instanceof ForeignKeyConstraintError) {
        return sendError(res, 400, "Related data does not exist or is still in use");
    }

    if (error instanceof multer.MulterError) {
        return sendError(res, 400, error.message);
    }

    console.error(error);

    return sendError(res, error.statusCode || 500, error.message || "Server error");
};

module.exports = {
    errorHandler,
    notFound
};
