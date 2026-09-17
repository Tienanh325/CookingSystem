const express = require('express');

const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(require('./customerAuthRoutes'));

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', authenticate, AuthController.me);
router.patch('/me', authenticate, AuthController.updateMe);
router.patch('/change-password', authenticate, AuthController.changePassword);
router.post('/logout', authenticate, AuthController.logout);

module.exports = router;
