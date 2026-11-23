function errorHandler(err, req, res, next) {
  // Expected client errors: our own validation, Mongoose validation, duplicate SKU.
  if (err?.status === 400 || err?.name === 'ValidationError' || err?.name === 'CastError' || err?.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ message: 'A product with this SKU already exists.' });
  }
  if (err?.status === 401) {
    return res.status(401).json({ message: err.message || 'Unauthorized' });
  }

  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Щось пішло не так.' });
}

module.exports = errorHandler;
