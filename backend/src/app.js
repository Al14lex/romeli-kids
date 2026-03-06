// test access
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const productRoutes = require('./routes/products');
const errorHandler = require('./middleware/error');

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5000',
    'http://localhost:5173',
    'https://romeli-kids.vercel.app',
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', productRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
      console.log('[routes] mounted under /api: /admin/girls/upload, /admin/boys/upload, /admin/products/upload');
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
