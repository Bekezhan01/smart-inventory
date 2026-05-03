const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

// ── JWT Authentication ────────────────────────────────────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Требуется токен доступа' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, isActive: true, faceAuthEnabled: true, pinEnabled: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Пользователь не найден или деактивирован' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Срок действия токена истёк' });
    }
    return res.status(401).json({ error: 'Недействительный токен' });
  }
};

// ── Role-based authorization ──────────────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
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
