const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const controller = require('../controllers/inventory.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);

router.get('/',              authorize('ADMIN', 'OPERATOR', 'SELLER'), controller.getAll);
router.get('/summary',       authorize('ADMIN', 'OPERATOR'), controller.getSummary);
router.get('/alerts',        authorize('ADMIN', 'OPERATOR'), controller.getLowStockAlerts);
router.get('/:productId',    authorize('ADMIN', 'OPERATOR', 'SELLER'), controller.getByProductId);

router.put('/:productId',    authorize('ADMIN', 'OPERATOR'), [
  body('quantity').optional().isInt({ min: 0 }),
  body('minStock').optional().isInt({ min: 0 }),
  body('maxStock').optional().isInt({ min: 0 }),
  validate,
], controller.update);

module.exports = router;
