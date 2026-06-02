const { getCookieHeader } = require('./_auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const cookie = getCookieHeader('', { secure: process.env.NODE_ENV === 'production', clear: true });
  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ success: true });
};