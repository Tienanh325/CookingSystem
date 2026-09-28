const router = require('express').Router();
const c = require('../controllers/ThanhToanController');
const { authenticate } = require('../middleware/authMiddleware');

// VNPAY gọi hai endpoint này không kèm JWT. IPN tự xác thực bằng HMAC-SHA512.
router.get('/vnpay/ipn', c.ipn);
router.get('/vnpay/return', c.returnFromVnpay);
router.get('/', authenticate, c.mine);
router.get('/:id', authenticate, c.detail);
router.post('/yeu-cau', authenticate, c.create);
router.post('/vnpay/tao', authenticate, c.createVnpay);

module.exports = router;
