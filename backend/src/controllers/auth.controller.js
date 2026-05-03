const authService    = require('../services/auth.service');
const webAuthnService = require('../services/webauthn.service');

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ message: 'Пользователь зарегистрирован', ...result });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json({ message: 'Вход выполнен', ...result });
  } catch (err) { next(err); }
};

const loginWithPin = async (req, res, next) => {
  try {
    const result = await authService.loginWithPin(req.body);
    res.json({ message: 'Вход по PIN выполнен', ...result });
  } catch (err) { next(err); }
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
    res.json({ message: 'Пользователь обновлён', user });
  } catch (err) { next(err); }
};

const deleteUser = async (req, res, next) => {
  try {
    await authService.deleteUser(req.params.id);
    res.json({ message: 'Пользователь удалён' });
  } catch (err) { next(err); }
};

// ── WebAuthn ─────────────────────────────────────────────────────────────────
const webAuthnRegisterStart = async (req, res, next) => {
  try {
    const options = await webAuthnService.startRegistration(req.user.id, req);
    res.json(options);
  } catch (err) { next(err); }
};

const webAuthnRegisterFinish = async (req, res, next) => {
  try {
    const { response, name } = req.body;
    const result = await webAuthnService.completeRegistration(req.user.id, response, name, req);
    res.json({ message: 'Face ID зарегистрирован', ...result });
  } catch (err) { next(err); }
};

const webAuthnAuthStart = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await webAuthnService.startAuthentication(email, req);
    res.json(result.options);
  } catch (err) { next(err); }
};

const webAuthnAuthFinish = async (req, res, next) => {
  try {
    const { email, response } = req.body;
    const result = await webAuthnService.completeAuthentication(email, response, req);
    res.json({ message: 'Вход через Face ID выполнен', ...result });
  } catch (err) { next(err); }
};

const deleteCredential = async (req, res, next) => {
  try {
    await webAuthnService.deleteCredential(req.user.id, req.params.credentialId);
    res.json({ message: 'Устройство удалено' });
  } catch (err) { next(err); }
};

module.exports = {
  register, login, loginWithPin, getProfile,
  listUsers, updateUser, deleteUser,
  webAuthnRegisterStart, webAuthnRegisterFinish,
  webAuthnAuthStart, webAuthnAuthFinish, deleteCredential,
};
