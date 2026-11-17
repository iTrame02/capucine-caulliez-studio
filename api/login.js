const crypto = require('crypto');
const { sign, readBody, fail } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST uniquement' });
  try {
    const { password } = await readBody(req);
    const expected = process.env.ADMIN_PASSWORD || '';
    const a = crypto.createHash('sha256').update(String(password || '')).digest();
    const b = crypto.createHash('sha256').update(expected).digest();
    if (!expected || !crypto.timingSafeEqual(a, b)) {
      await new Promise(r => setTimeout(r, 600));
      return res.status(401).json({ error: 'Mot de passe incorrect.' });
    }
    const token = sign({ exp: Date.now() + 1000 * 60 * 60 * 24 * 7 });
    res.status(200).json({ token });
  } catch (e) { fail(res, e); }
};
