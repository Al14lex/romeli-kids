require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const productRoutes = require('./routes/products');
const errorHandler = require('./middleware/error');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', productRoutes);

app.use(errorHandler);

// запуск
const PORT = process.env.PORT || 3001;
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Сервер запущено на порту ${PORT}`));
  })
  .catch(err => console.error('Помилка підключення до MongoDB:', err));
