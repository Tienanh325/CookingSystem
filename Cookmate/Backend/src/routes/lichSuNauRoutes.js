const express = require('express');

const LichSuNauController = require('../controllers/LichSuNauController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/', LichSuNauController.listMine);
router.post('/', LichSuNauController.start);
router.get('/:id', LichSuNauController.detail);
router.patch('/:id/steps/:idBuocNau', LichSuNauController.updateStep);
router.patch('/:id/finish', LichSuNauController.finish);
router.patch('/:id/cancel', LichSuNauController.cancel);

module.exports = router;
