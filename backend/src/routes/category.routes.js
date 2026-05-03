const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const controller = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

router.use(authenticate);

router.get('/', controller.getAll);

router.post('/', authorize('ADMIN', 'MANAGER'), [
  body('name').trim().notEmpty().withMessage('Name required'),
  validate,
], controller.create);

router.put('/:id', authorize('ADMIN', 'MANAGER'), [
  body('name').trim().notEmpty(),
  validate,
], controller.update);

router.delete('/:id', authorize('ADMIN'), controller.remove);

module.exports = router;
