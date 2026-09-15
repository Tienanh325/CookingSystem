const express = require("express");

const DanhGiaController = require("../controllers/DanhGiaController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

router.get("/mine", DanhGiaController.listMine);
router.delete("/:id", DanhGiaController.remove);

module.exports = router;
