const router = require('express').Router();
const c = require('../controllers/ThanhToanController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, c.mine);
router.get('/:id', authenticate, c.detail);
router.post('/vietqr/tao', authenticate, c.createVietQr);
router.patch('/:id/da-thanh-toan', authenticate, c.customerConfirm);

module.exports = router;
