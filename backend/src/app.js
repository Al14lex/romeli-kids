require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const productRoutes = require('./routes/products');
const errorHandler = require('./middleware/error');
const app = express();

app.use(cors({
  origin: [
    "http://localhost:5000",
    "http://localhost:5173",
    "https://romeli-kids.vercel.app"
  ],
  methods: ["GET", "POST", "PATCH", "DELETE"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', productRoutes);

app.use(errorHandler);

// запуск
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Сервер запущено на порту ${PORT}`));
  })
  .catch(err => console.error('Помилка підключення до MongoDB:', err));