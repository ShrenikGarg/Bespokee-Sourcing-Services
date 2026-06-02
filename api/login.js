const { createToken, getCookieHeader } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  const password = body.password;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    res.status(500).json({ error: 'Admin password is not configured.' });
    return;
  }

  if (!password || password !== adminPassword) {
    res.status(401).json({ error: 'Invalid password.' });
    return;
  }

  const token = createToken();
  const cookie = getCookieHeader(token, { secure: process.env.NODE_ENV === 'production' });
  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ success: true });
};