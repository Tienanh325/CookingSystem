const express = require('express');

const ThongBaoController = require('../controllers/ThongBaoController');
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/', ThongBaoController.listMine);
router.post('/thiet-bi', ThongBaoController.registerDevice);
router.delete('/thiet-bi', ThongBaoController.unregisterDevices);
router.patch('/read-all', ThongBaoController.markAllRead);
router.patch('/:id/read', ThongBaoController.markRead);
router.post('/', authorizeAdmin, ThongBaoController.create);

module.exports = router;
