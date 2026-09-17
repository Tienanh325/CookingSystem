const express = require('express');

const YeuThichController = require('../controllers/YeuThichController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/', YeuThichController.listMine);
router.get('/:idMonAn', YeuThichController.status);
router.post('/:idMonAn', YeuThichController.add);
router.delete('/:idMonAn', YeuThichController.remove);

module.exports = router;
