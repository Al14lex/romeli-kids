// test access
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const productRoutes = require('./routes/products');
const errorHandler = require('./middleware/error');
const { login, requireAdmin } = require('./middleware/adminAuth');

const app = express();
// Render runs behind a proxy: use the real client IP for login rate limiting.
app.set('trust proxy', 1);

app.use(cors({
  origin: [
    'http://localhost:5000',
    'http://localhost:5173',
    'https://romeli-kids.vercel.app',
    // Vercel preview deployments of this project (test links before going live)
    /^https:\/\/romeli-kids-[a-z0-9-]+\.vercel\.app$/,
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lightweight check for the keep-alive ping (does not touch the database).
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Admin: login is public, everything else under /api/admin needs a valid token.
app.post('/api/admin/login', login);
app.use('/api/admin', requireAdmin);
app.use('/api', productRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT}`);
      if (!process.env.ADMIN_PASSWORD) {
        console.warn('[admin] ADMIN_PASSWORD is not set: admin routes are disabled.');
      }
      console.log('[routes] mounted under /api: /admin/girls/upload, /admin/boys/upload, /admin/products/upload');
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });
