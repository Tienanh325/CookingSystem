const express = require("express");

const NguoiDungController = require("../controllers/NguoiDungController");
const { authenticate, authorizeAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate, authorizeAdmin);

router.get("/", NguoiDungController.list);
router.get("/:id", NguoiDungController.detail);
router.patch("/:id", NguoiDungController.update);

module.exports = router;
