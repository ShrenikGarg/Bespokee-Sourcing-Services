const crypto = require('crypto');
const COOKIE_NAME = 'bss_admin_session';
const SECRET = process.env.ADMIN_SECRET || 'please_change_this_secret';
const MAX_AGE = 4 * 60 * 60; // 4 hours in seconds

function encodePayload(payload) {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString('base64url');
}

function decodePayload(tokenPart) {
  return JSON.parse(Buffer.from(tokenPart, 'base64url').toString('utf8'));
}

function signature(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

function createToken() {
  const payload = { admin: true, exp: Date.now() + MAX_AGE * 1000 };
  const encoded = encodePayload(payload);
  return `${encoded}.${signature(encoded)}`;
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, part) => {
    const [key, ...valueParts] = part.split('=');
    if (!key || valueParts.length === 0) return acc;
    acc[key.trim()] = valueParts.join('=').trim();
    return acc;
  }, {});
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return false;
  if (signature(payload) !== sig) return false;

  const parsed = decodePayload(payload);
  return parsed.admin === true && parsed.exp > Date.now();
}

function getCookieHeader(value, options = {}) {
  let cookie = `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE}`;
  if (options.secure) cookie += '; Secure';
  if (options.clear) cookie += '; Max-Age=0';
  return cookie;
}

function isAdminRequest(req) {
  const cookies = parseCookies(req.headers.cookie || '');
  return verifyToken(cookies[COOKIE_NAME]);
}

module.exports = {
  COOKIE_NAME,
  createToken,
  getCookieHeader,
  isAdminRequest,
};