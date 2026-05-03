const express = require('express');
const router = express.Router();
const controller = require('../controllers/security.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate, authorize('ADMIN'));

router.get('/summary', controller.getSummary);
router.get('/events', controller.listEvents);
router.get('/permissions', controller.getPermissions);

module.exports = router;
