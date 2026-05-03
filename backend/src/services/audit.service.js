const prisma = require('../config/database');

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const PERMISSION_MATRIX = [
  {
    role: 'ADMIN',
    label: 'Администратор',
    permissions: [
      'users:create', 'users:update', 'users:delete', 'products:manage',
      'inventory:manage', 'transactions:create', 'reports:view',
      'sales:view-all', 'security:view', 'security:audit', 'webauthn:manage-own',
    ],
    conditions: ['Полный доступ к административному контуру', 'Просмотр и анализ событий безопасности'],
  },
  {
    role: 'OPERATOR',
    label: 'Оператор',
    permissions: [
      'products:create', 'products:update', 'inventory:manage',
      'transactions:create', 'reports:view', 'categories:manage',
    ],
    conditions: ['Нет доступа к пользователям и security audit', 'Нет доступа к удалению пользователей'],
  },
  {
    role: 'SELLER',
    label: 'Продавец',
    permissions: ['sales:create', 'sales:view-own', 'webauthn:manage-own', 'pin:login'],
    conditions: ['Только собственные продажи', 'Вход через PIN или WebAuthn/Face ID'],
  },
];

const SENSITIVE_KEYS = new Set(['password', 'pin', 'token', 'authorization', 'credential', 'response']);

const sanitize = (value) => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitize);

  return Object.fromEntries(Object.entries(value).map(([key, val]) => {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) return [key, '[redacted]'];
    if (val && typeof val === 'object') return [key, sanitize(val)];
    return [key, val];
  }));
};

const getRequestMeta = (req) => ({
  ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || req.ip || null,
  userAgent: req.headers['user-agent'] || null,
});

const inferResource = (path = '') => {
  const parts = path.split('/').filter(Boolean);
  return parts[1] || parts[0] || 'system';
};

const inferAction = (req) => {
  const resource = inferResource(req.originalUrl || req.path);
  const methodMap = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete', GET: 'read' };
  return `${resource}:${methodMap[req.method] || req.method.toLowerCase()}`;
};

const record = async ({ req, user = req?.user, action, resource, status = 'allowed', statusCode = 200, metadata = {} }) => {
  try {
    const requestMeta = req ? getRequestMeta(req) : {};
    await prisma.auditEvent.create({
      data: {
        userId: user?.id || null,
        actorEmail: user?.email || metadata.email || null,
        role: user?.role || null,
        action: action || (req ? inferAction(req) : 'system:event'),
        resource: resource || (req ? inferResource(req.originalUrl || req.path) : 'system'),
        method: req?.method || metadata.method || 'SYSTEM',
        path: req?.originalUrl || metadata.path || '-',
        status,
        statusCode,
        ip: requestMeta.ip || null,
        userAgent: requestMeta.userAgent || null,
        metadata: sanitize(metadata),
      },
    });
  } catch (err) {
    console.error('[AUDIT] failed to record event:', err.message);
  }
};

const auditMutations = (req, res, next) => {
  res.on('finish', () => {
    if (!WRITE_METHODS.has(req.method)) return;
    if (req.originalUrl.startsWith('/api/auth')) return;
    if (req.originalUrl.startsWith('/api/security')) return;
    if (!req.user) return;

    const allowed = res.statusCode < 400;
    record({
      req,
      action: inferAction(req),
      resource: inferResource(req.originalUrl),
      status: allowed ? 'allowed' : 'denied',
      statusCode: res.statusCode,
      metadata: { body: req.body },
    });
  });
  next();
};

const getSummary = async () => {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, allowed, denied, authSuccess, authFailed, recent] = await Promise.all([
    prisma.auditEvent.count({ where: { createdAt: { gte: since } } }),
    prisma.auditEvent.count({ where: { createdAt: { gte: since }, status: 'allowed' } }),
    prisma.auditEvent.count({ where: { createdAt: { gte: since }, status: 'denied' } }),
    prisma.auditEvent.count({ where: { createdAt: { gte: since }, action: { in: ['auth:password-login', 'auth:pin-login', 'auth:webauthn-login'] }, status: 'allowed' } }),
    prisma.auditEvent.count({ where: { createdAt: { gte: since }, action: { in: ['auth:password-login', 'auth:pin-login', 'auth:webauthn-login'] }, status: 'denied' } }),
    prisma.auditEvent.findMany({ take: 8, orderBy: { createdAt: 'desc' }, select: { id: true, actorEmail: true, role: true, action: true, resource: true, status: true, statusCode: true, createdAt: true } }),
  ]);

  const byStatus = await prisma.auditEvent.groupBy({ by: ['status'], where: { createdAt: { gte: since } }, _count: { _all: true } });
  const byActionRaw = await prisma.auditEvent.groupBy({ by: ['action'], where: { createdAt: { gte: since } }, _count: { _all: true } });
  const byAction = byActionRaw
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 8);

  return { total, allowed, denied, authSuccess, authFailed, byStatus, byAction, recent };
};

const listEvents = async ({ status, action, role, page = 1, limit = 50 }) => {
  const where = {};
  if (status) where.status = status;
  if (action) where.action = { contains: action, mode: 'insensitive' };
  if (role) where.role = role;

  const take = Math.min(Number(limit) || 50, 100);
  const skip = (Number(page) - 1) * take;

  const [events, total] = await Promise.all([
    prisma.auditEvent.findMany({
      where, skip, take, orderBy: { createdAt: 'desc' },
      select: { id: true, actorEmail: true, role: true, action: true, resource: true, method: true, path: true, status: true, statusCode: true, ip: true, userAgent: true, metadata: true, createdAt: true },
    }),
    prisma.auditEvent.count({ where }),
  ]);

  return { events, pagination: { page: Number(page), limit: take, total, pages: Math.ceil(total / take) } };
};

module.exports = { PERMISSION_MATRIX, auditMutations, getSummary, listEvents, record };
