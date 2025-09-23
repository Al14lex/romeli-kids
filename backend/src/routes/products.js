const express = require('express');
const multer = require('multer');
const s3 = require('../utils/s3');
const Product = require('../models/Product');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

// girls
router.post('/admin/girls/upload', upload.single('file'), async (req, res, next) => {
  try {
    const { sku, price, salePrice, type, size } = req.body;

    const file = req.file;
    if (!file) throw new Error('Файл не завантажено.');

    const s3Params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `girls/${sku}-${uuidv4()}.jpg`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    };

    const s3Result = await s3.upload(s3Params).promise();

    const product = new Product({
      sku,
      price,
      salePrice: salePrice || null,
      type,
      size,
      category: 'girls',
      imageUrl: s3Result.Location,
    });

    await product.save();
    res.status(201).json({ message: 'Фото завантажено успішно.' });
  } catch (err) {
    next(err);
  }
});

// boys — копія з категорією boys
router.post('/admin/boys/upload', upload.single('file'), async (req, res, next) => {
  try {
    const { sku, price, salePrice, type, size } = req.body;

    const file = req.file;
    if (!file) throw new Error('Файл не завантажено.');

    const s3Params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `boys/${sku}-${uuidv4()}.jpg`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    };

    const s3Result = await s3.upload(s3Params).promise();

    const product = new Product({
      sku,
      price,
      salePrice: salePrice || null,
      type,
      size,
      category: 'boys',
      imageUrl: s3Result.Location,
    });

    await product.save();
    res.status(201).json({ message: 'Фото завантажено успішно.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
