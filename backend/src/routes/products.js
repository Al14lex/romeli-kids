const express = require('express');
const multer = require('multer');
const { uploadToS3, uploadManyToS3, deleteFromS3 } = require('../utils/s3');
const Product = require('../models/Product');
const { randomUUID } = require('crypto');
const {
  ALLOWED_CATEGORIES,
  parsePrice,
  parseRequiredText,
  parseNotes,
  parseCategory,
  currentImagesOf,
  parseKeepImages,
  planImageUpdate,
} = require('../utils/productFields');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });
const logUploadRouteHit = (route, meta = {}) => {
  console.log(`[upload-route] ${route}`, meta);
};

const parseS3KeyFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  const splitToken = '.amazonaws.com/';
  return url.includes(splitToken) ? url.split(splitToken)[1] : null;
};

const normalizeProductResponse = (productDoc) => {
  const product = typeof productDoc?.toObject === 'function'
    ? productDoc.toObject()
    : productDoc;

  const storedImages = Array.isArray(product?.images)
    ? product.images.filter(Boolean)
    : [];

  const images = storedImages.length
    ? storedImages
    : (product?.imageUrl ? [product.imageUrl] : []);

  let coverIndex = Number.isInteger(product?.coverIndex) ? product.coverIndex : 0;
  if (coverIndex < 0 || coverIndex >= images.length) coverIndex = 0;

  return {
    ...product,
    images,
    coverIndex,
    imageUrl: product?.imageUrl || images[coverIndex] || null,
    notes: product?.notes || '',
  };
};

const deleteS3Urls = async (urls) => {
  const keys = [...new Set(urls.map(parseS3KeyFromUrl).filter(Boolean))];
  const results = await Promise.allSettled(
    keys.map((key) => deleteFromS3({ bucket: process.env.S3_BUCKET_NAME, key }))
  );
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error('[s3] could not delete', keys[index], result.reason);
    }
  });
};

// ===== Upload: girls (legacy single-file endpoint) =====
router.post('/admin/girls/upload', upload.single('file'), async (req, res, next) => {
  try {
    const { sku, price, salePrice, type, size } = req.body;
    const notes = parseNotes(req.body.notes);
    logUploadRouteHit('/admin/girls/upload', { sku, hasFile: !!req.file });

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'File was not uploaded.' });
    }
    if (!sku) {
      return res.status(400).json({ message: 'SKU was not provided.' });
    }

    const bucket = process.env.S3_BUCKET_NAME;
    const key = `girls/${sku}-${randomUUID()}.jpg`;

    const imageUrl = await uploadToS3({
      bucket,
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    const product = new Product({
      sku,
      price,
      salePrice: salePrice || null,
      type,
      size,
      category: 'girls',
      images: [imageUrl],
      coverIndex: 0,
      imageUrl,
      notes,
    });

    await product.save();
    res.status(201).json({ message: 'Photo uploaded successfully.', product: normalizeProductResponse(product) });
  } catch (err) {
    next(err);
  }
});

// ===== Upload: boys (legacy single-file endpoint) =====
router.post('/admin/boys/upload', upload.single('file'), async (req, res, next) => {
  try {
    const { sku, price, salePrice, type, size } = req.body;
    const notes = parseNotes(req.body.notes);
    logUploadRouteHit('/admin/boys/upload', { sku, hasFile: !!req.file });

    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: 'File was not uploaded.' });
    }
    if (!sku) {
      return res.status(400).json({ message: 'SKU was not provided.' });
    }

    const bucket = process.env.S3_BUCKET_NAME;
    const key = `boys/${sku}-${randomUUID()}.jpg`;

    const imageUrl = await uploadToS3({
      bucket,
      key,
      body: file.buffer,
      contentType: file.mimetype,
    });

    const product = new Product({
      sku,
      price,
      salePrice: salePrice || null,
      type,
      size,
      category: 'boys',
      images: [imageUrl],
      coverIndex: 0,
      imageUrl,
      notes,
    });

    await product.save();
    res.status(201).json({ message: 'Photo uploaded successfully.', product: normalizeProductResponse(product) });
  } catch (err) {
    next(err);
  }
});

// ===== Upload: one product with many images =====
router.post('/admin/products/upload', upload.array('images', 20), async (req, res, next) => {
  try {
    const { sku, price, salePrice, type, size, category } = req.body;
    const notes = parseNotes(req.body.notes);
    const files = req.files || [];
    logUploadRouteHit('/admin/products/upload', {
      sku,
      category,
      coverIndex: req.body.coverIndex,
      filesCount: files.length,
    });

    if (!files.length) {
      return res.status(400).json({ message: 'Images were not uploaded.' });
    }
    if (!sku) {
      return res.status(400).json({ message: 'SKU was not provided.' });
    }
    if (!ALLOWED_CATEGORIES.has(category)) {
      return res.status(400).json({ message: "category must be 'girls' or 'boys'." });
    }

    const parsedCoverIndex = Number.parseInt(req.body.coverIndex, 10);
    const coverIndex = Number.isInteger(parsedCoverIndex) ? parsedCoverIndex : 0;
    if (coverIndex < 0 || coverIndex >= files.length) {
      return res.status(400).json({ message: 'coverIndex is out of range.' });
    }

    const bucket = process.env.S3_BUCKET_NAME;
    const baseKeyPrefix = `${category}/${sku}-${randomUUID()}`;
    const images = await uploadManyToS3({
      bucket,
      baseKeyPrefix,
      files,
    });

    const product = new Product({
      sku,
      price,
      salePrice: salePrice || null,
      type,
      size,
      category,
      images,
      coverIndex,
      imageUrl: images[coverIndex] || null,
      notes,
    });

    await product.save();
    res.status(201).json({ message: 'Product uploaded successfully.', product: normalizeProductResponse(product) });
  } catch (err) {
    next(err);
  }
});

