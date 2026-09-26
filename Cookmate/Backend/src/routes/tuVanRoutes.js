const router = require('express').Router();
const { authenticate } = require('../middleware/authMiddleware');
router.post('/', authenticate, require('../controllers/TuVanController').advise);
module.exports = router;
