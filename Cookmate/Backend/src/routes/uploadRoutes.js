const express = require('express');

const UploadController = require('../controllers/UploadController');
const { authenticate } = require('../middleware/authMiddleware');
const { uploadImage, uploadLimit } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post(
  '/image',
  authenticate,
  uploadLimit,
  uploadImage.single('image'),
  UploadController.image,
);

module.exports = router;
