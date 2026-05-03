const express  = require('express');
const { body } = require('express-validator');
const router   = express.Router();
const controller = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

// ── Public ────────────────────────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
], controller.login);

router.post('/login/pin', [
  body('email').isEmail().normalizeEmail(),
  body('pin').isLength({ min: 4, max: 8 }).withMessage('PIN: 4-8 цифр'),
  validate,
], controller.loginWithPin);

// WebAuthn — initiate (public, no JWT needed)
router.post('/webauthn/auth/start',  [
  body('email').isEmail().normalizeEmail(), validate,
], controller.webAuthnAuthStart);

router.post('/webauthn/auth/finish', [
  body('email').isEmail().normalizeEmail(),
  body('response').notEmpty(), validate,
], controller.webAuthnAuthFinish);

// ── Admin: register new users ─────────────────────────────────────────────────
router.post('/register', authenticate, authorize('ADMIN'), [
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['ADMIN', 'OPERATOR', 'SELLER']),
  validate,
], controller.register);

// ── Authenticated ─────────────────────────────────────────────────────────────
router.get('/profile', authenticate, controller.getProfile);

// WebAuthn registration (requires JWT — must be logged in first or admin registers for seller)
router.post('/webauthn/register/start',  authenticate, controller.webAuthnRegisterStart);
router.post('/webauthn/register/finish', authenticate, [
  body('response').notEmpty(), validate,
], controller.webAuthnRegisterFinish);

router.delete('/webauthn/credentials/:credentialId', authenticate, controller.deleteCredential);

// ── Admin: user management ────────────────────────────────────────────────────
router.get('/users',       authenticate, authorize('ADMIN'), controller.listUsers);
router.put('/users/:id',   authenticate, authorize('ADMIN'), controller.updateUser);
router.delete('/users/:id',authenticate, authorize('ADMIN'), controller.deleteUser);

module.exports = router;
