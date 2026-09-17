const express = require('express');

const BinhLuanController = require('../controllers/BinhLuanController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.patch('/:id', BinhLuanController.update);
router.delete('/:id', BinhLuanController.remove);

module.exports = router;
