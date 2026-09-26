const express = require('express');
const controller = require('../controllers/GoiDichVuController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', controller.list);
router.get('/me', authenticate, controller.mine);

module.exports = router;
