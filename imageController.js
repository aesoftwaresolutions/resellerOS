// src/controllers/imageController.js
const multer = require('multer');
const Joi = require('joi');
const ImageService = require('../services/ImageService');
const { success, created } = require('../utils/response');

// Multer config — memory storage for processing with Sharp before S3
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 16 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// Single image upload
const uploadSingle = [
  upload.single('image'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: { message: 'No image file provided' } });
    const record = await ImageService.uploadProductImage(
      req.file.buffer,
      { originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size },
      req.user.id,
      req.params.productId,
      parseInt(req.body.position) || 0
    );
    return created(res, record, 'Image uploaded');
  },
];

// Multiple image upload
const uploadMultiple = [
  upload.array('images', 16),
  async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'No image files provided' } });
    }
    const result = await ImageService.uploadMultiple(req.files, req.user.id, req.params.productId);
    return created(res, result, `${result.uploaded.length} images uploaded`);
  },
];

// Delete image
const deleteImage = async (req, res) => {
  await ImageService.deleteImage(req.user.id, req.params.imageId);
  return success(res, null, 'Image deleted');
};

// Reorder images
const reorderImages = async (req, res) => {
  const { imageIds } = req.body;
  if (!imageIds || !Array.isArray(imageIds)) {
    return res.status(400).json({ success: false, error: { message: 'imageIds array required' } });
  }
  const result = await ImageService.reorderImages(req.user.id, req.params.productId, imageIds);
  return success(res, result);
};

// Set primary image
const setPrimary = async (req, res) => {
  const result = await ImageService.setPrimaryImage(req.user.id, req.params.productId, req.params.imageId);
  return success(res, result);
};

// Get product images
const getProductImages = async (req, res) => {
  const images = await ImageService.getProductImages(req.params.productId);
  return success(res, images);
};

// Get presigned URL for direct upload
const getPresignedUrl = async (req, res) => {
  const { filename, contentType } = req.query;
  if (!filename) return res.status(400).json({ success: false, error: { message: 'filename required' } });
  const result = await ImageService.getPresignedUploadUrl(
    req.user.id, req.params.productId, filename, contentType || 'image/jpeg'
  );
  return success(res, result);
};

module.exports = {
  uploadSingle,
  uploadMultiple,
  deleteImage,
  reorderImages,
  setPrimary,
  getProductImages,
  getPresignedUrl,
};
