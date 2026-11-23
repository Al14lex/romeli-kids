const mongoose = require('mongoose');

const { NOTES_MAX_LENGTH } = require('../utils/productFields');

const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  salePrice: Number,
  type: { type: String, required: true },
  size: { type: String, required: true },
  category: { type: String, enum: ['girls', 'boys'], required: true },
  images: { type: [String], default: [] },
  coverIndex: { type: Number, default: 0 },
  imageUrl: { type: String },
  notes: { type: String, trim: true, maxlength: NOTES_MAX_LENGTH, default: '' },
}, { timestamps: true, collection: 'foto' });

module.exports = mongoose.model('Product', productSchema);
