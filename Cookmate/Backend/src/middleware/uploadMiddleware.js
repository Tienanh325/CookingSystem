const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads");
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname || "").toLowerCase();
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, uniqueName);
    }
});

const imageFileFilter = (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
        const error = new Error("Only image files are allowed");
        error.statusCode = 400;
        return cb(error);
    }

    return cb(null, true);
};

const uploadImage = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

module.exports = {
    uploadImage
};
