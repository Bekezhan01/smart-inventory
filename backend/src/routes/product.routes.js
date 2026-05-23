const express = require('express');
const { body } = require('express-validator');
const router  = express.Router();
const controller = require('../controllers/product.controller');
const { authenticate, authorize, enforceSellerHours } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);

router.get('/',    authorize('ADMIN', 'OPERATOR', 'SELLER'), enforceSellerHours, controller.getAll);
router.get('/:id', authorize('ADMIN', 'OPERATOR', 'SELLER'), enforceSellerHours, controller.getById);

router.post('/', authorize('ADMIN', 'OPERATOR'), [
  body('name').trim().notEmpty(),
  body('sku').trim().notEmpty(),
  body('price').isFloat({ min: 0 }),
  validate,
], controller.create);

router.put('/:id', authorize('ADMIN', 'OPERATOR'), [
  body('name').optional().trim().notEmpty(),
  body('price').optional().isFloat({ min: 0 }),
  validate,
], controller.update);

router.delete('/:id', authorize('ADMIN'), controller.remove);

module.exports = router;
