const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const controller = require('../controllers/transaction.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);

router.get('/',    authorize('ADMIN', 'OPERATOR'), controller.getAll);
router.get('/:id', authorize('ADMIN', 'OPERATOR'), controller.getById);

router.post('/', authorize('ADMIN', 'OPERATOR'), [
  body('productId').notEmpty(),
  body('type').isIn(['IN', 'OUT', 'ADJUSTMENT']),
  body('quantity').isInt({ min: 1 }),
  validate,
], controller.create);

module.exports = router;
