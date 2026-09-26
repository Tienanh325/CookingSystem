const router = require('express').Router();
const c = require('../controllers/ThanhToanController');
const { authenticate } = require('../middleware/authMiddleware');
router.use(authenticate);
router.get('/', c.mine);
router.post('/yeu-cau', c.create);
module.exports = router;
