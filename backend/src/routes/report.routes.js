const express = require('express');
const router = express.Router();
const controller = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/dashboard', controller.getDashboardStats);
router.get('/transactions', controller.getTransactionReport);
router.get('/top-products', controller.getTopProducts);
router.get('/inventory', controller.getInventoryReport);
router.get('/forecast', controller.getDemandForecast);

module.exports = router;
