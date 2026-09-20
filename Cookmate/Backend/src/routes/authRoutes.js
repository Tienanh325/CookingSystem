const express = require('express');

const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(require('./customerAuthRoutes'));

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/resend-verification', AuthController.resendVerification);
router.post('/verify-email', AuthController.verifyEmail);
router.post('/forgot-password', AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.get('/me', authenticate, AuthController.me);
router.patch('/me', authenticate, AuthController.updateMe);
router.patch('/change-password', authenticate, AuthController.changePassword);
router.post('/logout', authenticate, AuthController.logout);

module.exports = router;