// ===== Find by SKU =====
router.get('/admin/find/:sku', async (req, res, next) => {
  try {
    const { sku } = req.params;
    const product = await Product.findOne({ sku });

    if (!product) return res.status(404).json({ message: 'Photo not found' });
    res.json(normalizeProductResponse(product));
  } catch (err) {
    next(err);
  }
});

// ===== Update metadata (JSON, kept for compatibility) =====
router.patch('/admin/update/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { price, salePrice, type, size, notes, category } = req.body;

    const update = {};
    if (price !== undefined) update.price = parsePrice(price, { required: true, field: 'price' });
    if (salePrice !== undefined) update.salePrice = parsePrice(salePrice, { required: false, field: 'salePrice' });
    if (type !== undefined) update.type = parseRequiredText(type, 'type');
    if (size !== undefined) update.size = parseRequiredText(size, 'size');
    if (notes !== undefined) update.notes = parseNotes(notes);
    if (category !== undefined) update.category = parseCategory(category);

    const updated = await Product.findByIdAndUpdate(
      id,
      update,
      { new: true, runValidators: true }
    );

    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Updated successfully', product: normalizeProductResponse(updated) });
  } catch (err) {
    next(err);
  }
});

// ===== Full edit: fields + photos + cover (multipart) =====
// Body fields: price, salePrice, type, size, category, notes,
//   keepImages (JSON array of existing image URLs, in display order),
//   coverIndex (index into keepImages followed by newly uploaded files).
// Files: images[] (new photos to append).
router.patch('/admin/products/:id', upload.array('images', 20), async (req, res, next) => {
  const files = req.files || [];
  let uploaded = [];

  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Not found' });

    const category = req.body.category !== undefined
      ? parseCategory(req.body.category)
      : product.category;

    const fields = {
      price: parsePrice(req.body.price ?? product.price, { required: true, field: 'price' }),
      salePrice: req.body.salePrice !== undefined
        ? parsePrice(req.body.salePrice, { required: false, field: 'salePrice' })
        : (product.salePrice ?? null),
      type: parseRequiredText(req.body.type ?? product.type, 'type'),
      size: parseRequiredText(req.body.size ?? product.size, 'size'),
      notes: req.body.notes !== undefined ? parseNotes(req.body.notes) : (product.notes || ''),
      category,
    };

    const currentImages = currentImagesOf(product);
    const keepImages = parseKeepImages(req.body.keepImages, currentImages);
    const { coverIndex, removed } = planImageUpdate({
      currentImages,
      keepImages,
      newCount: files.length,
      coverIndex: req.body.coverIndex ?? product.coverIndex ?? 0,
    });

    logUploadRouteHit('/admin/products/:id (edit)', {
      sku: product.sku,
      kept: keepImages.length,
      added: files.length,
      removed: removed.length,
      coverIndex,
    });

    if (files.length) {
      uploaded = await uploadManyToS3({
        bucket: process.env.S3_BUCKET_NAME,
        baseKeyPrefix: `${category}/${product.sku}-${randomUUID()}`,
        files,
      });
    }

    const images = [...keepImages, ...uploaded];
    Object.assign(product, fields, {
      images,
      coverIndex,
      imageUrl: images[coverIndex] || null,
    });

    await product.save();
    uploaded = [];

    // Remove photos the admin deleted, only after the product is saved.
    if (removed.length) await deleteS3Urls(removed);

    res.json({ message: 'Updated successfully', product: normalizeProductResponse(product) });
  } catch (err) {
    // Saving failed: do not leave orphan uploads in S3.
    if (uploaded.length) await deleteS3Urls(uploaded);
    next(err);
  }
});

// ===== Delete product photos =====
router.delete('/admin/delete/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: 'Not found' });

    const imageUrls = Array.isArray(product.images) && product.images.length
      ? product.images
      : (product.imageUrl ? [product.imageUrl] : []);

    await Product.findByIdAndDelete(id);
    await deleteS3Urls(imageUrls);

    res.json({ message: 'Photo deleted' });
  } catch (err) {
    next(err);
  }
});

// ===== Public route: girls =====
router.get('/girls', async (req, res, next) => {
  try {
    const products = await Product.find({ category: 'girls' }).sort({ createdAt: -1 });
    res.json(products.map(normalizeProductResponse));
  } catch (err) {
    next(err);
  }
});

// ===== Public route: boys =====
router.get('/boys', async (req, res, next) => {
  try {
    const products = await Product.find({ category: 'boys' }).sort({ createdAt: -1 });
    res.json(products.map(normalizeProductResponse));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
