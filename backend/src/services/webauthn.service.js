/**
 * WebAuthn / Face ID Service
 * Uses @simplewebauthn/server — implements FIDO2 / WebAuthn Level 2
 *
 * Flow:
 *   Registration:  generateRegistrationOptions → user completes → verifyRegistration
 *   Authentication: generateAuthenticationOptions → user biometric → verifyAuthentication
 */

const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');
const jwt    = require('jsonwebtoken');
const prisma = require('../config/database');

const RP_NAME  = process.env.WEBAUTHN_RP_NAME  || 'StockOS';
const RP_ID    = process.env.WEBAUTHN_RP_ID    || 'localhost';
const ORIGIN   = process.env.WEBAUTHN_ORIGIN   || 'http://localhost:3000';
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ── Helper: clean expired challenges ─────────────────────────────────────────
const cleanExpiredChallenges = async () => {
  await prisma.webAuthnChallenge.deleteMany({ where: { expiresAt: { lt: new Date() } } });
};

// ── REGISTRATION ──────────────────────────────────────────────────────────────

const startRegistration = async (userId) => {
  await cleanExpiredChallenges();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { webAuthnCredentials: true },
  });
  if (!user) throw Object.assign(new Error('Пользователь не найден'), { status: 404 });

  const existingCredentials = user.webAuthnCredentials.map((c) => ({
    id: Buffer.from(c.credentialId, 'base64url'),
    type: 'public-key',
    transports: c.transports,
  }));

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID:   RP_ID,
    userID: Buffer.from(userId),
    userName: user.email,
    userDisplayName: user.name,
    attestationType: 'none',
    excludeCredentials: existingCredentials,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required', // ensures biometric / PIN on device
      authenticatorAttachment: 'platform', // prefer built-in Face ID / fingerprint
    },
    supportedAlgorithmIDs: [-7, -257], // ES256, RS256
  });

  // Store challenge
  await prisma.webAuthnChallenge.create({
    data: {
      userId,
      challenge:  options.challenge,
      type:       'registration',
      expiresAt:  new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });

  return options;
};

const completeRegistration = async (userId, response, credentialName) => {
  const challengeRecord = await prisma.webAuthnChallenge.findFirst({
    where: { userId, type: 'registration', expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!challengeRecord) throw Object.assign(new Error('Challenge не найден или истёк'), { status: 400 });

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin:    ORIGIN,
      expectedRPID:      RP_ID,
      requireUserVerification: true,
    });
  } catch (err) {
    throw Object.assign(new Error(`Ошибка верификации: ${err.message}`), { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    throw Object.assign(new Error('Верификация не пройдена'), { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp, aaguid } = verification.registrationInfo;

  // Save credential
  const saved = await prisma.webAuthnCredential.create({
    data: {
      userId,
      credentialId: Buffer.from(credential.id).toString('base64url'),
      publicKey:    Buffer.from(credential.publicKey).toString('base64'),
      counter:      BigInt(credential.counter),
      deviceType:   credentialDeviceType,
      backedUp:     credentialBackedUp,
      transports:   response.response.transports || [],
      aaguid:       aaguid || null,
      name:         credentialName || 'Face ID устройство',
    },
  });

  // Mark user as face-auth enabled
  await prisma.user.update({
    where:  { id: userId },
    data:   { faceAuthEnabled: true },
  });

  // Remove used challenge
  await prisma.webAuthnChallenge.delete({ where: { id: challengeRecord.id } });

  return { credentialId: saved.credentialId, name: saved.name };
};

// ── AUTHENTICATION ────────────────────────────────────────────────────────────

const startAuthentication = async (email) => {
  await cleanExpiredChallenges();

  const user = await prisma.user.findUnique({
    where: { email },
    include: { webAuthnCredentials: true },
  });
  if (!user || !user.isActive) {
    throw Object.assign(new Error('Пользователь не найден'), { status: 404 });
  }
  if (!user.faceAuthEnabled || user.webAuthnCredentials.length === 0) {
    throw Object.assign(new Error('Face ID не настроен'), { status: 400 });
  }

  const allowCredentials = user.webAuthnCredentials.map((c) => ({
    id:         Buffer.from(c.credentialId, 'base64url'),
    type:       'public-key',
    transports: c.transports,
  }));

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials,
    userVerification: 'required',
    timeout: 60000,
  });

  await prisma.webAuthnChallenge.create({
    data: {
      userId:    user.id,
      challenge: options.challenge,
      type:      'authentication',
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
    },
  });

  return { options, userId: user.id };
};

const completeAuthentication = async (email, response) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { webAuthnCredentials: true },
  });
  if (!user || !user.isActive) {
    throw Object.assign(new Error('Пользователь не найден'), { status: 401 });
  }

  const challengeRecord = await prisma.webAuthnChallenge.findFirst({
    where: { userId: user.id, type: 'authentication', expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!challengeRecord) throw Object.assign(new Error('Challenge не найден или истёк'), { status: 400 });

  // Find the credential that was used
  const credentialId = Buffer.from(response.id, 'base64url').toString('base64url');
  const storedCred = user.webAuthnCredentials.find((c) => c.credentialId === credentialId);
  if (!storedCred) throw Object.assign(new Error('Устройство не зарегистрировано'), { status: 400 });

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin:    ORIGIN,
      expectedRPID:      RP_ID,
      credential: {
        id:         Buffer.from(storedCred.credentialId, 'base64url'),
        publicKey:  Buffer.from(storedCred.publicKey, 'base64'),
        counter:    Number(storedCred.counter),
        transports: storedCred.transports,
      },
      requireUserVerification: true,
    });
  } catch (err) {
    throw Object.assign(new Error(`Ошибка аутентификации: ${err.message}`), { status: 401 });
  }

  if (!verification.verified) {
    throw Object.assign(new Error('Аутентификация не прошла'), { status: 401 });
  }

  // Update counter to prevent replay attacks
  await prisma.webAuthnCredential.update({
    where: { id: storedCred.id },
    data: {
      counter:    BigInt(verification.authenticationInfo.newCounter),
      lastUsedAt: new Date(),
    },
  });

  await prisma.webAuthnChallenge.delete({ where: { id: challengeRecord.id } });

  // Issue JWT
  const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
  const { password: _, pinHash: __, ...safeUser } = user;
  return { user: { ...safeUser, webAuthnCredentials: undefined }, token };
};

// ── Manage credentials ────────────────────────────────────────────────────────

const deleteCredential = async (userId, credentialId) => {
  const cred = await prisma.webAuthnCredential.findFirst({ where: { id: credentialId, userId } });
  if (!cred) throw Object.assign(new Error('Не найдено'), { status: 404 });
  await prisma.webAuthnCredential.delete({ where: { id: credentialId } });

  // If no more credentials, disable face auth
  const remaining = await prisma.webAuthnCredential.count({ where: { userId } });
  if (remaining === 0) {
    await prisma.user.update({ where: { id: userId }, data: { faceAuthEnabled: false } });
  }
};

module.exports = {
  startRegistration,
  completeRegistration,
  startAuthentication,
  completeAuthentication,
  deleteCredential,
};
