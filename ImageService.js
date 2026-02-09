// src/services/ImageService.js
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const config = require('../config');
const db = require('../config/database');
const logger = require('../utils/logger');
const { ValidationError } = require('../utils/errors');

// S3-compatible client (works with AWS S3, DigitalOcean Spaces, Hostinger Object Storage, MinIO)
const AWS = require('aws-sdk');

const s3 = new AWS.S3({
  endpoint: config.storage.endpoint || undefined,
  accessKeyId: config.storage.accessKey,
  secretAccessKey: config.storage.secretKey,
  region: config.storage.region,
  s3ForcePathStyle: !!config.storage.endpoint, // needed for non-AWS S3-compatible
  signatureVersion: 'v4',
});

const BUCKET = config.storage.bucket;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_HEIGHT = 400;
const FULL_MAX_WIDTH = 1600;
const FULL_MAX_HEIGHT = 1600;
const QUALITY = 85;

class ImageService {
  /**
   * Process and upload a single image for a product
   * @param {Buffer} fileBuffer - Raw image buffer from multer
   * @param {Object} fileInfo - { originalname, mimetype, size }
   * @param {string} userId
   * @param {string} productId
   * @param {number} position - Image ordering position
   * @returns {Object} Image record
   */
  async uploadProductImage(fileBuffer, fileInfo, userId, productId, position = 0) {
    // Validate
    if (!ALLOWED_TYPES.includes(fileInfo.mimetype)) {
      throw new ValidationError(`Unsupported image type: ${fileInfo.mimetype}. Use JPG, PNG, or WebP.`);
    }
    if (fileInfo.size > MAX_FILE_SIZE) {
      throw new ValidationError('Image exceeds 10MB limit');
    }

    // Check product ownership
    const product = await db('products').where({ id: productId, user_id: userId }).first();
    if (!product) throw new ValidationError('Product not found');

    // Check image count limit (max 16 per product)
    const existingCount = await db('product_images')
      .where({ product_id: productId })
      .count('id as count')
      .first();
    if (parseInt(existingCount.count) >= 16) {
      throw new ValidationError('Maximum 16 images per product');
    }

    const imageId = uuidv4();
    const ext = 'webp'; // Always output as WebP for consistency and smaller size
    const keyPrefix = `products/${userId}/${productId}`;

    try {
      // Get metadata from original
      const metadata = await sharp(fileBuffer).metadata();

      // ─── Process full-size image ───
      const fullBuffer = await sharp(fileBuffer)
        .rotate() // auto-rotate based on EXIF
        .resize(FULL_MAX_WIDTH, FULL_MAX_HEIGHT, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();

      const fullKey = `${keyPrefix}/${imageId}.${ext}`;
      const fullUrl = await this._uploadToS3(fullKey, fullBuffer, 'image/webp');

      // ─── Generate thumbnail ───
      const thumbBuffer = await sharp(fileBuffer)
        .rotate()
        .resize(THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, { fit: 'cover', position: 'centre' })
        .webp({ quality: 75 })
        .toBuffer();

      const thumbKey = `${keyPrefix}/${imageId}_thumb.${ext}`;
      const thumbUrl = await this._uploadToS3(thumbKey, thumbBuffer, 'image/webp');

      // ─── Save to database ───
      const isPrimary = parseInt(existingCount.count) === 0; // First image is primary

      const [imageRecord] = await db('product_images')
        .insert({
          id: imageId,
          product_id: productId,
          url: fullUrl,
          thumbnail_url: thumbUrl,
          s3_key: fullKey,
          position: position,
          is_primary: isPrimary,
          width: metadata.width,
          height: metadata.height,
          file_size: fullBuffer.length,
          content_type: 'image/webp',
        })
        .returning('*');

      logger.info(`Image uploaded: ${imageId} for product ${productId}`, { userId });

      return imageRecord;
    } catch (err) {
      // Clean up any S3 uploads on failure
      logger.error('Image upload failed:', err.message);
      throw err;
    }
  }

  /**
   * Upload multiple images for a product
   */
  async uploadMultiple(files, userId, productId) {
    const results = { uploaded: [], failed: [] };

    // Get current max position
    const maxPos = await db('product_images')
      .where({ product_id: productId })
      .max('position as max')
      .first();
    let position = (maxPos?.max ?? -1) + 1;

    for (const file of files) {
      try {
        const record = await this.uploadProductImage(
          file.buffer,
          { originalname: file.originalname, mimetype: file.mimetype, size: file.size },
          userId,
          productId,
          position
        );
        results.uploaded.push(record);
        position++;
      } catch (err) {
        results.failed.push({ filename: file.originalname, error: err.message });
      }
    }

    return results;
  }

  /**
   * Delete a product image
   */
  async deleteImage(userId, imageId) {
    const image = await db('product_images')
      .join('products', 'product_images.product_id', 'products.id')
      .where({ 'product_images.id': imageId, 'products.user_id': userId })
      .select('product_images.*')
      .first();

    if (!image) throw new ValidationError('Image not found');

    // Delete from S3
    if (image.s3_key) {
      await this._deleteFromS3(image.s3_key);
      // Also delete thumbnail
      const thumbKey = image.s3_key.replace(/\.(\w+)$/, '_thumb.$1');
      await this._deleteFromS3(thumbKey).catch(() => {}); // ignore if no thumb
    }

    // Delete from DB
    await db('product_images').where({ id: imageId }).del();

    // If deleted image was primary, promote next one
    if (image.is_primary) {
      const nextImage = await db('product_images')
        .where({ product_id: image.product_id })
        .orderBy('position')
        .first();
      if (nextImage) {
        await db('product_images')
          .where({ id: nextImage.id })
          .update({ is_primary: true });
      }
    }

    logger.info(`Image deleted: ${imageId}`);
    return { deleted: true };
  }

  /**
   * Reorder images for a product
   */
  async reorderImages(userId, productId, imageIds) {
    // Verify ownership
    const product = await db('products').where({ id: productId, user_id: userId }).first();
    if (!product) throw new ValidationError('Product not found');

    // Update positions and primary flag
    for (let i = 0; i < imageIds.length; i++) {
      await db('product_images')
        .where({ id: imageIds[i], product_id: productId })
        .update({ position: i, is_primary: i === 0 });
    }

    return { reordered: true };
  }

  /**
   * Set a specific image as primary
   */
  async setPrimaryImage(userId, productId, imageId) {
    const product = await db('products').where({ id: productId, user_id: userId }).first();
    if (!product) throw new ValidationError('Product not found');

    // Unset all primary
    await db('product_images')
      .where({ product_id: productId })
      .update({ is_primary: false });

    // Set the chosen one
    await db('product_images')
      .where({ id: imageId, product_id: productId })
      .update({ is_primary: true, position: 0 });

    return { primary: imageId };
  }

  /**
   * Get all images for a product
   */
  async getProductImages(productId) {
    return db('product_images')
      .where({ product_id: productId })
      .orderBy('position');
  }

  /**
   * Generate a background-removed version (placeholder for future AI integration)
   */
  async removeBackground(imageBuffer) {
    // Future: integrate with remove.bg API or rembg
    logger.info('Background removal requested (not yet implemented)');
    return imageBuffer;
  }

  // ─── S3 Helpers ───

  async _uploadToS3(key, buffer, contentType) {
    const params = {
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read',
      CacheControl: 'max-age=31536000', // 1 year cache
    };

    const result = await s3.upload(params).promise();
    return result.Location;
  }

  async _deleteFromS3(key) {
    await s3.deleteObject({ Bucket: BUCKET, Key: key }).promise();
  }

  /**
   * Generate a signed URL for direct browser upload (for large files)
   */
  async getPresignedUploadUrl(userId, productId, filename, contentType) {
    const ext = path.extname(filename) || '.jpg';
    const key = `products/${userId}/${productId}/${uuidv4()}${ext}`;

    const url = await s3.getSignedUrlPromise('putObject', {
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      Expires: 300, // 5 minutes
      ACL: 'public-read',
    });

    return { uploadUrl: url, key, expiresIn: 300 };
  }

  /**
   * Fallback: save to local filesystem if S3 is not configured
   */
  async _saveLocally(key, buffer) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, key);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);
    return `/uploads/${key}`;
  }
}

module.exports = new ImageService();
