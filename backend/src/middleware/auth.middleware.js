const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const auditService = require('../services/audit.service');

const SELLER_ACCESS_START_HOUR = 9;
const SELLER_ACCESS_END_HOUR = 24;
const SELLER_TIMEZONE = process.env.SELLER_TIMEZONE || process.env.TZ || 'Asia/Aqtau';

const getSellerHour = (date = new Date()) => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hour12: false,
    timeZone: SELLER_TIMEZONE,
  });
  return Number(formatter.format(date));
};

const isSellerAccessOpen = (date = new Date()) => {
  const hour = getSellerHour(date);
  return hour >= SELLER_ACCESS_START_HOUR && hour < SELLER_ACCESS_END_HOUR;
};

// ── JWT Authentication ────────────────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      await auditService.record({
        req, action: 'auth:missing-token', resource: 'auth', status: 'denied', statusCode: 401,
        metadata: { reason: 'missing bearer token' },
      });
      return res.status(401).json({ error: 'Требуется токен доступа' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, isActive: true, faceAuthEnabled: true, pinEnabled: true },
    });

    if (!user || !user.isActive) {
      await auditService.record({
        req, action: 'auth:inactive-user', resource: 'auth', status: 'denied', statusCode: 401,
        metadata: { userId: decoded.userId },
      });
      return res.status(401).json({ error: 'Пользователь не найден или деактивирован' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      await auditService.record({ req, action: 'auth:expired-token', resource: 'auth', status: 'denied', statusCode: 401 });
      return res.status(401).json({ error: 'Срок действия токена истёк' });
    }
    await auditService.record({ req, action: 'auth:invalid-token', resource: 'auth', status: 'denied', statusCode: 401 });
    return res.status(401).json({ error: 'Недействительный токен' });
  }
};

// ── Role-based authorization ──────────────────────────────────────────────────
const authorize = (...roles) => {
  return async (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      await auditService.record({
        req, action: 'access:denied', resource: req.originalUrl.split('/').filter(Boolean)[1] || 'api',
        status: 'denied', statusCode: 403, metadata: { required: roles, current: req.user.role },
      });
      return res.status(403).json({
        error: 'Недостаточно прав',
        required: roles,
        current: req.user.role,
      });
    }
    next();
  };
};

const enforceSellerHours = async (req, res, next) => {
  if (req.user?.role !== 'SELLER') return next();
  if (isSellerAccessOpen()) return next();

  const error = 'Панель продавца доступна только с 09:00 до 00:00';
  await auditService.record({
    req,
    action: 'seller:off-hours',
    resource: req.originalUrl.split('/').filter(Boolean)[1] || 'seller',
    status: 'denied',
    statusCode: 403,
    metadata: {
      availableFrom: '09:00',
      availableUntil: '00:00',
      localHour: getSellerHour(),
      timeZone: SELLER_TIMEZONE,
    },
  });

  return res.status(403).json({
    error,
    code: 'SELLER_OFF_HOURS',
    availableFrom: '09:00',
    availableUntil: '00:00',
  });
};

// Shorthand helpers
const adminOnly      = authorize('ADMIN');
const adminOrOperator = authorize('ADMIN', 'OPERATOR');
const sellerOnly     = authorize('SELLER');
const allRoles       = authorize('ADMIN', 'OPERATOR', 'SELLER');

module.exports = {
  authenticate,
  authorize,
  enforceSellerHours,
  isSellerAccessOpen,
  adminOnly,
  adminOrOperator,
  sellerOnly,
  allRoles,
};
