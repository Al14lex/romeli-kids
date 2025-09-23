const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  salePrice: Number,
  type: { type: String, required: true },
  size: { type: String, required: true },
  category: { type: String, enum: ['girls', 'boys'], required: true },
  imageUrl: { type: String, required: true },
}, { timestamps: true, collection: 'foto' });

module.exports = mongoose.model('Product', productSchema);
