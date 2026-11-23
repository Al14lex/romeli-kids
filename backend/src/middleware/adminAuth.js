// Admin authentication: one password stored on the server (ADMIN_PASSWORD),
// exchanged for a signed token that the admin page sends with every request.
const crypto = require('crypto');

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

const getPassword = () => process.env.ADMIN_PASSWORD || '';
// Tokens are signed with ADMIN_TOKEN_SECRET if set, otherwise derived from the
// password, so changing the password logs everyone out.
const getSecret = () => process.env.ADMIN_TOKEN_SECRET || `romeli-admin:${getPassword()}`;

const b64url = (buf) => Buffer.from(buf).toString('base64url');

const sign = (payload) => crypto
  .createHmac('sha256', getSecret())
  .update(payload)
  .digest('base64url');

const safeEqual = (a, b) => {
  // Hash first so lengths always match and timing does not leak the length.
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

function createToken(now = Date.now()) {
  const expiresAt = now + TOKEN_TTL_MS;
  const payload = b64url(JSON.stringify({ exp: expiresAt, n: crypto.randomBytes(8).toString('hex') }));
  return { token: `${payload}.${sign(payload)}`, expiresAt };
}

function verifyToken(token, now = Date.now()) {
  if (typeof token !== 'string' || !token.includes('.')) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Number.isFinite(exp) && exp > now;
  } catch {
    return false;
  }
}

const notConfigured = (res) => res.status(503).json({
  message: 'ADMIN_PASSWORD is not configured on the server.',
});

// Simple in-memory limiter for login attempts, per IP.
const attempts = new Map();
function tooManyAttempts(ip, now = Date.now()) {
  const entry = attempts.get(ip);
  if (!entry || now - entry.start > LOGIN_WINDOW_MS) return false;
  return entry.count >= LOGIN_MAX_ATTEMPTS;
}
function recordFailure(ip, now = Date.now()) {
  const entry = attempts.get(ip);
  if (!entry || now - entry.start > LOGIN_WINDOW_MS) {
    attempts.set(ip, { start: now, count: 1 });
  } else {
    entry.count += 1;
  }
  if (attempts.size > 5000) attempts.clear();
}

function login(req, res) {
  if (!getPassword()) return notConfigured(res);

  const ip = req.ip || 'unknown';
  if (tooManyAttempts(ip)) {
    return res.status(429).json({ message: 'Too many attempts. Try again in 15 minutes.' });
  }

  const password = req.body?.password;
  if (typeof password !== 'string' || !safeEqual(password, getPassword())) {
    recordFailure(ip);
    return res.status(401).json({ message: 'Wrong password' });
  }

  attempts.delete(ip);
  return res.json(createToken());
}

function requireAdmin(req, res, next) {
  if (!getPassword()) return notConfigured(res);

  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!verifyToken(token)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  return next();
}

module.exports = {
  login,
  requireAdmin,
  createToken,
  verifyToken,
  _attempts: attempts,
};
