const express = require("express");

const DanhMucController = require("../controllers/DanhMucController");
const { authenticate, authorizeAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", DanhMucController.list);
router.get("/:id", DanhMucController.detail);
router.post("/", authenticate, authorizeAdmin, DanhMucController.create);
router.patch("/:id", authenticate, authorizeAdmin, DanhMucController.update);
router.delete("/:id", authenticate, authorizeAdmin, DanhMucController.remove);

module.exports = router;
