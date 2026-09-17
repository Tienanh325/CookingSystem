const express = require('express');

const NhatKyHeThongController = require('../controllers/NhatKyHeThongController');
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate, authorizeAdmin);

router.get('/', NhatKyHeThongController.list);

module.exports = router;
