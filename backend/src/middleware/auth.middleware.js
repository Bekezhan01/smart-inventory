const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const auditService = require('../services/audit.service');

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

// Shorthand helpers
const adminOnly      = authorize('ADMIN');
const adminOrOperator = authorize('ADMIN', 'OPERATOR');
const sellerOnly     = authorize('SELLER');
const allRoles       = authorize('ADMIN', 'OPERATOR', 'SELLER');

module.exports = { authenticate, authorize, adminOnly, adminOrOperator, sellerOnly, allRoles };
