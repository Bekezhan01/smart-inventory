const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

// ── Password / JWT Auth (Admin + Operator) ────────────────────────────────────

const register = async ({ name, email, password, role }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const error = new Error('Email уже зарегистрирован');
    error.status = 409;
    throw error;
  }

  // Only ADMIN can create ADMIN accounts (enforced in route layer)
  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role || 'SELLER' },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  const token = generateToken(user.id, user.role);
  return { user, token };
};

const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    const error = new Error('Неверный email или пароль');
    error.status = 401;
    throw error;
  }

  // Sellers should use Face ID or PIN — block password login for them
  if (user.role === 'SELLER') {
    const error = new Error('Продавцы входят через Face ID или PIN');
    error.status = 403;
    throw error;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    const error = new Error('Неверный email или пароль');
    error.status = 401;
    throw error;
  }

  const token = generateToken(user.id, user.role);
  const { password: _, pinHash: __, ...safeUser } = user;
  return { user: safeUser, token };
};

// ── PIN Auth (Seller fallback) ────────────────────────────────────────────────

const loginWithPin = async ({ email, pin }) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive || user.role !== 'SELLER') {
    const error = new Error('Пользователь не найден');
    error.status = 401;
    throw error;
  }

  if (!user.pinEnabled || !user.pinHash) {
    const error = new Error('PIN не настроен. Обратитесь к администратору.');
    error.status = 403;
    throw error;
  }

  const valid = await bcrypt.compare(String(pin), user.pinHash);
  if (!valid) {
    const error = new Error('Неверный PIN');
    error.status = 401;
    throw error;
  }

  const token = generateToken(user.id, user.role);
  const { password: _, pinHash: __, ...safeUser } = user;
  return { user: safeUser, token };
};

// ── Profile & User Management ─────────────────────────────────────────────────

const getProfile = async (userId) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, role: true,
      faceAuthEnabled: true, pinEnabled: true, isActive: true, createdAt: true,
      webAuthnCredentials: { select: { id: true, name: true, createdAt: true, lastUsedAt: true, deviceType: true } },
    },
  });
};

const listUsers = async ({ role, page = 1, limit = 20 }) => {
  const where = {};
  if (role) where.role = role;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true,
        faceAuthEnabled: true, pinEnabled: true, isActive: true, createdAt: true,
      },
      skip, take: Number(limit),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);
  return { users, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } };
};

const updateUser = async (id, data) => {
  const updateData = {};
  if (data.name)     updateData.name = data.name;
  if (data.email)    updateData.email = data.email;
  if (data.role)     updateData.role = data.role;
  if (typeof data.isActive === 'boolean') updateData.isActive = data.isActive;

  // Admin resetting a seller's PIN
  if (data.pin) {
    updateData.pinHash    = await bcrypt.hash(String(data.pin), 12);
    updateData.pinEnabled = true;
  }
  if (data.password) {
    updateData.password = await bcrypt.hash(data.password, 12);
  }

  return prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, email: true, role: true, faceAuthEnabled: true, pinEnabled: true, isActive: true },
  });
};

const deleteUser = async (id) => {
  await prisma.user.delete({ where: { id } });
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const generateToken = (userId, role) => {
  return jwt.sign({ userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
};

module.exports = { register, login, loginWithPin, getProfile, listUsers, updateUser, deleteUser };
