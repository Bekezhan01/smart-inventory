const authService     = require('../services/auth.service');
const webAuthnService = require('../services/webauthn.service');
const auditService    = require('../services/audit.service');

const logAuth = (req, { user, email, action, status, statusCode, message }) => auditService.record({
  req,
  user,
  action,
  resource: 'auth',
  status,
  statusCode,
  metadata: { email, message },
});

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    await auditService.record({
      req,
      action: 'users:create',
      resource: 'users',
      status: 'allowed',
      statusCode: 201,
      metadata: { createdUserId: result.user.id, email: result.user.email, role: result.user.role },
    });
    res.status(201).json({ message: 'Пользователь зарегистрирован', ...result });
  } catch (err) {
    await auditService.record({
      req,
      action: 'users:create',
      resource: 'users',
      status: 'denied',
      statusCode: err.status || 500,
      metadata: { email: req.body?.email, role: req.body?.role, message: err.message },
    });
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    await logAuth(req, { user: result.user, email: result.user.email, action: 'auth:password-login', status: 'allowed', statusCode: 200 });
    res.json({ message: 'Вход выполнен', ...result });
  } catch (err) {
    await logAuth(req, { email: req.body?.email, action: 'auth:password-login', status: 'denied', statusCode: err.status || 500, message: err.message });
    next(err);
  }
};

const loginWithPin = async (req, res, next) => {
  try {
    const result = await authService.loginWithPin(req.body);
    await logAuth(req, { user: result.user, email: result.user.email, action: 'auth:pin-login', status: 'allowed', statusCode: 200 });
    res.json({ message: 'Вход по PIN выполнен', ...result });
  } catch (err) {
    await logAuth(req, { email: req.body?.email, action: 'auth:pin-login', status: 'denied', statusCode: err.status || 500, message: err.message });
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);
    res.json({ user });
  } catch (err) { next(err); }
};

// ── User Management (Admin) ───────────────────────────────────────────────────
const listUsers = async (req, res, next) => {
  try {
    const result = await authService.listUsers(req.query);
    res.json(result);
  } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
  try {
    const user = await authService.updateUser(req.params.id, req.body);
    await auditService.record({
      req,
      action: 'users:update',
      resource: 'users',
      status: 'allowed',
      statusCode: 200,
      metadata: { targetUserId: req.params.id, email: user.email, changed: Object.keys(req.body || {}) },
    });
    res.json({ message: 'Пользователь обновлён', user });
  } catch (err) {
    await auditService.record({ req, action: 'users:update', resource: 'users', status: 'denied', statusCode: err.status || 500, metadata: { targetUserId: req.params.id, message: err.message } });
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    await authService.deleteUser(req.params.id);
    await auditService.record({ req, action: 'users:delete', resource: 'users', status: 'allowed', statusCode: 200, metadata: { targetUserId: req.params.id } });
    res.json({ message: 'Пользователь удалён' });
  } catch (err) {
    await auditService.record({ req, action: 'users:delete', resource: 'users', status: 'denied', statusCode: err.status || 500, metadata: { targetUserId: req.params.id, message: err.message } });
    next(err);
  }
};

// ── WebAuthn ─────────────────────────────────────────────────────────────────
const webAuthnRegisterStart = async (req, res, next) => {
  try {
    const options = await webAuthnService.startRegistration(req.user.id, req);
    await auditService.record({ req, action: 'webauthn:register-start', resource: 'webauthn', status: 'allowed', statusCode: 200 });
    res.json(options);
  } catch (err) {
    await auditService.record({ req, action: 'webauthn:register-start', resource: 'webauthn', status: 'denied', statusCode: err.status || 500, metadata: { message: err.message } });
    next(err);
  }
};

const webAuthnRegisterFinish = async (req, res, next) => {
  try {
    const { response, name } = req.body;
    const result = await webAuthnService.completeRegistration(req.user.id, response, name, req);
    await auditService.record({ req, action: 'webauthn:register-finish', resource: 'webauthn', status: 'allowed', statusCode: 200, metadata: { credentialName: name } });
    res.json({ message: 'Face ID зарегистрирован', ...result });
  } catch (err) {
    await auditService.record({ req, action: 'webauthn:register-finish', resource: 'webauthn', status: 'denied', statusCode: err.status || 500, metadata: { message: err.message } });
    next(err);
  }
};

const webAuthnAuthStart = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await webAuthnService.startAuthentication(email, req);
    await auditService.record({ req, action: 'auth:webauthn-start', resource: 'auth', status: 'allowed', statusCode: 200, metadata: { email } });
    res.json(result.options);
  } catch (err) {
    await auditService.record({ req, action: 'auth:webauthn-start', resource: 'auth', status: 'denied', statusCode: err.status || 500, metadata: { email: req.body?.email, message: err.message } });
    next(err);
  }
};

const webAuthnAuthFinish = async (req, res, next) => {
  try {
    const { email, response } = req.body;
    const result = await webAuthnService.completeAuthentication(email, response, req);
    await logAuth(req, { user: result.user, email: result.user.email, action: 'auth:webauthn-login', status: 'allowed', statusCode: 200 });
    res.json({ message: 'Вход через Face ID выполнен', ...result });
  } catch (err) {
    await logAuth(req, { email: req.body?.email, action: 'auth:webauthn-login', status: 'denied', statusCode: err.status || 500, message: err.message });
    next(err);
  }
};

const deleteCredential = async (req, res, next) => {
  try {
    await webAuthnService.deleteCredential(req.user.id, req.params.credentialId);
    await auditService.record({ req, action: 'webauthn:delete-credential', resource: 'webauthn', status: 'allowed', statusCode: 200, metadata: { credentialId: req.params.credentialId } });
    res.json({ message: 'Устройство удалено' });
  } catch (err) {
    await auditService.record({ req, action: 'webauthn:delete-credential', resource: 'webauthn', status: 'denied', statusCode: err.status || 500, metadata: { credentialId: req.params.credentialId, message: err.message } });
    next(err);
  }
};

module.exports = {
  register, login, loginWithPin, getProfile,
  listUsers, updateUser, deleteUser,
  webAuthnRegisterStart, webAuthnRegisterFinish,
  webAuthnAuthStart, webAuthnAuthFinish, deleteCredential,
};
