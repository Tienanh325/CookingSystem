const express = require('express');

const MonAnController = require('../controllers/MonAnController');
const YeuThichController = require('../controllers/YeuThichController');
const DanhGiaController = require('../controllers/DanhGiaController');
const BinhLuanController = require('../controllers/BinhLuanController');
const LichSuNauController = require('../controllers/LichSuNauController');
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/cua-toi', authenticate, MonAnController.listMine);
router.post('/cua-toi', authenticate, MonAnController.createMine);
router.get('/cua-toi/:id', authenticate, MonAnController.detailMine);
router.patch('/cua-toi/:id', authenticate, MonAnController.updateMine);
router.post('/cua-toi/:id/gui-duyet', authenticate, MonAnController.submitMine);

router.get('/', MonAnController.list);
router.get('/:id', MonAnController.detail);
router.get('/:id/stats', MonAnController.stats);

router.get('/:id/yeu-thich', authenticate, YeuThichController.status);
router.post('/:id/yeu-thich', authenticate, YeuThichController.add);
router.delete('/:id/yeu-thich', authenticate, YeuThichController.remove);

router.get('/:id/danh-gia', DanhGiaController.listByRecipe);
router.post('/:id/danh-gia', authenticate, DanhGiaController.upsertForRecipe);

router.get('/:id/binh-luan', BinhLuanController.listByRecipe);
router.post('/:id/binh-luan', authenticate, BinhLuanController.createForRecipe);

router.post('/:id/lich-su-nau', authenticate, LichSuNauController.start);

router.post('/', authenticate, authorizeAdmin, MonAnController.create);
router.patch('/:id', authenticate, authorizeAdmin, MonAnController.update);
router.delete('/:id', authenticate, authorizeAdmin, MonAnController.remove);

module.exports = router;
