const asyncHandler = require("../utils/asyncHandler");
const { sendError, sendSuccess } = require("../utils/apiResponse");

const UploadController = {
    image: asyncHandler(async (req, res) => {
        if (!req.file) {
            return sendError(res, 400, "Image file is required");
        }

        const filePath = `/uploads/${req.file.filename}`;

        return sendSuccess(res, 201, "Image uploaded", {
            filename: req.file.filename,
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: filePath,
            url: filePath
        });
    })
};

module.exports = UploadController;
