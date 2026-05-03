const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const fs         = require('fs');
const path       = require('path');

const authRoutes        = require('./routes/auth.routes');
const productRoutes     = require('./routes/product.routes');
const inventoryRoutes   = require('./routes/inventory.routes');
const transactionRoutes = require('./routes/transaction.routes');
const reportRoutes      = require('./routes/report.routes');
const categoryRoutes    = require('./routes/category.routes');
const saleRoutes        = require('./routes/sale.routes');
const securityRoutes    = require('./routes/security.routes');
const { errorHandler, notFound } = require('./middleware/error.middleware');
const { auditMutations } = require('./services/audit.service');

const app = express();

app.use(helmet({
  crossOriginEmbedderPolicy: false, // needed for WebAuthn
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Слишком много попыток' } });
const apiLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', version: '2.0', timestamp: new Date().toISOString() }));
app.use(auditMutations);
app.use('/api/auth',         authLimiter, authRoutes);
app.use('/api/products',     apiLimiter,  productRoutes);
app.use('/api/inventory',    apiLimiter,  inventoryRoutes);
app.use('/api/transactions', apiLimiter,  transactionRoutes);
app.use('/api/reports',      apiLimiter,  reportRoutes);
app.use('/api/categories',   apiLimiter,  categoryRoutes);
app.use('/api/sales',        apiLimiter,  saleRoutes);
app.use('/api/security',     apiLimiter,  securityRoutes);

const frontendIndex = path.join(__dirname, '..', 'public', 'index.html');
if (fs.existsSync(frontendIndex)) {
  app.use(express.static(path.dirname(frontendIndex)));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    return res.sendFile(frontendIndex);
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
