const express = require("express");

const NguyenLieuController = require("../controllers/NguyenLieuController");
const { authenticate, authorizeAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", NguyenLieuController.list);
router.get("/:id", NguyenLieuController.detail);
router.post("/", authenticate, authorizeAdmin, NguyenLieuController.create);
router.patch("/:id", authenticate, authorizeAdmin, NguyenLieuController.update);
router.delete("/:id", authenticate, authorizeAdmin, NguyenLieuController.remove);

module.exports = router;
