const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const controller = require('../controllers/sale.controller');
const { authenticate, authorize, enforceSellerHours } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);
router.use(enforceSellerHours);

router.get('/',        authorize('ADMIN', 'OPERATOR', 'SELLER'), controller.getSales);
router.get('/summary', authorize('ADMIN', 'OPERATOR', 'SELLER'), controller.getSummary);
router.get('/:id',     authorize('ADMIN', 'OPERATOR', 'SELLER'), controller.getSaleById);

router.post('/', authorize('ADMIN', 'SELLER'), [
  body('items').isArray({ min: 1 }).withMessage('Нужен хотя бы 1 товар'),
  body('items.*.productId').notEmpty(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('paymentMethod').optional().isIn(['cash', 'card', 'qr']),
  body('discount').optional().isFloat({ min: 0 }),
  validate,
], controller.createSale);

module.exports = router;
