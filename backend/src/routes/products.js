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

// ===== Пошук за артиклем (GET) =====
router.get('/admin/find/:sku', async (req, res, next) => {
  try {
    const { sku } = req.params;
    const product = await Product.findOne({ sku });

    if (!product) return res.status(404).json({ message: 'Not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// ===== Оновлення метаданих (PATCH) =====
router.patch('/admin/update/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { price, salePrice, type, size } = req.body;

    const updated = await Product.findByIdAndUpdate(
      id,
      { price, salePrice, type, size },
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Оновлено успішно', product: updated });
  } catch (err) {
    next(err);
  }
});

// ===== Видалення фото (DELETE) =====
router.delete('/admin/delete/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Not found' });

    // Витягуємо ключ з URL
    const key = product.imageUrl.split('.amazonaws.com/')[1];
    if (!key) throw new Error('Не вдалося визначити ключ S3.');

    // Видаляємо з S3
    await s3.deleteObject({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    }).promise();

    // Видаляємо з MongoDB
    await Product.findByIdAndDelete(id);

    res.json({ message: 'Фото видалено' });
  } catch (err) {
    next(err);
  }
});
// пошук фото по артиклю
router.get('/admin/find/:sku', async (req, res, next) => {
  try {
    const { sku } = req.params;
    const product = await Product.findOne({ sku });

    if (!product) return res.status(404).json({ message: 'Фото не знайдено' });

    res.json(product);
  } catch (err) {
    next(err);
  }
});
// ===== Публічний роут: всі товари для дівчат =====
router.get('/girls', async (req, res, next) => {
  try {
    const products = await Product.find({ category: 'girls' }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

// ===== Публічний роут: всі товари для хлопців =====
router.get('/boys', async (req, res, next) => {
  try {
    const products = await Product.find({ category: 'boys' }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

module.exports = router;