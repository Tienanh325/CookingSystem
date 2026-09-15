const express = require("express");

const VaiTroController = require("../controllers/VaiTroController");
const { authenticate, authorizeAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate, authorizeAdmin);

router.get("/", VaiTroController.list);
router.post("/", VaiTroController.create);
router.patch("/:id", VaiTroController.update);

module.exports = router;
